# Delhi Unified Ward-Level Intelligence Pollution Platform (DWIPP)

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

---

## 🌍 Project Overview

**Delhi Unified Ward-Level Intelligence Pollution Platform (DWIPP)** is a comprehensive web-based platform that visualizes and analyzes air quality and environmental pollution data at the granular ward level across Delhi.

### Vision
To empower Delhi government officials, urban planners, environmental researchers, and citizens with real-time, actionable air quality intelligence at their ward level, facilitating informed decision-making and policy implementation.

### Key Objectives
- Provide **real-time air quality monitoring** for Delhi's ~272 municipal wards
- **Unify multiple pollution data sources** into a single, user-friendly interface
- Enable **data-driven policy decisions** for environmental management
- **Educate citizens** about air quality in their locality
- Support **trend analysis and predictive modeling** for pollution patterns

### Target Users
- **Delhi Government Officials** - Policy enforcement and resource allocation
- **Urban Planners & Environmental Researchers** - Data analysis and trend identification
- **Delhi Citizens** - Personal ward air quality information and health guidance
- **NGOs & Policy Makers** - Environmental advocacy and compliance monitoring

---

## ✨ Core Features

### 1. **Ward-Level Pollution Map**
- Interactive, zoomable map of Delhi showing all ~272 municipal wards
- Color-coded wards by pollution severity (green → red gradient)
- Click on any ward to view detailed information
- Layer toggles for different pollutants and data sources
- Real-time updates as new data becomes available

### 2. **Real-Time & Historical AQI Data**
- Current Air Quality Index (AQI) for each ward
- Historical data visualization (7-day, 30-day, 1-year views)
- AQI category classification (Good, Satisfactory, Moderately Polluted, Poor, Very Poor, Severe)
- Trend indicators (improving ↑ / worsening ↓)
- Comparison with Delhi average and national standards

### 3. **Detailed Pollutant Breakdown**
- Individual pollution level tracking:
  - **PM2.5** (Fine Particulate Matter)
  - **PM10** (Coarse Particulate Matter)
  - **NO₂** (Nitrogen Dioxide)
  - **SO₂** (Sulfur Dioxide)
  - **CO** (Carbon Monoxide)
  - **O₃** (Ozone)
- Health impact assessment for each pollutant
- WHO and Indian air quality standards reference

### 4. **Ward Comparison Tool**
- Select multiple wards to compare side-by-side
- Overlay historical trends for comparative analysis
- Export comparison reports (PDF/CSV)
- Identify pollution hotspots and patterns
- Seasonal and temporal comparisons

### 5. **Advanced Analytics & Trend Charts**
- Time-series graphs for temporal trends
- Heatmaps showing pollution patterns across time and space
- Statistical summaries (mean, median, peak, trend slope)
- Correlation analysis between different pollutants
- Seasonality detection and forecasting

### 6. **Alert & Notification System**
- **Threshold-based alerts** when AQI exceeds limits
- **Push notifications** for critical pollution events
- **Email alerts** for subscribed users
- **Ward-specific warnings** with health recommendations
- **Voluntary exposure reduction** suggestions (outdoor activities, transport modes)

### 7. **Data Source Integration Panel**
- Transparent display of data sources for each ward
- **CPCB** (Central Pollution Control Board) official measurements
- **DPCC** (Delhi Pollution Control Committee) data
- **Satellite data** for coverage areas without ground sensors
- **OpenAQ** community-contributed measurements
- **Weather data integration** (temperature, humidity, wind)
- Data freshness indicators and update timestamps

---

## 🛠 Tech Stack

### **Frontend**
- **Framework**: React 18+ with Vite
- **UI Components**: Custom CSS with responsive design
- **Mapping**: Leaflet.js (open-source) or Mapbox GL (for advanced features)
- **Charts & Graphs**: Recharts / Chart.js
- **State Management**: React Hooks / Context API
- **HTTP Client**: Axios / Fetch API
- **Build Tool**: Vite

### **Backend**
- **Framework**: Python FastAPI (production-ready REST API)
- **Async Support**: AsyncIO for non-blocking operations
- **Task Scheduling**: Celery for periodic data ingestion
- **Data Processing**: Pandas, NumPy for data manipulation

### **Database**
- **Primary**: PostgreSQL (relational data, spatial queries with PostGIS)
- **Cache**: Redis (for real-time data and session management)
- **Time-Series Data**: TimescaleDB extension or InfluxDB alternative

