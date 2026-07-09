from pydantic import BaseModel

class PredictionResponse(BaseModel):
    call_id: str
    fraud_score: float
    is_fraud: bool
    model_version: str
    features_used: dict

class BatchPredictionResponse(BaseModel):
    predictions: list[PredictionResponse]
    total: int
    fraud_count: int