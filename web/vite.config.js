// web/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: true, // allows access from LAN if you ever need it
  },
  // helps Vite pre-bundle correctly in some Windows setups
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
