from datetime import datetime
import numpy as np


PRICING_PAYLOAD = {
    "currency": "INR",
    "monthlyRange": {"min": 99, "max": 199},
    "plans": [
        {
            "id": "free",
            "name": "Public Free",
            "priceMonthly": 0,
            "features": [
                "Ward-level AQI dashboard",
                "City and ward in-app alerts",
                "General health advisories",
                "Pollution hotspot map view",
            ],
        },
        {
            "id": "premium",
            "name": "Consumer Premium",
            "priceMonthly": 149,
            "features": [
                "SMS alerts during severe AQI",
                "Personalized family health suggestions",
                "Low-pollution route suggestions",
                "Ward-level AQI forecast (24-72 hrs)",
            ],
        },
    ],
}


def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def safe_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return int(default)


def normalize_text(value):
    return "".join(ch for ch in str(value or "").lower() if ch.isalnum())


def sigmoid(value):
    return 1.0 / (1.0 + np.exp(-value))


def get_aqi_band(aqi):
    value = safe_float(aqi, 0.0)
    if value > 300:
        return "Hazardous"
    if value > 200:
        return "Very Unhealthy"
    if value > 100:
        return "Unhealthy"
    if value > 50:
        return "Moderate"
    return "Good"


def match_ward(profile_ward, ward_rows):
    if not ward_rows:
        return None

    query = normalize_text(profile_ward)
    if not query:
        return ward_rows[0]

    direct = None
    partial = None
    for row in ward_rows:
        name = str(row.get("name", ""))
        norm_name = normalize_text(name)
        if query == norm_name:
            direct = row
            break
        if query in norm_name and partial is None:
            partial = row

    if direct:
        return direct
    if partial:
        return partial

    return min(
        ward_rows,
        key=lambda row: abs(len(normalize_text(row.get("name", ""))) - len(query)),
    )


def get_forecast_point(points, horizon_hours):
    for point in points or []:
        if int(point.get("horizonHours", -1)) == int(horizon_hours):
            return point
    return None


def build_feature_vector(ward_row, forecast_row, profile, city_weather):
    aqi = safe_float(ward_row.get("avg_AQI"), 0.0)
    pm25 = safe_float(ward_row.get("pm2_5"), 0.0)
    pm10 = safe_float(ward_row.get("pm10"), 0.0)

    forecast24 = get_forecast_point(forecast_row.get("points", []), 24) if forecast_row else None
    delta24 = safe_float((forecast24 or {}).get("predictedAqi"), aqi) - aqi

    humidity_corr = 0.0
    inversion_corr = 0.0
    for factor in city_weather.get("factors", []):
        factor_id = str(factor.get("id", ""))
        corr = safe_float(factor.get("correlation"), 0.0)
        if factor_id == "humidity":
            humidity_corr = corr
        elif factor_id == "temp_inversion":
            inversion_corr = corr

    family_members = max(1, safe_int(profile.get("family_members"), 1))
    elderly = 1.0 if profile.get("elderly") else 0.0
    children = 1.0 if profile.get("children") else 0.0
    respiratory = 1.0 if profile.get("respiratory_issues") else 0.0
    travel_minutes = max(0.0, safe_float(profile.get("daily_travel_minutes"), 60))

    features = {
        "aqi_norm": np.clip(aqi / 500.0, 0.0, 1.0),
        "pm25_norm": np.clip(pm25 / 250.0, 0.0, 1.0),
        "pm10_norm": np.clip(pm10 / 350.0, 0.0, 1.0),
        "forecast_delta_norm": np.clip(max(0.0, delta24) / 180.0, 0.0, 1.0),
        "family_norm": np.clip(family_members / 8.0, 0.0, 1.0),
        "travel_norm": np.clip(travel_minutes / 180.0, 0.0, 1.0),
        "elderly": elderly,
        "children": children,
        "respiratory": respiratory,
        "humidity_corr_norm": np.clip(abs(humidity_corr), 0.0, 1.0),
        "inversion_corr_norm": np.clip(abs(inversion_corr), 0.0, 1.0),
        "delta24_raw": delta24,
        "aqi_raw": aqi,
        "pm25_raw": pm25,
        "pm10_raw": pm10,
    }
    return features


