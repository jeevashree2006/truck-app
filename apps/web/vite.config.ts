import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split big, stable third-party deps into their own cacheable chunks.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory")) return "recharts";
            if (id.includes("framer-motion")) return "motion";
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    // Proxy API calls to the backend so the app makes same-origin requests in dev
    // (no CORS preflight). Override the target with VITE_PROXY_TARGET if needed.
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
