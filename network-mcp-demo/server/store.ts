import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { seedSchema, type SeedBundle } from "../shared/schemas.js";

export const DATA_TABLES = [
  "sites", "devices", "vlans", "interfaces", "links", "metrics", "alerts", "documents",
] as const;
export type DataTable = typeof DATA_TABLES[number];

export class NetworkStore {
  readonly db: DatabaseSync;
  private closed = false;

  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
        region TEXT NOT NULL, type TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY, hostname TEXT NOT NULL UNIQUE, type TEXT NOT NULL,
        vendor TEXT NOT NULL, model TEXT NOT NULL, managementIp TEXT NOT NULL UNIQUE,
        siteId TEXT NOT NULL REFERENCES sites(id), status TEXT NOT NULL,
        description TEXT NOT NULL, firmware TEXT NOT NULL, version INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS vlans (
        id TEXT PRIMARY KEY, siteId TEXT NOT NULL REFERENCES sites(id),
        number INTEGER NOT NULL, name TEXT NOT NULL, subnet TEXT NOT NULL,
        UNIQUE(siteId, number)
      );
      CREATE TABLE IF NOT EXISTS interfaces (
        id TEXT PRIMARY KEY, deviceId TEXT NOT NULL REFERENCES devices(id),
        name TEXT NOT NULL, role TEXT NOT NULL, adminStatus TEXT NOT NULL,
        operStatus TEXT NOT NULL, speedMbps REAL NOT NULL,
        vlanId TEXT REFERENCES vlans(id), utilizationPct REAL NOT NULL,
        errors INTEGER NOT NULL, version INTEGER NOT NULL,
        UNIQUE(deviceId, name)
      );
      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY, sourceInterfaceId TEXT NOT NULL REFERENCES interfaces(id),
        targetInterfaceId TEXT NOT NULL REFERENCES interfaces(id),
        bandwidthMbps REAL NOT NULL, status TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY, deviceId TEXT NOT NULL REFERENCES devices(id),
        timestamp TEXT NOT NULL, cpuPct REAL NOT NULL, memoryPct REAL NOT NULL,
        bandwidthInMbps REAL NOT NULL, bandwidthOutMbps REAL NOT NULL,
        packetLossPct REAL NOT NULL
      );
      CREATE INDEX IF NOT EXISTS metrics_device_timestamp ON metrics(deviceId, timestamp);
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY, deviceId TEXT NOT NULL REFERENCES devices(id),
        interfaceId TEXT REFERENCES interfaces(id), severity TEXT NOT NULL,
        code TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
        status TEXT NOT NULL, createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL,
        siteId TEXT REFERENCES sites(id), deviceId TEXT REFERENCES devices(id),
        tags TEXT NOT NULL, content TEXT NOT NULL, sourcePath TEXT,
        version INTEGER NOT NULL, updatedAt TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
        title, content, tags, content='documents', content_rowid='rowid',
        tokenize='unicode61'
      );
      CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
        INSERT INTO documents_fts(rowid, title, content, tags) VALUES (new.rowid, new.title, new.content, new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
        INSERT INTO documents_fts(documents_fts, rowid, title, content, tags)
        VALUES ('delete', old.rowid, old.title, old.content, old.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
        INSERT INTO documents_fts(documents_fts, rowid, title, content, tags)
        VALUES ('delete', old.rowid, old.title, old.content, old.tags);
        INSERT INTO documents_fts(rowid, title, content, tags) VALUES (new.rowid, new.title, new.content, new.tags);
      END;
      CREATE TABLE IF NOT EXISTS changes (
        id TEXT PRIMARY KEY, status TEXT NOT NULL, requestedBy TEXT NOT NULL,
        reason TEXT NOT NULL, operation TEXT NOT NULL, preview TEXT NOT NULL,
        createdAt TEXT NOT NULL, decidedAt TEXT, error TEXT
      );
      CREATE TABLE IF NOT EXISTS audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL,
        actor TEXT NOT NULL, action TEXT NOT NULL, targetId TEXT NOT NULL, detail TEXT NOT NULL
      );
    `);
  }

  transaction<T>(action: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = action();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  count(table: DataTable): number {
    const row = this.db.prepare(`SELECT count(*) AS total FROM ${table}`).get();
    return Number(row?.total);
  }

  metadata(key: string): string | null {
    const value = this.db.prepare("SELECT value FROM metadata WHERE key = ?").get(key)?.value;
    return value === undefined ? null : String(value);
  }

  ingest(input: SeedBundle, reset = false): { inserted: boolean; fingerprint: string } {
    const seed = seedSchema.parse(input);
    const fingerprint = createHash("sha256").update(JSON.stringify(seed)).digest("hex");
    const existing = this.metadata("seedFingerprint");
    if (!reset && existing === fingerprint) return { inserted: false, fingerprint };
    if (!reset && (existing || this.count("devices") > 0)) {
      throw new Error("Database sudah berisi dataset lain. Gunakan --reset secara eksplisit; perubahan demo akan hilang.");
    }
    return this.transaction(() => {
      if (reset) {
        this.db.exec(`
          DELETE FROM changes; DELETE FROM audit;
          DELETE FROM documents; DELETE FROM alerts; DELETE FROM metrics;
          DELETE FROM links; DELETE FROM interfaces; DELETE FROM vlans;
          DELETE FROM devices; DELETE FROM sites; DELETE FROM metadata;
        `);
      }
      for (const table of DATA_TABLES) {
        for (const item of seed[table]) {
          const entries = Object.entries(item);
          const values: SQLInputValue[] = entries.map(([, value]) =>
            Array.isArray(value) ? JSON.stringify(value) : value,
          );
          this.db.prepare(`INSERT INTO ${table} (${entries.map(([key]) => key).join(",")})
            VALUES (${entries.map(() => "?").join(",")})`).run(...values);
        }
      }
      const put = this.db.prepare("INSERT INTO metadata(key, value) VALUES (?, ?)");
      put.run("seedFingerprint", fingerprint);
      put.run("datasetVersion", seed.datasetVersion);
      put.run("snapshotAt", seed.snapshotAt);
      this.audit("system", reset ? "dataset.reset" : "dataset.ingest", seed.datasetVersion,
        `Imported ${seed.devices.length} devices dan ${seed.documents.length} dokumen; SHA256 ${fingerprint}.`);
      return { inserted: true, fingerprint };
    });
  }

  audit(actor: string, action: string, targetId: string, detail: string): void {
    this.db.prepare("INSERT INTO audit(timestamp, actor, action, targetId, detail) VALUES (?, ?, ?, ?, ?)")
      .run(new Date().toISOString(), actor, action, targetId, detail);
  }

  close(): void {
    if (!this.closed) {
      this.db.close();
      this.closed = true;
    }
  }
}
