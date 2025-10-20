// src/pages/PlotEditor.jsx
import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  createPlot,
  getPlot,
  updatePlot,
  addHarvest,
  deleteHarvest,
  getPlots, // 👈 NEW: load other plots
} from "../api.js";
import { FARM } from "../farmConfig.js";
import { useNavigate, useParams } from "react-router-dom";
import HarvestTable from "../pages/HarvestTable.jsx";
import { useLang } from "../i18n.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

/* ---------------- Draw controls (Leaflet-Geoman) ---------------- */
function DrawControls({ setCoords, initial }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    map.pm.addControls({
      position: "topleft",
      drawCircle: false,
      drawMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircleMarker: false,
    });

    // preload an existing polygon for editing
    if (initial?.length) {
      const poly = L.polygon(initial.map(([lat, lng]) => [lat, lng])).addTo(map);
      layerRef.current = poly;
      try {
        map.fitBounds(poly.getBounds(), { padding: [20, 20] });
      } catch {}
    }

    const onCreate = (e) => {
      if (layerRef.current) layerRef.current.remove();
      const layer = e.layer;
      const latlngs = layer.getLatLngs()[0] || [];
      const coords = latlngs.map((ll) => [ll.lat, ll.lng]);
      setCoords(coords);
      layerRef.current = layer;
      try {
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      } catch {}
    };

    const onEdit = (e) => {
      const layer = e.layer;
      const latlngs = layer.getLatLngs()[0] || [];
      const coords = latlngs.map((ll) => [ll.lat, ll.lng]);
      setCoords(coords);
    };

    map.on("pm:create", onCreate);
    map.on("pm:edit", onEdit);
    return () => {
      map.off("pm:create", onCreate);
      map.off("pm:edit", onEdit);
    };
  }, [map, setCoords, initial]);

  return null;
}

/* ---------------- Helpers ---------------- */
const toLatLngRing = (geometry) => {
  const ring = geometry?.coordinates?.[0] || [];
  // GeoJSON is [lng,lat] -> Leaflet wants [lat,lng]
  return ring.map(([lng, lat]) => [lat, lng]);
};

