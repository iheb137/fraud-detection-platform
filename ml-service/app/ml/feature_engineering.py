from datetime import datetime
import numpy as np
import pandas as pd

COUNTRY_RISK_SCORES = {
    "TN": 0.05, "FR": 0.10, "DE": 0.10, "GB": 0.12,
    "US": 0.15, "IT": 0.12, "MA": 0.25, "DZ": 0.25,
    "NG": 0.85, "GH": 0.80, "CM": 0.75, "SN": 0.65,
    "CU": 0.90, "BY": 0.82, "UA": 0.50, "RU": 0.55,
}

FEATURE_COLUMNS = [
    "hour_of_day", "day_of_week", "is_night_call", "is_weekend",
    "is_international", "call_duration_sec", "duration_log", "duration_norm",
    "is_very_short_call", "is_very_long_call", "is_medium_long",
    "country_risk_score", "is_voice_call",
    "revenue", "revenue_log", "revenue_norm",
    "night_international", "risk_duration", "risk_revenue", "night_long_call",
    "hour_sin", "hour_cos"
]


def extract_features(cdr: dict) -> dict:
    """
    Extrait les features d'un CDR unique pour la prédiction.
    Aligné exactement avec les features utilisées à l'entraînement.
    """
    # Parse datetime
    try:
        dt = datetime.strptime(cdr["call_start_time"], "%Y-%m-%dT%H:%M:%S")
    except (ValueError, KeyError):
        try:
            dt = datetime.strptime(cdr["call_start_time"], "%Y-%m-%d %H:%M:%S")
        except (ValueError, KeyError):
            dt = datetime.now()

    hour = dt.hour
    day_of_week = dt.weekday()
    is_night = 1 if (hour >= 22 or hour <= 5) else 0
    is_weekend = 1 if day_of_week >= 5 else 0
    is_international = 1 if cdr.get("destination_country", "TN") != "TN" else 0

    duration = int(cdr.get("call_duration_sec", 0))
    duration_log = float(np.log1p(duration))
    duration_norm = min(duration / 14400.0, 1.0)
    is_very_short = 1 if duration <= 3 else 0
    is_very_long = 1 if duration > 3600 else 0
    is_medium_long = 1 if (1800 < duration <= 3600) else 0

    country = cdr.get("destination_country", "TN")
    country_risk = COUNTRY_RISK_SCORES.get(country, 0.50)

    call_type = cdr.get("call_type", "VOICE")
    is_voice = 1 if call_type == "VOICE" else 0

    revenue = float(cdr.get("revenue", 0))
    revenue_log = float(np.log1p(revenue))
    revenue_norm = min(revenue / 100.0, 1.0)

    # Interaction features
    night_international = is_night * is_international
    risk_duration = country_risk * duration_norm
    risk_revenue = country_risk * revenue_norm
    night_long_call = is_night * is_very_long

    # Hour cyclique
    hour_sin = float(np.sin(2 * np.pi * hour / 24))
    hour_cos = float(np.cos(2 * np.pi * hour / 24))

    return {
        "hour_of_day": hour,
        "day_of_week": day_of_week,
        "is_night_call": is_night,
        "is_weekend": is_weekend,
        "is_international": is_international,
        "call_duration_sec": duration,
        "duration_log": duration_log,
        "duration_norm": duration_norm,
        "is_very_short_call": is_very_short,
        "is_very_long_call": is_very_long,
        "is_medium_long": is_medium_long,
        "country_risk_score": country_risk,
        "is_voice_call": is_voice,
        "revenue": revenue,
        "revenue_log": revenue_log,
        "revenue_norm": revenue_norm,
        "night_international": night_international,
        "risk_duration": risk_duration,
        "risk_revenue": risk_revenue,
        "night_long_call": night_long_call,
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
    }


def extract_features_batch(cdrs: list) -> pd.DataFrame:
    """Extrait les features pour un lot de CDR."""
    df = pd.DataFrame([extract_features(cdr) for cdr in cdrs])
    return df[FEATURE_COLUMNS]