def compute_risk_score(features):
    coefficients = {
        "aqi_norm": 2.25,
        "pm25_norm": 1.7,
        "pm10_norm": 0.6,
        "forecast_delta_norm": 1.35,
        "family_norm": 0.45,
        "travel_norm": 0.9,
        "elderly": 0.85,
        "children": 0.72,
        "respiratory": 1.05,
        "humidity_corr_norm": 0.4,
        "inversion_corr_norm": 0.35,
    }
    intercept = -2.05
    linear = intercept
    contributions = {}
    for key, weight in coefficients.items():
        value = safe_float(features.get(key), 0.0)
        part = weight * value
        contributions[key] = part
        linear += part

    probability = float(sigmoid(linear))
    score = int(round(np.clip(probability, 0.0, 1.0) * 100))
    if score >= 72:
        level = "High"
    elif score >= 42:
        level = "Medium"
    else:
        level = "Low"

    ranked = sorted(
        contributions.items(),
        key=lambda item: abs(item[1]),
        reverse=True,
    )[:4]
    reason_map = {
        "aqi_norm": "High ward AQI level",
        "pm25_norm": "Elevated PM2.5 exposure",
        "pm10_norm": "Elevated PM10 exposure",
        "forecast_delta_norm": "Forecast indicates AQI worsening",
        "family_norm": "Higher family exposure footprint",
        "travel_norm": "Long daily outdoor travel duration",
        "elderly": "Elderly member present in household",
        "children": "Children present in household",
        "respiratory": "Respiratory vulnerability profile",
        "humidity_corr_norm": "Humidity-linked AQI sensitivity",
        "inversion_corr_norm": "Inversion-linked AQI sensitivity",
    }
    reasons = [reason_map.get(key, key) for key, _ in ranked]

    return {
        "score": score,
        "level": level,
        "probability": round(probability, 4),
        "drivers": reasons,
    }


def generate_health_advisories(risk, features, profile):
    level = str(risk.get("level", "Low"))
    advisories = []

    if level == "High":
        advisories.extend([
            "Avoid prolonged outdoor activity and use high-filtration masks when outside.",
            "Prefer indoor air filtration between 6:00-11:00 AM and 6:00-10:00 PM.",
            "Reduce non-essential travel when AQI rises above 220.",
        ])
    elif level == "Medium":
        advisories.extend([
            "Limit exposure during peak traffic windows and keep hydration high.",
            "Use mask protection for commutes longer than 30 minutes.",
            "Monitor daily AQI and adjust outdoor plans accordingly.",
        ])
    else:
        advisories.extend([
            "Maintain routine precautions and track AQI trend shifts.",
            "Prefer low-traffic streets for daily commute where possible.",
        ])

    if profile.get("children"):
        advisories.append("Shift children's outdoor play to lower-exposure windows (late afternoon).")
    if profile.get("elderly"):
        advisories.append("Schedule elderly medication and walks outside severe AQI windows.")
    if profile.get("respiratory_issues"):
        advisories.append("Keep inhalers and prescribed respiratory support accessible during commute.")

    if safe_float(features.get("delta24_raw"), 0.0) > 15:
        advisories.append("AQI is forecast to worsen in 24h; pre-plan indoor alternatives today.")

    return advisories[:6]


def build_route_suggestions(ward_row, station_rows, risk):
    ward_aqi = safe_float(ward_row.get("avg_AQI"), 0.0)
    ward_distance = max(0.0, safe_float(ward_row.get("distance_km"), 3.0))
    risk_level = str(risk.get("level", "Low"))

    if not station_rows:
        return [{
            "routeName": "Local Micro-Route",
            "routeType": "cleanest",
            "estimatedMinutes": int(max(12, round(ward_distance * 9))),
            "aqiExposureScore": int(round(ward_aqi)),
            "travelWindow": "11:00-16:00" if risk_level == "High" else "09:30-18:00",
            "reason": "Use local low-traffic roads and avoid major intersections.",
        }]

    station_rows = sorted(
        station_rows,
        key=lambda row: safe_float(row.get("aqi_index"), 0.0),
    )[:3]

    option_labels = [
        ("Cleanest Corridor", "cleanest"),
        ("Balanced Commute", "balanced"),
        ("Fast Practical Route", "fastest"),
    ]
    suggestions = []
    for idx, station in enumerate(station_rows):
        station_name = str(station.get("location", f"Station {idx + 1}"))
        station_aqi = safe_float(station.get("aqi_index"), ward_aqi)
        name_offset = (sum(ord(ch) for ch in station_name) % 11) - 5
        eta = int(np.clip((ward_distance * 8.5) + (idx * 4) + 16 + name_offset, 10, 80))
        exposure = int(round(np.clip((0.64 * station_aqi) + (0.36 * ward_aqi) + (eta * 0.11), 0, 500)))

        if risk_level == "High":
            window = "12:00-16:00"
        elif risk_level == "Medium":
            window = "11:00-17:00"
        else:
            window = "09:00-18:00"

        label, route_type = option_labels[min(idx, len(option_labels) - 1)]
        suggestions.append({
            "routeName": f"{label} via {station_name}",
            "routeType": route_type,
            "estimatedMinutes": eta,
            "aqiExposureScore": exposure,
            "travelWindow": window,
            "reason": f"Uses lower AQI station corridor around {station_name} to reduce exposure.",
        })

    return suggestions