### **Data & ML**
- **Data Ingestion**: Apache Airflow or custom schedulers
- **ML Models**: XGBoost, LSTM for pollution prediction
- **Data Processing**: Apache Spark (for large-scale processing)

### **Infrastructure & Deployment**
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes or Docker Swarm (scalability)
- **Cloud Platform**: Azure, AWS, or GCP
- **CI/CD**: GitHub Actions, GitLab CI, or Jenkins
- **Monitoring**: Prometheus + Grafana or CloudWatch
- **Logging**: ELK Stack or Cloud Logging

### **Additional Tools**
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest (frontend), Pytest (backend)
- **Code Quality**: ESLint, Black, Flake8
- **Version Control**: Git + GitHub

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ and npm/yarn
- **Python** 3.9+
- **PostgreSQL** 13+
- **Redis** (optional but recommended)
- **Docker** & **Docker Compose** (for containerized deployment)

### Running Locally (Development)

#### 1. **Clone the Repository**
```bash
git clone https://github.com/yourusername/dwipp-pollution-dashboard.git
cd pollution-dashboard
```

#### 2. **Set Up Backend**
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r Backend/requirements.txt

# Create .env file with database credentials
cp .env.example .env
# Edit .env with your database and API credentials

# Run migrations (if applicable)
python Backend/main.py
```

#### 3. **Start Backend Server**
```bash
python -m uvicorn Backend.main:app --reload --host 0.0.0.0 --port 8000
```
Backend will be available at: `http://localhost:8000`

#### 4. **Set Up Frontend**
```bash
# Install dependencies
npm install

# Create .env file for API endpoints
cp .env.example .env.local
# Edit .env.local with backend API URL

# Start development server
npm run dev
```
Frontend will be available at: `http://localhost:5173`

#### 5. **Access the Application**
- Open browser and navigate to: `http://localhost:5173`
- API documentation available at: `http://localhost:8000/docs`

---

## 📁 Installation

### Using Docker Compose (Recommended)
```bash
# Build and start all services
docker-compose up --build

# Services will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

### Manual Installation (Detailed)

#### Backend Installation
```bash
# 1. Create and activate virtual environment
python -m venv venv
source venv/bin/activate

# 2. Install Python dependencies
pip install -r Backend/requirements.txt

# 3. Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/dwipp"
export REDIS_URL="redis://localhost:6379/0"
export CPCB_API_KEY="your_api_key"
export DPCC_API_KEY="your_api_key"

# 4. Initialize database
python Backend/data_pipeline.py init-db

# 5. Run the application
uvicorn Backend.main:app --reload
```

#### Frontend Installation
```bash
# 1. Install Node dependencies
npm install

# 2. Create environment file
echo "VITE_API_URL=http://localhost:8000" > .env.local

# 3. Start development server
npm run dev

