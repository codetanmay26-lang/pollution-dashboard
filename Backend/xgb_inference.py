"""
xgb_inference.py — Drop-in XGBoost inference for build_aqi_forecast_payload().

Loads the three trained XGBoost models (24h/48h/72h) and exposes
predict_aqi_forecast() which returns the exact same dict shape as
the old ridge regression build_aqi_forecast_payload().

Falls back to None if models are not found so main.py can gracefully
fall back to ridge regression during development.
"""

import pickle
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

HORIZONS = [24, 48, 72]

# ── Lazy-load models once at startup ──────────────────────────────────────────
_xgb_models      = None
_xgb_feature_cols = None
_models_available = None


def _load_models():
    global _xgb_models, _xgb_feature_cols, _models_available

    if _models_available is not None:
        return _models_available

    feat_path = MODELS_DIR / "xgb_feature_cols.pkl"
    if not feat_path.exists():
        print("[XGB] xgb_feature_cols.pkl not found — using ridge fallback")
        _models_available = False
        return False

    missing = [h for h in HORIZONS
               if not (MODELS_DIR / f"xgb_pm25_{h}h.pkl").exists()]
    if missing:
        print(f"[XGB] Missing model files for horizons {missing} — using ridge fallback")
        _models_available = False
        return False

    try:
        with open(feat_path, "rb") as f:
            _xgb_feature_cols = pickle.load(f)

        _xgb_models = {}
        for h in HORIZONS:
            with open(MODELS_DIR / f"xgb_pm25_{h}h.pkl", "rb") as f:
                _xgb_models[h] = pickle.load(f)
    except ModuleNotFoundError as e:
        print(f"[XGB] Dependency missing during model load ({e}) — using ridge fallback")
        _xgb_models = None
        _xgb_feature_cols = None
        _models_available = False
        return False
    except Exception as e:
        print(f"[XGB] Model load failed ({e}) — using ridge fallback")
        _xgb_models = None
        _xgb_feature_cols = None
        _models_available = False
        return False

    print("[XGB] Models loaded successfully")
    _models_available = True
    return True


# ── AQI conversion ────────────────────────────────────────────────────────────
AQI_BREAKPOINTS = [
    (0.0,   12.0,  0,   50),
    (12.1,  35.4,  51,  100),
    (35.5,  55.4,  101, 150),
    (55.5,  150.4, 151, 200),
    (150.5, 250.4, 201, 300),
    (250.5, 500.4, 301, 500),
]

def pm25_to_aqi(pm25: float) -> float:
    pm25 = max(0.0, float(pm25))
    for pm_lo, pm_hi, aqi_lo, aqi_hi in AQI_BREAKPOINTS:
        if pm_lo <= pm25 <= pm_hi:
            return ((aqi_hi - aqi_lo) / (pm_hi - pm_lo)) * (pm25 - pm_lo) + aqi_lo
    return 500.0

def get_aqi_status(aqi: float) -> str:
    if aqi <= 50:   return "good"
    if aqi <= 100:  return "moderate"
    if aqi <= 200:  return "unhealthy"
    if aqi <= 300:  return "very_unhealthy"
    return "hazardous"

def get_model_quality(mae: float) -> str:
    if mae <= 14: return "high"
    if mae <= 24: return "medium"
    return "low"


# ── Feature builder (mirrors train_xgboost.py lag logic) ──────────────────────
BASE_SENSOR_COLS = ["pm2_5", "pm10", "co", "no2",
                    "temp_c", "pressure_mb", "windspeed_kph"]
LAG_HOURS = list(range(1, 25)) + list(range(27, 49, 3)) + list(range(54, 73, 6))

# 2025 event calendar — same as utils.py
_DIWALI_WEIGHTS = {(10,18):0.4,(10,19):0.6,(10,20):1.0,
                   (10,21):0.7,(10,22):0.3,(10,23):0.2}
_DUST_STORM_DAYS = {(3,4),(4,10),(4,11),(4,12),(5,14),(5,15),(6,9),(6,10)}

def _event_flags(dt: datetime) -> dict:
    """Return event flag values for a single datetime."""
    m, d = dt.month, dt.day

    diwali = _DIWALI_WEIGHTS.get((m, d), 0.0)

    dust = 0.0
    if (m, d) in _DUST_STORM_DAYS:
        dust = 1.0
    elif (m, d-1) in _DUST_STORM_DAYS and d > 1:
        dust = 0.5

    crop = 0.0
    if m == 10:
        crop = min(d / 20.0, 1.0)
    elif m == 11:
        crop = 1.0 if d <= 15 else max(0, 1.0 - (d-15)/15.0)

    new_year = 0.7 if (m==12 and d==31) else (0.5 if (m==1 and d==1) else 0.0)
    winter   = 1.0 if m in (11, 12, 1, 2) else 0.0

    return {
        "is_diwali": diwali,
        "is_dust_storm": dust,
        "is_crop_burning": crop,
        "is_new_year": new_year,
        "is_winter_inversion": winter,
    }


