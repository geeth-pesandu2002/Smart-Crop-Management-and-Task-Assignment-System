// web/src/pages/Tasks.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../api.js";
import { isAuthed, isManager } from "../auth";
import { Navigate } from "react-router-dom";
import { useLang } from "../i18n.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

const LIMIT = 10;

export default function Tasks() {
  const { t } = useLang();
  const notAllowed = !isAuthed() || !isManager();

  // form state
  const [mode, setMode] = useState("individual");
  const [staff, setStaff] = useState([]);
  const [groups, setGroups] = useState([]);
  const [plots, setPlots] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", assignedTo: "", groupId: "",
    priority: "normal", dueDate: "", plotId: "",
    sharedGroupTask: true, voiceUrl: ""
  });
  const [voiceFile, setVoiceFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  // table state
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pages = Math.max(Math.ceil(total / LIMIT), 1);

  // filters
  const [fStatus, setFStatus]   = useState("");
  const [fPriority, setFPrior]  = useState("");
  const [fStaff, setFStaff]     = useState("");
  const [fGroup, setFGroup]     = useState("");
  const [fPlot, setFPlot]       = useState("");

  // comments UI state
  const [expandedId, setExpandedId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesCache, setNotesCache] = useState({});

  const canSubmit = useMemo(
    () => form.title.trim().length > 0 && (
      (mode === "individual" && form.assignedTo) ||
      (mode === "group" && form.groupId)
    ),
    [form.title, form.assignedTo, form.groupId, mode]
  );

  // --- load metadata (staff, groups, plots) ---
  useEffect(() => {
    (async () => {
      try {
        const [{ data: staffData }, { data: groupData }, plotRes] = await Promise.all([
          api.get("/users?role=staff"),
          api.get("/groups"),
          api.get("/plots")
        ]);

        setStaff(staffData || []);
        setGroups(groupData || []);

        // Normalize /plots to an array (supports {items:[]} or [])
        const plotData = plotRes?.data;
        const plotsArr = Array.isArray(plotData) ? plotData : (plotData?.items || []);
        setPlots(plotsArr);
      } catch (e) {
        console.error(e);
        setMsg(t("tasks.msg.loadMetaFail"));
      }
    })();
  }, [t]);

  // --- build query params for tasks list ---
  const buildQuery = useCallback(() => {
    const q = new URLSearchParams();
    if (fStatus)   q.set("status",   fStatus);
    if (fPriority) q.set("priority", fPriority);
    if (fStaff)    q.set("staff",    fStaff);
    if (fGroup)    q.set("group",    fGroup);
    if (fPlot)     q.set("plot",     fPlot);
    q.set("page", String(page));
    q.set("limit", String(LIMIT));
    q.set("sort", "createdAt:desc");
    return q.toString();
  }, [fStatus, fPriority, fStaff, fGroup, fPlot, page]);

  // --- fetch tasks with filters + pagination ---
  const fetchTasks = useCallback(async () => {
    try {
      const query = buildQuery();
      const { data } = await api.get(`/tasks?${query}`);
      setTasks(data.items || data || []);
      setTotal(data.total ?? (Array.isArray(data) ? data.length : 0));
    } catch (e) {
      console.error(e);
      setMsg(t("tasks.msg.loadTasksFail"));
    }
  }, [buildQuery, t]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // reset to first page when filters change
  useEffect(() => { setPage(1); }, [fStatus, fPriority, fStaff, fGroup, fPlot]);

  // --- voice upload ---
  const uploadVoice = async () => {
    if (!voiceFile) return;
    setUploading(true); setMsg("");
    try {
      const fd = new FormData();
      fd.append("voice", voiceFile);
      const { data } = await api.post("/tasks/voice", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setForm(prev => ({ ...prev, voiceUrl: data.url }));
      setMsg(t("tasks.msg.uploadOk"));
    } catch (e) {
      console.error(e);
      setMsg(t("tasks.msg.uploadFail"));
    } finally {
      setUploading(false);
    }
  };

  // --- create task ---
  const submit = async (ev) => {
    ev.preventDefault();
    setMsg("");

    const payload = {
      title: form.title.trim(),
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      plotId: form.plotId || undefined,
      voiceUrl: form.voiceUrl || ""
    };

    if (mode === "individual") {
      if (!form.assignedTo) return setMsg(t("tasks.msg.needStaff"));
      payload.assignedTo = form.assignedTo;
    } else {
      if (!form.groupId) return setMsg(t("tasks.msg.needGroup"));
      payload.groupId = form.groupId;
      payload.sharedGroupTask = form.sharedGroupTask;
    }

    try {
      await api.post("/tasks", payload);
      setMsg(t("tasks.msg.created"));
      setForm({
        title: "", description: "", assignedTo: "", groupId: "",
        priority: "normal", dueDate: "", plotId: "",
        sharedGroupTask: true, voiceUrl: ""
      });
      setVoiceFile(null);
      // reload first page to see newest
      setPage(1);
      fetchTasks();
    } catch (e) {
      console.error(e);
      setMsg(e?.response?.data?.error || t("tasks.msg.createFail"));
    }
  };

  // --- row status update (optimistic) ---
  const changeStatus = async (id, next) => {
    setTasks(prev => prev.map(x => x._id === id ? { ...x, status: next } : x));
    try {
      await api.patch(`/tasks/${id}/status`, { status: next });
    } catch (e) {
      console.error(e);
      setMsg("❌ Status update failed");
      fetchTasks(); // revert by refetch
    }
  };

  // ----- comments helpers -----
  const loadNotes = async (taskId) => {
    try {
      setLoadingNotes(true);
      const { data } = await api.get(`/tasks/${taskId}/comments`);
      setNotesCache(prev => ({ ...prev, [taskId]: data || [] }));
    } catch (e) {
      console.error(e);
      setMsg(t("tasks.msg.loadNotesFail") || "❌ Failed to load notes");
    } finally {
      setLoadingNotes(false);
    }
  };

  const addNote = async (taskId) => {
    const text = (commentText || "").trim();
    if (!text) return;
    try {
      const { data } = await api.post(`/tasks/${taskId}/comment`, { text });
      setNotesCache(prev => ({ ...prev, [taskId]: data || [] }));
      setCommentText("");
      setMsg(t("tasks.msg.noteAdded") || "✅ Note added");
    } catch (e) {
      console.error(e);
      setMsg(t("tasks.msg.noteAddFail") || "❌ Failed to add note");
    }
  };

  if (notAllowed) return <Navigate to="/login" replace />;

  return (
    <div className="container">
      {/* Header + Mode + Language */}
      <div className="page-header">
        <div>
          <h2 style={{ margin: 0, color: "#fff" }}>{t("tasks.title")}</h2>
          <p className="sub" style={{ margin: 0, color: "rgba(255,255,255,.9)" }}>
            {t("tasks.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="segment" role="tablist" aria-label="Assign mode">
            <button
              type="button"
              className={mode === "individual" ? "on" : ""}
              onClick={() => setMode("individual")}
            >
              {t("tasks.modeIndividual")}
            </button>
            <button
              type="button"
              className={mode === "group" ? "on" : ""}
              onClick={() => setMode("group")}
            >
              {t("tasks.modeGroup")}
            </button>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi"><p className="t">{t("tasks.kpi.pending")}</p><p className="v">
          {tasks.filter(tk => tk.status === "pending").length}
        </p></div>
        <div className="kpi"><p className="t">{t("tasks.kpi.in_progress")}</p><p className="v">
          {tasks.filter(tk => tk.status === "in_progress").length}
        </p></div>
        <div className="kpi"><p className="t">{t("tasks.kpi.blocked")}</p><p className="v">
          {tasks.filter(tk => tk.status === "blocked").length}
        </p></div>
        <div className="kpi"><p className="t">{t("tasks.kpi.completed")}</p><p className="v">
          {tasks.filter(tk => tk.status === "completed").length}
        </p></div>
      </div>

      <div className="panel">
        {/* Left: create form */}
        <div className="card">
          <h3>{t("tasks.form.create")}</h3>
          <p className="sub">{t("tasks.form.hint")}</p>

          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <div className="grid2">
              <div className="field">
                <label>{t("tasks.form.title")}</label>
                <input
                  className="input"
                  placeholder={t("tasks.form.titlePh")}
                  value={form.title}
                  onChange={(ev) => setForm({ ...form, title: ev.target.value })}
                />
              </div>
              <div className="field">
                <label>{t("tasks.form.priority")}</label>
                <select
                  className="select"
                  value={form.priority}
                  onChange={(ev) => setForm({ ...form, priority: ev.target.value })}
                >
                  <option value="low">{t("tasks.form.low")}</option>
                  <option value="normal">{t("tasks.form.normal")}</option>
                  <option value="high">{t("tasks.form.high")}</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>{t("tasks.form.desc")}</label>
              <textarea
                className="input"
                rows={3}
                placeholder={t("tasks.form.descPh")}
                value={form.description}
                onChange={(ev) => setForm({ ...form, description: ev.target.value })}
              />
            </div>

            {mode === "individual" ? (
              <div className="field">
                <label>{t("tasks.form.assignStaff")}</label>
                <select
                  className="select"
                  value={form.assignedTo}
                  onChange={(ev) => setForm({ ...form, assignedTo: ev.target.value })}
                >
                  <option value="">{t("tasks.form.selectStaff")}</option>
                  {staff.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="field">
                  <label>{t("tasks.form.assignGroup")}</label>
                  <select
                    className="select"
                    value={form.groupId}
                    onChange={(ev) => setForm({ ...form, groupId: ev.target.value })}
                  >
                    <option value="">{t("tasks.form.selectGroup")}</option>
                    {groups.map((g) => (
                      <option key={g._id} value={g._id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={form.sharedGroupTask}
                    onChange={(ev) => setForm({ ...form, sharedGroupTask: ev.target.checked })}
                  />
                  <span>{t("tasks.form.shared")}</span>
                </label>
              </>
            )}

            <div className="grid3">
              <div className="field">
                <label>{t("tasks.form.plot")}</label>
                <select
                  className="select"
                  value={form.plotId}
                  onChange={(ev) => setForm({ ...form, plotId: ev.target.value })}
                >
                  <option value="">{t("tasks.form.selectPlot")}</option>
                  {plots.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fieldName}{p.cropType ? ` (${p.cropType})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t("tasks.form.due")}</label>
                <input
                  className="input"
                  type="date"
                  value={form.dueDate}
                  onChange={(ev) => setForm({ ...form, dueDate: ev.target.value })}
                />
              </div>
              <div className="field">
                <label>{t("tasks.form.voice")}</label>
                <div className="btnbar">
                  <input
                    className="input"
                    type="file"
                    accept="audio/*"
                    onChange={(ev) => setVoiceFile(ev.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={uploadVoice}
                    disabled={!voiceFile || uploading}
                    title={t("tasks.form.attach")}
                  >
                    {uploading ? "Uploading…" : t("tasks.form.attach")}
                  </button>
                  {form.voiceUrl && <span className="badge">{t("tasks.form.attached")}</span>}
                </div>
              </div>
            </div>

            <div className="btnbar">
              <button className="btn primary" type="submit" disabled={!canSubmit}>
                {t("tasks.form.submit")}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setForm({
                    title: "", description: "", assignedTo: "", groupId: "",
                    priority: "normal", dueDate: "", plotId: "",
                    sharedGroupTask: true, voiceUrl: ""
                  });
                  setVoiceFile(null);
                  setMsg("");
                }}
                title={t("tasks.form.clear") || "Clear"}
              >
                {t("tasks.form.clear") || "Clear"}
              </button>
            </div>
          </form>

          {msg && (
            <div className={`note ${msg.startsWith('✅') ? 'ok' : msg.startsWith('❌') ? 'err' : ''}`}>
              {msg}
            </div>
          )}
        </div>

        {/* Right: filters + table */}
        <div className="card">
          <h3>{t("tasks.table.recent")}</h3>
          <p className="sub">{t("tasks.table.hint")}</p>

          {/* Filters */}
          <div className="toolbar">
            <select className="select sm" value={fStatus} onChange={e => setFStatus(e.target.value)}>
              <option value="">{t("tasks.f.statusAll")}</option>
              <option value="pending">{t("tasks.kpi.pending")}</option>
              <option value="in_progress">{t("tasks.kpi.in_progress")}</option>
              <option value="blocked">{t("tasks.kpi.blocked")}</option>
              <option value="completed">{t("tasks.kpi.completed")}</option>
            </select>
            <select className="select sm" value={fPriority} onChange={e => setFPrior(e.target.value)}>
              <option value="">{t("tasks.f.priorityAll")}</option>
              <option value="low">{t("tasks.form.low")}</option>
              <option value="normal">{t("tasks.form.normal")}</option>
              <option value="high">{t("tasks.form.high")}</option>
            </select>
            <select className="select sm" value={fStaff} onChange={e => setFStaff(e.target.value)}>
              <option value="">{t("tasks.f.staffAll")}</option>
              {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <select className="select sm" value={fGroup} onChange={e => setFGroup(e.target.value)}>
              <option value="">{t("tasks.f.groupAll")}</option>
              {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
            <select className="select sm" value={fPlot} onChange={e => setFPlot(e.target.value)}>
              <option value="">{t("tasks.f.plotAll")}</option>
              {plots.map((p) => (
  <option key={p._id} value={p._id}>
    {p.fieldName}{p.cropType ? ` (${p.cropType})` : ""}
  </option>
))}
            </select>
            <button
              className="btn ghost"
              type="button"
              onClick={() => { setFStatus(""); setFPrior(""); setFStaff(""); setFGroup(""); setFPlot(""); }}
              title={t("tasks.f.clear") || "Clear"}
            >
              {t("tasks.f.clear") || "Clear"}
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>{t("tasks.table.head.title")}</th>
                <th>{t("tasks.table.head.assigned")}</th>
                <th>{t("tasks.table.head.plot")}</th>
                <th>{t("tasks.table.head.priority")}</th>
                <th>{t("tasks.table.head.status")}</th>
                <th>{t("tasks.table.head.due")}</th>
                <th style={{width:120}}>{t("tasks.comments.col") || "Comments"}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((tk) => {
                const notes = notesCache[tk._id] || tk.notes || [];
                const isOpen = expandedId === tk._id;

                return (
                  <tr key={tk._id}>
                    <td>{tk.title}</td>
                    <td>{tk.groupId?.name ? `${t("tasks.table.groupPrefix")}${tk.groupId.name}` : (tk.assignedTo?.name || "-")}</td>
                    <td>{tk.plotId?.fieldName || "-"}</td>
                    <td>{tk.priority}</td>
                    <td>
                      <select
                        className="select sm"
                        value={tk.status}
                        onChange={(e) => changeStatus(tk._id, e.target.value)}
                      >
                        <option value="pending">{t("tasks.kpi.pending")}</option>
                        <option value="in_progress">{t("tasks.kpi.in_progress")}</option>
                        <option value="blocked">{t("tasks.kpi.blocked")}</option>
                        <option value="completed">{t("tasks.kpi.completed")}</option>
                      </select>
                    </td>
                    <td>{tk.dueDate ? new Date(tk.dueDate).toLocaleDateString() : "-"}</td>
                    <td>
                      <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={async () => {
                            if (isOpen) {
                              setExpandedId(null);
                              return;
                            }
                            setExpandedId(tk._id);
                            if (!notesCache[tk._id]) {
                              await loadNotes(tk._id);
                            }
                          }}
                          title={isOpen ? (t("tasks.comments.hide") || "Hide") : (t("tasks.comments.show") || "Show")}
                        >
                          {isOpen ? (t("tasks.comments.hide") || "Hide") : (t("tasks.comments.add") || "Comments")}
                        </button>
                        <span className="chip">
                          {(notes?.length || 0)} {t("tasks.comments.count") || "notes"}
                        </span>
                      </div>

                      {isOpen && (
                        <div className="noteBox">
                          {loadingNotes ? (
                            <p className="small">{t("tasks.comments.loading") || "Loading…"}</p>
                          ) : (
                            <>
                              <div className="notesList">
                                {(notes || []).map((n, idx) => (
                                  <div key={idx} className="noteItem">
                                    <div className="noteMeta">
                                      <b>{n?.by?.name || t("tasks.comments.unknown") || "Unknown"}</b>
                                      <span> · {new Date(n.at).toLocaleString()}</span>
                                    </div>
                                    <div className="noteText">{n.text}</div>
                                  </div>
                                ))}
                                {(!notes || notes.length === 0) && (
                                  <p className="small" style={{color:'#64748b'}}>{t("tasks.comments.empty") || "No notes yet."}</p>
                                )}
                              </div>
                              <div className="noteForm">
                                <input
                                  className="input"
                                  placeholder={t("tasks.comments.placeholder") || "Add a short note for your staff…"}
                                  value={commentText}
                                  onChange={e => setCommentText(e.target.value)}
                                />
                                <div className="btnbar" style={{marginTop:6}}>
                                  <button
                                    type="button"
                                    className="btn primary sm"
                                    onClick={() => addNote(tk._id)}
                                  >
                                    {t("tasks.comments.save") || "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn ghost sm"
                                    onClick={() => { setExpandedId(null); setCommentText(""); }}
                                  >
                                    {t("tasks.comments.cancel") || "Cancel"}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pager">
            <button
              className="btn ghost"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              title="Previous page"
            >
              ◀ {t("tasks.f.prev") || "Prev"}
            </button>
            <span className="small">
              Page {page} / {pages} — {total} items
            </span>
            <button
              className="btn ghost"
              disabled={page >= pages}
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              title="Next page"
            >
              {t("tasks.f.next") || "Next"} ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
