import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { inspectDatabase, parseInspectionArgs } from "../server/inspection.js";

if (existsSync(".env")) loadEnvFile(".env");
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(`Melihat SQLite secara read-only. Tidak ada SQL write dan tidak ada panggilan AI.

npm run db:inspect
npm run db:inspect -- --table devices --device-id br-sw-01
npm run db:inspect -- --table interfaces --device-id br-sw-01
npm run db:inspect -- --table metrics --device-id br-sw-01 --limit 3
npm run --silent db:inspect -- --table documents --device-id br-sw-01 --json

--limit 1..100 (default 25). --json menampilkan hasil lengkap, termasuk body dokumen.
DATABASE_PATH mengikuti konfigurasi aplikasi dan .env. Isi network tetap simulasi.`);
} else {
  try {
    const options = parseInspectionArgs(args);
    const result = inspectDatabase(resolve(process.env.DATABASE_PATH || "data\\runtime\\network.sqlite"), options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("SQL NYATA, DATA NETWORK SIMULASI | READ ONLY");
      console.log(`File yang benar-benar dibuka SQLite: ${result.databasePath}`);
      console.log(`Waktu query: ${result.executedAt} | Durasi: ${result.durationMs} ms`);
      console.table(result.tables);
      if (result.query) {
        console.log(`\nSQL: ${result.query.sql}`);
        console.log(`Parameter: ${JSON.stringify(result.query.parameters)}`);
        console.log(`Hasil: ${result.query.rows.length} row, batas ${result.query.limit}. Jalankan ulang untuk membaca commit terbaru.`);
        console.table(result.query.rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
          key, typeof value === "string" && value.length > 180 ? `${value.slice(0, 180)}... [dipotong pada tampilan]` : value,
        ]))));
        console.log("Teks panjang dipotong hanya pada tampilan tabel. Gunakan --json untuk isi lengkap.");
      } else {
        console.log("Pilih tabel dengan --table devices, interfaces, metrics, documents, changes atau tabel lain di atas.");
      }
    }
  } catch (error) {
    console.error("[db:inspect] Gagal:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