# 4. Build for production
npm run build
```

---

## 📂 Project Structure

```
pollution-dashboard/
├── Backend/                          # Python FastAPI backend
│   ├── main.py                       # Application entry point
│   ├── consumer_model.py             # Consumer data models
│   ├── policy_model.py               # Policy and compliance models
│   ├── data_pipeline.py              # Data ingestion pipeline
│   ├── xgb_inference.py              # XGBoost prediction models
│   ├── requirements.txt              # Python dependencies
│   ├── processing/                   # Data processing modules
│   │   ├── aqi_processor/            # AQI calculation logic
│   │   ├── industrial_proxy.py       # Industrial pollution indicators
│   │   ├── traffic_proxy.py          # Traffic-based pollution modeling
│   │   ├── load_data.py              # Data loading utilities
│   │   └── master_merge/             # Data consolidation
│   ├── models/                       # Trained ML models storage
│   └── data/                         # Raw and processed data files
│       ├── aqi.csv                   # AQI measurements
│       ├── delhi_wards.geojson       # Ward boundaries (GeoJSON)
│       ├── delhi_wards.kml           # Ward boundaries (KML)
│       ├── citizen_signals.json      # User-submitted pollution data
│       ├── fire_aqi_combined.csv     # Fire-related pollution correlations
│       ├── industry.geojson          # Industrial facility locations
│       ├── traffic.geojson           # Traffic data
│       └── [datasets]/               # Additional datasets
│
├── src/                              # React frontend
│   ├── main.jsx                      # Application entry point
│   ├── App.jsx                       # Root component
│   ├── App.css                       # Global styles
│   ├── index.css                     # Base CSS
│   ├── assets/                       # Images, icons, static files
│   ├── hooks/                        # Custom React hooks
│   │   └── useJudgeSessionSync.js    # WebSocket/real-time sync hook
│   └── pages/                        # Page components
│       ├── Home/                     # Landing page
│       ├── Dashboard/                # Main dashboard with ward map
│       ├── WardDetails/              # Individual ward details view
│       ├── MapView/                  # Interactive map component
│       ├── AllWards/                 # Grid view of all wards
│       ├── PredictiveAQI/            # AQI forecast and predictions
│       ├── ConsumerDashboard/        # User-specific dashboard
│       ├── JudgeMode/                # Administrative/review interface
│       ├── FireIntel/                # Fire-pollution correlation analysis
│       ├── WeatherCorrelation/       # Weather-pollution relationships
│       ├── Solutions/                # Mitigation strategies and suggestions
│       ├── CitizenReview/            # Community feedback interface
│       ├── TicketStatus/             # Issue tracking for pollution complaints
│       ├── OmniQRGenerator/          # QR code generation for ward data
│       ├── PortalSelect/             # User role and portal selection
│       ├── ConsumerOnboarding/       # User registration and setup
│       └── About/                    # Project information and credits
│
├── public/                           # Static public assets
├── Dockerfile                        # Container image definition
├── docker-compose.yml                # Multi-container orchestration
├── vite.config.js                    # Vite build configuration
├── eslint.config.js                  # Code linting rules
├── package.json                      # Node.js dependencies and scripts
├── README.md                         # This file
├── ARCHITECTURE.md                   # System design documentation
├── PROJECT_ROADMAP.md                # Development phases and timeline
├── DEPLOYMENT.md                     # Deployment instructions
├── render.yaml                       # Render.com deployment config
├── render-build.sh                   # Build script for Render
├── start.sh                          # Application startup script
└── vercel.json                       # Vercel deployment config
```

---

## 💡 Usage Guide

### For Citizens
1. **Visit the Dashboard**: Open the application and navigate to the main map view
2. **Check Your Ward**: Locate your ward on the interactive map or search by name
3. **View AQI Details**: Click on the ward to see:
   - Current AQI and category
   - Individual pollutant levels
   - Health recommendations
   - Historical trends
4. **Subscribe to Alerts**: Enable notifications for your ward (in user settings)
5. **View Comparisons**: Compare your ward with neighboring wards

### For Researchers & Analysts
1. **Access Data Exports**: Use the export functionality to download ward-level data
2. **Run Comparisons**: Use the ward comparison tool for detailed statistical analysis
3. **Analyze Trends**: Review historical charts and identify pollution patterns
4. **Access APIs**: Programmatically fetch data via REST APIs (see API Documentation)
5. **Generate Reports**: Export PDF reports with visualizations and statistics

### For Government Officials
1. **Monitor Hotspots**: Identify critically polluted wards requiring intervention
2. **Track Interventions**: Monitor pollution levels before/after policy implementation
3. **Plan Resources**: Use ward comparison data to allocate pollution control resources
4. **Access Forecasts**: Review predictive models for upcoming pollution episodes
5. **Generate Reports**: Create comprehensive reports for stakeholders and the public

### For NGOs & Policy Makers
1. **Identify Issues**: Pinpoint wards with persistent pollution problems
2. **Evidence Gathering**: Use data to support environmental advocacy
3. **Policy Review**: Analyze effectiveness of existing pollution control measures
4. **Stakeholder Communication**: Generate visual reports for presentations

---

## 📡 API Documentation

### Base URL
```
Development: http://localhost:8000
Production: https://api.dwipp.delhi.gov.in
```

### Authentication
All API endpoints require Bearer token authentication:
```bash
Authorization: Bearer {access_token}
```

### Core Endpoints

#### 1. **Wards**
```
GET /api/wards/
- Get list of all wards
- Query Params: page=1, limit=50, sort=name

GET /api/wards/{ward_id}
- Get detailed ward information
- Path Params: ward_id (integer)

GET /api/wards/{ward_id}/boundary
- Get ward GeoJSON boundary
- Returns: GeoJSON FeatureCollection
```

#### 2. **AQI Data**
```
GET /api/aqi/wards/{ward_id}
- Get current AQI for a ward
- Response: { ward_id, aqi, category, timestamp, pollutants {...} }

GET /api/aqi/wards/{ward_id}/history
- Get historical AQI data
- Query Params: start_date, end_date, interval (hourly/daily)