def build_personalized_consumer_insight(
    profile,
    ward_rows,
    ward_forecast_rows,
    station_snapshot_rows,
    city_weather_payload,
):
    ward_rows = ward_rows or []
    ward_forecast_rows = ward_forecast_rows or []
    station_snapshot_rows = station_snapshot_rows or []

    matched_ward = match_ward(profile.get("ward"), ward_rows)
    if not matched_ward:
        return {
            "generatedAt": datetime.now().isoformat(),
            "error": "No ward data available for personalization.",
            "pricing": PRICING_PAYLOAD,
        }

    ward_name_key = normalize_text(matched_ward.get("name"))
    forecast_row = None
    for item in ward_forecast_rows:
        if normalize_text(item.get("ward")) == ward_name_key:
            forecast_row = item
            break

    features = build_feature_vector(
        matched_ward,
        forecast_row or {},
        profile,
        city_weather_payload or {},
    )
    risk = compute_risk_score(features)
    advisories = generate_health_advisories(risk, features, profile)
    routes = build_route_suggestions(matched_ward, station_snapshot_rows, risk)

    forecast24 = get_forecast_point((forecast_row or {}).get("points", []), 24)
    forecast48 = get_forecast_point((forecast_row or {}).get("points", []), 48)
    forecast72 = get_forecast_point((forecast_row or {}).get("points", []), 72)

    premium = bool(profile.get("premium"))
    recommendations = [
        "Stay indoors during severe spikes and use indoor filtration where possible.",
        "Check ward AQI before long commutes and avoid high-traffic segments.",
    ]
    if premium:
        recommendations.extend([
            "Enable severe AQI SMS alerts for family-level monitoring.",
            "Follow cleanest-route recommendations for daily commute planning.",
            "Use 24-72h ward forecast to plan outdoor and school timings.",
        ])

    return {
        "generatedAt": datetime.now().isoformat(),
        "profile": {
            "wardRequested": profile.get("ward", ""),
            "wardMatched": matched_ward.get("name", ""),
            "familyMembers": max(1, safe_int(profile.get("family_members"), 1)),
            "elderly": bool(profile.get("elderly")),
            "children": bool(profile.get("children")),
            "respiratoryIssues": bool(profile.get("respiratory_issues")),
            "dailyTravelMinutes": max(0, safe_int(profile.get("daily_travel_minutes"), 60)),
            "premium": premium,
        },
        "wardSnapshot": {
            "aqi": int(round(safe_float(matched_ward.get("avg_AQI"), 0.0))),
            "band": get_aqi_band(matched_ward.get("avg_AQI")),
            "pm2_5": round(safe_float(matched_ward.get("pm2_5"), 0.0), 2),
            "pm10": round(safe_float(matched_ward.get("pm10"), 0.0), 2),
            "vehicularPct": int(round(safe_float(matched_ward.get("vehicular_pct"), 0.0))),
            "industrialPct": int(round(safe_float(matched_ward.get("industrial_pct"), 0.0))),
            "distanceKm": round(safe_float(matched_ward.get("distance_km"), 0.0), 2),
            "locationCluster": matched_ward.get("location", ""),
        },
        "forecast": {
            "point24h": forecast24,
            "point48h": forecast48,
            "point72h": forecast72,
        },
        "risk": risk,
        "healthAdvisories": advisories,
        "routeSuggestions": routes,
        "recommendations": recommendations[:5],
        "pricing": PRICING_PAYLOAD,
    }

