import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: true, 
    historyApiFallback: true, // <-- keep this line
  },
  // helps Vite pre-bundle correctly in some Windows setups
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});