def _build_inference_row(history_df: pd.DataFrame) -> dict | None:
    """
    Build one flat feature row from the last 72+ hours of sensor history.
    history_df must be sorted ascending by datetime with columns matching
    BASE_SENSOR_COLS + datetime column.

    Returns None if insufficient history.
    """
    if len(history_df) < 73:
        return None

    row = {}
    latest = history_df.iloc[-1]
    dt     = latest.get("datetime_ist") or latest.get("datetime")
    if dt is None:
        return None

    # Cyclic time features
    hour  = dt.hour
    dow   = dt.dayofweek
    month = dt.month
    row["hour_sin"]  = np.sin(2 * np.pi * hour  / 24)
    row["hour_cos"]  = np.cos(2 * np.pi * hour  / 24)
    row["dow_sin"]   = np.sin(2 * np.pi * dow   / 7)
    row["dow_cos"]   = np.cos(2 * np.pi * dow   / 7)
    row["month_sin"] = np.sin(2 * np.pi * month / 12)
    row["month_cos"] = np.cos(2 * np.pi * month / 12)

    # Event flags
    row.update(_event_flags(dt))

    # Lag features
    values = history_df[BASE_SENSOR_COLS].values  # shape (n, 7)
    for feat_idx, feat in enumerate(BASE_SENSOR_COLS):
        for lag in LAG_HOURS:
            idx = -lag - 1
            if abs(idx) <= len(values):
                row[f"{feat}_lag{lag}h"] = float(values[idx, feat_idx])
            else:
                row[f"{feat}_lag{lag}h"] = float(values[0, feat_idx])

    # Rolling stats on PM2.5
    pm25_series = history_df["pm2_5"].values
    for window in [3, 6, 12, 24]:
        tail = pm25_series[-(window+1):-1]
        row[f"pm25_rollmean_{window}h"] = float(np.mean(tail)) if len(tail) > 0 else float(pm25_series[-2])
        row[f"pm25_rollstd_{window}h"]  = float(np.std(tail))  if len(tail) > 1 else 0.0

    # Rate of change
    row["pm25_delta_1h"] = float(pm25_series[-2] - pm25_series[-3]) if len(pm25_series) >= 3 else 0.0
    row["pm25_delta_3h"] = float(pm25_series[-2] - pm25_series[-5]) if len(pm25_series) >= 5 else 0.0
    row["pm25_delta_6h"] = float(pm25_series[-2] - pm25_series[-8]) if len(pm25_series) >= 8 else 0.0

    # Dust ratio
    last_pm10 = float(history_df["pm10"].iloc[-2])
    last_pm25 = float(history_df["pm2_5"].iloc[-2])
    row["pm10_pm25_ratio"] = min(float(last_pm10 / (last_pm25 + 1e-6)), 20.0)

    return row


def predict_aqi_forecast(city_hourly: pd.DataFrame) -> dict | None:
    """
    Drop-in replacement for build_aqi_forecast_payload().
    Returns same dict shape, or None if models unavailable / insufficient data.

    city_hourly must have columns:
        datetime_ist, pm2_5, pm10, co, no2, temp_c, pressure_mb, windspeed_kph, aqi_index
    """
    if not _load_models():
        return None

    if city_hourly is None or len(city_hourly) < 73:
        return None

    df = city_hourly.sort_values("datetime_ist").copy()

    # Clip outliers (same as training)
    df["pm10"] = df["pm10"].clip(upper=600)
    df["co"]   = df["co"].clip(upper=5000)

    inference_row = _build_inference_row(df)
    if inference_row is None:
        return None

    latest_observed_at = df["datetime_ist"].iloc[-1]
    latest_aqi         = float(df["aqi_index"].iloc[-1])

    # Align to feature column order expected by models
    X = pd.DataFrame([inference_row])[_xgb_feature_cols]

    forecast_points = []
    mae_values      = []

    for h in HORIZONS:
        try:
            pred_pm25 = float(np.clip(_xgb_models[h].predict(X)[0], 0, 500))
            pred_aqi  = float(np.clip(pm25_to_aqi(pred_pm25), 0, 500))

            # XGBoost doesn't produce native confidence intervals
            # Use ±15% of prediction as a reasonable uncertainty band
            interval  = max(10.0, pred_aqi * 0.15)
            lower_aqi = float(np.clip(pred_aqi - interval, 0, 500))
            upper_aqi = float(np.clip(pred_aqi + interval, 0, 500))

            # Best-iteration MAE from training (stored in model)
            best_score = getattr(_xgb_models[h], "best_score", None)
            mae = float(best_score) if best_score else 28.0
            mae_values.append(mae)

            forecast_dt = latest_observed_at + timedelta(hours=h)
            forecast_points.append({
                "horizonHours":  int(h),
                "forecastAt":    forecast_dt.isoformat(),
                "predictedAqi":  int(round(pred_aqi)),
                "lowerAqi":      int(round(lower_aqi)),
                "upperAqi":      int(round(upper_aqi)),
                "status":        get_aqi_status(pred_aqi),
                "mae":           round(mae, 2),
            })
        except Exception as e:
            print(f"[XGB] Inference error at +{h}h: {e}")
            continue

    if not forecast_points:
        return None

    predicted_values = [p["predictedAqi"] for p in forecast_points]
    if predicted_values[-1] - predicted_values[0] > 8:
        trend = "rising"
    elif predicted_values[0] - predicted_values[-1] > 8:
        trend = "falling"
    else:
        trend = "stable"

    mean_mae = float(np.mean(mae_values)) if mae_values else None

    return {
        "generatedAt":        datetime.now().isoformat(),
        "latestObservedAt":   latest_observed_at.isoformat(),
        "model": {
            "type":    "xgboost",
            "quality": get_model_quality(mean_mae or 999),
            "meanMae": round(mean_mae, 2) if mean_mae else None,
        },
        "points":         forecast_points,
        "trendDirection": trend,
    }