// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"; // <-- useLocation added
import api, { getPlots } from "../api.js";
import { isAuthed, isManager } from "../auth";

import { MapContainer, TileLayer, Polygon, Tooltip, Popup } from "react-leaflet";
import { FARM } from "../farmConfig.js";

function useFetch(url, initial = null) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const { data } = await api.get(url);
        if (ok) setData(data);
      } catch (e) {
        if (ok) setErr(e?.response?.data?.error || "fetch failed");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, [url]);
  return { data, loading, err };
}

function colorFromString(s) {
  if (!s) return "#16a34a";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 60% 45%)`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation(); // <-- for active sidebar state

  const allowed = isAuthed() && isManager();

  const { data: taskSum, loading: loadTasks } = useFetch("/tasks/summary", null);

  const alerts = useMemo(() => ([
    { id: 1, title: "Low moisture - P-A3", level: "high" },
    { id: 2, title: "pH drift - P-B2", level: "med" },
    { id: 3, title: "Fertilizer overdue - P-C1", level: "low" },
  ]), []);
  const finance = { revenue: 150000, delta: +8.2 };

  const [plots, setPlots] = useState([]);
  const [loadingPlots, setLoadingPlots] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPlots({ withStats: true, limit: 500 });
        setPlots(res.items || res || []);
      } catch (e) {
        console.error("Failed to load plots", e);
      } finally {
        setLoadingPlots(false);
      }
    })();
  }, []);

  const legend = useMemo(() => {
    const counts = new Map();
    for (const p of plots) counts.set(p.cropType || "Unknown", (counts.get(p.cropType || "Unknown") || 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label]) => ({ label, color: colorFromString(label) }));
  }, [plots]);

  return (
    <>
      {!allowed && <Navigate to="/login" replace />}

  <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, height: "100vh", overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{
          background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.5)",
          backdropFilter: "blur(8px)", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 8
        }}>
          <div className="brand" style={{ fontWeight: 700, marginBottom: 8 }}>
            <img src="/images/logo.png" alt="" style={{ height: 24, marginRight: 8 }} />
            Manager
          </div>

          {/* active based on current pathname */}
          <NavLink to="/manager"   label="Dashboard"     active={location.pathname.startsWith("/manager")} />
          <NavLink to="/tasks"     label="Staff & Tasks" active={location.pathname.startsWith("/tasks")} />
          <NavLink to="/plots"     label="Land & Crop"   active={location.pathname.startsWith("/plots")} />
          <NavLink to="/resources" label="Resources"     active={location.pathname.startsWith("/resources")} />
          <NavLink to="/reports"   label="Reports"       active={location.pathname.startsWith("/reports")} />
          <NavLink to="/reports/field"   label="Field Reports"       active={location.pathname.startsWith("/reports/field")} />
          <NavLink to="/settings"  label="Settings"      active={location.pathname.startsWith("/settings")} />

          <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
            <Link to="/settings" className="btn outline">Help</Link>
            <Link to="/login" className="btn outline" onClick={() => localStorage.clear()}>Logout</Link>
          </div>
        </aside>

        {/* Main */}
        <main className="container" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <header className="nav" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Main Dashboard</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link to="/reports" className="btn outline">Notifications</Link>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.85)",
                display: "grid", placeItems: "center", fontWeight: 700
              }}>M</div>
            </div>
          </header>

          {/* Content (scrollable) */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px 24px' }}>
            {/* KPI row */}
            <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiCard title="Crop Status" big="95% Healthy" sub="Overall health of active crops" action="View Details" />
            <KpiCard title="Soil Condition Alerts" big={`${alerts.length} Active Alerts`} sub="Immediate issues from sensors" action="View Details" />
            <KpiCard
              title="Task Summary"
              big={loadTasks || !taskSum ? "…" : `${taskSum.pending} Pending`}
              sub="Tasks needing attention and in progress"
              action="View Details"
              to="/tasks"
            />
            <KpiCard
              title="Financial Snapshot"
              big={`Rs. ${finance.revenue.toLocaleString()}`}
              sub={`Revenue (Δ ${finance.delta > 0 ? "+" : ""}${finance.delta}%)`}
              action="View Details"
              to="/reports"
            />
            </section>

            {/* Map */}
            <section style={{ marginTop: 22 }}>
            <h3 style={{ margin: "8px 0 12px" }}>Interactive Farm Map</h3>

            <div className="card" style={{ position: "relative" }}>
              <div style={{ height: 560, borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
                <MapContainer
                  center={FARM.center}
                  zoom={16}
                  bounds={FARM.bounds}
                  maxBounds={FARM.bounds}
                  maxBoundsViscosity={1.0}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  {!loadingPlots && plots.map((p) => {
                    const ring = (p.geometry?.coordinates?.[0] || []).map(([lng, lat]) => [lat, lng]);
                    if (!ring.length) return null;
                    const color = colorFromString(p.cropType);
                    return (
                      <Polygon
                        key={p._id}
                        positions={ring}
                        pathOptions={{ color, weight: 2.5, fillOpacity: 0.3 }}
                        eventHandlers={{ click: () => navigate(`/plots/${p._id}`) }}
                      >
                        <Tooltip sticky>
                          <div style={{ fontWeight: 700 }}>{p.fieldName}</div>
                          <div style={{ fontSize: 12 }}>
                            {p.cropType || "—"} · {p.area} {p.areaUnit}
                          </div>
                        </Tooltip>
                        <Popup>
                          <div style={{ minWidth: 200 }}>
                            <div style={{ fontWeight: 800, marginBottom: 6 }}>{p.fieldName}</div>
                            <div><b>Crop:</b> {p.cropType || "—"}</div>
                            <div><b>Area:</b> {p.area} {p.areaUnit}</div>
                            <div><b>Planted:</b> {p.plantingDate ? new Date(p.plantingDate).toLocaleDateString() : "—"}</div>
                            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                              <button className="btn sm" onClick={() => navigate(`/plots/${p._id}`)}>
                                Open plot
                              </button>
                              <button className="btn ghost sm" onClick={() => navigate("/plots")}>
                                See list
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Polygon>
                    );
                  })}
                </MapContainer>
              </div>

              {/* Legend */}
              {legend.length > 0 && (
                <div className="card" style={{
                  position: "absolute", right: 14, top: 14,
                  padding: 10, borderRadius: 12, width: 220
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Crops</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 6, columnGap: 8 }}>
                    {legend.map((l) => (
                      <div key={l.label} style={{ display: "contents" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 12, height: 12, borderRadius: 3,
                              background: l.color, border: "1px solid rgba(0,0,0,.1)",
                            }}
                          />
                          <span style={{ fontSize: 13 }}>{l.label}</span>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>
                          {plots.filter((p) => (p.cropType || "Unknown") === l.label).length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </section>
          </div>

          <div className="footer" style={{ marginTop: 12, padding: '12px 24px' }}>© 2025 Labuduwa Farmhouse</div>
        </main>
      </div>
    </>
  );
}

function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: active ? "rgba(22,163,74,.12)" : "transparent",
        color: active ? "#166534" : "inherit",
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  );
}

function KpiCard({ title, big, sub, action, to }) {
  const content = (
    <div className="card" style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{big}</div>
      <div className="p" style={{ margin: 0 }}>{sub}</div>
      <div style={{ marginTop: 6 }}>
        <span className="link">{action}</span>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}
