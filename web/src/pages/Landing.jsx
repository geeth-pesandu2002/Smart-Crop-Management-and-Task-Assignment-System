import { Link } from "react-router-dom";
import { useLang } from "../i18n.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

export default function Landing() {
  const { t } = useLang();

  return (
    <div>
      <div className="container">
        {/* Top bar */}
        <nav className="nav">
          <div className="brand" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <img src="/images/logo.png" alt="logo" style={{ height: 36 }} />
            {t("brand")}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <LanguageSwitcher />
            <Link to="/login" className="btn">{t("nav.login")}</Link>
          </div>
        </nav>

        {/* Hero section */}
        <section className="hero" id="home">
          <div>
            <h1 className="h1">{t("landing.headline")}</h1>
            <p className="p">{t("landing.sub")}</p>
            <div className="actions">
              <Link to="/login" className="btn">{t("landing.getStarted")}</Link>
              <Link to="/manager" className="btn outline">{t("nav.dashboard")}</Link>
            </div>
            <p className="p" style={{ marginTop: 16 }}>
              <strong>{t("nav.support")}:</strong> manager@labuduwafarmhouse.lk · +94 71 234 5678
            </p>
          </div>

          {/* Dashboard preview image */}
          <img
            src="/images/dashboard-preview.png"
            alt="Dashboard preview"
            style={{ borderRadius: 16, width: "100%", maxHeight: 300, objectFit: "cover" }}
          />
        </section>

        {/* Features */}
        <section className="features">
          <div className="card">
            <img src="/images/monitoring.jpg" alt="Monitoring" style={{ width: "100%", borderRadius: 12, marginBottom: 8 }} />
            <h4>Real-time monitoring</h4>
            <p>See soil/plots at a glance (IoT-ready).</p>
          </div>
          <div className="card">
            <img src="/images/task.png" alt="Task assignment" style={{ width: "100%", borderRadius: 12, marginBottom: 8 }} />
            <h4>Task assignment</h4>
            <p>Assign, track, and verify staff work quickly.</p>
          </div>
          <div className="card">
            <img src="/images/reports.jpg" alt="Reports" style={{ width: "100%", borderRadius: 12, marginBottom: 8 }} />
            <h4>Reports & insights</h4>
            <p>Harvest, costs, and performance summaries.</p>
          </div>
        </section>

        {/* Footer */}
        <div className="footer" style={{ marginTop: 80 }}>{t("footer")}</div>
      </div>
    </div>
  );
}
