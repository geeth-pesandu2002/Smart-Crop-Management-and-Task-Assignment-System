// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Tasks from "./pages/Tasks.jsx";
import Plots from "./pages/Plots.jsx";
import PlotEditor from "./pages/PlotEditor.jsx";
import Resources from "./pages/Resources.jsx";
import Settings from "./pages/Settings.jsx"; // <-- make sure this exists
import { isAuthed, isManager, ensureMe } from "./auth.js"; // <-- NEW import

function ErrorBoundary({ children }) {
  const [err, setErr] = useState(null);
  useEffect(() => {
    const onErr = (e) => setErr(e?.reason || e?.error || e);
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onErr);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onErr);
    };
  }, []);
  if (err) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Something went wrong on this page.</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{String(err?.message || err)}</pre>
      </div>
    );
  }
  return children;
}

/**
 * Manager-only gate:
 * - If token exists but role is missing/stale, calls /auth/me to repair storage.
 * - Avoids false redirects when navigating directly to /settings after a reload.
 */
function Protected({ children }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      // quick local check first
      if (!isAuthed()) {
        setAllowed(false);
        setReady(true);
        return;
      }
      // if role is already manager, allow
      if (isManager()) {
        setAllowed(true);
        setReady(true);
        return;
      }
      // token exists but role missing or not manager -> try to repair from server
      const res = await ensureMe(); // will rewrite storage to { token, user }
      setAllowed(res.ok && res.user?.role === "manager");
      setReady(true);
    })();
  }, []);

  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;
  return allowed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Manager-only */}
          <Route path="/manager"     element={<Protected><Dashboard /></Protected>} />
          <Route path="/tasks"       element={<Protected><Tasks /></Protected>} />
          <Route path="/plots"       element={<Protected><Plots /></Protected>} />
          <Route path="/plots/new"   element={<Protected><PlotEditor /></Protected>} />
          <Route path="/plots/:id"   element={<Protected><PlotEditor /></Protected>} />
          <Route path="/resources"   element={<Protected><Resources /></Protected>} />
          <Route path="/settings"    element={<Protected><Settings /></Protected>} /> {/* ensure this line exists */}

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
