// web/src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { LanguageProvider } from "./i18n.jsx";

// Leaflet & Geoman styles/scripts
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";

// Add global listeners so a blank screen will always print the error
window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("Window error:", e?.error || e);
});
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled rejection:", e?.reason || e);
});

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);