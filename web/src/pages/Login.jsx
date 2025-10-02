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
            <label className="label">{t("login.email")}</label>
            <input
              className="input"
              placeholder="manager@farm.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <label className="label">{t("login.password")}</label>
            <input
              className="input"
              type="password"
              placeholder="********"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <div className="row">
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