GET /api/aqi/wards/batch
- Get AQI for multiple wards
- Query Params: ward_ids=1,2,3
```

#### 3. **Pollutants**
```
GET /api/pollutants/{ward_id}
- Get all pollutant levels for a ward
- Response: { PM2.5, PM10, NO2, SO2, CO, O3 }

GET /api/pollutants/{ward_id}/forecast
- Get pollutant forecast for next 7 days
- Response: Hourly predictions for each pollutant
```

#### 4. **Comparisons**
```
POST /api/comparisons/
- Create a comparison between wards
- Body: { ward_ids: [1, 2, 3], date_range: {...} }

GET /api/comparisons/{comparison_id}
- Get comparison results and analysis
```

#### 5. **Alerts**
```
GET /api/alerts/user
- Get user's active alerts

POST /api/alerts/subscribe
- Subscribe to ward alerts
- Body: { ward_id, alert_type, threshold }

DELETE /api/alerts/{alert_id}
- Unsubscribe from an alert
```

#### 6. **Forecasts**
```
GET /api/forecasts/{ward_id}
- Get AQI forecast for next 7 days
- Response: Hourly AQI predictions

GET /api/forecasts/{ward_id}/episodes
- Get predicted pollution episodes
- Response: List of high-pollution periods with severity
```

### Response Format
```json
{
  "success": true,
  "data": {...},
  "timestamp": "2026-02-24T10:30:00Z",
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 272
  }
}
```

### Error Handling
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Ward with ID 999 not found",
    "details": {...}
  },
  "timestamp": "2026-02-24T10:30:00Z"
}
```

### Rate Limiting
- **Unauthenticated**: 100 requests/hour
- **Authenticated**: 5000 requests/hour
- **Premium Users**: Unlimited

### API Documentation UI
- **Swagger/OpenAPI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## 🔧 Development

### Setting Up Development Environment

#### Prerequisites
```bash
# Check versions
node --version  # Should be 16+
python --version  # Should be 3.9+
docker --version
```

#### Initial Setup
```bash
# 1. Fork and clone the repository
git clone https://github.com/yourfork/dwipp-pollution-dashboard.git

# 2. Create development branch
git checkout -b feature/your-feature-name

# 3. Set up both backend and frontend as per Quick Start section
```

### Code Standards

#### Frontend (React/JavaScript)
```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# Run tests
npm run test

# Build for production
npm run build
```

#### Backend (Python)
```bash
# Check code quality
flake8 Backend/

# Format with Black
black Backend/

# Type checking
mypy Backend/

# Run tests
pytest Backend/tests/

# Build for production
# Handled automatically in CI/CD
```

### Running Tests

#### Frontend Tests
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report
```

#### Backend Tests
```bash
pytest                   # Run all tests
pytest -v               # Verbose output
pytest --cov            # Coverage report
pytest Backend/tests/test_aqi.py  # Specific test file
```

### Debugging

#### Backend Debugging
```bash
# Run with debug logging
export LOG_LEVEL=DEBUG
uvicorn Backend.main:app --reload

# Use Python debugger
python -m pdb Backend/main.py
```

#### Frontend Debugging
```bash
# Use browser DevTools (F12 in Chrome)
# Add console.log statements
# Use React DevTools browser extension
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/ward-comparison

# 2. Make changes and commit
git add .
git commit -m "Add ward comparison feature"

# 3. Push to your fork
git push origin feature/ward-comparison

# 4. Create Pull Request on GitHub
# - Provide clear description
# - Reference related issues
# - Include screenshots if UI changes
```

---

## 🚀 Deployment

### Development Deployment
```bash
# Using Render (auto-deploys from main branch)
# See render.yaml and render-build.sh

# Verify deployment
curl https://dwipp-dev.onrender.com/api/health
```

### Production Deployment

#### Prerequisites
- Azure/AWS/GCP account
- Domain name configured
- SSL certificate (Let's Encrypt)
- Database backups configured

#### Deployment Steps
1. **Set Environment Variables**
   ```bash
   ENVIRONMENT=production
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   CPCB_API_KEY=...
   ```

2. **Build Docker Images**
   ```bash
   docker build -t dwipp-backend:latest Backend/
   docker build -t dwipp-frontend:latest .
   ```

3. **Push to Registry**
   ```bash
   docker tag dwipp-backend:latest myregistry.azurecr.io/dwipp-backend:latest
   docker push myregistry.azurecr.io/dwipp-backend:latest
   ```

4. **Deploy to Kubernetes**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/backend-deployment.yaml
   kubectl apply -f k8s/frontend-deployment.yaml
   ```

