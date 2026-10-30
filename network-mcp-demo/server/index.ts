import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import express from "express";
import { createApp } from "./app.js";
import { loadSeedDirectory } from "./ingestion.js";
import { NetworkStore } from "./store.js";

if (existsSync(".env")) loadEnvFile(".env");
const root = process.cwd();
const host = process.env.HOST || "127.0.0.1";
if (host !== "127.0.0.1") throw new Error("HOST harus 127.0.0.1. Demo ini tidak dirancang untuk exposure publik.");
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("PORT harus angka 1024-65535.");
const store = new NetworkStore(resolve(process.env.DATABASE_PATH || "data\\runtime\\network.sqlite"));
if (!store.metadata("seedFingerprint")) {
  const seedDirectory = resolve(root, "data", "seed");
  if (!existsSync(resolve(seedDirectory, "network.json"))) {
    store.close();
    throw new Error("Seed belum tersedia. Jalankan npm run data:generate lalu npm run seed.");
  }
  store.ingest(loadSeedDirectory(seedDirectory));
}
const runtime = createApp({
  store, root, mcpUrl: () => `http://${host}:${port}/mcp`,
  mcpToken: process.env.MCP_API_TOKEN || undefined,
  model: process.env.COPILOT_MODEL || undefined, cliPath: process.env.COPILOT_CLI_PATH || undefined,
});
let closeVite: (() => Promise<void>) | undefined;
if (process.argv[1]?.endsWith(".ts")) {
  const { createServer } = await import("vite");
  const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
  closeVite = () => vite.close();
  runtime.app.use(vite.middlewares);
} else {
  const clientRoot = resolve(root, "dist", "client");
  if (!existsSync(resolve(clientRoot, "index.html"))) {
    store.close();
    throw new Error("Frontend belum di-build. Jalankan npm run build sebelum npm start.");
  }
  runtime.app.use(express.static(clientRoot));
  runtime.app.get("/{*path}", (_request, response) => response.sendFile(resolve(clientRoot, "index.html")));
}
runtime.app.use(runtime.errorHandler);
const server = runtime.app.listen(port, host, () => {
  console.log(`\nNetOps Lab: http://${host}:${port}`);
  console.log(`MCP: http://${host}:${port}/mcp (Bearer token; stateless Streamable HTTP)`);
  console.log(`Dataset: ${store.count("devices")} device, ${store.count("documents")} dokumen, ${store.count("metrics")} metrics.`);
  console.log("SIMULATION ONLY. Tidak ada koneksi device asli. Agent memakai login GitHub Copilot lokal.");
});
server.on("error", (error) => {
  console.error("[server] Tidak dapat listen:", error.message);
  store.close();
  process.exitCode = 1;
});
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\n[server] Menghentikan aplikasi...");
  server.close();
  try {
    await runtime.agent.stop();
    await closeVite?.();
  } catch (error) {
    console.error("[server] Shutdown gagal:", error);
    process.exitCode = 1;
  } finally { store.close(); }
}
process.on("SIGINT", () => { void shutdown(); });
process.on("SIGTERM", () => { void shutdown(); });
