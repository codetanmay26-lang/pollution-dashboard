import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import './MapView.css';

const API_BASE = import.meta.env.DEV ? 'https://delhi-pollution-2.onrender.com' : '';
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 860;
const MAP_PADDING = 36;

const getAqiBand = (aqi) => {
  if (aqi > 300) return { label: 'Hazardous', className: 'hazardous', color: '#ef4444' };
  if (aqi > 200) return { label: 'Very Unhealthy', className: 'very-unhealthy', color: '#f97316' };
  if (aqi > 100) return { label: 'Unhealthy', className: 'unhealthy', color: '#f59e0b' };
  if (aqi > 50) return { label: 'Moderate', className: 'moderate', color: '#4ac9ff' };
  return { label: 'Good', className: 'good', color: '#90f4aa' };
};

const extractRings = (geometry) => {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates || [];
  if (geometry.type === 'MultiPolygon') return (geometry.coordinates || []).flat();
  return [];
};

const computeBounds = (features) => {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  features.forEach((feature) => {
    extractRings(feature.geometry).forEach((ring) => {
      ring.forEach((point) => {
        const lon = Number(point[0]);
        const lat = Number(point[1]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });
    });
  });

  if (!Number.isFinite(minLon) || !Number.isFinite(maxLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    return { minLon: 0, maxLon: 1, minLat: 0, maxLat: 1 };
  }

  return { minLon, maxLon, minLat, maxLat };
};

const projectPoint = (lon, lat, bounds) => {
  const xSpan = Math.max(1e-9, bounds.maxLon - bounds.minLon);
  const ySpan = Math.max(1e-9, bounds.maxLat - bounds.minLat);
  const x = MAP_PADDING + ((lon - bounds.minLon) / xSpan) * (MAP_WIDTH - MAP_PADDING * 2);
  const y = MAP_HEIGHT - MAP_PADDING - ((lat - bounds.minLat) / ySpan) * (MAP_HEIGHT - MAP_PADDING * 2);
  return { x, y };
};

const geometryToPath = (geometry, bounds) => {
  const rings = extractRings(geometry);
  if (!rings.length) return '';

  const parts = rings.map((ring) => {
    if (!ring.length) return '';
    const d = ring.map((point, index) => {
      const projected = projectPoint(Number(point[0]), Number(point[1]), bounds);
      return `${index === 0 ? 'M' : 'L'}${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`;
    });
    return `${d.join(' ')} Z`;
  });

  return parts.filter(Boolean).join(' ');
};

const normalizeContributions = (vehicularRaw, industrialRaw, otherRaw) => {
  const vehicular = Math.max(0, Number(vehicularRaw || 0));
  const industrial = Math.max(0, Number(industrialRaw || 0));
  const otherInput = Math.max(0, Number(otherRaw || 0));
  const baseTotal = vehicular + industrial + otherInput;
  const total = baseTotal > 0 ? baseTotal : vehicular + industrial;

  if (total <= 0) {
    return { vehicular: 0, industrial: 0, other: 100 };
  }

  const v = Math.round((vehicular / total) * 100);
  const i = Math.round((industrial / total) * 100);
  return { vehicular: v, industrial: i, other: Math.max(0, 100 - v - i) };
};

const MapView = () => {
  const navigate = useNavigate();
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [selectedWardName, setSelectedWardName] = useState('');

  const fetchMapData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/map/wards`);
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const payload = await response.json();
      setGeoData(payload);
      const byAqi = [...(payload.features || [])].sort((a, b) => Number(b.properties?.aqi || 0) - Number(a.properties?.aqi || 0));
      setSelectedWardName(byAqi[0]?.properties?.name || '');
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to fetch map data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  const prepared = useMemo(() => {
    const features = geoData?.features || [];
    const bounds = computeBounds(features);
    return features
      .map((feature) => {
        const props = feature.properties || {};
        const wardName = props.name || 'Unknown';
        const aqi = Number(props.aqi || 0);
        const band = getAqiBand(aqi);
        return {
          ...feature,
          properties: props,
          wardName,
          band,
          path: geometryToPath(feature.geometry, bounds),
        };
      })
      .filter((feature) => feature.path);
  }, [geoData]);

  const filtered = useMemo(() => {
    let rows = prepared;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((f) => f.wardName.toLowerCase().includes(q));
    }
    if (severity !== 'all') {
      rows = rows.filter((f) => f.band.className === severity);
    }
    return rows;
  }, [prepared, search, severity]);

  const selectedWard = filtered.find((f) => f.wardName === selectedWardName)
    || prepared.find((f) => f.wardName === selectedWardName)
    || filtered[0]
    || null;

  const metadata = geoData?.metadata || {};

  useEffect(() => {
    if (!loading) {
      anime({
        targets: '.ward-path',
        opacity: [0, 1],
        duration: 420,
        easing: 'easeOutQuad',
        delay: anime.stagger(8)
      });
    }
  }, [loading, filtered]);

  if (loading) {
    return (
      <div className="map-loading">
        <div className="loading-ring"></div>
        <p>Loading ward geometries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-loading">
        <h2>Unable to load real map</h2>
        <p>{error}</p>
        <button className="btn-solid" onClick={fetchMapData}>Retry</button>
      </div>
    );
  }

  const normalized = normalizeContributions(
    selectedWard?.properties?.vehicular_pct,
    selectedWard?.properties?.industrial_pct,
    selectedWard?.properties?.other_pct
  );

  return (
    <div className="map-page">
      <header className="map-header">
        <div>
          <p className="page-kicker">Delhi Ward Pollution Monitor</p>
          <h1>Real Ward Boundary Map</h1>
          <p>
            AQI is rendered on actual ward polygons from your `{metadata.geometrySource || 'map'}` geometry source.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="btn-ghost" onClick={() => navigate('/wards')}>All Wards</button>
        </div>
      </header>

      <section className="map-controls">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ward"
        />
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="all">All AQI bands</option>
          <option value="hazardous">Hazardous</option>
          <option value="very-unhealthy">Very Unhealthy</option>
          <option value="unhealthy">Unhealthy</option>
          <option value="moderate">Moderate</option>
          <option value="good">Good</option>
        </select>
        <p>{filtered.length} / {prepared.length} wards shown</p>
      </section>

      <section className="map-layout">
        <div className="map-canvas-shell">
          <svg className="map-canvas" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
            {prepared.map((feature) => {
              const hidden = !filtered.includes(feature);
              const isSelected = selectedWard?.wardName === feature.wardName;
              return (
                <path
                  key={feature.wardName}
                  d={feature.path}
                  className={`ward-path ${isSelected ? 'active' : ''}`}
                  style={{
                    fill: feature.band.color,
                    opacity: hidden ? 0.08 : isSelected ? 0.9 : 0.58
                  }}
                  onClick={() => setSelectedWardName(feature.wardName)}
                />
              );
            })}
          </svg>
        </div>

        <aside className="map-panel">
          {selectedWard ? (
            <>
              <h3>{selectedWard.wardName}</h3>
              <p className={`aqi-band ${selectedWard.band.className}`}>
                AQI {Math.round(Number(selectedWard.properties.aqi || 0))} - {selectedWard.band.label}
              </p>
              <p className="quality-line">
                Data quality: <strong>{selectedWard.properties.data_quality || 'unknown'}</strong>
              </p>

              <div className="panel-metrics">
                <div><span>PM2.5</span><strong>{Math.round(Number(selectedWard.properties.pm2_5 || 0))}</strong></div>
                <div><span>PM10</span><strong>{Math.round(Number(selectedWard.properties.pm10 || 0))}</strong></div>
                <div><span>Traffic Score</span><strong>{Math.round(Number(selectedWard.properties.traffic_raw || 0))}</strong></div>
                <div><span>Industrial Sites</span><strong>{Math.round(Number(selectedWard.properties.industrial_count || 0))}</strong></div>
              </div>

              <div className="source-breakdown">
                <div className="source-row">
                  <span>Vehicular</span>
                  <div><i style={{ width: `${normalized.vehicular}%` }}></i></div>
                  <em>{normalized.vehicular}%</em>
                </div>
                <div className="source-row">
                  <span>Industrial</span>
                  <div><i style={{ width: `${normalized.industrial}%` }}></i></div>
                  <em>{normalized.industrial}%</em>
                </div>
                <div className="source-row">
                  <span>Other</span>
                  <div><i style={{ width: `${normalized.other}%` }}></i></div>
                  <em>{normalized.other}%</em>
                </div>
              </div>

              {Array.isArray(selectedWard.properties.source_localities) && selectedWard.properties.source_localities.length > 0 && (
                <p className="source-note">
                  Source localities: {selectedWard.properties.source_localities.join(', ')}
                </p>
              )}

              <button
                className="btn-solid full"
                onClick={() => navigate(`/wards/${encodeURIComponent(selectedWard.wardName)}`)}
              >
                Open Full Ward Profile
              </button>
            </>
          ) : (
            <p>No ward selected.</p>
          )}
        </aside>
      </section>
    </div>
  );
};

export default MapView;
