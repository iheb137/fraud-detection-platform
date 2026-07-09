from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/health")
def health_check():
    model_exists = os.path.exists("models/fraud_model.pkl")
    return {
        "status": "healthy",
        "model_loaded": model_exists,
        "service": "Fraud Detection ML"
    }