5. **Verify Deployment**
   ```bash
   kubectl get pods
   kubectl logs pod/dwipp-backend-xxx
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🤝 Contributing

We welcome contributions from developers, data scientists, and domain experts! 

### How to Contribute

1. **Fork the Repository**
   - Click "Fork" on GitHub

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make Your Changes**
   - Follow code standards (see Development section)
   - Add tests for new functionality
   - Update documentation

4. **Commit and Push**
   ```bash
   git commit -m "Add descriptive commit message"
   git push origin feature/your-feature
   ```

5. **Create a Pull Request**
   - Provide detailed description
   - Link related issues
   - Wait for code review

### Contribution Areas

#### High Priority
- **Improve Prediction Models**: Enhance XGBoost/LSTM accuracy
- **Data Source Integration**: Add new pollution data sources
- **Performance Optimization**: Reduce API response times
- **Mobile Responsiveness**: Improve mobile UI/UX

#### Medium Priority
- **Additional Visualizations**: New chart types and insights
- **User Experience**: UI/UX improvements and accessibility
- **Documentation**: Expand guides and API documentation
- **Testing**: Increase test coverage

#### Good First Issues
- Bug fixes (look for "good-first-issue" label)
- Documentation improvements
- UI refinements
- Test coverage expansion

### Code Review Process
1. Automated tests must pass
2. Code review by at least 2 maintainers
3. No conflicts with main branch
4. Documentation updated
5. Merged by maintainer

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Key Points
- ✅ Use for commercial and private purposes
- ✅ Modify and distribute
- ❌ Hold liable for issues
- ⚠️ Include license in distributions

### Attribution
- Project: Delhi Unified Ward-Level Intelligence Pollution Platform (DWIPP)
- Built with data from: CPCB, DPCC, OpenAQ, NASA
- Map data: OpenStreetMap contributors

---

## 💬 Support

### Getting Help

#### Documentation
- 📖 [Project README](README.md) - Start here
- 🏗️ [Architecture Guide](ARCHITECTURE.md) - System design
- 🗺️ [Project Roadmap](PROJECT_ROADMAP.md) - Planned features
- 🚀 [Deployment Guide](DEPLOYMENT.md) - Production setup

#### Community & Questions
- 💬 **Discussions**: GitHub Discussions tab
- 🐛 **Report Issues**: GitHub Issues tab
- 📧 **Email**: support@dwipp.delhi.gov.in
- 🌐 **Website**: https://dwipp.delhi.gov.in

#### Development Resources
- 📚 FastAPI Documentation: https://fastapi.tiangolo.com/
- ⚛️ React Documentation: https://react.dev/
- 🗺️ Leaflet.js: https://leafletjs.com/
- 📊 Recharts: https://recharts.org/

### Troubleshooting

#### Backend Won't Start
```bash
# Check if port 8000 is in use
lsof -i :8000
# Try different port: uvicorn Backend.main:app --port 8001

# Check database connection
python -c "from Backend.data_pipeline import db; print(db.health())"
```

#### Frontend Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### API Errors
- Check authentication token
- Verify database connection
- Review server logs: `docker logs container-name`
- Check rate limiting

---

## 👥 Team & Credits

### Core Team
- **Project Lead**: [Your Name]
- **Backend Lead**: [Name]
- **Frontend Lead**: [Name]
- **Data Science**: [Name]

### Contributors
Special thanks to all contributors and the open-source community.

### Data Sources
- **CPCB** (Central Pollution Control Board)
- **DPCC** (Delhi Pollution Control Committee)
- **OpenAQ** (Community Air Quality Platform)
- **NASA** (Satellite Data)
- **Weather APIs** (Temperature, Humidity, Wind)

---

## 📞 Contact & Links

- 🌐 Website: [https://dwipp.delhi.gov.in](https://dwipp.delhi.gov.in)
- 📧 Email: support@dwipp.delhi.gov.in
- 🐙 GitHub: [https://github.com/yourusername/dwipp-pollution-dashboard](https://github.com/yourusername/dwipp-pollution-dashboard)
- 🐛 Issue Tracker: [GitHub Issues](https://github.com/yourusername/dwipp-pollution-dashboard/issues)
- 💡 Discussions: [GitHub Discussions](https://github.com/yourusername/dwipp-pollution-dashboard/discussions)

---

**Last Updated**: February 24, 2026
**Version**: 1.0.0
**Status**: Active Development
