// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Pages
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Tasks from "./pages/Tasks.jsx";
import Plots from "./pages/Plots.jsx";
import PlotEditor from "./pages/PlotEditor.jsx";
import Resources from "./pages/Resources.jsx";
import Reports from "./pages/Reports.jsx";
import FieldReports from "./pages/FieldReports.jsx";
import Settings from "./pages/Settings.jsx";

// Auth helpers
import { isAuthed, isManager, ensureMe } from "./auth.js";

/* -------------------------------- Error Boundary ------------------------------- */
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

/* ------------------------------ Manager-only gate ------------------------------ */
function Protected({ children }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isAuthed()) {
        setAllowed(false);
        setReady(true);
        return;
      }
      if (isManager()) {
        setAllowed(true);
        setReady(true);
        return;
      }
      const res = await ensureMe(); // refresh local user from server
      setAllowed(res.ok && res.user?.role === "manager");
      setReady(true);
    })();
  }, []);

  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;
  return allowed ? children : <Navigate to="/login" replace />;
}

/* ------------------------------------ App ------------------------------------- */
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
          <Route path="/reports"     element={<Protected><Reports /></Protected>} />
          <Route path="/reports/field" element={<Protected><FieldReports /></Protected>} />
          <Route path="/settings"    element={<Protected><Settings /></Protected>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
