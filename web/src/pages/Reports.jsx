// web/src/pages/Reports.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import api, { getResourceMetrics, listResourceUsages } from "../api.js";
import { getAuth } from "../auth";
import { useLang } from "../i18n.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

// ----- helpers -----
function getDashboardPath() {
  const fromEnv = import.meta?.env?.VITE_DASHBOARD_PATH;
  if (fromEnv) return fromEnv;
  const role = getAuth?.()?.role;
  if (role === "manager" || role === "admin") return "/manager";
  return "/dashboard";
}
const DASHBOARD_PATH = getDashboardPath();

const COLORS = {
  fertilizer: "#ff7a00", // orange
  seeds: "#8B5E3C",      // brown
  pesticide: "#FFD166",  // yellow
};

const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function Reports() {
  // language
  const { lang } = useLang();
  const L = (en, si) => (lang === "si" ? si : en);

  // filters
  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [category, setCategory] = useState("all");

  // derived dates
  const from = useMemo(() => dayjs(`${monthStr}-01`).startOf("month"), [monthStr]);
  const to   = useMemo(() => from.add(1, "month"), [from]);
  const year = from.year();

  // data
  const [metrics, setMetrics] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // live refresh channel (from Resources page)
  const bcRef = useRef(null);
  useEffect(() => {
    try { bcRef.current = new BroadcastChannel("resources"); } catch { bcRef.current = null; }
    const onMsg = (ev) => { if (ev?.data?.type === "changed") refresh(); };
    bcRef.current?.addEventListener?.("message", onMsg);
    const onStorage = (e) => { if (e.key === "resources:changed") refresh(); };
    window.addEventListener("storage", onStorage);
    return () => {
      try { bcRef.current?.removeEventListener?.("message", onMsg); bcRef.current?.close(); } catch {}
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setLoading(true);
    setErr("");
    try {
      const [m, list] = await Promise.all([
        getResourceMetrics(year),
        listResourceUsages({
          from: from.format("YYYY-MM-DD"),
          to: to.format("YYYY-MM-DD"),
          type: category !== "all" ? category : undefined,
          limit: 500,
        }),
      ]);
      setMetrics(m);
      setRows(list.items || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [monthStr, category]); // load on filters

  const monthlyChart = useMemo(() => {
    if (!metrics) return [];
    return metrics.monthly.map((m) => ({
      month: dayjs(`${metrics.year}-${m.month}-01`).format("MMM"),
      fertilizer: m.fertilizer,
      seeds: m.seeds,
      pesticide: m.pesticide,
      total: m.total,
    }));
  }, [metrics]);

  const distribution = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: "fertilizer", value: metrics.ytd?.fertilizerCost || 0 },
      { name: "seeds",      value: metrics.ytd?.seedCost || 0 },
      { name: "pesticide",  value: metrics.ytd?.pesticideCost || 0 },
    ];
  }, [metrics]);

  // downloads (match backend endpoints) + catch errors so ErrorBoundary won't fire
  const downloadCSV = async () => {
    try {
      const params = new URLSearchParams({
        from: from.format("YYYY-MM-DD"),
        to: to.format("YYYY-MM-DD"),
        type: category,
        format: "csv",
      });
      // use canonical endpoint (aliases exist too)
      const url = `/reports/resources.csv?${params.toString()}`;
      const { data } = await api.get(url, { responseType: "blob" });
      const blob = new Blob([data], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `resource-usage_${monthStr}_${category}.csv`;
      a.click();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || e?.message || "CSV download failed");
    }
  };

  const downloadPDF = async () => {
    try {
      const params = new URLSearchParams({
        from: from.format("YYYY-MM-DD"),
        to: to.format("YYYY-MM-DD"),
        type: category,
        format: "pdf",
      });
      const url = `/reports/resources.pdf?${params.toString()}`;
      const { data } = await api.get(url, { responseType: "blob" });
      const blob = new Blob([data], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `resource-usage_${monthStr}_${category}.pdf`;
      a.click();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || e?.message || "PDF download failed");
    }
  };

  return (
    <div className="container" style={{ padding: 24, display: "grid", gap: 16 }}>
      {/* PAGE HEADER: title + language + dashboard button (top-right) */}
      <div className="page-header">
        <h2 style={{ margin: 0 }}>{L("Resource Usage Reports", "සාධන වාර්තා")}</h2>
        <div className="header-actions">
          <LanguageSwitcher />
          <Link to={DASHBOARD_PATH}>
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
              {L("Dashboard", "පුවරුව")}
            </button>
          </Link>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{L("Filters", "පෙරහන්")}</div>

        <label className="row">
          <span className="muted">{L("Month", "මස")}</span>
          <input
            className="input"
            type="month"
            value={monthStr}
            onChange={(e) => setMonthStr(e.target.value)}
          />
        </label>

        <label className="row">
          <span className="muted">{L("Category", "ප්‍රවර්ගය")}</span>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">{L("All", " සියල්ල")}</option>
            <option value="fertilizer">{L("Fertilizer", "වරගෙය")}</option>
            <option value="seeds">{L("Seeds", "බීජ")}</option>
            <option value="pesticide">{L("Pesticides", "කෘමිනාශක")}</option>
          </select>
        </label>

        <button className="btn green" onClick={downloadCSV}>{L("Download CSV", "CSV බාගත කරන්න")}</button>
        <button className="btn green" onClick={downloadPDF}>{L("Download PDF", "PDF බාගත කරන්න")}</button>
      </div>

      <div className="muted" style={{ marginTop: -4 }}>
        {L("Period", "කාලය")}: {from.format("DD/MM/YYYY")} → {to.format("DD/MM/YYYY")} · {L("Category", "ප්‍රවර්ගය")}: {category.toUpperCase()}
      </div>

      {/* CHARTS */}
      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="card">
          <h3>{L("Monthly Resource Cost (YTD)", "මාසික වියදම් (මෙවැනි වර්ෂය)")}</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChart}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="fertilizer" stroke={COLORS.fertilizer} strokeWidth={2} />
                <Line type="monotone" dataKey="seeds" stroke={COLORS.seeds} strokeWidth={2} />
                <Line type="monotone" dataKey="pesticide" stroke={COLORS.pesticide} strokeWidth={2} />
                <Line type="monotone" dataKey="total" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3>{L("Resource Category Distribution", "ප්‍රවර්ග වාරි බෙදාහැරීම")}</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} label>
                  {distribution.map((d, i) => (
                    <Cell key={i} fill={COLORS[d.name] || "#999"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>{L("Month", "මාසය")}</th>
                <th>{L("Resource", "සරමු")}</th>
                <th>{L("Category", "ප්‍රවර්ගය")}</th>
                <th>{L("Total Qty", "මුළු ප්‍රමාණය")}</th>
                <th>{L("Unit", "ඒකකය")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5}>{L("Loading…", "පූරණය වෙමින්…")}</td></tr>
              )}
              {!loading && err && (
                <tr><td colSpan={5} style={{ color: "#b91c1c" }}>{err}</td></tr>
              )}
              {!loading && !err && rows.length === 0 && (
                <tr><td colSpan={5}>{L("No data", "දත්ත නැත")}</td></tr>
              )}
              {!loading && !err && rows.map((r) => (
                <tr key={r._id}>
                  <td>{dayjs(r.date).format("YYYY-MM")}</td>
                  <td>
                    {r.type === "fertilizer" && (r.fertilizerName || "—")}
                    {r.type === "seeds" && (r.fieldName || "—")}
                    {r.type === "pesticide" && (Array.isArray(r.pesticideNames) ? r.pesticideNames.join(", ") : (r.pesticideNames || "—"))}
                  </td>
                  <td>{r.type}</td>
                  <td>{r.quantity?.value || 0}</td>
                  <td>{r.quantity?.unit || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        .page-header {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .card { background: #fff; border-radius: 16px; padding: 18px; box-shadow: 0 2px 6px rgba(0,0,0,.05); }
        .btn { border: none; padding: 10px 16px; border-radius: 999px; cursor: pointer; font-weight: 700; color:#fff; text-decoration: none; display:inline-flex; align-items:center; justify-content:center; }
        .btn.green { background:#16a34a; }
        .btn.green:hover { filter: brightness(0.95); }
        .no-underline { text-decoration: none; }
        .input, .select {
          display:block; height:40px; padding:8px 10px; border:1px solid #e5e7eb; border-radius:10px; background:#fff;
        }
        .row { display:flex; gap:8px; align-items:center; }
        .muted { color:#6b7280; }
        .table { width:100%; border-collapse: collapse; }
        .table th, .table td { text-align:left; padding:10px 12px; border-top:1px solid #eee; }
      `}</style>
    </div>
  );
}
