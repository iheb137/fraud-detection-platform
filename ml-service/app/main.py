from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict, health, pipeline

app = FastAPI(
    title="Fraud Detection ML Service",
    description="Service de detection de fraude telephonique - Tunisie Telecom",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(predict.router, prefix="/predict", tags=["Prediction"])
app.include_router(pipeline.router, prefix="/pipeline", tags=["Pipeline"])

@app.get("/")
def root():
    return {"service": "Fraud Detection ML", "status": "running", "version": "1.0.0"}