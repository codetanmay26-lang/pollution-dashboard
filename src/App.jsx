import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout/Layout";

// Lazy load all route components for better initial load performance
const Home = lazy(() => import("./pages/Home/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const AllWards = lazy(() => import("./pages/Dashboard/AllWards"));
const WardDetails = lazy(() => import("./pages/WardDetails/WardDetails"));
const MapView = lazy(() => import("./pages/MapView/MapView"));
const WeatherCorrelation = lazy(() => import("./pages/WeatherCorrelation/WeatherCorrelation"));
const PredictiveAQI = lazy(() => import("./pages/PredictiveAQI/PredictiveAQI"));
const Solutions = lazy(() => import("./pages/Solutions/Solutions"));
const PortalSelect = lazy(() => import("./pages/PortalSelect/PortalSelect"));
const ConsumerOnboarding = lazy(() => import("./pages/ConsumerOnboarding/ConsumerOnboarding"));
const ConsumerDashboard = lazy(() => import("./pages/ConsumerDashboard/ConsumerDashboard"));
const TicketStatus = lazy(() => import("./pages/TicketStatus/TicketStatus"));
const CitizenReview = lazy(() => import("./pages/CitizenReview/CitizenReview"));
const JudgeMode = lazy(() => import("./pages/JudgeMode/JudgeMode"));
const FireAQICorrelation = lazy(() => import("./pages/FireIntel/FireAQICorrelation"));

// Loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    background: '#1a1f2e', 
    color: '#51cf66',
    fontSize: '18px'
  }}>
    Loading...
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Layout wrapper for all routes - handles nav display conditionally */}
          <Route element={<Layout />}>
            <Route path="/" element={<PortalSelect />} />
            <Route path="/government" element={<Home />} />
            <Route path="/consumer" element={<ConsumerDashboard />} />
            <Route path="/consumer/onboarding" element={<ConsumerOnboarding />} />
            <Route path="/ticket/:ticketId" element={<TicketStatus />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/citizen-review" element={<CitizenReview />} />
            <Route path="/judge/:sessionId" element={<JudgeMode />} />
            <Route path="/weather-correlation" element={<WeatherCorrelation />} />
            <Route path="/predictive-aqi" element={<PredictiveAQI />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/wards" element={<AllWards />} />
            <Route path="/wards/:wardName" element={<WardDetails />} />
            <Route path="/fire-intel" element={<FireAQICorrelation />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}


export default App;
