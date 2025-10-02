import { useLang } from "../i18n.jsx";

export default function LanguageSwitcher() {
  const { lang, toggle } = useLang();

  const isEn = lang === "en";
  const aria = isEn ? "Switch to Sinhala" : "Switch to English";
  const title = aria;

  return (
    <button
      type="button"
      className="btn outline"
      onClick={toggle}
      aria-label={aria}
      title={title}
    >
      {isEn ? "සිං" : "EN"}
    </button>
  );
}
