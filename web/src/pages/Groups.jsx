import { useEffect, useState } from "react";
import api from "../api.js";

import { useNavigate } from "react-router-dom";

const GROUPS_PER_PAGE = 8;

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [groupPage, setGroupPage] = useState(1);
  const [staff, setStaff] = useState([]);
  const [editing, setEditing] = useState(null); // group being edited or null
  const [form, setForm] = useState({ name: "", members: [], createdAt: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [{ data: groupData }, { data: staffData }] = await Promise.all([
          api.get("/groups"),
          api.get("/users?role=staff"),
        ]);
        setGroups(groupData || []);
        setStaff(staffData || []);
      } catch (e) {
        setMsg("Failed to load groups or staff");
      }
    })();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({ name: "", members: [], createdAt: new Date().toISOString().slice(0, 10) });
    setMsg("");
  };

  const startEdit = (g) => {
    setEditing(g._id);
    setForm({
      name: g.name,
      members: g.members?.map(m => m._id || m) || [],
      createdAt: g.createdAt?.slice(0, 10) || "",
    });
    setMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/groups/${editing}`, { name: form.name, members: form.members });
        setMsg("Group updated");
      } else {
        await api.post("/groups", { name: form.name, members: form.members, createdAt: form.createdAt });
        setMsg("Group created");
      }
      // reload
      const { data } = await api.get("/groups");
      setGroups(data || []);
      setEditing(null);
      setForm({ name: "", members: [], createdAt: "" });
    } catch (e) {
      setMsg("Failed to save group");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this group?")) return;
    try {
      await api.delete(`/groups/${id}`);
      setGroups(groups.filter(g => g._id !== id));
      setMsg("Group deleted");
    } catch {
      setMsg("Failed to delete group");
    }
  };

  const navigate = useNavigate();

  return (
    <div className="container">
      <button
        className="btn"
        style={{ marginBottom: 16, background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)", color: "#fff", border: "none", borderRadius: 999, padding: "8px 20px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
        onClick={() => navigate('/tasks')}
      >
        ← Back to Task Management
      </button>
      <h2>Groups Management</h2>
      <button className="btn primary" onClick={startCreate} style={{ marginBottom: 16 }}>Create New Group</button>
      {msg && <div style={{ color: "#b91c1c", marginBottom: 8 }}>{msg}</div>}
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 420, marginBottom: 24 }}>
        <h3>{editing ? "Edit Group" : "Create Group"}</h3>
        <div className="field">
          <label>Group Name</label>
          <input
            className="input"
            style={{ maxWidth: 220, width: "100%" }}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div className="field">
          <label>Creation Date</label>
          <input
            className="input"
            type="date"
            style={{ maxWidth: 180, width: "100%" }}
            value={form.createdAt}
            onChange={e => setForm(f => ({ ...f, createdAt: e.target.value }))}
            required
          />
        </div>
        <div className="field">
          <label>Group Members</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 160, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: 8 }}>
            {staff.map(s => (
              <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={form.members.includes(s._id)}
                  onChange={e => {
                    setForm(f => ({
                      ...f,
                      members: e.target.checked
                        ? [...f.members, s._id]
                        : f.members.filter(id => id !== s._id)
                    }));
                  }}
                />
                {s.name} {s.email ? `(${s.email})` : ""}
              </label>
            ))}
          </div>
        </div>
        <div className="btnbar">
          <button className="btn primary" type="submit">{editing ? "Update Group" : "Create Group"}</button>
          {editing && <button className="btn ghost" type="button" onClick={startCreate}>Cancel</button>}
        </div>
      </form>
      <h3>Existing Groups</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Created</th>
            <th>Members</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.length === 0 && <tr><td colSpan={4}><i>No groups found</i></td></tr>}
          {groups.slice((groupPage-1)*GROUPS_PER_PAGE, groupPage*GROUPS_PER_PAGE).map(g => (
            <tr key={g._id}>
              <td>{g.name}</td>
              <td>{g.createdAt ? g.createdAt.slice(0, 10) : "-"}</td>
              <td>{g.members?.length || 0}</td>
              <td>
                <button className="btn sm" onClick={() => startEdit(g)}>Edit</button>
                <button className="btn ghost sm" onClick={() => handleDelete(g._id)} style={{ marginLeft: 8 }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination Controls */}
      {groups.length > GROUPS_PER_PAGE && (
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button
            className="btn sm"
            onClick={() => setGroupPage(p => Math.max(1, p - 1))}
            disabled={groupPage === 1}
          >
            Prev
          </button>
          <span style={{ alignSelf: 'center' }}>
            Page {groupPage} of {Math.ceil(groups.length / GROUPS_PER_PAGE)}
          </span>
          <button
            className="btn sm"
            onClick={() => setGroupPage(p => Math.min(Math.ceil(groups.length / GROUPS_PER_PAGE), p + 1))}
            disabled={groupPage === Math.ceil(groups.length / GROUPS_PER_PAGE)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
