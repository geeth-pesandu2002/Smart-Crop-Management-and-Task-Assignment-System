import { useEffect, useState, useMemo } from "react";
import { useLang } from "../i18n.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import { getPlots } from "../api.js";
import { Link } from "react-router-dom";

function calculateCropHealth(harvests) {
  let totalHarvested = 0;
  let totalDiscarded = 0;
  for (const cycle of harvests || []) {
    totalHarvested += Number(cycle.harvestedQty || 0);
    totalDiscarded += Number(cycle.discardedQty || 0);
  }
  if (totalHarvested === 0) return null;
  return (((totalHarvested - totalDiscarded) / totalHarvested) * 100).toFixed(2);
}

export default function Status() {
  const { t } = useLang();
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPlots({ withStats: true, limit: 500 });
        setPlots(res.items || res || []);
      } catch (e) {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sortedPlots = [...plots].sort((a, b) => {
    if (!a.fieldName) return 1;
    if (!b.fieldName) return -1;
    return a.fieldName.localeCompare(b.fieldName, undefined, { numeric: true });
  });
  const plotsWithHealth = sortedPlots.filter(plot => Array.isArray(plot.harvests) && plot.harvests.some(h => h.harvestedQty > 0));
  const healthValues = plotsWithHealth.map(plot => Number(calculateCropHealth(plot.harvests))).filter(v => !isNaN(v));
  const overallHealth = healthValues.length > 0
    ? (healthValues.reduce((sum, v) => sum + v, 0) / healthValues.length).toFixed(2)
    : 'N/A';

  return (
    <div className="container">
      <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0" }}>{t("status.title", "Crop Health Status")}</h1>
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("status.sub", "View health status of crops for each plot")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <LanguageSwitcher />
          <button
            style={{
              background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
              color: "white",
              padding: "8px 18px",
              borderRadius: 10,
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
            onClick={() => window.location.href = "/manager"}
          >
            {t("nav.dashboard", "Dashboard")}
          </button>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><p className="t">{t("status.overallHealth", "Overall Health")}</p><p className="v">{overallHealth !== 'N/A' ? `${overallHealth}% ${t("status.healthy", "Healthy")}` : 'N/A'}</p></div>
      </div>
      <div className="card">
        <h3 className="card-title">{t("status.byPlot", "Crop Health by Plot")}</h3>
        <p className="card-sub">{t("status.byPlotSub", "Calculated as (Qty discarded / Qty harvested) × 100%")}</p>
        {loading ? (
          <div className="vstack" style={{ gap: 8 }}>
            <div className="skeleton" style={{ height: 44 }} />
            <div className="skeleton" style={{ height: 44 }} />
            <div className="skeleton" style={{ height: 44 }} />
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th align="left">{t("status.fieldName", "Field Name")}</th>
                <th align="left">{t("status.cropType", "Crop Type")}</th>
                <th style={{ width: 120 }}>{t("status.health", "Health (%)")}</th>
                <th style={{ width: 120 }}>{t("status.details", "Details")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlots.map((plot) => {
                const hasValidHarvest = Array.isArray(plot.harvests) && plot.harvests.some(h => h.harvestedQty > 0 && h.discardedQty >= 0);
                const health = hasValidHarvest ? calculateCropHealth(plot.harvests) : null;
                return (
                  <tr key={plot._id} style={{ cursor: "pointer" }}>
                    <td>{plot.fieldName}</td>
                    <td style={{ color: "#cbd5e1" }}>{plot.cropType}</td>
                    <td style={{ textAlign: "center" }}>{health !== null ? `${health}%` : 'N/A'}</td>
                    <td>
                      <Link to={`/plots/${plot._id}`}><button className="btn sm">{t("status.viewEdit", "View/Edit")}</button></Link>
                    </td>
                  </tr>
                );
              })}
              {plots.length === 0 && (
                <tr><td colSpan={4}><i>{t("status.noPlots", "No plots found")}</i></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
