#!/bin/sh
set -e
if [ ! -f /ml/models/fraud_model.pkl ]; then
  echo "[seed] copie des modeles depuis l image"
  cp /ml/models-seed/*.pkl /ml/models/
fi
exec uvicorn app.main:app --host 0.0.0.0 --port 8000