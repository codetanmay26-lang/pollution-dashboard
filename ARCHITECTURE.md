# DWIPP Architecture & System Design

## 📋 Table of Contents
- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Data Flow](#data-flow)
- [Component Breakdown](#component-breakdown)
- [Database Schema](#database-schema)
- [API Layer](#api-layer)
- [Frontend Architecture](#frontend-architecture)
- [Security Architecture](#security-architecture)
- [Scalability Considerations](#scalability-considerations)
- [Monitoring & Logging](#monitoring--logging)

---

## 🏛️ System Overview

The Delhi Unified Ward-Level Intelligence Pollution Platform (DWIPP) follows a **microservices-oriented architecture** with clear separation between data ingestion, API serving, and frontend presentation layers.

### Core Design Principles
1. **Data Centralization**: All pollution data sources converge into a unified PostgreSQL warehouse
2. **API-First**: Frontend communicates exclusively through RESTful APIs
3. **Real-Time Capabilities**: Redis cache for instant data access
4. **Scalability**: Horizontal scaling through containerization and orchestration
5. **Modularity**: Independent components for data, policy, and consumer intelligence
6. **Transparency**: Clear audit trails and data source attribution

### Key Architectural Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACES                        │
│  (React Frontend, Mobile App, Government Dashboard)         │
└────────────────────────┬────────────────────────────────────┘
                         │
                  HTTP/WebSocket
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   API GATEWAY LAYER                         │
│  (FastAPI, Rate Limiting, Authentication, Caching)         │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────┐   ┌───────▼────┐  ┌──────▼──────┐
│Core APIs   │   │Forecast    │  │Comparison   │
│AQI/Pollut. │   │Analytics   │  │Recommend.   │
└───────┬────┘   └───────┬────┘  └──────┬──────┘
        │                │               │
        └────────────────┼───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼──────┐  ┌────▼──────┐  ┌────▼──────┐
    │PostgreSQL │  │   Redis   │  │Elasticsearch
    │(Primary)  │  │ (Cache)   │  │ (Logs)     │
    └────┬──────┘  └────┬──────┘  └────┬──────┘
         │              │              │
┌────────▼──────────────▼──────────────▼───────────┐
│         DATA LAYER & STORAGE                     │
└────────────────────────────────────────────────┬─┘
                                                  │
                    ┌─────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │ DATA INGESTION      │
         │ Pipeline (Airflow)  │
         └──────────┬──────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐   ┌─────▼─────┐   ┌───▼─────┐
│ CPCB   │   │   DPCC    │   │ OpenAQ  │
│ APIs   │   │   APIs    │   │  APIs   │
└────────┘   └───────────┘   └─────────┘
```

---

## 📊 Data Flow

### End-to-End Data Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: DATA ACQUISITION & INGESTION                              │
└─────────────────────────────────────────────────────────────────────┘

CPCB Official     DPCC              OpenAQ          Weather APIs      Satellite
Measurements  Monitoring Data    Community Data   (Temperature,Wind) Imagery
   │               │                  │                │               │
   └───────────────┴──────────────────┴────────────────┴───────────────┘
                           │
                  Hourly/Daily Polls
                           │
                    ┌──────▼──────┐
                    │  Data       │
                    │  Validation │
                    │  & Cleanup  │
                    └──────┬──────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌─────────────┐   ┌────────────────┐   ┌──────────────────┐
│Deduplication│   │Geo-matching    │   │Quality Scoring   │
│& Validation │   │(Ward Mapping)  │   │(Reliability)     │
└──────┬──────┘   └────────┬───────┘   └────────┬─────────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                   ┌────────▼────────┐
                   │ Master Merge    │
                   │ (Consolidation) │
                   └────────┬────────┘
                            │

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: DATA PROCESSING & ENRICHMENT                              │
└─────────────────────────────────────────────────────────────────────┘

                            │
                   ┌────────▼────────────┐
                   │  AQI Calculation    │
                   │  (India Standard)   │
                   │  Pollutant Indexing │
                   └────────┬────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
    ▼                       ▼                       ▼
┌─────────────┐   ┌────────────────┐   ┌──────────────────┐
│ Trend       │   │ Seasonal       │   │ Correlation      │
│ Analysis    │   │ Decomposition  │   │ Analysis         │
│(Rolling Avg)│   │(STL)           │   │(Pollutants)      │
└──────┬──────┘   └────────┬───────┘   └────────┬─────────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                   ┌────────▼────────────┐
                   │ ML Preprocessing    │
                   │ Feature Engineering │
                   └────────┬────────────┘
                            │

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: PREDICTIVE MODELING & INFERENCE                           │
└─────────────────────────────────────────────────────────────────────┘

                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
    ▼                       ▼                       ▼
┌──────────────┐   ┌──────────────┐   ┌─────────────────┐
│ XGBoost      │   │ LSTM Neural  │   │ Ensemble        │
│ Regression   │   │ Network      │   │ Predictions     │
│ (Hourly AQI) │   │ (7-Day Trend)│   │ (Voting)        │
└──────┬───────┘   └──────┬───────┘   └────────┬────────┘
       │                   │                    │
       └───────────────────┼────────────────────┘
                           │
                   ┌───────▼────────┐
                   │ Forecast       │
                   │ Aggregation    │
                   │ (24h/72h)      │
                   └───────┬────────┘
                           │

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: DATA STORAGE & CACHING                                    │
└─────────────────────────────────────────────────────────────────────┘

                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│PostgreSQL    │   │Redis Cache   │   │Elasticsearch │
│(OLTP)        │   │(Hot Data)    │   │(Full-text)   │
│- Wards       │   │- Current AQI │   │- Logs        │
│- Time Series │   │- Forecasts   │   │- Metrics     │
│- Users       │   │- Sessions    │   │- Events      │
└──────┬───────┘   └──────┬───────┘   └──────────────┘
       │                   │
       └───────────────────┼─────────────────────────┐
                           │                         │
                  ┌────────▼────────┐                │
                  │ Index Creation  │                │
                  │ (Geo-spatial)   │                │
                  └────────┬────────┘                │
                           │                         │

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 5: API SERVING & PRESENTATION                                │
└─────────────────────────────────────────────────────────────────────┘

                           │
                   ┌───────▼────────┐
                   │  FastAPI       │
                   │  Service       │
                   └───────┬────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│/api/wards    │   │/api/aqi      │   │/api/forecast │
│/api/alerts   │   │/api/compare  │   │/api/solutions│
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
              ┌────────────▼──────────────┐
              │ Frontend Applications     │
              │ - React Dashboard         │
              │ - Mobile App              │
              │ - Admin Console           │
              └──────────────────────────┘
```

---

## 🧩 Component Breakdown

### 1. **Data Ingestion Layer**

#### Purpose
Continuously collect, validate, and standardize pollution data from multiple sources.

#### Components

| Component | Technology | Responsibility |
|-----------|-----------|-----------------|
| **Data Schedulers** | Apache Airflow / APScheduler | Orchestrate periodic data pulls |
| **API Connectors** | Python requests + retry logic | Call CPCB, DPCC, OpenAQ APIs |
| **Validators** | Pydantic models | Schema validation & type checking |
| **Deduplicator** | Custom logic | Remove duplicate measurements |
| **Geo-Matcher** | PostGIS queries | Map measurements to wards |

#### Data Ingestion Pseudo-Code
```python
# Backend/data_pipeline.py
class DataIngestionPipeline:
    def ingest_cpcb_data(self):
        # 1. Fetch from CPCB API
        raw_data = fetch_from_api("cpcb_endpoint")
        
        # 2. Validate schema
        validated = validate_aqi_schema(raw_data)
        
        # 3. Deduplicate
        deduplicated = remove_duplicates(validated)
        
        # 4. Geo-match to wards
        ward_mapped = match_to_wards(deduplicated)
        
        # 5. Store in PostgreSQL
        store_in_db(ward_mapped)
        
        # 6. Cache in Redis
        cache_latest_values(ward_mapped)
        
        return status
```

### 2. **Data Processing Layer**

#### Purpose
Transform raw measurements into actionable intelligence through enrichment and analysis.

#### Components

| Component | Input | Output |
|-----------|-------|--------|
| **AQI Processor** | Raw pollutant levels | Calculated AQI scores |
| **Trend Analyzer** | Time-series data | Trend direction + slope |
| **Seasonal Decomposer** | Historical data | Seasonal/Trend/Residual |
| **Correlation Engine** | Multi-pollutant data | Pollutant relationships |
| **Feature Engineer** | Raw measurements | ML-ready features |

#### Processing Flow
```python
# Backend/processing/aqi_processor/__init__.py
class AQIProcessor:
    """Calculate AQI from individual pollutants using Indian standard"""
    
    def calculate_aqi(self, pollutants):
        # India standard breakpoints
        aqi_scores = []
        
        for pollutant, value in pollutants.items():
            sub_index = self.calculate_sub_index(pollutant, value)
            aqi_scores.append(sub_index)
        
        return max(aqi_scores)  # AQI is max of sub-indices
    
    def calculate_sub_index(self, pollutant, value):
        breakpoints = self.get_india_breakpoints(pollutant)
        return interpolate(value, breakpoints)
```

### 3. **Machine Learning Layer**

#### Purpose
Generate predictive models for pollution forecasting and policy recommendations.

#### Components

| Model | Algorithm | Use Case |
|-------|-----------|----------|
| **AQI Forecast** | XGBoost | Predict AQI 24h, 48h, 72h ahead |
| **Trend Prediction** | LSTM | Long-term pollution trend (7-30 days) |
| **Episode Detection** | Isolation Forest | Identify anomalous pollution events |
| **Policy Recommender** | K-Means + Rules | Suggest interventions by ward cluster |
| **Health Risk Score** | Logistic Regression | Personalized exposure risk for users |

#### Model Training Pipeline
```
Raw Data (2+ years) → Feature Engineering → Train/Test Split (80/20)
                           ↓
                    ┌──────┴──────┐
                    ↓             ↓
                 XGBoost        LSTM
                    ↓             ↓
                 CV Score      Validation
                    ↓             ↓
                    └──────┬──────┘
                           ↓
                    Model Ensemble
                           ↓
                    Cross-Validation
                           ↓
                    Model Registry
                           ↓
                    Production Serving
```

### 4. **API Layer**

#### Purpose
Serve predictions and data to frontend and external consumers through RESTful endpoints.

#### FastAPI Structure
```
Backend/
├── main.py                    # App initialization, router mounting
├── routers/
│   ├── wards.py              # /api/wards endpoints
│   ├── aqi.py                # /api/aqi endpoints
│   ├── forecasts.py          # /api/forecasts endpoints
│   ├── comparisons.py        # /api/comparisons endpoints
│   ├── alerts.py             # /api/alerts endpoints
│   └── health.py             # /api/health (liveness probe)
├── models/
│   ├── schemas.py            # Pydantic request/response models
│   ├── database.py           # SQLAlchemy ORM models
│   └── ml.py                 # ML model schemas
├── services/
│   ├── ward_service.py       # Ward business logic
│   ├── aqi_service.py        # AQI calculations
│   ├── forecast_service.py   # Forecast retrieval
│   └── cache_service.py      # Redis operations
├── middleware/
│   ├── auth.py               # JWT verification
│   ├── ratelimit.py          # Rate limiting
│   └── cors.py               # CORS configuration
└── utils/
    ├── db.py                 # Database connection pool
    ├── config.py             # Environment config
    └── logging.py            # Structured logging
```

### 5. **Frontend Layer**

#### Purpose
Deliver interactive visualizations and user interfaces for consuming pollution data.

#### React Component Architecture
```
src/
├── components/
│   ├── Map/
│   │   ├── WardMap.jsx       # Main Leaflet map
│   │   ├── WardPopup.jsx     # Popup info
│   │   └── LayerControl.jsx  # Layer toggles
│   ├── Charts/
│   │   ├── AQITrendChart.jsx # Time-series AQI
│   │   ├── PollutantChart.jsx# Pollutant breakdown
│   │   └── ComparisonChart.jsx# Multi-ward comparison
│   ├── Alerts/
│   │   ├── AlertBanner.jsx   # Prominent alerts
│   │   └── AlertManager.jsx  # Subscription UI
│   └── Common/
│       ├── Header.jsx        # Navigation
│       ├── Footer.jsx        # Info footer
│       └── Loading.jsx       # Spinners
├── pages/
│   ├── Dashboard.jsx         # Main command center
│   ├── WardDetails.jsx       # Individual ward view
│   ├── MapView.jsx           # Full-screen map
│   ├── Comparisons.jsx       # Multi-ward analysis
│   ├── PredictiveAQI.jsx     # Forecast view
│   └── Solutions.jsx         # Policy recommendations
├── hooks/
│   ├── useAQIData.js         # Fetch AQI data
│   ├── useForecast.js        # Fetch forecasts
│   ├── useWardComparison.js  # Comparison logic
│   └── useJudgeSessionSync.js# Real-time updates
├── services/
│   ├── api.js                # Axios instance + interceptors
│   ├── wardService.js        # Ward API calls
│   ├── aqiService.js         # AQI API calls
│   └── forecastService.js    # Forecast API calls
└── utils/
    ├── colors.js             # AQI color mapping
    ├── formatters.js         # Data formatting
    └── constants.js          # App constants
```

---

## 🗄️ Database Schema

### PostgreSQL Schema Overview

#### 1. **Wards Table**
```sql
CREATE TABLE wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    locality VARCHAR(255),
    district VARCHAR(255),
    geometry GEOMETRY(POLYGON, 4326),  -- PostGIS
    population INT,
    area_km2 DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wards_geometry ON wards USING GIST(geometry);
CREATE INDEX idx_wards_name ON wards(name);
```

#### 2. **AQI Measurements Table**
```sql
CREATE TABLE aqi_measurements (
    id SERIAL PRIMARY KEY,
    ward_id INT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    aqi INT,
    aqi_category VARCHAR(50),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    no2 DECIMAL(8, 2),
    so2 DECIMAL(8, 2),
    co DECIMAL(8, 2),
    o3 DECIMAL(8, 2),
    temperature DECIMAL(5, 2),
    humidity INT,
    wind_speed DECIMAL(5, 2),
    data_source VARCHAR(50),  -- CPCB, DPCC, SATELLITE, etc.
    quality_score DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (ward_id) REFERENCES wards(id)
);

-- Time-series optimization
SELECT create_hypertable('aqi_measurements', 'timestamp', 
    if_not_exists => TRUE);

CREATE INDEX idx_aqi_ward_time 
    ON aqi_measurements(ward_id, timestamp DESC);
```

#### 3. **Forecasts Table**
```sql
CREATE TABLE aqi_forecasts (
    id SERIAL PRIMARY KEY,
    ward_id INT NOT NULL,
    forecast_timestamp TIMESTAMP NOT NULL,
    horizon_hours INT,  -- 24, 48, 72
    predicted_aqi INT,
    predicted_pm25 DECIMAL(8, 2),
    predicted_pm10 DECIMAL(8, 2),
    confidence_interval_lower INT,
    confidence_interval_upper INT,
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (ward_id) REFERENCES wards(id)
);

CREATE INDEX idx_forecast_ward_time 
    ON aqi_forecasts(ward_id, forecast_timestamp);
```

#### 4. **Users Table**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    full_name VARCHAR(255),
    role ENUM('citizen', 'researcher', 'official', 'admin'),
    ward_id INT,
    family_size INT,
    has_elderly BOOLEAN DEFAULT FALSE,
    has_children BOOLEAN DEFAULT FALSE,
    respiratory_issues BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (ward_id) REFERENCES wards(id)
);

CREATE INDEX idx_users_email ON users(email);
```

#### 5. **Alerts Table**
```sql
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    ward_id INT NOT NULL,
    alert_type ENUM('AQI_THRESHOLD', 'EPISODE', 'HEALTH_ADVISORY'),
    threshold_value INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_triggered_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (ward_id) REFERENCES wards(id)
);

CREATE INDEX idx_alerts_user_active 
    ON alerts(user_id, is_active);
```

#### 6. **Comparisons Table**
```sql
CREATE TABLE comparisons (
    id SERIAL PRIMARY KEY,
    comparison_uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    ward_ids INT[] NOT NULL,
    start_date DATE,
    end_date DATE,
    created_by INT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Relationships Diagram
```
users (1) ──────── (M) alerts
  │
  ├── many-to-many via user_preferences
  │
  └── (1) ──── (M) comparisons

wards (1) ──────── (M) aqi_measurements
wards (1) ──────── (M) aqi_forecasts
wards (1) ──────── (M) alerts
wards (1) ──────── (M) data_sources

data_sources (1) ──────── (M) aqi_measurements
```

---

## 🔌 API Layer

### Request/Response Flow

#### Example: Get Ward AQI Endpoint
```
REQUEST:
GET /api/aqi/wards/42?include_forecast=true HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Request-ID: abc-123-def

AUTHENTICATION:
1. JWT middleware validates token
2. Decode user identity and permissions
3. Rate limiter checks quota

PROCESSING:
1. Input validation (ward_id must be integer)
2. Check Redis cache
3. If miss: Query PostgreSQL
4. Enrich with forecast if requested
5. Apply row-level security (if applicable)

RESPONSE:
{
    "success": true,
    "data": {
        "ward_id": 42,
        "ward_name": "Kasturba Nagar",
        "aqi": 287,
        "aqi_category": "Very Poor",
        "timestamp": "2026-02-24T10:00:00Z",
        "pollutants": {
            "pm25": 156.2,
            "pm10": 289.4,
            "no2": 92.3,
            "so2": 18.5,
            "co": 2.1,
            "o3": 28.9
        },
        "trend": "worsening",
        "forecast": {
            "24h_aqi": 295,
            "48h_aqi": 275,
            "72h_aqi": 250
        },
        "data_sources": [
            {
                "source": "CPCB",
                "station": "ITO Station",
                "freshness_minutes": 15,
                "quality_score": 0.95
            }
        ]
    },
    "timestamp": "2026-02-24T10:30:00Z"
}

CACHE:
Store in Redis with 15-minute TTL:
  KEY: aqi:ward:42
  VALUE: JSON response
  TTL: 900 seconds
```

### Authentication & Authorization

```python
# Backend/middleware/auth.py

class JWTBearer:
    def __call__(self, request: Request) -> str:
        credentials = request.headers.get("Authorization")
        if not credentials:
            raise HTTPException(status_code=401, detail="Missing token")
        
        try:
            scheme, token = credentials.split()
            if scheme.lower() != "bearer":
                raise ValueError()
            
            payload = jwt.decode(token, settings.SECRET_KEY)
            user_id = payload.get("sub")
            
            if user_id is None:
                raise HTTPException(status_code=401)
                
            return user_id
        except Exception:
            raise HTTPException(status_code=401)

# Usage in endpoints
@router.get("/api/aqi/wards/{ward_id}")
async def get_ward_aqi(
    ward_id: int,
    user_id: str = Depends(JWTBearer()),
    db: Session = Depends(get_db)
):
    # user_id available in endpoint
    pass
```

### Rate Limiting

```python
# Backend/middleware/ratelimit.py

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Authenticated: 5000/hour
# Unauthenticated: 100/hour

@app.get("/api/aqi/wards/{ward_id}")
@limiter.limit("5000/hour")
async def get_ward_aqi(request: Request, ward_id: int):
    pass
```

---

## 🎨 Frontend Architecture

### State Management Pattern
```
Redux-like pattern using React Context & Hooks

┌─────────────────────────────────────────┐
│      Application Root Context           │
│  (Global State Management)              │
└─────────────────────────────────────────┘
  │
  ├── AQIContext               # Current AQI data
  ├── ForecastContext          # Predictions
  ├── AlertContext             # User alerts
  ├── ComparisonContext        # Multi-ward compare
  ├── UserContext              # User profile
  └── UIContext                # UI state (modals, etc)

Each Context Consumer:
  - Subscribes to updates
  - Triggers API calls on state change
  - Merges data into React component tree
```

### Data Fetching Pattern
```javascript
// src/hooks/useAQIData.js

export const useAQIData = (wardId) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        // 1. Check if data in context (cache)
        const cached = useContext(AQIContext);
        if (cached[wardId]) {
            setData(cached[wardId]);
            setLoading(false);
            return;
        }
        
        // 2. Fetch from API
        const fetchData = async () => {
            try {
                const response = await aqiService.getWardAQI(wardId);
                setData(response);
                updateCache(wardId, response);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [wardId]);
    
    return { data, loading, error };
};
```

### Component Composition
```jsx
// Typical page structure

<Dashboard>
  <Header />
  
  <MainContent>
    <SidePanel>
      <WardSelector />
      <AlertPanel />
    </SidePanel>
    
    <CentralArea>
      <MapComponent />
      
      <DataPanel>
        <AQICard data={aqiData} />
        <PollutantChart data={pollutants} />
        <TrendChart data={trends} />
        <ComparisonSelector />
      </DataPanel>
    </CentralArea>
  </MainContent>
  
  <Footer />
</Dashboard>
```

---

## 🔐 Security Architecture

### Data Protection Layers

```
┌─────────────────────────────────────────────────┐
│ 1. TRANSPORT LAYER (HTTPS/TLS 1.3)             │
│    - All data in-transit encrypted              │
│    - Certificate pinning in mobile apps         │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ 2. API LAYER (Authentication & Authorization)   │
│    - JWT tokens with 1-hour expiry              │
│    - Refresh tokens (7 days)                    │
│    - Role-based access control (RBAC)           │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ 3. DATABASE LAYER (Encryption at Rest)         │
│    - Encrypted PostgreSQL fields (sensitive)    │
│    - Redis SSL connections                      │
│    - Encrypted backups                          │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ 4. APPLICATION LAYER                           │
│    - Input validation & sanitization            │
│    - SQL injection prevention (ORM)             │
│    - XSS protection (React escaping)            │
│    - CSRF token validation                      │
└─────────────────────────────────────────────────┘
```

### User Data Privacy
- Personal data segregated from public data
- Anonymization for analytics
- GDPR-compliant data retention policies
- User consent for notifications/tracking

---

## 📈 Scalability Considerations

### Horizontal Scaling Strategy

```
LOAD BALANCER (NGINX / Azure Load Balancer)
         │
    ┌────┼────┬────┬────┐
    ▼    ▼    ▼    ▼    ▼
  [API] [API] [API] [API] [API]  (Auto-scaling group)
    │    │    │    │    │
    └────┴────┼────┴────┘
             │
      ┌──────▼──────┐
      │ Shared      │
      │ PostgreSQL  │
      │ (Primary)   │
      └──────┬──────┘
             │
       ┌─────┴─────┐
       ▼           ▼
    [Read         [Read
     Replica]     Replica]
     
     + Redis Cache (shared)
     + Elasticsearch (shared logs)
```

### Performance Optimization
- **API Response Caching**: 15-60 min TTL in Redis
- **Database Query Optimization**: Indexes on ward_id, timestamp
- **Frontend Code Splitting**: Lazy-load pages
- **Image Optimization**: Webp format, CDN delivery
- **Data Pagination**: 50-100 items per page

---

## 📊 Monitoring & Logging

### Observability Stack

```
Application
    │
    ├── Metrics (Prometheus)
    │   - API response times
    │   - Database query times
    │   - Cache hit/miss rates
    │   - Queue depths
    │
    ├── Logs (ELK / Cloud Logging)
    │   - Request logs (incoming)
    │   - Application logs (debug, info, warn, error)
    │   - Database query logs (slow queries)
    │   - Data ingestion logs
    │
    └── Tracing (Jaeger / Application Insights)
        - Distributed tracing across services
        - Latency analysis
        - Error propagation tracking
```

### Health Checks

```python
# Backend/routers/health.py

@router.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    checks = {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "components": {
            "database": await check_database(db),
            "redis": await check_redis(),
            "api": "healthy"
        }
    }
    
    if any(v != "healthy" for v in checks["components"].values()):
        checks["status"] = "degraded"
    
    return checks

# Response
{
    "status": "healthy",
    "components": {
        "database": "healthy",
        "redis": "healthy",
        "api": "healthy"
    }
}
```

### Alerting

```yaml
# Prometheus rules (prometheus/rules.yml)

groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          (rate(http_requests_total{status=~"5.."}[5m]) / 
           rate(http_requests_total[5m])) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: SlowDatabaseQueries
        expr: |
          histogram_quantile(0.95, db_query_duration_ms) > 1000
        for: 10m
        annotations:
          summary: "95th percentile query time > 1s"
```

---

## 🔄 Deployment Architecture

### CI/CD Pipeline

```
Git Push (main branch)
    │
    ├─→ [Linting & Testing]
    │   - ESLint (frontend)
    │   - Pytest (backend)
    │   - Coverage checks (>80%)
    │
    ├─→ [Build]
    │   - npm run build (frontend → dist/)
    │   - Docker build (backend image)
    │   - Docker build (frontend image)
    │
    ├─→ [Push to Registry]
    │   - Publish to Container Registry
    │   - Tag with git commit hash
    │
    ├─→ [Deploy to Staging]
    │   - Update K8s manifests
    │   - Roll out new version
    │   - Run smoke tests
    │
    └─→ [Deploy to Production]
        - Manual approval
        - Canary deployment (10% traffic)
        - Monitor metrics
        - Full rollout if stable
```

---

## 📋 Summary

| Layer | Technology | Responsibility |
|-------|-----------|-----------------|
| **Frontend** | React + Vite | User interface & visualization |
| **API Gateway** | FastAPI | Request routing & business logic |
| **Data Processing** | Pandas, NumPy | ETL & data enrichment |
| **ML Models** | XGBoost, LSTM | Forecasting & predictions |
| **Database** | PostgreSQL + PostGIS | Persistent data storage |
| **Cache** | Redis | Real-time data serving |
| **Infrastructure** | Docker + Kubernetes | Container orchestration |
| **Monitoring** | Prometheus + Grafana | System health & alerting |

This architecture supports millions of daily queries while maintaining sub-second response times through intelligent caching, efficient database design, and horizontal scalability.

---

**Last Updated**: February 24, 2026
**Version**: 1.0.0
**Architecture Pattern**: Microservices with centralized data warehouse
