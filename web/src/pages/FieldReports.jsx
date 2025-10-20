import { useEffect, useMemo, useState, useRef } from "react";
import api from "../api.js";
import { useLang } from "../i18n.jsx";
import { Link, useNavigate } from "react-router-dom";

function PageControls({ page, setPage, pages }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button className="btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</button>
      <div style={{ fontWeight: 700 }}>{page} / {pages}</div>
      <button className="btn" disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p+1))}>Next</button>
    </div>
  );
}

export default function FieldReports() {
  const { lang } = useLang();
  const L = (en, si) => (lang === "si" ? si : en);
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  // local map to track action taken per report (client-side only)
  const [actionTaken, setActionTaken] = useState({});

  const [q, setQ] = useState(""); // input value
  const [search, setSearch] = useState(""); // actual search trigger
  const [page, setPage] = useState(1);
  const LIMIT = 8;
  const searchInputRef = useRef();

  useEffect(() => { refresh(); }, [page, search]);
  async function refresh() {
    setLoading(true); setErr("");
    try {
      const params = { page, limit: LIMIT };
      if (search) params.q = search;
      const res = await api.get('/reports', { params });
      // axios returns a response object; backend currently returns an array of reports
      const data = res && res.data ? res.data : res;
      // backend currently returns array; adapt if pagination is added
      setRows(Array.isArray(data) ? data : (data.items || []));
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || e?.message || 'Failed to load reports');
    } finally { setLoading(false); }
  }

  const pages = useMemo(() => Math.max(1, Math.ceil((rows.length || 0) / LIMIT)), [rows.length]);

  function buildAbsoluteUrl(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    const base = (api?.defaults?.baseURL || '').replace(/\/+$/, '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  function openLightbox(url) {
    const w = window.open();
    w.document.write(`<img src="${url}" style="max-width:100%;height:auto"/>`);
  }

  function formatDateTime(input) {
    if (!input) return '';
    const d = new Date(input);
    try {
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } catch (e) {
      return d.toString();
    }
  }

  return (
    <div className="container" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{L('Field Reports', 'ක්ෂේත්‍ර වාර්තා')}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            ref={searchInputRef}
            placeholder={L('Search by field, reporter, type...', 'ක්ෂේත්‍රය, වාර්තාකරු, වර්ගය අනුව සොයන්න...')}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setPage(1);
                setSearch(q);
              }
            }}
          />
          <button
            className="btn"
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
            onClick={() => {
              setPage(1);
              setSearch(q);
              searchInputRef.current && searchInputRef.current.blur();
            }}
          >{L('Search', 'සොයන්න')}</button>
          <PageControls page={page} setPage={setPage} pages={pages} />
          <Link to="/manager">
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
              {L('Dashboard', 'පුවරුව')}
            </button>
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        {loading && <div>{L('Loading…','පූරණය වෙමින්…')}</div>}
        {err && <div style={{ color: '#b91c1c' }}>{err}</div>}
      </div>

      <div className="field-reports-grid">
        {rows.map((r) => {
          const photo = r.photoUrl ? buildAbsoluteUrl(r.photoUrl) : null;
          const voice = r.voiceUrl ? buildAbsoluteUrl(r.voiceUrl) : null;
          return (
            <div key={r._id} className="field-report-card">
              <div className="field-report-header">
                <div className="field-report-title">{r.issueType || 'Issue'}</div>
                <div className="field-report-date">{formatDateTime(r.date)}</div>
              </div>
              <div className="field-report-meta">
                {r.userCode ? `${r.userCode} · ` : ''}{r.userName || 'Unknown'}
                <span style={{ marginLeft: 10 }}>Plot: {r.field || '-'}</span>
              </div>
              {r.description ? <div className="field-report-description">{r.description}</div> : null}
              {photo ? (
                <div className="field-report-photo">
                  <img onClick={() => openLightbox(photo)} src={photo} alt="report" />
                </div>
              ) : null}
              {voice ? (
                <div className="field-report-audio">
                  <audio controls src={voice} style={{ width: '100%' }} />
                </div>
              ) : null}
              <div className="field-report-actions">
                <button
                  className="btn"
                  onClick={() => {
                    navigate(`/tasks?fromReport=${r._id}`);
                    setActionTaken(prev => ({ ...prev, [r._id]: 'Task created' }));
                    setTimeout(() => setActionTaken(prev => ({ ...prev, [r._id]: null })), 4000);
                  }}
                >{L('Create Task', 'කාර්යයක් සාදන්න')}</button>
                {actionTaken[r._id] ? <div className="field-report-action-message">{actionTaken[r._id]}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
