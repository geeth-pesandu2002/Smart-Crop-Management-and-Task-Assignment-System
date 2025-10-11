// src/components/LanguageSwitcher.jsx
import { useLang } from "../i18n.jsx";

export default function LanguageSwitcher({ className = "" }) {
  const { lang, toggle, t } = useLang();
  const label =
    (t && t("langToggle")) || (lang === "en" ? "සිං / EN" : "EN / සිං");

  return (
    <button
      type="button"
      className={`btn ghost ${className}`}
      onClick={toggle}
      aria-label="Toggle language"
      title={label}
    >
      {label}
    </button>
  );
}
