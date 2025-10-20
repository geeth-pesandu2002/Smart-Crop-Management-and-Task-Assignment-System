// web/src/pages/Resources.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import {
  getResourceMetrics,
  createResourceUsage,
  listPlots,
  listResourceUsages,
  deleteResourceUsage,
} from "../api.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

import { useLang } from "../i18n.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import { getAuth } from "../auth";

// --- NEW: consistent colors per resource type ---
const COLOR_MAP = {
  fertilizer: "#f97316", // orange
  seeds: "#8b5e34",      // brown
  pesticide: "#f59e0b",  // yellow/amber
};

// Money helper
const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

// Compute your app's main dashboard path once
function getDashboardPath() {
  const fromEnv = import.meta?.env?.VITE_DASHBOARD_PATH;
  if (fromEnv) return fromEnv;
  const role = getAuth?.()?.role;
  if (role === "manager" || role === "admin") return "/manager";
  return "/dashboard";
}

// Prefer common naming fields; fall back to id suffix
const plotLabel = (p) =>
  p?.name ||
  p?.plotName ||
  p?.title ||
  p?.fieldName ||
  p?.properties?.name ||
  p?.meta?.name ||
  (p?._id ? `Plot ${String(p._id).slice(-4)}` : "Unnamed plot");

export default function Resources() {
  const { lang } = useLang();
  const L = (en, si) => (lang === "si" ? si : en);
  const dashboardPath = getDashboardPath();

  const [plots, setPlots] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const [form, setForm] = useState({
    plotId: "",
    fieldName: "",
    quantityValue: "",
    quantityUnit: "kg",
    cost: "",
    date: dayjs().format("YYYY-MM-DD"),
    fertilizerName: "",
    cropSupported: "",
    plantedAreaAcres: "",
    pesticideNames: "",
  });
  const [tab, setTab] = useState("fertilizer"); // fertilizer | seeds | pesticide

  // --- Real-time: Broadcast to other pages (Reports) when data changes
  const bcRef = useRef(null);
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel("resources");
    } catch {
      bcRef.current = null; // older browsers / environments
    }
    return () => {
      try { bcRef.current?.close(); } catch {}
    };
  }, []);
  const notifyChange = () => {
    try { bcRef.current?.postMessage({ type: "changed", at: Date.now() }); } catch {}
    try { localStorage.setItem("resources:changed", String(Date.now())); } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const [plotsRes, metricsRes, usageRes] = await Promise.all([
          listPlots(),
          getResourceMetrics(year),
          listResourceUsages({ limit: 20 }),
        ]);
        const plotItems = Array.isArray(plotsRes) ? plotsRes : (plotsRes?.items || []);
        setPlots(plotItems);
        setMetrics(metricsRes);
        setUsages(usageRes.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [year]);

  const submit = async (e) => {
    e.preventDefault();
    const payload = { ...form, type: tab };
    if (!payload.plotId) return alert(L("Please choose a Plot", "කරුණාකර බිම් කොටසක් තෝරන්න"));

    await createResourceUsage(payload);

    setForm((f) => ({
      ...f,
      quantityValue: "",
      cost: "",
      fertilizerName: "",
      cropSupported: "",
      plantedAreaAcres: "",
      pesticideNames: "",
    }));

    const [metricsRes, usageRes] = await Promise.all([
      getResourceMetrics(year),
      listResourceUsages({ limit: 20 }),
    ]);
    setMetrics(metricsRes);
    setUsages(usageRes.items || []);

    notifyChange();
  };

  const handleDelete = async (id) => {
    if (!confirm(L("Delete this record?", "මෙම වාර්තාව මකන්නද?"))) return;
    await deleteResourceUsage(id);

    const [metricsRes, usageRes] = await Promise.all([
      getResourceMetrics(year),
      listResourceUsages({ limit: 20 }),
    ]);
    setMetrics(metricsRes);
    setUsages(usageRes.items || []);

    notifyChange();
  };

  // Localized chart keys
  const KEY_FERT = L("Fertilizer", "වරගෙය");
  const KEY_SEED = L("Seeds", "බීජ");
  const KEY_PEST = L("Pesticide", "කෘමිනාශක");
  const KEY_TOTAL = L("Total", "එකතුව");

  const monthlyChart = useMemo(() => {
    if (!metrics) return [];
    return metrics.monthly.map((m) => ({
      month: dayjs(`${metrics.year}-${m.month}-01`).format("MMM"),
      [KEY_FERT]: m.fertilizer,
      [KEY_SEED]: m.seeds,
      [KEY_PEST]: m.pesticide,
      [KEY_TOTAL]: m.total,
    }));
  }, [metrics, KEY_FERT, KEY_SEED, KEY_PEST, KEY_TOTAL]);

  // --- UPDATED: include original type + per-slice fill so legend & slices use our colors
  const distribution = useMemo(() => {
    if (!metrics) return [];
    return metrics.distribution.map((d) => {
      const type = d.type; // fertilizer | seeds | pesticide
      const name =
        type === "fertilizer" ? KEY_FERT :
        type === "seeds"      ? KEY_SEED : KEY_PEST;
      const fill = COLOR_MAP[type] || "#9ca3af";
      return { name, value: d.cost, type, fill };
    });
  }, [metrics, KEY_FERT, KEY_SEED, KEY_PEST]);

  // Legend payload colored like slices
  const legendPayload = useMemo(
    () => distribution.map(d => ({ value: d.name, color: d.fill, type: "square", id: d.type })),
    [distribution]
  );

  if (loading) return <div style={{ padding: 24 }}>{L("Loading…", "පූරණය වෙමින්…")}</div>;

  return (
    <div className="container" style={{ padding: 24, display: "grid", gap: 24 }}>
      {/* Top bar: title, dashboard button, language switcher, year */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{L("Resource Management", "සාධන කළමනාකරණය")}</h2>


        <div><LanguageSwitcher /></div>
        <Link to={dashboardPath}>
          <button
            style={{
              background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
              color: "#fff",
              fontWeight: 700,
              padding: "10px 22px",
              borderRadius: "999px",
              border: "none",
              boxShadow: "0 2px 8px rgba(34,197,94,0.10)",
              letterSpacing: "0.5px",
              fontSize: "15px",
              transition: "background 0.2s, box-shadow 0.2s",
              cursor: "pointer"
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(34,197,94,0.18)";
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(34,197,94,0.10)";
            }}
          >
            {L("Dashboard", "ඩෑෂ්බෝඩ්")}
          </button>
        </Link>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="field-label">{L("Year", "වර්ෂය")}</span>
          <input
            type="number"
            className="input"
            style={{ width: 120 }}
            value={year}
            onChange={(e) => setYear(Number(e.target.value || new Date().getFullYear()))}
          />
        </label>
      </div>

      {/* YTD KPIs */}
      {metrics && (
        <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(220px,1fr))", gap: 16 }}>
          <Kpi title={L("Total Resource Spend (YTD)", "මෙවැනි වර්ෂයදක් වියදම් එකතුව")} value={money(metrics.ytd.totalSpend)} />
          <Kpi title={L("Fertilizer Cost", "වරගෙය ගාස්තු")} value={money(metrics.ytd.fertilizerCost)} />
          <Kpi title={L("Redo/Seeds Cost", "බීජ/නැවත තැබීමේ ගාස්තු")} value={money(metrics.ytd.seedCost)} />
          <Kpi title={L("Pesticides Cost", "කෘමිනාශක ගාස්තු")} value={money(metrics.ytd.pesticideCost)} />
        </div>
      )}

      {/* Entry forms */}
      <section className="card" style={{ display: "grid", gap: 16 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          labels={{
            fertilizer: L("Fertilizer", "වරගෙය"),
            seeds: L("Redo (Seeds)", "නැවත තැබීම (බීජ)"),
            pesticide: L("Pesticide", "කෘමිනාශක"),
          }}
        />

        {/* 12-column layout; rows have safe gaps and overflow protections */}
        <form onSubmit={submit} className="form-grid">
          {/* Row 1: Plot (4) | Field (4) | Date (4) */}
          <Field span={4} label={L("Plot", "බිම් කොටස")}>
            <select
              className="select"
              value={form.plotId}
              onChange={(e) => setForm({ ...form, plotId: e.target.value })}
            >
              <option value="">{L("Select plot…", "බිම් කොටස තෝරාගන්න…")}</option>
              {plots.map((p) => (
                <option key={p._id} value={p._id}>
                  {plotLabel(p)}
                </option>
              ))}
            </select>
          </Field>

          <Field span={4} label={L("Field Name", "ක්ෂේත්‍ර නාමය")}>
            <input
              className="input"
              placeholder={L("e.g., Wheat field 1", "උදා: ගෝධුම් කෙත් 1")}
              value={form.fieldName}
              onChange={(e) => setForm({ ...form, fieldName: e.target.value })}
            />
          </Field>

          <Field span={4} label={L("Date", "දිනය")}>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>

          {/* Row 2 varies per tab */}
          {tab === "fertilizer" && (
            <>
              <Field span={6} label={L("Fertilizer Name", "වරගෙය නාමය")}>
                <input
                  className="input"
                  placeholder={L("e.g., Urea", "උදා: යූරියා")}
                  value={form.fertilizerName}
                  onChange={(e) => setForm({ ...form, fertilizerName: e.target.value })}
                />
              </Field>
              <Field span={6} label={L("Crop Supported", "බෝගය")}>
                <input
                  className="input"
                  placeholder={L("e.g., Wheat", "උදා: ගෝධුම්")}
                  value={form.cropSupported}
                  onChange={(e) => setForm({ ...form, cropSupported: e.target.value })}
                />
              </Field>
            </>
          )}

          {tab === "seeds" && (
            <>
              <Field span={4} label={L("Planted Area (acres)", "ස්ථාපිත ප්‍රමාණය (ඇකර්)")}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.plantedAreaAcres}
                  onChange={(e) => setForm({ ...form, plantedAreaAcres: e.target.value })}
                />
              </Field>
              <Spacer span={8} />
            </>
          )}

          {tab === "pesticide" && (
            <Field span={12} label={L("Pesticide Name(s)", "කෘමිනාශක නාම(ය)")}>
              <input
                className="input"
                placeholder={L("comma separated", "කොමාවෙන් වෙන්කරන්න")}
                value={form.pesticideNames}
                onChange={(e) => setForm({ ...form, pesticideNames: e.target.value })}
              />
            </Field>
          )}

          {/* Row 3: Quantity (4) | Unit (4) | Cost (4) */}
          <Field span={4} label={L("Quantity", "ප්‍රමාණය")}>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.quantityValue}
              onChange={(e) => setForm({ ...form, quantityValue: e.target.value })}
            />
          </Field>

          <Field span={4} label={L("Unit", "ඒකකය")}>
            <select
              className="select"
              value={form.quantityUnit}
              onChange={(e) => setForm({ ...form, quantityUnit: e.target.value })}
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="ml">ml</option>
              <option value="seeds">{L("seeds", "බීජ")}</option>
              <option value="plants">{L("plants", "රොප්පු")}</option>
            </select>
          </Field>

          <Field span={4} label={L("Cost (Rs.)", "ප්‍රමිතිගත වියදම (රු.)")}>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </Field>

          {/* Submit row */}
          <div style={{ gridColumn: "span 12 / span 12" }}>
            <button
              type="submit"
              style={{
                background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
                color: "#fff",
                fontWeight: 700,
                padding: "10px 22px",
                borderRadius: "999px",
                border: "none",
                boxShadow: "0 2px 8px rgba(34,197,94,0.10)",
                letterSpacing: "0.5px",
                fontSize: "15px",
                transition: "background 0.2s, box-shadow 0.2s",
                cursor: "pointer"
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(34,197,94,0.18)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(34,197,94,0.10)";
              }}
            >
              {tab === "seeds"
                ? L("Add Redo Usage", "නැවත තැබීම එකතු කරන්න")
                : tab === "fertilizer"
                ? L("Add Fertilizer Usage", "වරගෙය භාවිතය එකතු කරන්න")
                : L("Add Pesticide Usage", "කෘමිනාශක භාවිතය එකතු කරන්න")}
            </button>
          </div>
        </form>
      </section>

      {/* Recent usage list */}
      <section className="card">
        <h3 style={{ marginBottom: 12 }}>{L("Recent Resource Entries", "මෑත සාධන ඇතුළත්කිරීම්")}</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>{L("Date", "දිනය")}</th>
                <th>{L("Type", "වර්ගය")}</th>
                <th>{L("Field", "ක්ෂේත්‍රය")}</th>
                <th>{L("Qty", "ප්‍රමාණය")}</th>
                <th>{L("Cost", "වියදම")}</th>
                <th>{L("Extra", "අමතර")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usages.map((u) => (
                <tr key={u._id}>
                  <td>{dayjs(u.date).format("YYYY-MM-DD")}</td>
                  <td>{u.type}</td>
                  <td>{u.fieldName || "—"}</td>
                  <td>{u.quantity?.value} {u.quantity?.unit}</td>
                  <td>{money(u.cost)}</td>
                  <td>
                    {u.type === "fertilizer" && (u.fertilizerName || "—")}
                    {u.type === "seeds" && (u.plantedAreaAcres ? `${u.plantedAreaAcres} ${L("acres","ඇකර්")}` : "—")}
                    {u.type === "pesticide" && (Array.isArray(u.pesticideNames) ? u.pesticideNames.join(", ") : (u.pesticideNames || "—"))}
                  </td>
                  <td>
                    <button className="btn small danger" onClick={() => handleDelete(u._id)}>
                      {L("Delete", "මකන්න")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Charts */}
      <section className="grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div className="card">
          <h3>{L("Monthly Resource Cost (YTD)", "මාසික වියදම් (මෙවැනි වර්ෂය)")}</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChart}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey={KEY_FERT} strokeWidth={2} stroke={COLOR_MAP.fertilizer} dot={{ r: 4 }} />
                <Line type="monotone" dataKey={KEY_PEST} strokeWidth={2} stroke={COLOR_MAP.pesticide} dot={{ r: 4 }} />
                <Line type="monotone" dataKey={KEY_SEED} strokeWidth={2} stroke={COLOR_MAP.seeds} dot={{ r: 4 }} />
                <Line type="monotone" dataKey={KEY_TOTAL} strokeWidth={2} stroke="#0ea5e9" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>{L("Resource Category Distribution", "ප්‍රවර්ග වාරි බෙදාහැරීම")}</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  label
                >
                  {distribution.map((slice, i) => (
                    <Cell key={i} fill={slice.fill} />
                  ))}
                </Pie>
                <Tooltip />
                {/* Legend colored to match slices */}
                <Legend payload={legendPayload} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Styles tuned to prevent overflow and collisions */}
      <style>{`
        * { box-sizing: border-box; }
        .card { background: #fff; border-radius: 16px; padding: 18px; box-shadow: 0 2px 6px rgba(0,0,0,.05); }
        .btn { background:#0f172a; color:#fff; padding:10px 16px; border:none; border-radius:10px; cursor:pointer; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
        .btn.small { padding:6px 10px; border-radius:8px; }
        .btn.danger { background:#b91c1c; }
        .btn.linklike { text-decoration:none; display:inline-flex; align-items:center; }
        .input, .select {
          display:block;
          width:100%;
          max-width:100%;
          height:44px;
          padding:10px 12px;
          border:1px solid #e5e7eb;
          border-radius:10px;
          background:#fff;
          line-height:22px;
        }
        .table { width:100%; border-collapse: collapse; }
        .table th, .table td { text-align:left; padding:10px 12px; border-top:1px solid #eee; }
        .tabs { display:flex; gap:10px; }
        .tab { padding:10px 14px; border-radius:12px; border:1px solid #e5e7eb; cursor:pointer; background:#f9fafb; font-weight:600; }
        .tab.active { background:#0f172a; color:#fff; border-color:#0f172a; }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          column-gap: 18px;
          row-gap: 18px;
        }
        .field { display:flex; flex-direction:column; gap:6px; min-width:0; }
        .field > .input, .field > .select { min-width:0; }
        .field-label { font-size:12px; color:#6b7280; }
        input[type="date"].input { min-width:0; }
      `}</style>
    </div>
  );
}

/* ---------- small UI helpers ---------- */

function Kpi({ title, value }) {
  return (
    <div className="card">
      <div className="field-label" style={{ marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Tabs({ value, onChange, labels }) {
  const items = [
    { key: "fertilizer", label: labels?.fertilizer || "Fertilizer" },
    { key: "seeds", label: labels?.seeds || "Redo (Seeds)" },
    { key: "pesticide", label: labels?.pesticide || "Pesticide" },
  ];
  return (
    <div className="tabs">
      {items.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`tab ${value === key ? "active" : ""}`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Field/Spacer components for the 12-col grid */
function Field({ label, span = 4, children }) {
  return (
    <div className="field" style={{ gridColumn: `span ${span} / span ${span}` }}>
      {label ? <div className="field-label">{label}</div> : null}
      {children}
    </div>
  );
}
function Spacer({ span = 1 }) {
  return <div style={{ gridColumn: `span ${span} / span ${span}` }} />;
}
