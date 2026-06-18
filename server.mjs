// Production server for the Meridian web console.
// Serves the built SPA from ./dist and proxies /api/* to the api-gateway so the
// browser talks to a single origin (no CORS) while the tenant header stays
// under the app's control.
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 5173);
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const app = express();

app.use(
  "/api",
  createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    pathRewrite: { "^/api": "" },
  })
);

const dist = path.join(__dirname, "dist");
app.use(express.static(dist));
// SPA fallback — let client-side routing handle everything else.
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`meridian-web listening on :${PORT} → proxying /api to ${API_URL}`);
});
