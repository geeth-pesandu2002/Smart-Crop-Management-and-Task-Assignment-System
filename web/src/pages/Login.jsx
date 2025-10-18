import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import { setAuth as saveAuth } from "../auth.js"; // <-- extension + alias
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import { useLang } from "../i18n.jsx";

export default function Login() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setOk(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      // data: { token, role, name, id, user? }
      if (data.role !== "manager") {
        setErr(t("login.onlyManager"));
      } else {
        // Save token + payload; our auth helpers handle either shape
        saveAuth(data);
        setOk(t("login.success"));
        setTimeout(() => nav("/manager"), 400);
      }
    } catch (e) {
      setErr(e?.response?.data?.error || t("login.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      {/* Left info panel with image */}
      <div
        className="side"
        style={{
          backgroundImage: "url('/images/login-side.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div style={{ background: "rgba(0,0,0,0.5)", padding: 24, borderRadius: 12 }}>
          <h2 style={{ marginBottom: 0, color: "white" }}>{t("login.welcomeTitle")}</h2>
          <ul className="bullets" style={{ color: "white" }}>
            {t("login.welcomeBullets").map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      </div>

      {/* Right form card */}
      <div className="formWrap" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <LanguageSwitcher />
        </div>

        <div className="formCard">
          <h3>{t("login.boxTitle")}</h3>
          <p className="sub">{t("login.boxSub")}</p>

          <form onSubmit={submit}>
            <div style={{ marginBottom: 18 }}>
              <label className="label" style={{ display: "block", marginBottom: 6 }}>{t("login.email")}</label>
              <input
                className="input"
                placeholder="manager@farm.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: "100%", maxWidth: 400, minWidth: 0 }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label className="label" style={{ display: "block", marginBottom: 6 }}>{t("login.password")}</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: "100%", maxWidth: 400, minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    alignItems: "center"
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.07 21.07 0 0 1 5.06-6.06"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47"/></svg>
                  )}
                </button>
              </div>
            </div>
            <div className="row" style={{ marginBottom: 24 }}>
              <span className="small">{t("login.forgot")}</span>
              <Link to="/" className="small link">{t("login.backHome")}</Link>
            </div>
            <button className="cta" type="submit" disabled={loading}>
              {loading ? "..." : t("login.loginBtn")}
            </button>
          </form>

          {ok && <div className="note">{ok}</div>}
          {err && <div className="error">{err}</div>}
        </div>
      </div>
    </div>
  );
}
