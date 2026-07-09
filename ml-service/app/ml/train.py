import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
from sklearn.preprocessing import StandardScaler
import joblib
import os


def generate_synthetic_data(n_samples=10000):
    """
    Génère des données CDR synthétiques RÉALISTES avec chevauchement
    entre les classes pour un modèle plus robuste et discriminant.
    """
    np.random.seed(42)
    n_legit = int(n_samples * 0.80)
    n_fraud = n_samples - n_legit

    records = []

    # ==========================================
    # APPELS LÉGITIMES (80%)
    # ==========================================

    # Type 1: Appels locaux normaux (50% des légitimes)
    n1 = int(n_legit * 0.50)
    for _ in range(n1):
        hour = int(np.random.choice(
            list(range(7, 23)),
            p=[0.02, 0.06, 0.08, 0.10, 0.10, 0.10, 0.10, 0.08,
               0.06, 0.06, 0.05, 0.04, 0.04, 0.03, 0.05, 0.03]
        ))
        records.append({
            "hour_of_day": hour,
            "day_of_week": np.random.randint(0, 7),
            "is_international": 0,
            "call_duration_sec": int(np.random.lognormal(4.5, 1.0)),
            "destination_country": "TN",
            "call_type": np.random.choice(["VOICE", "SMS"], p=[0.7, 0.3]),
            "revenue": round(np.random.uniform(0.1, 5.0), 2),
            "is_fraud": 0
        })

    # Type 2: Appels internationaux normaux (20% des légitimes)
    n2 = int(n_legit * 0.20)
    countries_normal = ["FR", "DE", "GB", "IT", "US", "MA", "DZ"]
    for _ in range(n2):
        hour = int(np.random.choice(list(range(6, 24))))
        records.append({
            "hour_of_day": hour,
            "day_of_week": np.random.randint(0, 7),
            "is_international": 1,
            "call_duration_sec": int(np.random.lognormal(5.0, 0.8)),
            "destination_country": np.random.choice(countries_normal),
            "call_type": "VOICE",
            "revenue": round(np.random.uniform(1.0, 15.0), 2),
            "is_fraud": 0
        })

    # Type 3: Appels nocturnes légitimes (15% des légitimes)
    n3 = int(n_legit * 0.15)
    for _ in range(n3):
        hour = np.random.choice([22, 23, 0, 1, 2, 3, 4, 5, 6])
        records.append({
            "hour_of_day": int(hour),
            "day_of_week": np.random.randint(0, 7),
            "is_international": np.random.choice([0, 1], p=[0.7, 0.3]),
            "call_duration_sec": int(np.random.lognormal(4.0, 1.2)),
            "destination_country": np.random.choice(["TN", "FR", "MA", "DZ"]),
            "call_type": "VOICE",
            "revenue": round(np.random.uniform(0.2, 8.0), 2),
            "is_fraud": 0
        })

    # Type 4: Appels longs légitimes - entreprises (15% des légitimes)
    n4 = n_legit - n1 - n2 - n3
    for _ in range(n4):
        hour = np.random.randint(8, 19)
        records.append({
            "hour_of_day": int(hour),
            "day_of_week": np.random.randint(0, 5),
            "is_international": np.random.choice([0, 1], p=[0.5, 0.5]),
            "call_duration_sec": int(np.random.uniform(1800, 5400)),
            "destination_country": np.random.choice(["TN", "FR", "DE", "US"]),
            "call_type": "VOICE",
            "revenue": round(np.random.uniform(5.0, 25.0), 2),
            "is_fraud": 0
        })

    # ==========================================
    # APPELS FRAUDULEUX (20%)
    # ==========================================

    # Type F1: IRSF - International Revenue Share Fraud (35% des fraudes)
    nf1 = int(n_fraud * 0.35)
    countries_irsf = ["NG", "GH", "CM", "CU", "BY", "SN"]
    for _ in range(nf1):
        hour = np.random.choice([0, 1, 2, 3, 4, 5, 22, 23])
        records.append({
            "hour_of_day": int(hour),
            "day_of_week": np.random.randint(0, 7),
            "is_international": 1,
            "call_duration_sec": int(np.random.uniform(3600, 14400)),
            "destination_country": np.random.choice(countries_irsf),
            "call_type": "VOICE",
            "revenue": round(np.random.uniform(20.0, 100.0), 2),
            "is_fraud": 1
        })

    # Type F2: Wangiri - appels très courts (25% des fraudes)
    nf2 = int(n_fraud * 0.25)
    for _ in range(nf2):
        hour = np.random.randint(0, 24)
        records.append({
            "hour_of_day": int(hour),
            "day_of_week": np.random.randint(0, 7),
            "is_international": 1,
            "call_duration_sec": np.random.choice([1, 2, 3]),
            "destination_country": np.random.choice(countries_irsf + ["RU", "UA"]),
            "call_type": "VOICE",
            "revenue": round(np.random.uniform(0.0, 0.5), 2),
            "is_fraud": 1
        })

    # Type F3: SIM Boxing - volume élevé, durée moyenne (20% des fraudes)
    nf3 = int(n_fraud * 0.20)
    for _ in range(nf3):
        hour = np.random.randint(8, 22)
        records.append({
            "hour_of_day": int(hour),
            "day_of_week": np.random.randint(0, 7),
            "is_international": 1,
            "call_duration_sec": int(np.random.uniform(60, 300)),
            "destination_country": np.random.choice(["TN", "MA", "DZ"]),
            "call_type": "VOICE",
            "revenue": round(np.random.uniform(0.5, 3.0), 2),
            "is_fraud": 1
        })

    # Type F4: PBX Hacking - nocturne, longue durée (20% des fraudes)
    nf4 = n_fraud - nf1 - nf2 - nf3
    for _ in range(nf4):
        hour = np.random.choice([0, 1, 2, 3, 4, 5])
        records.append({
            "hour_of_day": int(hour),
            "day_of_week": np.random.choice([5, 6]),
            "is_international": 1,
            "call_duration_sec": int(np.random.uniform(1800, 10800)),
            "destination_country": np.random.choice(countries_irsf),
            "call_type": "VOICE",
            "revenue": round(np.random.uniform(15.0, 80.0), 2),
            "is_fraud": 1
        })

    df = pd.DataFrame(records)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Feature engineering avancé à partir des données brutes CDR.
    Produit des features continues et discriminantes.
    """
    COUNTRY_RISK = {
        "TN": 0.05, "FR": 0.10, "DE": 0.10, "GB": 0.12,
        "US": 0.15, "IT": 0.12, "MA": 0.25, "DZ": 0.25,
        "NG": 0.85, "GH": 0.80, "CM": 0.75, "SN": 0.65,
        "CU": 0.90, "BY": 0.82, "UA": 0.50, "RU": 0.55,
    }

    features = pd.DataFrame()
    features["hour_of_day"] = df["hour_of_day"]
    features["day_of_week"] = df["day_of_week"]
    features["is_night_call"] = df["hour_of_day"].apply(lambda h: 1 if (h >= 22 or h <= 5) else 0)
    features["is_weekend"] = df["day_of_week"].apply(lambda d: 1 if d >= 5 else 0)
    features["is_international"] = df["is_international"]

    # Duration features (continues, pas binaires)
    features["call_duration_sec"] = df["call_duration_sec"]
    features["duration_log"] = np.log1p(df["call_duration_sec"])
    features["duration_norm"] = df["call_duration_sec"].clip(upper=14400) / 14400.0
    features["is_very_short_call"] = (df["call_duration_sec"] <= 3).astype(int)
    features["is_very_long_call"] = (df["call_duration_sec"] > 3600).astype(int)
    features["is_medium_long"] = ((df["call_duration_sec"] > 1800) & (df["call_duration_sec"] <= 3600)).astype(int)

    # Country risk (continu)
    features["country_risk_score"] = df["destination_country"].map(COUNTRY_RISK).fillna(0.50)

    # Call type
    features["is_voice_call"] = (df["call_type"] == "VOICE").astype(int)

    # Revenue features (continus)
    features["revenue"] = df["revenue"]
    features["revenue_log"] = np.log1p(df["revenue"])
    features["revenue_norm"] = df["revenue"].clip(upper=100) / 100.0

    # Interaction features
    features["night_international"] = features["is_night_call"] * features["is_international"]
    features["risk_duration"] = features["country_risk_score"] * features["duration_norm"]
    features["risk_revenue"] = features["country_risk_score"] * features["revenue_norm"]
    features["night_long_call"] = features["is_night_call"] * features["is_very_long_call"]

    # Hour cyclique (sine/cosine)
    features["hour_sin"] = np.sin(2 * np.pi * features["hour_of_day"] / 24)
    features["hour_cos"] = np.cos(2 * np.pi * features["hour_of_day"] / 24)

    return features


FEATURE_COLUMNS = [
    "hour_of_day", "day_of_week", "is_night_call", "is_weekend",
    "is_international", "call_duration_sec", "duration_log", "duration_norm",
    "is_very_short_call", "is_very_long_call", "is_medium_long",
    "country_risk_score", "is_voice_call",
    "revenue", "revenue_log", "revenue_norm",
    "night_international", "risk_duration", "risk_revenue", "night_long_call",
    "hour_sin", "hour_cos"
]


def train():
    print("=" * 60)
    print("  ENTRAINEMENT DU MODELE DE DETECTION DE FRAUDE")
    print("=" * 60)

    print("\n[1/5] Generation des donnees synthetiques...")
    df = generate_synthetic_data(10000)
    print(f"      Dataset: {len(df)} CDR ({df['is_fraud'].sum():.0f} fraudes, "
          f"{(df['is_fraud'].mean()*100):.1f}%)")

    print("\n[2/5] Feature engineering...")
    features = engineer_features(df)
    X = features[FEATURE_COLUMNS]
    y = df["is_fraud"]

    print(f"      {len(FEATURE_COLUMNS)} features extraites")

    print("\n[3/5] Split train/test (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"      Train: {len(X_train)} | Test: {len(X_test)}")

    print("\n[4/5] Entrainement Random Forest...")
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="roc_auc")
    print(f"      Cross-validation AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    print("\n[5/5] Evaluation sur le jeu de test...")
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_proba)

    print("\n" + "=" * 60)
    print("  METRIQUES D'EVALUATION")
    print("=" * 60)
    print(classification_report(y_test, y_pred, target_names=["Legitime", "Fraude"]))
    print(f"AUC-ROC: {auc:.4f}")

    cm = confusion_matrix(y_test, y_pred)
    print(f"\nMatrice de confusion:")
    print(f"  VP (Vrais Positifs)  : {cm[1][1]}")
    print(f"  VN (Vrais Negatifs)  : {cm[0][0]}")
    print(f"  FP (Faux Positifs)   : {cm[0][1]}")
    print(f"  FN (Faux Negatifs)   : {cm[1][0]}")

    # Feature importance
    importances = pd.Series(model.feature_importances_, index=FEATURE_COLUMNS)
    importances = importances.sort_values(ascending=False)
    print(f"\nTop 10 features importantes:")
    for feat, imp in importances.head(10).items():
        print(f"  {feat:30s} {imp:.4f}")

    # Score distribution
    fraud_scores = y_proba[y_test == 1]
    legit_scores = y_proba[y_test == 0]
    print(f"\nDistribution des scores:")
    print(f"  Fraude  - min: {fraud_scores.min():.3f}, "
          f"mean: {fraud_scores.mean():.3f}, max: {fraud_scores.max():.3f}")
    print(f"  Legitime - min: {legit_scores.min():.3f}, "
          f"mean: {legit_scores.mean():.3f}, max: {legit_scores.max():.3f}")

    # Sauvegarde
    os.makedirs("models", exist_ok=True)
    model_data = {
        "model": model,
        "features": FEATURE_COLUMNS,
        "version": "v2.0",
        "auc": auc,
        "threshold": 0.5
    }
    joblib.dump(model_data, "models/fraud_model.pkl")
    print(f"\n{'=' * 60}")
    print(f"  Modele sauvegarde dans models/fraud_model.pkl")
    print(f"  Version: v2.0 | AUC: {auc:.4f}")
    print(f"{'=' * 60}")

    return auc


if __name__ == "__main__":
    train()
