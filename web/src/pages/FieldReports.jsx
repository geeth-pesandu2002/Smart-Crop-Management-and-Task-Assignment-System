import { useEffect, useMemo, useState } from "react";
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

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  useEffect(() => { refresh(); }, [page, q]);
  async function refresh() {
    setLoading(true); setErr("");
    try {
      const params = { page, limit: LIMIT };
      if (q) params.q = q;
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
          <input className="input" placeholder={L('Search by field, reporter, type...', 'ක්ෂේත්‍රය, වාර්තාකරු, වර්ගය අනුව සොයන්න...')} value={q} onChange={(e) => setQ(e.target.value)} />
          <PageControls page={page} setPage={setPage} pages={pages} />
          <Link to="/manager" className="btn outline">{L('Back', 'පසු 돌아')}</Link>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        {loading && <div>{L('Loading…','පූරණය වෙමින්…')}</div>}
        {err && <div style={{ color: '#b91c1c' }}>{err}</div>}
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        {rows.map((r) => {
          const photo = r.photoUrl ? buildAbsoluteUrl(r.photoUrl) : null;
          const voice = r.voiceUrl ? buildAbsoluteUrl(r.voiceUrl) : null;
          return (
            <div key={r._id} style={{ background: '#fff', padding: 16, borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{r.issueType || 'Issue'}</h3>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{formatDateTime(r.date)}</div>
                  </div>

                  <div style={{ color: '#374151', marginTop: 8 }}>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{r.userCode ? `${r.userCode} · ` : ''}{r.userName || 'Unknown'}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Plot: {r.field || '-'}</div>
                  </div>

                  {r.description ? <div style={{ marginTop: 10, color: '#111827' }}>{r.description}</div> : null}

                  {photo ? (
                    <div style={{ marginTop: 10 }}>
                      <img onClick={() => openLightbox(photo)} src={photo} alt="report" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} />
                    </div>
                  ) : null}

                  {voice ? (
                    <div style={{ marginTop: 8 }}>
                      <audio controls src={voice} style={{ width: '100%' }} />
                    </div>
                  ) : null}

                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn"
                      onClick={() => {
                        // navigate to tasks with fromReport and show temporary action taken message
                        navigate(`/tasks?fromReport=${r._id}`);
                        setActionTaken(prev => ({ ...prev, [r._id]: 'Task created' }));
                        // clear after 4s
                        setTimeout(() => setActionTaken(prev => ({ ...prev, [r._id]: null })), 4000);
                      }}
                    >{L('Create Task', 'කාර්යයක් සාදන්න')}</button>
                    {actionTaken[r._id] ? <div style={{ color: '#065f46', fontWeight: 600 }}>{actionTaken[r._id]}</div> : null}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
