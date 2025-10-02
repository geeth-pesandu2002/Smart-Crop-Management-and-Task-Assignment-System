import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import { isManager, isAuthed, clearAuth } from "../auth";

export default function ManagerHome() {
  const nav = useNavigate();
  const [form, setForm] = useState({ title:'', description:'', assignedTo:'', priority:'normal', dueDate:'' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isAuthed() || !isManager()) nav('/login');
  }, [nav]);

  const createTask = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const { data } = await api.post('/tasks', form);
      setMsg('Task created: ' + data._id);
      setForm({ title:'', description:'', assignedTo:'', priority:'normal', dueDate:'' });
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Failed to create task');
    }
  };

  return (
    <div style={{padding:24}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2>Manager Dashboard</h2>
        <button onClick={() => { clearAuth(); nav('/login'); }}>Log out</button>
      </header>

      <h3 style={{marginTop:24}}>Assign Task</h3>
      <form onSubmit={createTask} style={{maxWidth:520, display:'grid', gap:10}}>
        <input placeholder="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})}/>
        <textarea placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/>
        <input placeholder="AssignedTo (staff user id)" value={form.assignedTo} onChange={e=>setForm({...form, assignedTo:e.target.value})}/>
        <select value={form.priority} onChange={e=>setForm({...form, priority:e.target.value})}>
          <option value="low">low</option>
          <option value="normal">normal</option>
          <option value="high">high</option>
        </select>
        <input type="date" value={form.dueDate} onChange={e=>setForm({...form, dueDate:e.target.value})}/>
        <button type="submit">Create Task</button>
      </form>
      {msg && <p style={{marginTop:10}}>{msg}</p>}
    </div>
  );
}