/* ---------------- Main: PlotEditor ---------------- */
export default function PlotEditor() {
  const { t } = useLang();
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fieldName: "",
    cropType: "",
    area: "",
    areaUnit: "ac",
    plantingDate: "",
  });
  const [coords, setCoords] = useState([]); // current polygon (lat,lng)
  const [plot, setPlot] = useState(null);   // current plot data (edit mode)
  const [allPlots, setAllPlots] = useState([]); // 👈 other plots for context
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(id);

  // load one plot when editing
  useEffect(() => {
    (async () => {
      if (!id) return;
      const data = await getPlot(id);
      setPlot(data);
      setForm({
        fieldName: data.fieldName,
        cropType: data.cropType,
        area: data.area,
        areaUnit: data.areaUnit,
        plantingDate: data.plantingDate?.substring(0, 10),
      });
      setCoords(toLatLngRing(data.geometry));
    })();
  }, [id]);

  // load ALL plots (for faint map context) — works for both New + Edit
  useEffect(() => {
    (async () => {
      try {
        const res = await getPlots({ limit: 1000 });
        // keep just what we need
        setAllPlots((res.items || []).map((p) => ({
          _id: p._id,
          fieldName: p.fieldName,
          cropType: p.cropType,
          ring: toLatLngRing(p.geometry),
        })));
      } catch (e) {
        console.error("Failed to load plots context", e);
      }
    })();
  }, []);

  // submit (create/update)
  const submit = async (e) => {
    e.preventDefault();
    if (!coords.length) {
      alert(t("plots.edit.removeShape") || "Please draw the plot polygon on the map.");
      return;
    }
    setSubmitting(true);

    // Leaflet gives [lat,lng]; GeoJSON expects [lng,lat]. Ensure closed ring.
    const ringLngLat = coords.map(([lat, lng]) => [lng, lat]);
    const first = ringLngLat[0];
    const last = ringLngLat[ringLngLat.length - 1];
    if (!last || last[0] !== first[0] || last[1] !== first[1]) ringLngLat.push(first);

    const geometry = { type: "Polygon", coordinates: [ringLngLat] };

    const payload = {
      ...form,
      area: Number.parseFloat(form.area) || 0,
      plantingDate: new Date(form.plantingDate).toISOString(),
      geometry,
    };

    try {
      if (isEdit) {
        await updatePlot(id, payload);
        navigate("/plots");
      } else {
        const created = await createPlot(payload);
        navigate(`/plots/${created._id}`);
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  // map center
  const center = useMemo(() => {
    if (coords.length) return coords[0];
    // try to center on first existing plot if available
    const firstOther = allPlots[0]?.ring?.[0];
    return firstOther || FARM.center;
  }, [coords, allPlots]);

  // unit conversions
  const convertArea = (toUnit) => {
    const val = Number(form.area) || 0;
    let m2;
    if (form.areaUnit === "ac") m2 = val * 4046.8564224;
    else if (form.areaUnit === "ha") m2 = val * 10000;
    else m2 = val;

    let out = m2;
    if (toUnit === "ac") out = m2 / 4046.8564224;
    if (toUnit === "ha") out = m2 / 10000;
    if (toUnit === "m2") out = m2;

    setForm((f) => ({ ...f, areaUnit: toUnit, area: Number(out.toFixed(4)) }));
  };

  // quick totals (only when editing)
  const totals = useMemo(() => {
    if (!plot) return { harvested: 0, discarded: 0, earnings: 0 };
    const harvested = (plot.harvests || []).reduce((s, h) => s + (h.harvestedQty || 0), 0);
    const discarded = (plot.harvests || []).reduce((s, h) => s + (h.discardedQty || 0), 0);
    const earnings = (plot.harvests || []).reduce((s, h) => s + (h.earnings || 0), 0);
    return { harvested, discarded, earnings };
  }, [plot]);

  // build layers for “other plots”
  const otherPlotLayers = useMemo(() => {
    const currentId = id || null;
    return (allPlots || [])
      .filter((p) => !currentId || p._id !== currentId)
      .filter((p) => p.ring?.length >= 3)
      .map((p) => ({
        _id: p._id,
        ring: p.ring,
        name: p.fieldName,
        crop: p.cropType,
      }));
  }, [allPlots, id]);

  return (
    <div className="container">
      {/* Header: Language + Dashboard + Back to list */}
      <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0" }}>
            {isEdit ? t("plots.edit.edit") : t("plots.edit.new")}
          </h1>
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("plots.edit.hint")}</p>
        </div>
        <div className="btnbar" style={{ gap: 8 }}>
          <LanguageSwitcher />
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
            onClick={() => navigate("/manager")}
          >
            {t("nav.dashboard")}
          </button>
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
            onClick={() => navigate("/plots")}
          >
            {t("plots.edit.backList")}
          </button>
        </div>
      </div>

      {isEdit && (
        <div className="kpis">
          <div className="kpi">
            <p className="t">{t("plots.edit.harvested")}</p>
            <p className="v">{totals.harvested.toLocaleString()}</p>
          </div>
          <div className="kpi">
            <p className="t">{t("plots.edit.discarded")}</p>
            <p className="v">{totals.discarded.toLocaleString()}</p>
          </div>
          <div className="kpi">
            <p className="t">{t("plots.edit.earnings")}</p>
            <p className="v">LKR {totals.earnings.toLocaleString()}</p>
          </div>
          <div className="kpi">
            <p className="t">{t("plots.edit.area") || "Area"}</p>
            <p className="v">
              {form.area} {form.areaUnit}
            </p>
          </div>
        </div>
      )}

      {/* Details + Map */}
      <div className="card">
        <h3 className="card-title">{t("plots.edit.detailsTitle")}</h3>
        <p className="card-sub">{t("plots.edit.detailsSub")}</p>

        <form onSubmit={submit} className="vstack" style={{ gap: 16 }}>
          <div className="hstack" style={{ gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
            {/* Left: form */}
            <div style={{ flex: "1 1 360px" }}>
              <div className="vstack">
                <div className="hstack" style={{ gap: 10 }}>
                  <input
                    className="input"
                    placeholder={t("plots.edit.fieldName")}
                    value={form.fieldName}
                    onChange={(e) => setForm((f) => ({ ...f, fieldName: e.target.value }))}
                    required
                  />
                  <input
                    className="input"
                    placeholder={t("plots.edit.cropType")}
                    value={form.cropType}
                    onChange={(e) => setForm((f) => ({ ...f, cropType: e.target.value }))}
                    required
                  />
                </div>

                <div className="hstack" style={{ gap: 10 }}>
                  <input
                    className="input"
                    type="number"
                    step="0.0001"
                    placeholder={t("plots.edit.area")}
                    value={form.area}
                    onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                    required
                  />
                  <select
                    className="select"
                    value={form.areaUnit}
                    onChange={(e) => setForm((f) => ({ ...f, areaUnit: e.target.value }))}
                  >
                    <option value="ac">{t("plots.edit.unit.ac")}</option>
                    <option value="ha">{t("plots.edit.unit.ha")}</option>
                    <option value="m2">{t("plots.edit.unit.m2")}</option>
                  </select>
                  <div className="btnbar">
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => convertArea("ac")}
                    >
                      {t("plots.edit.toAc")}
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => convertArea("ha")}
                    >
                      {t("plots.edit.toHa")}
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => convertArea("m2")}
                    >
                      {t("plots.edit.toM2")}
                    </button>
                  </div>
                </div>

                <label style={{ width: "100%" }}>
                  <span style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>
                    {t("plots.edit.plantingDate")}
                  </span>
                  <input
                    className="input"
                    type="date"
                    value={form.plantingDate}
                    onChange={(e) => setForm((f) => ({ ...f, plantingDate: e.target.value }))}
                    required
                  />
                </label>
              </div>
            </div>

            {/* Right: map */}
            <div style={{ flex: "1 1 480px", minWidth: 380 }}>
              <div
                style={{
                  height: 420,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid var(--line)",
                }}
              >
                <MapContainer center={center} zoom={16} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  {/* Other plots (faint / dashed) */}
                  {otherPlotLayers.map((op) => (
                    <Polygon
                      key={op._id}
                      positions={op.ring}
                      pathOptions={{
                        color: "#94a3b8", // slate-400
                        weight: 2,
                        fillOpacity: 0.12,
                        dashArray: "6 6",
                      }}
                      eventHandlers={{
                        click: () => navigate(`/plots/${op._id}`),
                      }}
                    />
                  ))}

                  {/* Current plot highlight (edit/new). 
                      We don't render current coords Polygon when using Geoman layer for edit,
                      but showing it here improves visibility in new mode too. */}
                  {coords.length >= 3 && (
                    <Polygon
                      positions={coords}
                      pathOptions={{
                        color: "#16a34a", // green-600
                        weight: 4,
                        fillOpacity: 0.28,
                      }}
                    />
                  )}

                  <DrawControls setCoords={setCoords} initial={coords} />
                </MapContainer>
              </div>
              <div className="btnbar" style={{ marginTop: 8 }}>
                <button type="button" className="btn ghost" onClick={() => setCoords([])}>
                  {t("plots.edit.removeShape")}
                </button>
              </div>
            </div>
          </div>

          <div className="sticky-actions">
            <div className="btnbar" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => navigate("/plots")}>
                {t("plots.edit.cancel")}
              </button>
              <button type="submit" className="btn primary" disabled={submitting}>
                {submitting
                  ? (isEdit ? t("plots.edit.save") : t("plots.edit.create")) + "…"
                  : isEdit
                  ? t("plots.edit.save")
                  : t("plots.edit.create")}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Harvest & Earnings */}
      {isEdit && plot && (
        <>
          <div style={{ height: 18 }} />
          <div className="card">
            <h3 className="card-title">
              {t("plots.edit.harvested")} &nbsp;{t("plots.edit.earnings")}
            </h3>
            <p className="card-sub">
              Track dates, quantities, and earnings for this plot. Summaries are shown above.
            </p>
            <HarvestTable
              plot={plot}
              onChanged={async () => setPlot(await getPlot(id))}
              onAdd={async (h) => {
                await addHarvest(id, h);
                setPlot(await getPlot(id));
              }}
              onDelete={async (hid) => {
                await deleteHarvest(id, hid);
                setPlot(await getPlot(id));
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
