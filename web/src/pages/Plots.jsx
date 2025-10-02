// src/pages/Plots.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getPlots, deletePlot } from "../api.js";
import { Link } from "react-router-dom";
import { useLang } from "../i18n.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

export default function Plots() {
  const { t } = useLang();

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const debTimer = useRef(null);

  const load = useCallback(async (q) => {
    setLoading(true);
    const res = await getPlots({ search: q || "", withStats: true, limit: 100 });
    setItems(res.items || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(""); }, [load]);

  useEffect(() => {
    clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => load(search), 300);
    return () => clearTimeout(debTimer.current);
  }, [search, load]);

  const totals = useMemo(() => {
    const area = items.reduce((s, p) => s + (Number(p.area) || 0), 0);
    const harvested = items.reduce((s, p) => s + (p.totals?.harvested || 0), 0);
    const discarded = items.reduce((s, p) => s + (p.totals?.discarded || 0), 0);
    const earnings  = items.reduce((s, p) => s + (p.totals?.earnings || 0), 0);
    return { area, harvested, discarded, earnings };
  }, [items]);

  return (
    <div className="container">
      {/* Header with Language switcher + Dashboard + Add Plot */}
      <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0" }}>{t("plots.listTitle")}</h1>
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("plots.listSub")}</p>
        </div>
        <div className="btnbar" style={{ gap: 8 }}>
          <LanguageSwitcher />
          <Link to="/manager">
            <button className="btn ghost">{t("nav.dashboard")}</button>
          </Link>
          <Link to="/plots/new">
            <button className="btn primary">{t("plots.addPlot")}</button>
          </Link>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><p className="t">{t("plots.kpi.area")}</p><p className="v">{totals.area.toLocaleString()} (mixed)</p></div>
        <div className="kpi"><p className="t">{t("plots.kpi.harvested")}</p><p className="v">{totals.harvested.toLocaleString()}</p></div>
        <div className="kpi"><p className="t">{t("plots.kpi.discarded")}</p><p className="v">{totals.discarded.toLocaleString()}</p></div>
        <div className="kpi"><p className="t">{t("plots.kpi.earnings")}</p><p className="v">LKR {totals.earnings.toLocaleString()}</p></div>
      </div>

      <div className="toolbar">
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("plots.searchPh")}
          style={{ flex: "1 1 320px", minWidth: 260 }}
        />
        <button className="btn ghost" onClick={() => setSearch("")}>
          {t("tasks.f.clear")}
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">{t("plots.table.title")}</h3>
        <p className="card-sub">{t("plots.table.sub")}</p>

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
                <th align="left">{t("plots.table.head.field")}</th>
                <th align="left">{t("plots.table.head.crop")}</th>
                <th style={{ width: 120 }}>{t("plots.table.head.area")}</th>
                <th style={{ width: 130 }}>{t("plots.table.head.planted")}</th>
                <th style={{ width: 140, textAlign: "right" }}>{t("plots.table.head.harvested")}</th>
                <th style={{ width: 120, textAlign: "right" }}>{t("plots.table.head.discarded")}</th>
                <th style={{ width: 160, textAlign: "right" }}>{t("plots.table.head.earnings")}</th>
                <th style={{ width: 160 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p._id}
                  onClick={(e) => {
                    if (e.target.tagName !== "BUTTON" && e.target.tagName !== "A") location.href = `/plots/${p._id}`;
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td>{p.fieldName}</td>
                  <td style={{ color: "#cbd5e1" }}>{p.cropType}</td>
                  <td style={{ textAlign: "center" }}>{p.area} {p.areaUnit}</td>
                  <td style={{ textAlign: "center" }}>{new Date(p.plantingDate).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right" }}>{(p.totals?.harvested ?? 0).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>{(p.totals?.discarded ?? 0).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>LKR {(p.totals?.earnings ?? 0).toLocaleString()}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/plots/${p._id}`}><button className="btn sm">{t("plots.table.open")}</button></Link>
                      <button
                        className="btn sm ghost"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm("Delete this plot?")) return;
                          await deletePlot(p._id);
                          load(search);
                        }}
                      >
                        {t("plots.table.del")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8}><i>{t("plots.table.none")}</i></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
