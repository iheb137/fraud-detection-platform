from fastapi import APIRouter, HTTPException
from app.schemas.cdr_schema import CDRInput, CDRBatchInput
from app.schemas.prediction_schema import PredictionResponse, BatchPredictionResponse
from app.services.prediction_service import PredictionService

router = APIRouter()
prediction_service = PredictionService()

@router.post("", response_model=PredictionResponse)
def predict_single(cdr: CDRInput):
    try:
        return prediction_service.predict_one(cdr)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch", response_model=BatchPredictionResponse)
def predict_batch(batch: CDRBatchInput):
    try:
        return prediction_service.predict_batch(batch.cdrs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/model-info")
def model_info():
    return prediction_service.get_model_info()