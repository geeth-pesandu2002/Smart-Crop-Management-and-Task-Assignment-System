// src/pages/HarvestTable.jsx
import { useMemo, useState } from "react";
import { updateHarvest } from "../api.js";

export default function HarvestTable({ plot, onChanged, onAdd, onDelete }) {
  const [draft, setDraft] = useState({
    harvestDate: "",
    harvestedQty: "",
    discardedQty: "",
    earnings: "",
    note: "",
  });

  const totals = useMemo(() => {
    const harvested = (plot.harvests || []).reduce((s, h) => s + (h.harvestedQty || 0), 0);
    const discarded = (plot.harvests || []).reduce((s, h) => s + (h.discardedQty || 0), 0);
    const earnings  = (plot.harvests || []).reduce((s, h) => s + (h.earnings || 0), 0);
    return { harvested, discarded, earnings };
  }, [plot]);

  const add = async (e) => {
    e.preventDefault();
    await onAdd({
      harvestDate: new Date(draft.harvestDate).toISOString(),
      harvestedQty: Number(draft.harvestedQty || 0),
      discardedQty: Number(draft.discardedQty || 0),
      earnings: Number(draft.earnings || 0),
      note: draft.note || "",
    });
    setDraft({ harvestDate: "", harvestedQty: "", discardedQty: "", earnings: "", note: "" });
  };

  // convenience style to ensure inputs never overflow their grid cells
  const fit = { boxSizing: "border-box", width: "100%" };

  return (
    <div className="vstack" style={{ gap: 14 }}>
      {/* Summary mini KPIs */}
      <div className="kpis">
        <div className="kpi">
          <p className="t">Total Harvested</p>
          <p className="v">{totals.harvested.toLocaleString()}</p>
        </div>
        <div className="kpi">
          <p className="t">Total Discarded</p>
          <p className="v">{totals.discarded.toLocaleString()}</p>
        </div>
        <div className="kpi">
          <p className="t">Total Earnings</p>
          <p className="v">LKR {totals.earnings.toLocaleString()}</p>
        </div>
        <div className="kpi">
          <p className="t">Entries</p>
          <p className="v">{(plot.harvests || []).length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ paddingTop: 10 }}>
        <h3 className="card-title" style={{ marginBottom: 6 }}>Harvest & Earnings</h3>
        <p className="card-sub" style={{ marginBottom: 12 }}>
          Each entry records the date, quantities and earnings. Use “Edit note” for quick annotations.
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th style={{ width: 150, textAlign: "right" }}>Qty (harvested)</th>
              <th style={{ width: 150, textAlign: "right" }}>Qty (discarded)</th>
              <th style={{ width: 180, textAlign: "right" }}>Earnings (LKR)</th>
              <th>Note</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {(plot.harvests || []).map((h) => (
              <tr key={h._id}>
                <td>{new Date(h.harvestDate).toLocaleDateString()}</td>
                <td style={{ textAlign: "right" }}>{Number(h.harvestedQty || 0).toLocaleString()}</td>
                <td style={{ textAlign: "right" }}>{Number(h.discardedQty || 0).toLocaleString()}</td>
                <td style={{ textAlign: "right" }}>{Number(h.earnings || 0).toLocaleString()}</td>
                <td>
                  {h.note ? (
                    <span
                      className="chip"
                      title={h.note}
                      style={{
                        maxWidth: 320,
                        display: "inline-block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.note}
                    </span>
                  ) : (
                    <span className="small" style={{ color: "var(--muted)" }}>
                      <i>No note</i>
                    </span>
                  )}
                </td>
                <td>
                  <div className="btnbar">
                    <button
                      type="button"
                      className="btn sm"
                      onClick={async () => {
                        const note = prompt("Update note", h.note || "");
                        if (note == null) return;
                        await updateHarvest(plot._id, h._id, { note });
                        await onChanged();
                      }}
                    >
                      Edit note
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this harvest record?")) {
                          onDelete(h._id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {(!plot.harvests || plot.harvests.length === 0) && (
              <tr>
                <td colSpan={6}>
                  <div
                    className="note"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: 12,
                      color: "#0f172a",
                    }}
                  >
                    No harvests yet. Add the first entry below.
                  </div>
                </td>
              </tr>
            )}
          </tbody>

          {(plot.harvests || []).length > 0 && (
            <tfoot>
              <tr>
                <td style={{ fontWeight: 700 }}>Totals</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>
                  {totals.harvested.toLocaleString()}
                </td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>
                  {totals.discarded.toLocaleString()}
                </td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>
                  {totals.earnings.toLocaleString()}
                </td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add a harvest — structured & non-overlapping */}
      <div className="card" style={{ padding: 16 }}>
        <h3 className="card-title">Add a harvest</h3>
        <p className="card-sub" style={{ marginBottom: 12 }}>
          Use precise quantities (kg) and whole LKR values. Notes are optional.
        </p>

        <form onSubmit={add} style={{ display: "grid", gap: 16 }}>
          {/* Row 1: Date + quantities */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div className="field" style={{ minWidth: 0 }}>
              <label>Date</label>
              <input
                type="date"
                className="input"
                required
                style={fit}
                value={draft.harvestDate}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, harvestDate: e.target.value }))
                }
              />
            </div>

            <div className="field" style={{ minWidth: 0 }}>
              <label>Qty harvested (kg)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                style={fit}
                placeholder="e.g. 120.5"
                value={draft.harvestedQty}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, harvestedQty: e.target.value }))
                }
              />
            </div>

            <div className="field" style={{ minWidth: 0 }}>
              <label>Qty discarded (kg)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                style={fit}
                placeholder="e.g. 5.2"
                value={draft.discardedQty}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, discardedQty: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Row 2: Earnings + Note */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
              gap: 12,
            }}
          >
            <div className="field" style={{ minWidth: 0 }}>
              <label>Earnings (LKR)</label>
              <input
                type="number"
                step="1"
                className="input"
                style={fit}
                placeholder="e.g. 45000"
                value={draft.earnings}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, earnings: e.target.value }))
                }
              />
            </div>
            <div className="field" style={{ minWidth: 0 }}>
              <label>Note</label>
              <textarea
                className="input"
                rows={3}
                style={fit}
                placeholder="e.g. smaller sizes due to rain"
                value={draft.note}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, note: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Actions */}
          <div className="btnbar" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                setDraft({
                  harvestDate: "",
                  harvestedQty: "",
                  discardedQty: "",
                  earnings: "",
                  note: "",
                })
              }
            >
              Clear
            </button>
            <button type="submit" className="btn primary">
              Save entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
