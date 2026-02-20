from datetime import datetime
import numpy as np


WEATHER_DRIVER_CODES = {
    "wind speed": 0,
    "humidity": 1,
    "temp inversion proxy": 2,
}

PLAYBOOK_ACTIONS = {
    "Emergency Containment": [
        "Activate 48-hour ward emergency response with inter-department control room.",
        "Restrict heavy-duty vehicle entry during peak exposure windows.",
        "Run continuous dust suppression and public health advisories for vulnerable groups.",
    ],
    "Traffic Suppression": [
        "Deploy corridor-specific no-idling and congestion diversion enforcement.",
        "Increase bus and metro frequency on high-load commuter corridors.",
        "Launch targeted PUC and emissions compliance checkpoints.",
    ],
    "Industrial Compliance": [
        "Run immediate inspections for high-emission units in and around the ward.",
        "Apply temporary curbs on non-compliant industrial operations.",
        "Increase stack monitoring and on-ground particulate controls.",
    ],
    "Mixed Local Mitigation": [
        "Coordinate traffic, dust, and waste-burning enforcement in one operational window.",
        "Increase ward-level monitoring frequency and hotspot patrolling.",
        "Issue focused advisories and local response checklists to ward offices.",
    ],
    "Stabilization and Monitoring": [
        "Maintain current controls and monitor for reversal in forecast trend.",
        "Prioritize preventive checks in micro-hotspots with recurring spikes.",
        "Use targeted communication for schools, elderly, and respiratory risk groups.",
    ],
}


def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def normalize_source_split(vehicular_raw, industrial_raw):
    vehicular = max(0.0, safe_float(vehicular_raw, 0.0))
    industrial = max(0.0, safe_float(industrial_raw, 0.0))
    total = vehicular + industrial

    if total <= 0:
        return (0.0, 0.0, 100.0)
    if total > 100:
        scale = 100.0 / total
        vehicular *= scale
        industrial *= scale
    other = max(0.0, 100.0 - vehicular - industrial)
    return (vehicular, industrial, other)


def dominant_source_label(vehicular, industrial):
    gap = abs(vehicular - industrial)
    if gap < 8:
        return "Mixed"
    return "Traffic" if vehicular > industrial else "Industrial"


def get_weather_code(driver_name):
    key = str(driver_name or "").strip().lower()
    return WEATHER_DRIVER_CODES.get(key, 3)


def get_forecast_point(points, horizon_hours):
    for point in points or []:
        if int(point.get("horizonHours", -1)) == int(horizon_hours):
            return point
    return None


