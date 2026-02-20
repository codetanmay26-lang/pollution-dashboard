# Delhi Ward Pollution Monitor (DWLP)

Dual-portal Delhi air pollution intelligence platform with one shared engine:

- Government command suite for ward operations and policy support
- Consumer app for personalized health and commute guidance

## What this project does

- Tracks ward-level AQI and pollutant metrics across Delhi.
- Renders real ward boundaries on an interactive map (KML/GeoJSON).
- Provides weather impact correlation and 24-72 hour AQI forecasting.
- Generates ML-driven government action recommendations in a dedicated solutions engine.
- Generates profile-based consumer risk scoring and low-pollution route suggestions.

## Current pages

- `/` Product portal selector (Government vs Consumer)
- `/government` Government product landing
- `/dashboard` Command dashboard (home-style theme, streamlined view)
- `/wards` All wards in compact list/table view
- `/wards/:wardName` Ward detail view
- `/map` Real ward polygon map
- `/weather-correlation` Weather impact analytics
- `/predictive-aqi` Forecast analytics (24/48/72h)
- `/solutions` Policy solutions engine
- `/consumer` Consumer dashboard (public + personalized modules)
- `/consumer/onboarding` Consumer profile setup

## Tech stack

- Frontend: React 19, Vite 7, React Router 7, anime.js
- Backend: FastAPI, Uvicorn, Pandas, NumPy
- Geospatial: custom KML/GeoJSON parsing and spatial matching
- Data: CSV files under `Backend/data`

## Project structure

```text
DWLP/
  src/
    pages/
      Home/
      PortalSelect/
      Dashboard/
      MapView/
      WardDetails/
      WeatherCorrelation/
      PredictiveAQI/
      Solutions/
      ConsumerDashboard/
      ConsumerOnboarding/
  Backend/
    main.py
    policy_model.py
    consumer_model.py
    requirements.txt
    data/
      aqi.csv
      ward_level_aqi_complete.csv
      delhi_wards.kml
      delhi_wards.geojson
      Final Dataset.csv
      final_dataset_complete.csv
```

## Data and analytics flow

1. `Backend/data/aqi.csv` is the primary AQI + weather time-series source.
2. `Backend/main.py` builds station and city hourly snapshots.
3. `ward_level_aqi_complete.csv` is enriched with AQI/pollutant metrics for ward outputs.
4. Weather correlation and forecast analytics are computed per city/station/ward.
5. `Backend/policy_model.py` consumes:
   - ward AQI/source profile
   - weather impact outputs
   - predictive outputs  
   and returns ward-wise intervention recommendations.
6. `Backend/consumer_model.py` consumes:
   - ward AQI + PM levels
   - weather correlation outputs
   - 24/48/72h forecast points
   - user family/travel profile
   and returns personalized risk, advisories, and cleaner route suggestions.

## API endpoints

### `GET /api/dashboard`

Returns core dashboard payload:

- `alerts`
- `kpis`
- `trendData`
- `wardRisks`
- `citySummary`
- `weatherCorrelation` (city-level summary)
- `aqiForecast` (city-level 24/48/72h summary)

### `GET /api/wards`

Returns:

- `wards`: enriched ward/locality rows
- `count`

### `GET /api/map/wards`

Returns GeoJSON `FeatureCollection`:

- ward geometry + pollution properties
- `metadata` with matching quality:
  - `observedNameMatchWards`
  - `observedSpatialWards`
  - `estimatedWards`
  - `noDataWards`
  - `unmatchedAqiRows`

### `GET /api/analytics/weather-correlation`

Returns:

- `city`
- `stations`
- `wards`
- `topImpactedWards`
- `metadata`

### `GET /api/analytics/predictive-aqi`

Returns:

- `city`
- `stations`
- `wards`
- `topRisk24h`
- `topRisk72h`
- `topImprovers72h`
- `metadata`

### `GET /api/analytics/solutions`

Returns ML recommendation output from `Backend/policy_model.py`:

- `model` (type, clusters, training rows, features, centroids)
- `cityPlaybookSummary`
- `clusterProfiles`
- `topImmediateActions`
- `wardRecommendations`
- `metadata`

### `GET /api/consumer/overview`

Returns consumer app baseline payload:

- `city` (AQI, band, status, active alerts)
- `alerts`
- `hotspots`
- `wardTable`
- `weatherCorrelation`
- `forecast`
- `generalAdvisories`
- `pricing`
- `metadata`

### `POST /api/consumer/insights`

Input profile:

- `ward`
- `family_members`
- `elderly`
- `children`
- `respiratory_issues`
- `daily_travel_minutes`
- `premium`

Returns personalized payload from `Backend/consumer_model.py`:

- `profile` (matched ward + household profile)
- `wardSnapshot`
- `forecast` (24/48/72h points)
- `risk` (score/level/drivers)
- `healthAdvisories`
- `routeSuggestions`
- `recommendations`
- `pricing`

## Policy model (separate module)

`Backend/policy_model.py` contains the solution model and is intentionally separate from `main.py`.

- Model style: K-means policy segmentation + rule-based playbook mapping.
- Inputs: AQI severity, +24/+72 forecast deltas, vehicular vs industrial pressure, weather driver/correlation, impact index.
- Outputs: ward priority score, urgency class, playbook, and 3-4 recommended actions.

## Consumer model (separate module)

`Backend/consumer_model.py` contains user-facing risk intelligence and is intentionally separate from `main.py`.

- Model style: interpretable weighted logistic-style risk scoring + rule-based advisories.
- Inputs: ward AQI/PM, forecast delta, weather linkage, profile vulnerability, travel load.
- Outputs: personalized risk level, action recommendations, and low-exposure route options.

## Local setup

## Prerequisites

- Node.js 18+
- Python 3.10+

## 1) Install dependencies

From project root:

```bash
npm install
pip install -r Backend/requirements.txt
```

## 2) Run backend

```bash
python -m uvicorn Backend.main:app --reload --host 0.0.0.0 --port 8000
```

Backend URL: `http://localhost:8000`

## 3) Run frontend

In another terminal:

```bash
npm run dev
```

Frontend URL: `http://localhost:5173`

Frontend uses:

- `http://localhost:8000` in dev mode
- relative API paths in production mode

## Production build notes

```bash
npm run build
```

Vite outputs to root `dist/`.  
FastAPI serves static assets if `Backend/dist` exists.

If serving frontend through FastAPI:

```bash
cp -r dist Backend/dist
python -m uvicorn Backend.main:app --host 0.0.0.0 --port 8000
```

## Known limitations

- Dashboard ward names and map ward names are sourced from different naming systems in current datasets.
- Many map wards are spatially assigned or nearest-estimated, not direct name-matched.
- Use `/api/map/wards -> metadata` to inspect matching quality.

## Deployment

`render.yaml` uses:

- build: `npm install && npm run build`
- start: `python -m uvicorn Backend.main:app --host 0.0.0.0 --port $PORT`

If deploying single-service frontend+backend, ensure frontend assets are available in `Backend/dist`.
