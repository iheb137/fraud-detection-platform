import joblib
import os
import numpy as np
import pandas as pd
from app.ml.feature_engineering import extract_features, extract_features_batch, FEATURE_COLUMNS
from app.schemas.prediction_schema import PredictionResponse, BatchPredictionResponse

MODEL_PATH = "models/fraud_model.pkl"


class PredictionService:

    def __init__(self):
        self.model = None
        self.model_version = "v2.0"
        self.features = FEATURE_COLUMNS
        self.threshold = 0.5
        self.auc = 0.0
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            model_data = joblib.load(MODEL_PATH)
            if isinstance(model_data, dict):
                self.model = model_data["model"]
                self.features = model_data.get("features", FEATURE_COLUMNS)
                self.model_version = model_data.get("version", "v2.0")
                self.auc = model_data.get("auc", 0.0)
                self.threshold = model_data.get("threshold", 0.5)
            else:
                # Backward compatibility avec l'ancien format
                self.model = model_data
                self.model_version = "v1.0-legacy"
            print(f"Modele {self.model_version} charge (AUC: {self.auc:.4f})")
        else:
            print("Aucun modele trouve — utilisation du mode demo")

    def predict_one(self, cdr) -> PredictionResponse:
        cdr_dict = cdr.model_dump()
        features = extract_features(cdr_dict)

        if self.model is not None:
            X = pd.DataFrame([features])[self.features]
            fraud_score = float(self.model.predict_proba(X)[0][1])
        else:
            fraud_score = self._demo_score(features)

        is_fraud = fraud_score >= self.threshold

        return PredictionResponse(
            call_id=cdr.call_id,
            fraud_score=round(fraud_score, 4),
            is_fraud=is_fraud,
            model_version=self.model_version,
            features_used=features
        )

    def predict_batch(self, cdrs: list) -> BatchPredictionResponse:
        if self.model is not None and len(cdrs) > 1:
            # Batch optimisé : feature engineering en une fois
            cdr_dicts = [c.model_dump() for c in cdrs]
            X = extract_features_batch(cdr_dicts)
            probas = self.model.predict_proba(X)[:, 1]

            predictions = []
            for i, cdr in enumerate(cdrs):
                score = float(probas[i])
                predictions.append(PredictionResponse(
                    call_id=cdr.call_id,
                    fraud_score=round(score, 4),
                    is_fraud=score >= self.threshold,
                    model_version=self.model_version,
                    features_used={}
                ))
        else:
            predictions = [self.predict_one(cdr) for cdr in cdrs]

        fraud_count = sum(1 for p in predictions if p.is_fraud)
        return BatchPredictionResponse(
            predictions=predictions,
            total=len(predictions),
            fraud_count=fraud_count
        )

    def get_model_info(self) -> dict:
        return {
            "model_version": self.model_version,
            "model_loaded": self.model is not None,
            "model_path": MODEL_PATH,
            "auc_score": self.auc,
            "threshold": self.threshold,
            "features": self.features,
            "n_features": len(self.features)
        }

    def _demo_score(self, features: dict) -> float:
        """Score heuristique quand aucun modèle n'est chargé."""
        score = 0.05
        if features.get("is_night_call", 0):
            score += 0.15
        if features.get("is_international", 0):
            score += 0.12
        if features.get("is_very_long_call", 0):
            score += 0.18
        if features.get("is_very_short_call", 0):
            score += 0.20
        risk = features.get("country_risk_score", 0)
        score += risk * 0.30
        revenue = features.get("revenue_norm", 0)
        if revenue > 0.3:
            score += revenue * 0.15
        if features.get("night_international", 0):
            score += 0.10
        return min(round(score, 4), 0.99)
