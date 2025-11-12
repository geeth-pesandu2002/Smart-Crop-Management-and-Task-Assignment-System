import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import { isManager, isAuthed, clearAuth } from "../auth";

export default function ManagerHome() {
  const nav = useNavigate();
  const [form, setForm] = useState({ title:'', description:'', assignedTo:'', priority:'normal', dueDate:'', startDate:'' });
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
  setForm({ title:'', description:'', assignedTo:'', priority:'normal', dueDate:'', startDate:'' });
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Failed to create task');
    }
  };

  return (
  <div style={{padding:24, display:'flex', flexDirection:'column', alignItems:'flex-start'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
        <h2>Manager Dashboard</h2>
        <div style={{display:'flex', gap:16, alignItems:'center'}}>
          <a href="#" onClick={e => { e.preventDefault(); /* add help logic here */ }} style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 500, cursor: 'pointer' }}>Help</a>
          <a href="#" onClick={e => { e.preventDefault(); /* add notification logic here */ }} style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 500, cursor: 'pointer' }}>Notifications</a>
          <button onClick={() => { clearAuth(); nav('/login'); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 500, cursor: 'pointer', textDecoration: 'none', padding: 0 }}>Log out</button>
        </div>
      </header>

      {/* Removed assigned tasks section. Only task creation form remains if needed. */}
    </div>
  );
}