def kmeans_fit(X, clusters=4, max_iter=48, seed=42):
    if X.size == 0:
        return np.array([], dtype=int), np.zeros((0, 0))

    n_rows = X.shape[0]
    k = max(1, min(int(clusters), n_rows))
    rng = np.random.default_rng(seed)
    indices = rng.choice(n_rows, size=k, replace=False)
    centroids = X[indices].copy()
    labels = np.zeros(n_rows, dtype=int)

    for iteration in range(max_iter):
        distances = ((X[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2)
        next_labels = np.argmin(distances, axis=1)
        if iteration > 0 and np.array_equal(next_labels, labels):
            break
        labels = next_labels

        for cluster_id in range(k):
            mask = labels == cluster_id
            if np.any(mask):
                centroids[cluster_id] = X[mask].mean(axis=0)
            else:
                centroids[cluster_id] = X[rng.integers(0, n_rows)]

    return labels, centroids


def choose_playbook(cluster_rows):
    mean_aqi = float(np.mean([row["aqi"] for row in cluster_rows]))
    mean_delta24 = float(np.mean([row["delta24"] for row in cluster_rows]))
    mean_delta72 = float(np.mean([row["delta72"] for row in cluster_rows]))
    mean_veh = float(np.mean([row["vehicularPct"] for row in cluster_rows]))
    mean_ind = float(np.mean([row["industrialPct"] for row in cluster_rows]))

    if mean_aqi >= 280 or mean_delta24 >= 18:
        return "Emergency Containment"
    if mean_delta72 <= -18 and mean_aqi < 230:
        return "Stabilization and Monitoring"
    if (mean_ind - mean_veh) >= 10 and mean_aqi >= 140:
        return "Industrial Compliance"
    if (mean_veh - mean_ind) >= 10 and mean_aqi >= 140 and mean_delta24 > -20:
        return "Traffic Suppression"
    return "Mixed Local Mitigation"


def get_priority_score(row):
    aqi_score = min(100.0, max(0.0, (row["aqi"] / 500.0) * 100.0))
    forecast_score = min(
        100.0,
        max(0.0, row["delta24"]) * 1.9 + max(0.0, row["delta72"]) * 1.2,
    )
    impact_score = min(100.0, max(0.0, row["impactIndex"]) * 0.9)
    source_pressure = max(row["vehicularPct"], row["industrialPct"])

    quality = str(row.get("modelQuality", "unavailable"))
    confidence_lookup = {"high": 85.0, "medium": 65.0, "low": 45.0}
    confidence = confidence_lookup.get(quality, 40.0)

    score = (
        0.38 * aqi_score
        + 0.26 * forecast_score
        + 0.18 * impact_score
        + 0.12 * source_pressure
        + 0.06 * confidence
    )
    return int(round(np.clip(score, 0.0, 100.0)))


def get_urgency(priority_score):
    if priority_score >= 78:
        return "critical"
    if priority_score >= 58:
        return "high"
    if priority_score >= 40:
        return "moderate"
    return "watch"


def augment_actions(playbook_name, row):
    actions = list(PLAYBOOK_ACTIONS.get(playbook_name, PLAYBOOK_ACTIONS["Mixed Local Mitigation"]))

    weather_driver = str(row.get("weatherDriver", "")).lower()
    if "humidity" in weather_driver:
        actions.append("Increase morning and evening road vacuuming to reduce moisture-bound particulates.")
    elif "wind" in weather_driver:
        actions.append("Time enforcement windows to low-dispersion periods where AQI rebound risk is higher.")
    elif "inversion" in weather_driver:
        actions.append("Prioritize late-night and early-morning controls when inversion buildup is expected.")

    return actions[:4]


def merge_analytics_rows(ward_rows, weather_rows, forecast_rows):
    weather_lookup = {
        str(item.get("ward", "")).strip().lower(): item
        for item in (weather_rows or [])
    }
    forecast_lookup = {
        str(item.get("ward", "")).strip().lower(): item
        for item in (forecast_rows or [])
    }

    merged = []
    for ward in ward_rows or []:
        ward_name = str(ward.get("name", "")).strip()
        if not ward_name:
            continue
        key = ward_name.lower()

        weather = weather_lookup.get(key, {})
        forecast = forecast_lookup.get(key, {})
        points = forecast.get("points", [])
        point24 = get_forecast_point(points, 24)
        point72 = get_forecast_point(points, 72)

        vehicular, industrial, other = normalize_source_split(
            ward.get("vehicular_pct"),
            ward.get("industrial_pct"),
        )

        current_aqi = safe_float(ward.get("avg_AQI"), safe_float(forecast.get("currentAqi"), 0.0))
        forecast24 = safe_float(
            (point24 or {}).get("predictedAqi"),
            current_aqi + safe_float(forecast.get("delta24"), 0.0),
        )
        forecast72 = safe_float(
            (point72 or {}).get("predictedAqi"),
            current_aqi + safe_float(forecast.get("delta72"), 0.0),
        )
        delta24 = safe_float(forecast.get("delta24"), forecast24 - current_aqi)
        delta72 = safe_float(forecast.get("delta72"), forecast72 - current_aqi)

        correlation = safe_float(weather.get("correlation"), 0.0)
        impact_index = safe_float(weather.get("impactIndex"), abs(correlation) * current_aqi)

        merged.append({
            "ward": ward_name,
            "location": ward.get("location", ""),
            "aqi": current_aqi,
            "forecast24": forecast24,
            "forecast72": forecast72,
            "delta24": delta24,
            "delta72": delta72,
            "vehicularPct": vehicular,
            "industrialPct": industrial,
            "otherPct": other,
            "dominantSource": dominant_source_label(vehicular, industrial),
            "weatherDriver": weather.get("topDriver", "Unknown"),
            "weatherCorrelation": correlation,
            "impactIndex": impact_index,
            "modelQuality": forecast.get("modelQuality", "unavailable"),
            "trendDirection": forecast.get("trendDirection", "stable"),
            "weatherCode": get_weather_code(weather.get("topDriver")),
            "dataQuality": {
                "forecast": forecast.get("dataQuality", "unknown"),
                "weather": weather.get("dataQuality", "unknown"),
            },
        })

    return merged


def generate_policy_recommendations(
    ward_rows,
    weather_rows,
    forecast_rows,
    cluster_count=4,
):
    merged_rows = merge_analytics_rows(ward_rows, weather_rows, forecast_rows)
    if not merged_rows:
        return {
            "model": {
                "type": "kmeans_policy_segmentation",
                "clusters": 0,
                "trainingRows": 0,
                "featureCount": 0,
                "generatedAt": datetime.now().isoformat(),
            },
            "cityPlaybookSummary": [],
            "clusterProfiles": [],
            "topImmediateActions": [],
            "wardRecommendations": [],
        }

    feature_rows = []
    for row in merged_rows:
        weather_code = int(row["weatherCode"])
        weather_one_hot = [0.0, 0.0, 0.0, 0.0]
        weather_one_hot[min(max(weather_code, 0), 3)] = 1.0

        feature_rows.append([
            row["aqi"],
            row["delta24"],
            row["delta72"],
            row["vehicularPct"],
            row["industrialPct"],
            row["impactIndex"],
            abs(row["weatherCorrelation"]),
            *weather_one_hot,
        ])

    X = np.asarray(feature_rows, dtype=float)
    feature_means = X.mean(axis=0)
    feature_stds = X.std(axis=0)
    feature_stds[feature_stds < 1e-6] = 1.0
    X_scaled = (X - feature_means) / feature_stds

    labels, centroids = kmeans_fit(X_scaled, clusters=cluster_count)
    cluster_count_final = len(np.unique(labels))

    for idx, row in enumerate(merged_rows):
        row["clusterId"] = int(labels[idx])

    cluster_to_playbook = {}
    cluster_profiles = []
    for cluster_id in sorted(set(int(label) for label in labels)):
        members = [row for row in merged_rows if int(row["clusterId"]) == cluster_id]
        playbook = choose_playbook(members)
        cluster_to_playbook[cluster_id] = playbook

        cluster_profiles.append({
            "clusterId": int(cluster_id),
            "playbook": playbook,
            "wardCount": len(members),
            "avgAqi": round(float(np.mean([row["aqi"] for row in members])), 2),
            "avgDelta24": round(float(np.mean([row["delta24"] for row in members])), 2),
            "avgDelta72": round(float(np.mean([row["delta72"] for row in members])), 2),
            "avgVehicularPct": round(float(np.mean([row["vehicularPct"] for row in members])), 2),
            "avgIndustrialPct": round(float(np.mean([row["industrialPct"] for row in members])), 2),
        })

    recommendations = []
    for row in merged_rows:
        playbook = cluster_to_playbook[int(row["clusterId"])]
        priority = get_priority_score(row)
        urgency = get_urgency(priority)
        actions = augment_actions(playbook, row)

        recommendations.append({
            "ward": row["ward"],
            "location": row["location"],
            "aqi": int(round(row["aqi"])),
            "forecast24": int(round(row["forecast24"])),
            "forecast72": int(round(row["forecast72"])),
            "delta24": int(round(row["delta24"])),
            "delta72": int(round(row["delta72"])),
            "dominantSource": row["dominantSource"],
            "weatherDriver": row["weatherDriver"],
            "weatherCorrelation": round(float(row["weatherCorrelation"]), 3),
            "impactIndex": int(round(row["impactIndex"])),
            "trendDirection": row["trendDirection"],
            "modelQuality": row["modelQuality"],
            "clusterId": int(row["clusterId"]),
            "playbook": playbook,
            "priorityScore": int(priority),
            "urgency": urgency,
            "recommendedActions": actions,
            "dataQuality": row["dataQuality"],
        })

    recommendations.sort(key=lambda item: item["priorityScore"], reverse=True)

    playbook_groups = {}
    for item in recommendations:
        bucket = playbook_groups.setdefault(item["playbook"], [])
        bucket.append(item)

    city_summary = []
    for playbook_name, items in sorted(
        playbook_groups.items(),
        key=lambda pair: np.mean([row["priorityScore"] for row in pair[1]]),
        reverse=True,
    ):
        city_summary.append({
            "playbook": playbook_name,
            "wards": len(items),
            "avgPriority": round(float(np.mean([row["priorityScore"] for row in items])), 2),
            "topWard": items[0]["ward"],
        })

    top_immediate = []
    for row in recommendations[:20]:
        top_immediate.append({
            "ward": row["ward"],
            "playbook": row["playbook"],
            "priorityScore": row["priorityScore"],
            "urgency": row["urgency"],
            "primaryAction": row["recommendedActions"][0] if row["recommendedActions"] else "",
        })

    return {
        "model": {
            "type": "kmeans_policy_segmentation",
            "clusters": int(cluster_count_final),
            "trainingRows": int(len(merged_rows)),
            "featureCount": int(X.shape[1]),
            "generatedAt": datetime.now().isoformat(),
            "normalization": {
                "mean": [round(float(x), 5) for x in feature_means.tolist()],
                "std": [round(float(x), 5) for x in feature_stds.tolist()],
            },
            "centroids": [
                [round(float(value), 5) for value in centroid.tolist()]
                for centroid in centroids
            ],
        },
        "cityPlaybookSummary": city_summary,
        "clusterProfiles": cluster_profiles,
        "topImmediateActions": top_immediate,
        "wardRecommendations": recommendations,
    }
