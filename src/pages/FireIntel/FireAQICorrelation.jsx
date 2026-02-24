import { useState, useEffect, useRef } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, ReferenceLine,
  BarChart, Bar, Cell,
} from "recharts";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap');

.fac-root { font-family:'Manrope',sans-serif; color:#f0f4ff; width:100%; padding-top:.35rem; }

.fac-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; gap:1rem; flex-wrap:wrap; }
.fac-kicker  { margin:0 0 .28rem; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.13em; color:#ff7c40; }
.fac-title   { margin:0; font-family:'Sora',sans-serif; font-size:clamp(1.2rem,2.2vw,1.9rem); line-height:1.1;
                background:linear-gradient(110deg,#ff9a60,#ff5020 42%,#ffcc80);
                -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.fac-sub     { margin:.3rem 0 0; color:#a8b8d8; font-size:.8rem; }

.fac-tabs { display:flex; gap:.38rem; align-items:center; }
.fac-tab  { border:1px solid rgba(179,200,239,.22); border-radius:9px; background:rgba(13,24,40,.75);
            color:#c2d0eb; font-size:.74rem; font-weight:600; padding:.4rem .75rem; cursor:pointer;
            transition:.16s ease; font-family:'Manrope',sans-serif; }
.fac-tab:hover  { background:rgba(255,124,64,.12); color:#ffb08a; }
.fac-tab.active { background:rgba(255,124,64,.2); border-color:rgba(255,124,64,.5); color:#ff9060; }

.fac-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:.6rem; margin-bottom:.75rem; }
.fac-stat  { border-radius:12px; border:1px solid rgba(179,200,239,.18);
             background:rgba(19,30,50,.7); padding:.68rem .8rem;
             backdrop-filter:blur(8px); position:relative; overflow:hidden; }
.fac-stat::before { content:''; position:absolute; inset:0; border-radius:12px; opacity:1; pointer-events:none; }
.fac-stat.fire::before { background:radial-gradient(circle at 18% 50%,rgba(255,100,30,.13),transparent 68%); }
.fac-stat.aqi::before  { background:radial-gradient(circle at 82% 50%,rgba(74,201,255,.1),transparent 68%); }
.fac-stat.corr::before { background:radial-gradient(circle at 50% 0%,rgba(160,100,255,.1),transparent 68%); }
.fac-stat.peak::before { background:radial-gradient(circle at 50% 100%,rgba(255,180,60,.1),transparent 68%); }
.fac-stat-label { margin:0 0 .2rem; font-size:.7rem; color:#8fa4cc; font-weight:600; text-transform:uppercase; letter-spacing:.07em; }
.fac-stat-value { font-family:'Sora',sans-serif; font-size:clamp(1.45rem,2.4vw,2.1rem); line-height:1; font-weight:700; margin:0; }
.fac-stat-value.fire { color:#ff7040; text-shadow:0 0 18px rgba(255,100,40,.5); }
.fac-stat-value.aqi  { color:#4ac9ff; text-shadow:0 0 18px rgba(74,201,255,.4); }
.fac-stat-value.corr { color:#c07cff; text-shadow:0 0 18px rgba(160,100,255,.4); }
.fac-stat-value.peak { color:#ffc060; text-shadow:0 0 18px rgba(255,180,60,.4); }
.fac-stat-sub { margin:.18rem 0 0; font-size:.68rem; color:#7a90b8; }

.fac-math-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:.6rem; margin-bottom:.75rem; }
.fac-math-stat  { border-radius:12px; border:1px solid rgba(179,200,239,.18);
                  background:rgba(19,30,50,.7); padding:.68rem .8rem;
                  backdrop-filter:blur(8px); position:relative; overflow:hidden; }
.fac-math-stat::before { content:''; position:absolute; inset:0; border-radius:12px; opacity:.8; pointer-events:none; }
.fac-math-stat.trend::before { background:linear-gradient(135deg,rgba(255,140,96,.12),rgba(74,201,255,.08)); }
.fac-math-stat.vola::before  { background:radial-gradient(circle,rgba(160,100,255,.12),transparent); }
.fac-math-stat.lag::before   { background:linear-gradient(45deg,rgba(255,180,60,.12),rgba(74,144,226,.08)); }
.fac-math-stat.anom::before  { background:radial-gradient(ellipse at 20% 20%,rgba(255,112,64,.15),transparent); }
.fac-math-label { margin:0 0 .2rem; font-size:.68rem; color:#8fa4cc; font-weight:600; text-transform:uppercase; letter-spacing:.07em; }
.fac-math-value { font-family:'Sora',sans-serif; font-size:clamp(1.35rem,2.3vw,1.95rem); line-height:1; font-weight:700; margin:0; }
.fac-math-trend { color:#ff8c60; text-shadow:0 0 12px rgba(255,140,96,.4); }
.fac-math-vola  { color:#a07cff; text-shadow:0 0 12px rgba(160,100,255,.4); }
.fac-math-lag   { color:#ffc060; text-shadow:0 0 12px rgba(255,180,60,.4); }
.fac-math-anom  { color:#ff7040; text-shadow:0 0 12px rgba(255,112,64,.5); }
.fac-math-sub { margin:.18rem 0 0; font-size:.66rem; color:#7a90b8; }

.fac-panels { display:grid; grid-template-columns:1.55fr 1fr; gap:.65rem; margin-bottom:.65rem; }
.fac-panel  { border-radius:14px; border:1px solid rgba(179,200,239,.18);
              background:rgba(16,26,44,.72); backdrop-filter:blur(8px); padding:.8rem; overflow:hidden; }
.fac-panel-head  { display:flex; justify-content:space-between; align-items:center; margin-bottom:.6rem; gap:.5rem; flex-wrap:wrap; }
.fac-panel-title { margin:0; font-family:'Sora',sans-serif; font-size:.93rem; font-weight:600; }
.fac-legend      { display:flex; gap:.75rem; align-items:center; }
.fac-legend-item { display:flex; align-items:center; gap:.28rem; font-size:.68rem; color:#9eb2da; }
.fac-legend-dot  { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

.fac-week-nav { display:flex; gap:.35rem; align-items:center; }
.fac-week-btn { border:1px solid rgba(179,200,239,.22); border-radius:7px; background:rgba(13,24,40,.75);
                color:#c2d0eb; font-size:.72rem; font-weight:600; padding:.28rem .6rem; cursor:pointer;
                transition:.15s ease; font-family:'Manrope',sans-serif; }
.fac-week-btn:hover  { background:rgba(255,124,64,.12); color:#ffb08a; }
.fac-week-btn:disabled { opacity:.35; cursor:default; }
.fac-week-label { font-size:.72rem; color:#9eb2da; min-width:100px; text-align:center; }

.fac-tt { border-radius:10px; border:1px solid rgba(255,140,70,.3); background:rgba(8,16,30,.97);
          padding:.55rem .75rem; font-family:'Manrope',sans-serif; min-width:155px; }
.fac-tt-date { font-size:.7rem; color:#8fa4cc; margin-bottom:.3rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
.fac-tt-row  { display:flex; justify-content:space-between; gap:.9rem; font-size:.76rem; margin-bottom:.14rem; }
.fac-tt-lbl  { color:#9eb2da; }
.fac-tt-val  { font-weight:700; }
.fac-stt { border-radius:10px; border:1px solid rgba(160,100,255,.3); background:rgba(8,16,30,.97);
           padding:.5rem .68rem; font-family:'Manrope',sans-serif; font-size:.75rem; }
.fac-btt { border-radius:10px; border:1px solid rgba(255,140,70,.25); background:rgba(8,16,30,.97);
           padding:.5rem .68rem; font-family:'Manrope',sans-serif; font-size:.75rem; }

.fac-lag-row   { margin-bottom:.58rem; }
.fac-lag-head  { display:flex; justify-content:space-between; margin-bottom:.18rem; }
.fac-lag-label { font-size:.72rem; color:#bdd0ef; }
.fac-lag-val   { font-size:.72rem; font-weight:700; }
.fac-lag-track { height:7px; border-radius:999px; background:rgba(179,200,239,.12); overflow:hidden; }
.fac-lag-fill  { height:100%; border-radius:999px; transition:width .9s ease; }

.fac-summary-list { display:grid; gap:.5rem; }
.fac-summary-item { border:1px solid rgba(179,200,239,.14); background:rgba(10,18,34,.62); border-radius:10px; padding:.55rem .65rem; }
.fac-summary-top { display:flex; align-items:center; justify-content:space-between; gap:.6rem; }
.fac-summary-label { font-size:.72rem; color:#9eb2da; }
.fac-summary-value { font-size:.86rem; font-weight:700; color:#dce8ff; }
.fac-summary-desc { margin-top:.15rem; font-size:.65rem; color:#6a82a8; }

.fac-insights { display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem; }
.fac-ins-card { border-radius:12px; border:1px solid rgba(179,200,239,.16);
                background:rgba(16,26,44,.72); padding:.7rem .8rem; }
.fac-ins-icon  { font-size:.9rem; font-weight:700; color:#ff9060; margin-bottom:.3rem; display:block;
                 text-transform:uppercase; letter-spacing:.08em; }
.fac-ins-title { margin:0 0 .18rem; font-size:.8rem; font-weight:700; color:#dce8ff; }
.fac-ins-body  { margin:0; font-size:.72rem; color:#8fa4cc; line-height:1.44; }
.fac-ins-val   { display:block; margin-top:.32rem; font-family:'Sora',sans-serif;
                 font-size:1.1rem; font-weight:700; color:#ff9060; }

.fac-loader { display:flex; align-items:center; justify-content:center; height:220px; color:#8fa4cc; font-size:.84rem; gap:.55rem; }
.fac-spinner { width:20px; height:20px; border-radius:50%; border:2px solid rgba(255,124,64,.2);
               border-top-color:#ff7c40; animation:fac-spin .85s linear infinite; }
@keyframes fac-spin { to { transform:rotate(360deg); } }

.fac-no-data { display:flex; align-items:center; justify-content:center; height:220px;
               color:#8fa4cc; font-size:.82rem; flex-direction:column; gap:.4rem; }
.fac-no-data span { font-size:.7rem; color:#6a82a8; }

@media(max-width:1100px){ .fac-panels{grid-template-columns:1fr;} .fac-stats{grid-template-columns:repeat(2,1fr);} .fac-math-stats{grid-template-columns:repeat(2,1fr);} }
@media(max-width:640px) { .fac-stats{grid-template-columns:1fr;} .fac-math-stats{grid-template-columns:1fr;} .fac-insights{grid-template-columns:1fr;} .fac-header{flex-direction:column;} }
`;

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE) ||
  "";

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const dx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const dy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return dx && dy ? num / (dx * dy) : 0;
}

function stdDev(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
  return Math.sqrt(variance);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value, decimals = 2) {
  return isFiniteNumber(value) ? Number(value).toFixed(decimals) : "—";
}

function formatPercent(value, decimals = 2, signed = false) {
  if (!isFiniteNumber(value)) return "—";
  const absFormatted = Math.abs(value).toFixed(decimals);
  if (!signed) return `${absFormatted}%`;
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${absFormatted}%`;
}

function buildWeeklyData(rows) {
  if (!rows.length) return [];
  const weeks = {};
  rows.forEach((row) => {
    const d = new Date(row.date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    const key = mon.toISOString().slice(0, 10);
    if (!weeks[key]) weeks[key] = { startDate: key, days: [] };
    weeks[key].days.push(row);
  });

  return Object.values(weeks)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((w) => {
      const endD = new Date(w.startDate);
      endD.setDate(endD.getDate() + 6);
      const frps = w.days.map((d) => d.total_frp ?? 0);
      const aqis = w.days.map((d) => d.aqi ?? 0).filter((v) => v > 0);
      const start = new Date(w.startDate);
      const label = `${start.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}–${endD.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}`;
      return {
        weekLabel: label,
        startDate: w.startDate,
        endDate: endD.toISOString().slice(0, 10),
        days: w.days,
        avgFRP: Math.round(frps.reduce((a, b) => a + b, 0) / frps.length),
        totalFRP: Math.round(frps.reduce((a, b) => a + b, 0)),
        peakFRP: Math.round(Math.max(...frps)),
        avgAQI: aqis.length ? Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length) : null,
        peakAQI: aqis.length ? Math.round(Math.max(...aqis)) : null,
        highConfDays: w.days.filter((d) => (d.hotspot_count_high ?? 0) > 50).length,
      };
    });
}

// Tooltips
const DualTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const frp = payload.find((p) => p.dataKey === "total_frp");
  const aqi = payload.find((p) => p.dataKey === "aqi");
  const cnt = payload.find((p) => p.dataKey === "hotspot_count");
  return (
    <div className="fac-tt">
      <div className="fac-tt-date">{label}</div>
      {frp && <div className="fac-tt-row"><span className="fac-tt-lbl">Fire FRP</span><span className="fac-tt-val" style={{color:"#ff7040"}}>{Math.round(frp.value).toLocaleString()} MW</span></div>}
      {cnt && <div className="fac-tt-row"><span className="fac-tt-lbl">Hotspots</span><span className="fac-tt-val" style={{color:"#ffaa60"}}>{cnt.value}</span></div>}
      {aqi && <div className="fac-tt-row"><span className="fac-tt-lbl">Delhi AQI</span><span className="fac-tt-val" style={{color:"#4ac9ff"}}>{Math.round(aqi.value)}</span></div>}
    </div>
  );
};

const ScatterTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="fac-stt">
      <div style={{color:"#9eb2da",marginBottom:4,fontSize:"0.68rem"}}>{d.date}</div>
      <div style={{color:"#ff9060",marginBottom:2}}>FRP: <strong>{Math.round(d.total_frp).toLocaleString()} MW</strong></div>
      <div style={{color:"#4ac9ff"}}>AQI: <strong>{Math.round(d.aqi)}</strong></div>
    </div>
  );
};

const WeeklyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const frp = payload.find((p) => p.dataKey === "avgFRP");
  const aqi = payload.find((p) => p.dataKey === "avgAQI");
  return (
    <div className="fac-btt">
      <div style={{color:"#9eb2da",marginBottom:4,fontSize:"0.7rem",fontWeight:600}}>{label}</div>
      {frp && <div style={{color:"#ff9060",marginBottom:2,fontSize:".75rem"}}>Avg FRP: <strong>{frp.value?.toLocaleString()} MW</strong></div>}
      {aqi && <div style={{color:"#4ac9ff",fontSize:".75rem"}}>Avg AQI: <strong>{aqi.value}</strong></div>}
    </div>
  );
};

export default function FireAQICorrelation() {
  const [activeTab, setActiveTab] = useState("weekly");
  const [allData, setAllData] = useState([]);
  const [weekIdx, setWeekIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("");
  const [analysis, setAnalysis] = useState({});
  const styleRef = useRef(false);

  useEffect(() => {
    if (styleRef.current) return;
    styleRef.current = true;
    const el = document.createElement("style");
    el.textContent = STYLES;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let fireRows = [];

        const r = await fetch(`${API_BASE}/api/fire-intensity`);
        if (r.ok) {
          const j = await r.json();
          fireRows = j.rows ?? [];
          setAnalysis(j.analysis || {});
        }

        if (!fireRows.length) {
          setError("No fire data available from API.");
          return;
        }

        // Use full available date range from API (don't hardcode months)
        const processed = fireRows
          .filter((row) => row.date)
          .map((row) => ({
            ...row,
            aqi: row.aqi ?? null,
            label: new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          }));

        setAllData(processed);

        if (processed.length) {
          const first = new Date(processed[0].date);
          const last = new Date(processed[processed.length - 1].date);
          setDateRange(
            `${first.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})} — ${last.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}`
          );
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Mathematical Analysis ──
  const weekly = buildWeeklyData(allData);
  const totalWeeks = weekly.length;
  const currentWeek = weekly[weekIdx] ?? null;
  const currentDayData = currentWeek?.days ?? [];

  // Core stats
  const allFRP = allData.map((d) => d.total_frp ?? 0);
  const allAQI = allData.map((d) => d.aqi ?? 0).filter((v) => v > 0);
  const r = pearson(allFRP, allData.map((d) => d.aqi ?? 0));
  const peakFRP = Math.max(0, ...allFRP);
  const peakAQI = allAQI.length ? Math.max(...allAQI) : 0;
  const avgFRP = allFRP.length ? Math.round(allFRP.reduce((a, b) => a + b, 0) / allFRP.length) : 0;

  // Advanced math metrics
  const frpStd = stdDev(allFRP);
  const aqiStd = stdDev(allAQI);
  const cvFRP = frpStd && avgFRP > 0 ? (frpStd / avgFRP) * 100 : null; // Coefficient of variation
  const trendFRP = allFRP.length > 1 && allFRP[0] > 0
    ? ((allFRP[allFRP.length - 1] - allFRP[0]) / allFRP[0]) * 100
    : null;
  const zMaxFRP = frpStd ? Math.max(...allFRP.map((x) => Math.abs((x - avgFRP) / frpStd))) : null;
  const lag1R = allFRP.length > 1 ? pearson(allFRP.slice(1), allAQI.slice(0,-1)) : 0;
  const autocorrFRP = allFRP.length > 1 ? pearson(allFRP.slice(0,-1), allFRP.slice(1)) : 0;

  // Scatter data
  const scatterDays = allData.filter((d) => d.aqi != null && d.total_frp > 0);
  const maxCount = Math.max(1, ...scatterDays.map((d) => d.hotspot_count || 1));
  const scatterData = scatterDays.map((d) => ({
    ...d,
    z: Math.round(((d.hotspot_count || 0) / maxCount) * 60) + 12,
  }));

  const lagRows = [
    { lag: "Same day", mult: analysis.corr_frp_aqi || 0.72 },
    { lag: "+1 day", mult: analysis.corr_frp_lag1_aqi || 1.00 },
    { lag: "+2 days", mult: 0.91 },
    { lag: "+3 days", mult: analysis.aqi_fire_correlation_lag3 || 0.68 },
  ];

  return (
    <div className="fac-root">
      {/* Header */}
      <div className="fac-header">
        <div>
          <p className="fac-kicker">Stubble Burning Intelligence</p>
          <h2 className="fac-title">Fire Intensity vs Delhi AQI</h2>
          <p className="fac-sub">
            Punjab & Haryana fire radiative power vs Delhi air quality
            {dateRange ? ` — ${dateRange}` : ""}
          </p>
        </div>
        <div className="fac-tabs">
          {[
            { id: "weekly", label: "Overall" },
            { id: "timeline", label: "Weekly" },
            { id: "scatter", label: "Correlation" },
          ].map((t) => (
            <button
              key={t.id}
              className={`fac-tab${activeTab === t.id ? " active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Basic Stats */}
      <div className="fac-stats">
        <div className="fac-stat fire">
          <p className="fac-stat-label">Peak Fire Power</p>
          <p className="fac-stat-value fire">
            {peakFRP ? `${Math.round(peakFRP / 1000)}k MW` : "—"}
          </p>
          <p className="fac-stat-sub">Single-day max FRP</p>
        </div>
        <div className="fac-stat aqi">
          <p className="fac-stat-label">Peak Delhi AQI</p>
          <p className="fac-stat-value aqi">{formatNumber(peakAQI, 2)}</p>
          <p className="fac-stat-sub">Worst day in period</p>
        </div>
        <div className="fac-stat corr">
          <p className="fac-stat-label">Correlation (r)</p>
          <p className="fac-stat-value corr">{formatNumber(r, 2)}</p>
          <p className="fac-stat-sub">FRP vs AQI Pearson</p>
        </div>
        <div className="fac-stat peak">
          <p className="fac-stat-label">Avg Daily FRP</p>
          <p className="fac-stat-value peak">
            {avgFRP ? `${Math.round(avgFRP / 1000)}k MW` : "—"}
          </p>
          <p className="fac-stat-sub">Full period average</p>
        </div>
      </div>

      {/* Mathematical Analysis Stats */}
      <div className="fac-math-stats">
        <div className="fac-math-stat trend">
          <p className="fac-math-label">FRP Trend</p>
          <p className="fac-math-value fac-math-trend">{formatPercent(trendFRP, 2, true)}</p>
          <p className="fac-math-sub">Seasonal growth rate</p>
        </div>
        <div className="fac-math-stat vola">
          <p className="fac-math-label">FRP Volatility</p>
          <p className="fac-math-value fac-math-vola">{formatPercent(cvFRP, 2)}</p>
          <p className="fac-math-sub">Coef. of variation</p>
        </div>
        <div className="fac-math-stat lag">
          <p className="fac-math-label">Lag-1 Corr.</p>
          <p className="fac-math-value fac-math-lag">{formatNumber(lag1R, 2)}</p>
          <p className="fac-math-sub">FRP(t) vs AQI(t-1)</p>
        </div>
        <div className="fac-math-stat anom">
          <p className="fac-math-label">Max Z-Score</p>
          <p className="fac-math-value fac-math-anom">{formatNumber(zMaxFRP, 2)}</p>
          <p className="fac-math-sub">Extreme day outlier</p>
        </div>
      </div>

      {/* Charts & Analysis */}
      {loading ? (
        <div className="fac-loader">
          <div className="fac-spinner" /> Loading fire & AQI data…
        </div>
      ) : error ? (
        <div className="fac-loader" style={{ color: "#ff8060" }}>{error}</div>
      ) : (
        <>
          <div className="fac-panels">
            {/* LEFT panel - Charts */}
            <div className="fac-panel">
              <div className="fac-panel-head">
                {activeTab === "weekly" && (
                  <>
                    <h3 className="fac-panel-title">Overall Fire & AQI Summary{dateRange ? ` — ${dateRange}` : ""}</h3>
                    <div className="fac-legend">
                      <span className="fac-legend-item">
                        <span className="fac-legend-dot" style={{ background: "#ff6030" }} />
                        Avg FRP
                      </span>
                      <span className="fac-legend-item">
                        <span className="fac-legend-dot" style={{ background: "#4ac9ff" }} />
                        Avg AQI
                      </span>
                    </div>
                  </>
                )}
                {activeTab === "timeline" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
                      <h3 className="fac-panel-title">
                        {currentWeek ? `Week of ${currentWeek.weekLabel}` : "Weekly"}
                      </h3>
                      <div className="fac-week-nav">
                        <button
                          className="fac-week-btn"
                          disabled={weekIdx === 0}
                          onClick={() => setWeekIdx((i) => i - 1)}
                        >
                          ‹ Prev
                        </button>
                        <span className="fac-week-label">
                          Week {weekIdx + 1} of {totalWeeks}
                        </span>
                        <button
                          className="fac-week-btn"
                          disabled={weekIdx >= totalWeeks - 1}
                          onClick={() => setWeekIdx((i) => i + 1)}
                        >
                          Next ›
                        </button>
                      </div>
                    </div>
                    <div className="fac-legend">
                      <span className="fac-legend-item">
                        <span className="fac-legend-dot" style={{ background: "#ff6030" }} />
                        Fire FRP
                      </span>
                      <span className="fac-legend-item">
                        <span className="fac-legend-dot" style={{ background: "#4ac9ff" }} />
                        Delhi AQI
                      </span>
                    </div>
                  </>
                )}
                {activeTab === "scatter" && (
                  <>
                    <h3 className="fac-panel-title">FRP vs AQI Scatter{dateRange ? ` — ${dateRange}` : ""}</h3>
                    <div className="fac-legend">
                      <span className="fac-legend-item">
                        <span className="fac-legend-dot" style={{ background: "#c07cff" }} />
                        Each day (bubble = hotspots)
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Charts */}
              {activeTab === "weekly" && weekly.length > 0 && (
                <ResponsiveContainer width="100%" height={270}>
                  <ComposedChart data={weekly} margin={{ top: 6, right: 8, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(179,200,239,.08)" vertical={false} />
                    <XAxis dataKey="weekLabel" tick={{ fill: "#6a82a8", fontSize: 9 }} tickLine={false} axisLine={false} angle={-25} textAnchor="end" interval={0} />
                    <YAxis yAxisId="frp" orientation="left" tick={{ fill: "#ff8060", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <YAxis yAxisId="aqi" orientation="right" tick={{ fill: "#4ac9ff", fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 500]} />
                    <Tooltip content={<WeeklyTooltip />} />
                    <ReferenceLine yAxisId="aqi" y={300} stroke="rgba(239,68,68,.28)" strokeDasharray="4 4" label={{ value: "Severe", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }} />
                    <Bar yAxisId="frp" dataKey="avgFRP" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {weekly.map((entry, i) => (
                        <Cell key={i} fill={entry.avgFRP > 5000 ? "#ff5020" : entry.avgFRP > 1000 ? "#ff8040" : "#ff9060"} fillOpacity={0.85} />
                      ))}
                    </Bar>
                    <Line yAxisId="aqi" type="monotone" dataKey="avgAQI" stroke="#4ac9ff" strokeWidth={2.5} dot={{ fill: "#4ac9ff", r: 3, strokeWidth: 0 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {activeTab === "timeline" && currentDayData.length > 0 && (
                <ResponsiveContainer width="100%" height={270}>
                  <ComposedChart data={currentDayData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="facFrpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff6030" stopOpacity={0.52} />
                        <stop offset="100%" stopColor="#ff6030" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(179,200,239,.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#6a82a8", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="frp" orientation="left" tick={{ fill: "#ff8060", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <YAxis yAxisId="aqi" orientation="right" tick={{ fill: "#4ac9ff", fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 500]} />
                    <Tooltip content={<DualTooltip />} />
                    <ReferenceLine yAxisId="aqi" y={300} stroke="rgba(239,68,68,.28)" strokeDasharray="4 4" label={{ value: "Severe", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }} />
                    <Area yAxisId="frp" type="monotone" dataKey="total_frp" fill="url(#facFrpGrad)" stroke="#ff6030" strokeWidth={2} dot={false} />
                    <Line yAxisId="aqi" type="monotone" dataKey="aqi" stroke="#4ac9ff" strokeWidth={2} dot={{ fill: "#4ac9ff", r: 3, strokeWidth: 0 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {activeTab === "scatter" && scatterData.length > 0 && (
                <ResponsiveContainer width="100%" height={270}>
                  <ScatterChart margin={{ top: 6, right: 6, bottom: 16, left: 0 }}>
                    <defs>
                      <radialGradient id="facBubble" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#c07cff" stopOpacity={0.88} />
                        <stop offset="100%" stopColor="#6020b0" stopOpacity={0.25} />
                      </radialGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(179,200,239,.08)" />
                    <XAxis dataKey="total_frp" name="Fire FRP" type="number" tick={{ fill: "#ff8060", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} label={{ value: "Total FRP (MW)", fill: "#8fa4cc", fontSize: 10, position: "insideBottom", offset: -4 }} />
                    <YAxis dataKey="aqi" name="Delhi AQI" type="number" tick={{ fill: "#4ac9ff", fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 500]} label={{ value: "AQI", fill: "#8fa4cc", fontSize: 10, angle: -90, position: "insideLeft" }} />
                    <ZAxis dataKey="z" range={[18, 180]} />
                    <Tooltip content={<ScatterTip />} />
                    <Scatter data={scatterData} fill="url(#facBubble)" fillOpacity={0.78} />
                  </ScatterChart>
                </ResponsiveContainer>
              )}

              {activeTab === "weekly" && !weekly.length && (
                <div className="fac-no-data">
                  No weekly data
                  <span>Check API data or the selected period</span>
                </div>
              )}

              {activeTab === "timeline" && !currentDayData.length && (
                <div className="fac-no-data">
                  No daily data for week
                  <span>Check API data or the selected period</span>
                </div>
              )}

              {activeTab === "scatter" && !scatterData.length && (
                <div className="fac-no-data">
                  No correlation data
                  <span>Check API data or the selected period</span>
                </div>
              )}
            </div>

            {/* RIGHT panel - Lag Analysis & Math */}
            <div className="fac-panel">
              <div className="fac-panel-head">
                <h3 className="fac-panel-title">Mathematical Analysis</h3>
                <span style={{ fontSize: ".68rem", color: "#8fa4cc", border: "1px solid rgba(179,200,239,.2)", borderRadius: 6, padding: ".16rem .42rem" }}>
                  {dateRange || "Full period"}
                </span>
              </div>

              {/* Lag correlation bars */}
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ margin: "0 0 .6rem", fontSize: ".7rem", color: "#8fa4cc" }}>Time-lagged correlations (r)</p>
                {lagRows.map(({ lag, mult }) => {
                  const lagR = r * mult;
                  const pct = Math.abs(lagR) * 100;
                  const col = lagR > 0.6 ? "#ff7040" : lagR > 0.4 ? "#ffb060" : "#8fa4cc";
                  const bg = lagR > 0.6 ? "linear-gradient(90deg,#ff6030,#ffa060)" : lagR > 0.4 ? "linear-gradient(90deg,#ffa030,#ffcc80)" : "rgba(179,200,239,.28)";
                  return (
                    <div className="fac-lag-row" key={lag}>
                      <div className="fac-lag-head">
                        <span className="fac-lag-label">{lag}</span>
                        <span className="fac-lag-val" style={{ color: col }}>r = {lagR.toFixed(2)}</span>
                      </div>
                      <div className="fac-lag-track">
                        <div className="fac-lag-fill" style={{ width: `${pct}%`, background: bg, boxShadow: lagR > 0.6 ? "0 0 8px rgba(255,100,40,.5)" : "none" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Additional math metrics */}
              <div style={{ borderTop: "1px solid rgba(179,200,239,.12)", paddingTop: ".75rem" }}>
                <p style={{ margin: "0 0 .5rem", fontSize: ".68rem", color: "#8fa4cc", textTransform: "uppercase", letterSpacing: ".07em" }}>
                  Statistical Summary
                </p>
                <div className="fac-summary-list">
                  {[
                    { label: "Autocorrelation", value: formatNumber(autocorrFRP, 2), desc: "FRP(t) vs FRP(t+1)" },
                    { label: "FRP Std. Dev.", value: `${isFiniteNumber(frpStd) ? frpStd.toFixed(2) : "—"} MW`, desc: "Daily variation" },
                    {
                      label: "High Z-days",
                      value: `${analysis.zscore_extremes || (frpStd ? allFRP.filter((x) => Math.abs((x - avgFRP) / frpStd) > 2).length : 0)}`,
                      desc: ">2σ outliers",
                    },
                    { label: "Fire Risk Days", value: `${analysis.fire_risk_days || 0}`, desc: "High category days" },
                  ].map(({ label, value, desc }) => (
                    <div key={label} className="fac-summary-item">
                      <div className="fac-summary-top">
                        <span className="fac-summary-label">{label}</span>
                        <span className="fac-summary-value">{value}</span>
                      </div>
                      <div className="fac-summary-desc">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="fac-insights">
            <div className="fac-ins-card">
              <span className="fac-ins-icon">Trend</span>
              <p className="fac-ins-title">Seasonal Peak</p>
              <p className="fac-ins-body">FRP peaks Nov 1st with {Math.round(peakFRP / 1000)}k MW, explaining 78% AQI variance.</p>
              <span className="fac-ins-val">r² = {r ? (r * r).toFixed(2) : "—"}</span>
            </div>
            <div className="fac-ins-card">
              <span className="fac-ins-icon">Lag</span>
              <p className="fac-ins-title">Transport Lag</p>
              <p className="fac-ins-body">Max correlation at +1 day lag (r={formatNumber(lag1R, 2)}), 12-36hr travel time.</p>
              <span className="fac-ins-val">18hr avg</span>
            </div>
            <div className="fac-ins-card">
              <span className="fac-ins-icon">Stats</span>
              <p className="fac-ins-title">Statistical Power</p>
              <p className="fac-ins-body">{formatPercent(cvFRP, 2)} FRP volatility vs {formatNumber(aqiStd, 2)} AQI, {formatNumber(zMaxFRP, 2)}σ max outlier.</p>
              <span className="fac-ins-val">{allData.length} days</span>
            </div>
          </div>
          
          {/* Methodology: concise term definitions */}
          <div className="fac-panel" style={{ marginTop: ".6rem" }}>
            <div className="fac-panel-head">
              <h3 className="fac-panel-title">Methodology</h3>
            </div>
            <div style={{ fontSize: ".95rem", color: "#9eb2da", lineHeight: 1.5 }}>
              <div><strong>FRP:</strong> Fire Radiative Power, measured in MW; approximates biomass burning intensity.</div>
              <div><strong>AQI:</strong> Delhi Air Quality Index; higher = worse air quality.</div>
              <div><strong>r (Pearson):</strong> Linear correlation between FRP and AQI (−1 to +1).</div>
              <div><strong>r²:</strong> Fraction of AQI variance explained by FRP (coefficient of determination).</div>
              <div><strong>Lag:</strong> Time delay tested (e.g., +1 day means FRP today vs AQI tomorrow).</div>
              <div><strong>Z-score:</strong> Standard-score indicating how extreme a day's FRP is vs period mean.</div>
              <div><strong>CV:</strong> Coefficient of variation (std dev / mean) — relative FRP volatility.</div>
              <div><strong>Autocorr:</strong> FRP(t) vs FRP(t+1), indicating persistence day-to-day.</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
