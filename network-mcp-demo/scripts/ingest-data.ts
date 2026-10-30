import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadSeedDirectory } from "../server/ingestion.js";
import { NetworkStore } from "../server/store.js";

if (existsSync(".env")) loadEnvFile(".env");
const args = process.argv.slice(2);
const allowed = new Set(["--reset", "--directory"]);
for (let index = 0; index < args.length; index++) {
  if (!allowed.has(args[index])) throw new Error(`Argumen tidak dikenal: ${args[index]}`);
  if (args[index] === "--directory") {
    if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error("--directory membutuhkan path.");
    index++;
  }
}
const pathIndex = args.indexOf("--directory");
const directory = pathIndex >= 0 ? args[pathIndex + 1] : resolve("data", "seed");
const store = new NetworkStore(resolve(process.env.DATABASE_PATH || "data\\runtime\\network.sqlite"));
try {
  const result = store.ingest(loadSeedDirectory(directory), args.includes("--reset"));
  console.log(result.inserted ? "Ingestion selesai." : "Dataset identik sudah pernah di-ingest; perubahan runtime dipertahankan.");
  console.log(JSON.stringify({
    ...result,
    devices: store.count("devices"), documents: store.count("documents"), metrics: store.count("metrics"),
  }, null, 2));
} finally {
  store.close();
}
