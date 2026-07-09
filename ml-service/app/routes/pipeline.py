"""
Pipeline de reentrainement pilote par l'analyste.
- Un seul job a la fois (verrou -> 409)
- Progression par PHASES (le fit RF prend ~2s : un vrai % d'entrainement serait fini avant l'affichage)
- Le candidat n'est JAMAIS promu automatiquement : l'analyste compare v_actuelle vs candidat et decide.
- Entrainement : analyst_label (verite terrain) prioritaire, sinon is_fraud (sortie modele) - comptes affiches separement.
"""
import io
import os
import shutil
import threading
import joblib
import pandas as pd
from fastapi import APIRouter, Request, HTTPException
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score
from app.ml.feature_engineering import extract_features_batch, FEATURE_COLUMNS

router = APIRouter()

MODEL_PATH = "models/fraud_model.pkl"
CANDIDATE_PATH = "models/fraud_model_candidate.pkl"

_lock = threading.Lock()
job = {"state": "IDLE", "phase": "", "percent": 0, "logs": [], "metrics": None, "error": None}


def _log(msg: str):
    job["logs"].append(msg)
    print(f"[pipeline] {msg}")


def _current_model_meta():
    if os.path.exists(MODEL_PATH):
        data = joblib.load(MODEL_PATH)
        if isinstance(data, dict):
            return {"version": data.get("version", "?"), "auc": data.get("auc", 0.0)}
    return {"version": "aucun", "auc": 0.0}


def _next_version(cur: str) -> str:
    try:
        return f"v{round(float(cur.lstrip('v').split('-')[0]) + 0.1, 1)}"
    except Exception:
        return "v2.1"


def _run_training(csv_text: str):
    try:
        job.update(state="RUNNING", phase="Chargement du dataset", percent=5, logs=[], metrics=None, error=None)
        df = pd.read_csv(io.StringIO(csv_text))
        _log(f"Dataset recu : {len(df)} lignes")
        job["percent"] = 10

        job.update(phase="Constitution des labels", percent=20)
        human = int(df["analyst_label"].notna().sum())
        df["label"] = df["analyst_label"].fillna(df["is_fraud"])
        df["label"] = df["label"].astype(bool).astype(int)
        _log(f"Labels : {human} verites terrain analyste, {len(df) - human} issus du modele")

        job.update(phase="Nettoyage", percent=30)
        before = len(df)
        df = df.drop_duplicates(subset=["call_id"]).dropna(subset=["call_start_time", "call_duration_sec"])
        _log(f"Nettoyage : {before - len(df)} lignes ecartees, {len(df)} conservees")
        if len(df) < 50 or df["label"].nunique() < 2:
            raise ValueError("Dataset insuffisant : au moins 50 lignes et les 2 classes sont requis")

        job.update(phase="Feature engineering (22 features)", percent=45)
        records = df.to_dict("records")
        X = extract_features_batch(records)[FEATURE_COLUMNS]
        y = df["label"].values
        _log(f"Features extraites : {X.shape[0]} x {X.shape[1]}")

        job.update(phase="Entrainement Random Forest", percent=60)
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)
        model = RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=42, n_jobs=-1)
        model.fit(X_tr, y_tr)
        _log(f"Entrainement termine sur {len(X_tr)} lignes")

        job.update(phase="Evaluation vs modele actuel", percent=85)
        proba = model.predict_proba(X_te)[:, 1]
        pred = (proba >= 0.5).astype(int)
        cand_auc = float(roc_auc_score(y_te, proba))
        cur = _current_model_meta()
        new_version = _next_version(cur["version"])
        metrics = {
            "candidate": {
                "version": new_version,
                "auc": round(cand_auc, 4),
                "precision": round(float(precision_score(y_te, pred, zero_division=0)), 4),
                "recall": round(float(recall_score(y_te, pred, zero_division=0)), 4),
                "f1": round(float(f1_score(y_te, pred, zero_division=0)), 4),
                "trained_on": int(len(df)),
                "human_labels": human,
            },
            "current": cur,
        }
        _log(f"Candidat {new_version} : AUC={cand_auc:.4f} | Actuel {cur['version']} : AUC={cur['auc']:.4f}")

        os.makedirs("models", exist_ok=True)
        joblib.dump({"model": model, "features": FEATURE_COLUMNS, "version": new_version,
                     "auc": cand_auc, "threshold": 0.5}, CANDIDATE_PATH)
        _log("Candidat sauvegarde - EN ATTENTE de decision analyste (promotion manuelle)")
        job.update(state="DONE", phase="Termine - candidat pret", percent=100, metrics=metrics)
    except Exception as e:
        _log(f"ERREUR : {e}")
        job.update(state="FAILED", phase="Echec", error=str(e))


@router.post("/retrain", status_code=202)
async def retrain(request: Request):
    if not _lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Un entrainement est deja en cours")
    try:
        if job["state"] == "RUNNING":
            raise HTTPException(status_code=409, detail="Un entrainement est deja en cours")
        csv_text = (await request.body()).decode("utf-8")
        if not csv_text or "call_id" not in csv_text.splitlines()[0]:
            raise HTTPException(status_code=400, detail="Body attendu : CSV du dataset (en-tetes du contrat 1c)")
        threading.Thread(target=_run_training, args=(csv_text,), daemon=True).start()
        return {"status": "started"}
    finally:
        _lock.release()


@router.get("/status")
def status():
    return {"state": job["state"], "phase": job["phase"], "percent": job["percent"],
            "logs": job["logs"][-30:], "metrics": job["metrics"], "error": job["error"]}


@router.post("/promote")
def promote():
    if job["state"] != "DONE" or not os.path.exists(CANDIDATE_PATH):
        raise HTTPException(status_code=409, detail="Aucun candidat pret a promouvoir")
    shutil.copyfile(CANDIDATE_PATH, MODEL_PATH)
    reloaded = _reload_active_model()
    job.update(state="PROMOTED", phase="Modele promu")
    _log(f"Promotion effectuee (rechargement a chaud : {reloaded})")
    return {"status": "promoted", "hot_reload": reloaded, "version": job["metrics"]["candidate"]["version"]}


def _reload_active_model() -> bool:
    """Recharge le modele dans l'instance PredictionService vivante (sans restart)."""
    try:
        from app.services.prediction_service import PredictionService
        from app.routes import predict as predict_routes
        for value in vars(predict_routes).values():
            if isinstance(value, PredictionService):
                value.load_model()
                return True
    except Exception as e:
        print(f"[pipeline] Rechargement a chaud impossible : {e}")
    return False