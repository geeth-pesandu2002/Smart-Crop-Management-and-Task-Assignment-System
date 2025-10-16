// src/pages/Settings.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, {
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
  resetUserPin,
  listLeaves,
  createLeave,
  endLeaveToday,
  listActiveLeaves,   // used to compute status for today
  extendLeave
} from "../api.js";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

/* ---------- styles ---------- */
const card = { border: "1px solid #cfcfcf", borderRadius: 12, padding: 16, background: "white" };
const col = { display: "grid", gap: 12 };
const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const label = { fontSize: 12, color: "#555" };
const input = { width: "100%", padding: "10px 12px", border: "1px solid #cfcfcf", borderRadius: 8, boxSizing: "border-box", background: "#fff" };
const tinyBtn = { padding: "6px 10px", borderRadius: 8, border: "1px solid #cfcfcf", background: "#f4f4f4", cursor: "pointer" };
const pill = (status) => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: 12,
  border: "1px solid #bbb",
  background: status === "active" ? "#e8fff0" : "#fff0f0",
  color: status === "active" ? "#166534" : "#7f1d1d"
});

/* ---------- Toast ---------- */
function Toast({ item, onClose }) {
  if (!item) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed", right: 16, top: 16, zIndex: 2000, minWidth: 260, maxWidth: 420,
        background: "rgba(255,255,255,0.95)", border: "1px solid #cfcfcf", borderRadius: 10,
        boxShadow: "0 6px 24px rgba(0,0,0,0.12)", padding: "10px 12px", display: "grid", gap: 6
      }}
      onClick={onClose}
    >
      <div style={{ fontWeight: 700 }}>{item.title || (item.type === "error" ? "Something went wrong" : "Done")}</div>
      <div style={{ color: item.type === "error" ? "#7f1d1d" : "#166534" }}>{item.message}</div>
      <div style={{ textAlign: "right" }}>
        <button style={{ ...tinyBtn, padding: "4px 8px" }} onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

