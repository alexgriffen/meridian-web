import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev (`pnpm --filter @meridian/web dev`) Vite serves the app and proxies
// /api → the api-gateway. In production the same proxying is done by server.mjs.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
