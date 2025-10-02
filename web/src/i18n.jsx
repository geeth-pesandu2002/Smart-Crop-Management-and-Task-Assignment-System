/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import STRINGS from "./i18n/strings.js";

const LangCtx = createContext(null);

function getFromDict(dict, path) {
  return path.split(".").reduce((acc, k) =>
    acc && Object.prototype.hasOwnProperty.call(acc, k) ? acc[k] : undefined, dict);
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  useEffect(() => { try { localStorage.setItem("lang", lang); } catch {} }, [lang]);

  const value = useMemo(() => {
    const t = (path, fallback = undefined) => {
      if (!path) return "";
      // 1) current language
      const cur = getFromDict(STRINGS[lang], path);
      if (cur !== undefined) return cur;           // ✅ return strings/arrays/objects as-is
      // 2) fallback to English for ANY type
      const enVal = getFromDict(STRINGS.en || {}, path);
      if (enVal !== undefined) return enVal;       // ✅ also arrays/objects
      // 3) final fallback
      return fallback ?? path;
    };

    const fmtDate = (d) => {
      try {
        const date = d instanceof Date ? d : new Date(d);
        return new Intl.DateTimeFormat(lang === "si" ? "si-LK" : "en-LK", { dateStyle: "medium" }).format(date);
      } catch { return d?.toString?.() ?? ""; }
    };

    const fmtNumber = (n) => {
      try { return new Intl.NumberFormat(lang === "si" ? "si-LK" : "en-LK").format(n); }
      catch { return String(n); }
    };

    const toggle = () => setLang((p) => (p === "en" ? "si" : "en"));

    return { lang, setLang, toggle, t, fmtDate, fmtNumber };
  }, [lang]);

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() { return useContext(LangCtx); }