import { useLang } from "../i18n.jsx";
export default function Settings() {
  const nav = useNavigate();
  const { t } = useLang();

  // Profile (manager)
  const [profile, setProfile] = useState({ _id: "", name: "", email: "", phone: "", role: "manager" });
  const [pw, setPw] = useState({ cur: "", n1: "", n2: "" });

  // Staff list + pagination
  const [q, setQ] = useState("");
  const [staff, setStaff] = useState([]);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil((staff?.length || 0) / PAGE_SIZE));
  const pagedStaff = useMemo(
    () => staff.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE),
    [staff, page]
  );

  // Add member modal
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState({
    name: "", phone: "", role: "staff", gender: "other",
    joinedAt: new Date().toISOString().slice(0,10),
    address: "", password: ""
  });

  // Details modal
  const [detail, setDetail] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ startDate: "", endDate: "", reason: "" });

  // “Currently on leave” (from API)
  const [activeLeaves, setActiveLeaves] = useState([]);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "ok", title = null) => {
    const t = { id: Date.now(), type, message, title };
    setToast(t);
    const id = setTimeout(() => setToast((cur) => (cur?.id === t.id ? null : cur)), 3000);
    return () => clearTimeout(id);
  }, []);

  const todayStr = () => new Date().toISOString().slice(0,10);

  // Helper: is a given user on leave today?
  const userIsOnLeave = useCallback(
    (userId) => activeLeaves.some(l => (l.user?._id || l.user) === userId),
    [activeLeaves]
  );

  /* ---------- init ---------- */
  useEffect(() => {
    (async () => {
      try {
        const me = (await api.get("/auth/me")).data;
        if (me && me._id) setProfile(me);
      } catch {}
      await reloadStaff();
      await reloadActiveLeaves();
    })();
  }, []);

  async function reloadStaff() {
    const users = await listUsers(q ? { q } : undefined);
    const arr = Array.isArray(users) ? users : [];
    setStaff([...arr].sort((a, b) => (a?.name || "").localeCompare(b?.name || "")));
    setPage(1);
    // keep statuses in sync when the list changes
    await reloadActiveLeaves();
  }

  async function reloadActiveLeaves() {
    try {
      const items = await listActiveLeaves(todayStr());
      setActiveLeaves(items || []);
    } catch {
      showToast("Failed to load current leaves", "error", "Leaves");
    }
  }

  /* ---------- profile + password ---------- */
  async function saveProfile() {
    if (!profile._id) return;
    // validate phone: if provided, must be 10 digits
    const phoneDigits = (profile.phone || '').replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length !== 10) return showToast("Phone must be 10 digits", "error");
    const updated = await updateUser(profile._id, { name: profile.name, phone: profile.phone });
    setProfile((p) => ({ ...p, ...updated }));
    showToast("Changes have been saved.", "ok", "Profile updated");
  }
  async function updatePassword() {
    if (pw.n1.length < 8) return showToast("New password must be at least 8 characters", "error");
    if (pw.n1 !== pw.n2) return showToast("Passwords do not match", "error");
    const r = await api.post("/auth/change-password", { currentPassword: pw.cur, newPassword: pw.n1 })
      .then(res => res.data).catch(e => ({ error: e?.response?.data?.error || "failed" }));
    if (r.error) return showToast(r.error, "error");
    setPw({ cur: "", n1: "", n2: "" });
    showToast("Password updated.", "ok");
  }

  /* ---------- add member ---------- */
  async function addMember() {
    if (!creating.name) return showToast("Full name is required", "error");
    // require phone to be exactly 10 digits
    const newPhone = (creating.phone || '').replace(/\D/g, '');
    if (!newPhone || newPhone.length !== 10) return showToast("Member phone must be 10 digits", "error");
    try {
      const res = await createUser(creating);
      await reloadStaff();
      setShowAdd(false);
      setCreating({ name: "", phone: "", role: "staff", gender: "other", joinedAt: new Date().toISOString().slice(0,10), address: "", password: "" });
      showToast(`Member created. User ID: ${res.userId}. Temp PIN: ${res.tempPin}`, "ok", "Add member");
    } catch (e) {
      showToast(e?.response?.data?.error || "Create user failed", "error");
    }
  }

  /* ---------- details modal helpers ---------- */
  async function openDetail(u) {
    setDetail(u);
    try {
      const ls = await listLeaves({ user: u._id });
      setLeaves(ls || []);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to load leaves';
      showToast(msg, 'error', 'Leaves');
      setLeaves([]);
    }
  }
  function closeDetail() {
    setDetail(null);
    setLeaves([]);
    setLeaveForm({ startDate: "", endDate: "", reason: "" });
  }

  async function doResetPw(u) {
    const r = await resetUserPassword(u._id);
    if (r?.error) return showToast(r.error, "error");
    showToast(`Temporary password: ${r.tempPassword}`, "ok", "Password reset");
  }
  async function doResetPin(u) {
    const r = await resetUserPin(u._id);
    if (r?.error) return showToast(r.error, "error");
    showToast(`Temporary PIN: ${r.tempPin}`, "ok", "PIN reset");
  }

  async function addLeave(u) {
    if (!leaveForm.startDate || !leaveForm.endDate) return showToast("Pick start & end date", "error");
    const payload = { user: u._id, startDate: leaveForm.startDate, endDate: leaveForm.endDate, reason: leaveForm.reason || "" };
    const r = await createLeave(payload).catch(e => ({ error: e?.response?.data?.error || "failed" }));
    if (r?.error) return showToast(r.error, "error");
    setLeaveForm({ startDate: "", endDate: "", reason: "" });
    const ls = await listLeaves({ user: u._id });
    setLeaves(ls || []);
    await reloadActiveLeaves(); // keep table + section in sync
    showToast("Leave added.", "ok");
  }
  async function endLeave(id, u) {
    await endLeaveToday(id);
    const ls = await listLeaves({ user: u._id });
    setLeaves(ls || []);
    await reloadActiveLeaves();
    showToast("Leave ended today.", "ok");
  }
  async function extendOneDay(leave) {
    const next = new Date(leave.endDate);
    next.setDate(next.getDate() + 1);
    const iso = next.toISOString().slice(0,10);
    try {
      await extendLeave(leave._id, iso);
      await reloadActiveLeaves();
      if (detail && detail._id === (leave.user?._id || leave.user)) {
        const ls = await listLeaves({ user: detail._id });
        setLeaves(ls || []);
      }
      showToast("Leave extended by 1 day.", "ok");
    } catch (e) {
      showToast(e?.response?.data?.error || "extend failed", "error");
    }
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <Toast item={toast} onClose={() => setToast(null)} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{t("settings.title", "Settings & Staff")}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LanguageSwitcher />
          <button onClick={() => nav('/manager')} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#f7f7f7" }}>
            Go to Dashboard
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
        {/* Profile */}
        <div style={{ display: 'grid', gap: 16 }}>
          <section style={{ ...card, alignSelf: 'start' }}>
          <h4>{t("settings.profile", "Profile Information")}</h4>
          <div style={{ height: 8 }} />
          <div style={col}>
            <div><div style={label}>{t("settings.fullName", "Full Name")}</div>
              <input style={input} value={profile.name || ""} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div><div style={label}>{t("settings.email", "Email")}</div>
              <input style={input} disabled value={profile.email || ""} />
            </div>
            <div><div style={label}>{t("settings.phone", "Phone")}</div>
              <input
                style={input}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]*"
                value={profile.phone || ""}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0,10) }))}
              />
            </div>
            <div><div style={label}>{t("settings.role", "Role")}</div>
              <select style={input} disabled value={profile.role || "manager"}><option>manager</option></select>
            </div>
            <div style={{ textAlign: "right" }}>
              <button onClick={saveProfile} style={tinyBtn}>{t("settings.save", "Save changes")}</button>
            </div>
          </div>
        </section>

          {/* Password card (moved under Profile) */}
          <section style={card}>
            <h4>{t("settings.password", "Password")}</h4>
            <div style={col}>
              <div>
                <div style={label}>{t("settings.currentPassword", "Current Password")}</div>
                <input style={input} type="password" value={pw.cur} onChange={e => setPw(p => ({ ...p, cur: e.target.value }))} />
              </div>
              <div style={row2}>
                <div>
                  <div style={label}>{t("settings.newPassword", "New Password (min 8)")}</div>
                  <input style={input} type="password" value={pw.n1} onChange={e => setPw(p => ({ ...p, n1: e.target.value }))} />
                </div>
                <div>
                  <div style={label}>{t("settings.confirmPassword", "Confirm New Password")}</div>
                  <input style={input} type="password" value={pw.n2} onChange={e => setPw(p => ({ ...p, n2: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => setPw({ cur: "", n1: "", n2: "" })} style={tinyBtn}>{t("settings.clear", "Clear")}</button>
                <button onClick={updatePassword} style={tinyBtn}>{t("settings.updatePassword", "Update Password")}</button>
              </div>
            </div>
          </section>

        </div>

        {/* Staff table */}
        <div style={{ display: "grid", gap: 16 }}>
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4>{t("settings.staffManagement", "Staff Management")}</h4>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder={t("settings.searchPh", "Search by name / phone / userId / email")}
                  style={input}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && reloadStaff()}
                />
                <button onClick={reloadStaff} style={tinyBtn}>{t("settings.search", "Search")}</button>
                <button onClick={() => setShowAdd(true)} style={tinyBtn}>{t("settings.addMember", "Add member")}</button>
              </div>
            </div>

            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th style={{ padding: "8px 6px" }}>{t("settings.userId", "User ID")}</th>
                    <th style={{ padding: "8px 6px" }}>{t("settings.name", "Name")}</th>
                    <th style={{ padding: "8px 6px" }}>{t("settings.phone", "Phone")}</th>
                    <th style={{ padding: "8px 6px" }}>{t("settings.role", "Role")}</th>
                    <th style={{ padding: "8px 6px" }}>{t("settings.status", "Status")}</th>
                    <th style={{ padding: "8px 6px" }} />
                  </tr>
                </thead>
                <tbody>
                  {pagedStaff.map(u => {
                    const status = userIsOnLeave(u._id) ? "on_leave" : "active"; // <<— derive from active leaves
                    return (
                      <tr key={u._id} style={{ borderTop: "1px solid #eee" }}>
                        <td style={{ padding: "8px 6px" }}>{u.userId || "—"}</td>
                        <td style={{ padding: "8px 6px" }}>{u.name}</td>
                        <td style={{ padding: "8px 6px" }}>{u.phone || "—"}</td>
                        <td style={{ padding: "8px 6px" }}>{u.role}</td>
                        <td style={{ padding: "8px 6px" }}>
                          <span style={pill(status)}>{status === "active" ? t("settings.active", "Active") : t("settings.onLeave", "On leave")}</span>
                        </td>
                        <td style={{ padding: "8px 6px" }}>
                          <button style={tinyBtn} onClick={() => openDetail(u)}>{t("settings.viewDetails", "View details")}</button>
                        </td>
                      </tr>
                    );
                  })}
                  {!pagedStaff.length && <tr><td colSpan="6" style={{ padding: 12, color: "#777" }}>{t("settings.noStaff", "No staff to show.")}</td></tr>}
                </tbody>
              </table>

              {/* pagination */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <div style={{ color: "#666", fontSize: 13 }}>{t("settings.pageInfo", `Page ${page} of ${pageCount} · ${staff.length} total`)}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button style={tinyBtn} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{t("settings.prev", "◀ Prev")}</button>
                  <span style={{ fontSize: 13 }}>{page}</span>
                  <button style={tinyBtn} disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>{t("settings.next", "Next ▶")}</button>
                </div>
              </div>
            </div>
          </section>

          {/* Currently on Leave (from API) */}
          <section style={card}>
            <h4>Currently on Leave</h4>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {activeLeaves.map((l) => {
                const u = l.user || {};
                const s = new Date(l.startDate).toISOString().slice(0,10);
                const e = new Date(l.endDate).toISOString().slice(0,10);
                return (
                  <div key={l._id} style={{ ...card, padding: 12, background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <b>{u.name}</b> <span style={{ color: "#666" }}>({u.role})</span>
                        <div style={{ fontSize: 12, color: "#666" }}>{s} → {e}{l.reason ? ` · ${l.reason}` : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={tinyBtn} onClick={() => extendOneDay(l)}>Extend 1 day</button>
                        <button style={tinyBtn} onClick={() => endLeave(l._id, u)}>End today</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!activeLeaves.length && <div style={{ color: "#777" }}>Everyone is active.</div>}
            </div>
          </section>
        </div>
      </div>


      {/* Details modal */}
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div style={{ width: 740, ...card, boxShadow: "0 8px 40px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{detail.name} · {detail.role}</h3>
              <button style={tinyBtn} onClick={closeDetail}>Close</button>
            </div>

            {/* Profile row */}
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, marginTop: 12 }}>
              <div style={{ width: 120, height: 120, borderRadius: 12, background: "#f0f0f0", display: "grid", placeItems: "center" }}>
                {detail.avatarUrl ? <img src={detail.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} /> : <span>Photo</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><div style={label}>User ID</div><div>{detail.userId || "—"}</div></div>
                <div><div style={label}>Phone</div><div>{detail.phone || "—"}</div></div>
                <div><div style={label}>Gender</div><div>{detail.gender || "—"}</div></div>
                <div><div style={label}>Joined</div><div>{detail.joinedAt ? new Date(detail.joinedAt).toISOString().slice(0,10) : "—"}</div></div>
                <div style={{ gridColumn: "1 / -1" }}><div style={label}>Address</div><div>{detail.address || "—"}</div></div>
              </div>
            </div>

            {/* Actions (no leave toggle) */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button style={tinyBtn} onClick={() => doResetPw(detail)}>Reset Password</button>
              <button style={tinyBtn} onClick={() => doResetPin(detail)}>Reset PIN</button>
            </div>

            {/* Leave form + history */}
            <div style={{ marginTop: 16 }}>
              <h4>Leave</h4>
              <div style={row2}>
                <div>
                  <div style={label}>Start date</div>
                  <input type="date" style={input} value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <div style={label}>End date</div>
                  <input type="date" style={input} value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={label}>Reason (optional)</div>
                <input style={input} value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button style={tinyBtn} onClick={() => addLeave(detail)}>Add leave</button>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Recent leaves</div>
                {leaves.map(l => (
                  <div key={l._id} style={{ ...card, padding: 10, background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <div><b>{new Date(l.startDate).toISOString().slice(0,10)}</b> → <b>{new Date(l.endDate).toISOString().slice(0,10)}</b></div>
                      {l.reason && <div style={{ fontSize: 12, color: "#666" }}>{l.reason}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={tinyBtn} onClick={() => endLeave(l._id, detail)}>End leave today</button>
                      <button style={tinyBtn} onClick={() => extendOneDay(l)}>Extend +1 day</button>
                    </div>
                  </div>
                ))}
                {!leaves.length && <div style={{ color: "#777" }}>No leaves recorded.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div style={{ width: 560, ...card, boxShadow: "0 8px 40px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Add Member</h3>
              <button style={tinyBtn} onClick={() => setShowAdd(false)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={label}>Full name</span>
                <input style={input} value={creating.name} onChange={e => setCreating(s => ({ ...s, name: e.target.value }))}/>
              </label>
              <div style={row2}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={label}>Phone</span>
                      <input
                        style={input}
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        pattern="[0-9]*"
                        value={creating.phone}
                        onChange={e => setCreating(s => ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0,10) }))}
                      />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={label}>Role</span>
                  <select style={input} value={creating.role} onChange={e => setCreating(s => ({ ...s, role: e.target.value }))}>
                    <option value="staff">Field Staff</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </label>
              </div>
              <div style={row2}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={label}>Gender</span>
                  <select style={input} value={creating.gender} onChange={e => setCreating(s => ({ ...s, gender: e.target.value }))}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={label}>Joined date</span>
                  <input type="date" style={input} value={creating.joinedAt} onChange={e => setCreating(s => ({ ...s, joinedAt: e.target.value }))}/>
                </label>
              </div>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={label}>Address</span>
                <input style={input} value={creating.address} onChange={e => setCreating(s => ({ ...s, address: e.target.value }))}/>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={label}>Password (optional; leave blank to auto-generate)</span>
                <input style={input} value={creating.password} onChange={e => setCreating(s => ({ ...s, password: e.target.value }))}/>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button style={tinyBtn} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={tinyBtn} onClick={addMember}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
