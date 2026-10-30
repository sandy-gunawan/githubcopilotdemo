import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync, type SQLInputValue, type SQLOutputValue } from "node:sqlite";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { idSchema } from "../shared/schemas.js";
import { DATA_TABLES } from "./store.js";

export const INSPECTION_TABLES = [...DATA_TABLES, "changes", "audit", "metadata", "documents_fts"] as const;
const optionsSchema = z.object({
  table: z.enum(INSPECTION_TABLES).optional(),
  deviceId: idSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
  json: z.boolean().default(false),
}).strict().refine((value) => !value.deviceId || value.table, {
  message: "--device-id harus disertai --table.",
});
type InspectionTable = typeof INSPECTION_TABLES[number];
export type InspectionOptions = z.input<typeof optionsSchema>;
export interface DatabaseInspection {
  simulation: true;
  readOnly: true;
  databasePath: string;
  executedAt: string;
  durationMs: number;
  tables: { name: InspectionTable; rows: number }[];
  query?: {
    table: InspectionTable;
    sql: string;
    parameters: SQLInputValue[];
    columns: { name: string; type: string; primaryKey: boolean }[];
    rows: Record<string, SQLOutputValue>[];
    limit: number;
  };
}

export function parseInspectionArgs(args: string[]) {
  const values: Record<string, unknown> = {};
  const flags: Record<string, string> = { "--table": "table", "--device-id": "deviceId", "--limit": "limit" };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--json") { values.json = true; continue; }
    const key = flags[argument];
    if (!key) throw new Error(`Argumen tidak dikenal: ${argument}. Gunakan --table, --device-id, --limit atau --json.`);
    const next = args[++index];
    if (!next || next.startsWith("--")) throw new Error(`${argument} membutuhkan nilai.`);
    if (key in values) throw new Error(`Argumen berulang: ${argument}`);
    values[key] = key === "limit" ? Number(next) : next;
  }
  return optionsSchema.parse(values);
}

export function inspectDatabase(filename: string, input: InspectionOptions = {}): DatabaseInspection {
  const options = optionsSchema.parse(input);
  const databasePath = resolve(filename);
  if (!existsSync(databasePath)) throw new Error(`Database belum ada: ${databasePath}. Jalankan npm run seed terlebih dahulu.`);
  const db = new DatabaseSync(databasePath, { readOnly: true });
  const started = performance.now();
  try {
    db.exec("PRAGMA query_only = ON; BEGIN");
    const database = z.object({ file: z.string() }).parse(
      db.prepare("PRAGMA database_list").all().find((row) => row.name === "main"),
    );
    const tables = INSPECTION_TABLES.map((name) => ({
      name, rows: z.object({ total: z.number() }).parse(db.prepare(`SELECT count(*) AS total FROM ${name}`).get()).total,
    }));
    let query: DatabaseInspection["query"];
    if (options.table) {
      const table = options.table;
      const parameters: SQLInputValue[] = [];
      let where = "";
      if (options.deviceId) {
        const field = table === "devices" ? "id"
          : ["interfaces", "metrics", "alerts", "documents"].includes(table) ? "deviceId" : null;
        if (!field) throw new Error(`Tabel ${table} tidak mendukung filter --device-id.`);
        where = ` WHERE ${field} = ?`;
        parameters.push(options.deviceId);
      }
      const order = table === "metadata" ? "key"
        : table === "documents_fts" ? "rowid"
          : table === "metrics" ? "timestamp DESC, id"
            : table === "changes" ? "createdAt DESC, id" : table === "audit" ? "id DESC" : "id";
      const sql = `SELECT * FROM ${table}${where} ORDER BY ${order} LIMIT ?`;
      parameters.push(options.limit);
      const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => {
        const column = z.object({ name: z.string(), type: z.string(), pk: z.number() }).parse(row);
        return { name: column.name, type: column.type, primaryKey: column.pk > 0 };
      });
      query = { table, sql, parameters, columns, rows: db.prepare(sql).all(...parameters), limit: options.limit };
    }
    db.exec("COMMIT");
    return {
      simulation: true, readOnly: true, databasePath: database.file, executedAt: new Date().toISOString(),
      durationMs: Number((performance.now() - started).toFixed(3)), tables, query,
    };
  } finally {
    db.close();
  }
}
