import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { deviceSchema } from "../shared/schemas.js";
import { inspectDatabase, parseInspectionArgs } from "../server/inspection.js";
import { createSeed } from "../server/seed.js";
import { NetworkStore } from "../server/store.js";
import { NetworkService } from "../server/service.js";

test("Inspector membuka database yang ada, menampilkan sumber, SQL dan parameter", () => {
  const directory = mkdtempSync(join(tmpdir(), "netops-inspect-"));
  const filename = join(directory, "network.sqlite");
  const store = new NetworkStore(filename);
  try {
    store.ingest(createSeed());
    const result = inspectDatabase(filename, { table: "devices", deviceId: "br-sw-01" });
    assert.equal(result.readOnly, true);
    assert.equal(result.simulation, true);
    assert.ok(result.databasePath.toLowerCase().endsWith("network.sqlite"));
    assert.equal(result.tables.find((table) => table.name === "devices")?.rows, 25);
    assert.equal(result.tables.find((table) => table.name === "documents")?.rows, 10);
    assert.ok(result.query);
    assert.match(result.query.sql, /WHERE id = \?/);
    assert.deepEqual(result.query.parameters, ["br-sw-01", 25]);
    assert.equal(result.query.rows.length, 1);
    assert.equal(deviceSchema.parse(result.query.rows[0]).hostname, "BR-SW-01");
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

test("Inspector melihat commit baru dari koneksi aplikasi tanpa membuka ulang aplikasi", () => {
  const directory = mkdtempSync(join(tmpdir(), "netops-fresh-read-"));
  const filename = join(directory, "network.sqlite");
  const store = new NetworkStore(filename);
  try {
    store.ingest(createSeed());
    const service = new NetworkService(store);
    const before = deviceSchema.parse(inspectDatabase(filename, { table: "devices", deviceId: "br-sw-01" }).query?.rows[0]);
    const request = service.createChange({
      reason: "Pembuktian pembacaan database terbaru dari koneksi independen.",
      operation: { kind: "update_device", deviceId: before.id, expectedVersion: before.version, patch: { description: "BUKTI-READ-BARU" } },
    }, "operator");
    const pending = deviceSchema.parse(inspectDatabase(filename, { table: "devices", deviceId: before.id }).query?.rows[0]);
    assert.equal(pending.description, before.description);
    service.decideChange(request.id, "approve");
    const after = deviceSchema.parse(inspectDatabase(filename, { table: "devices", deviceId: before.id }).query?.rows[0]);
    assert.equal(after.description, "BUKTI-READ-BARU");
    assert.equal(after.version, before.version + 1);
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

test("Inspector tidak membuat file baru dan menolak tabel atau filter di luar daftar", () => {
  const directory = mkdtempSync(join(tmpdir(), "netops-inspect-invalid-"));
  const missing = join(directory, "missing.sqlite");
  try {
    assert.throws(() => inspectDatabase(missing), /belum ada/);
    assert.equal(existsSync(missing), false);
    assert.throws(() => parseInspectionArgs(["--table", "devices; DELETE FROM devices"]), /Invalid option/);
    assert.throws(() => parseInspectionArgs(["--limit", "0"]), /Too small/);
    assert.throws(() => parseInspectionArgs(["--limit", "NaN"]), /Invalid input/);
    assert.throws(() => parseInspectionArgs(["--device-id", "br-sw-01"]), /--table/);
    assert.throws(() => parseInspectionArgs(["--table"]), /membutuhkan nilai/);
    assert.throws(() => parseInspectionArgs(["--unknown"]), /tidak dikenal/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("Inspector tidak mengubah data, audit, schema maupun jumlah row", () => {
  const directory = mkdtempSync(join(tmpdir(), "netops-inspect-readonly-"));
  const filename = join(directory, "network.sqlite");
  const store = new NetworkStore(filename);
  try {
    store.ingest(createSeed());
    const schema = store.db.prepare("SELECT sql FROM sqlite_master ORDER BY name").all();
    const audit = store.db.prepare("SELECT * FROM audit").all();
    inspectDatabase(filename);
    inspectDatabase(filename, { table: "documents", deviceId: "br-sw-01", limit: 3 });
    assert.throws(() => inspectDatabase(filename, { table: "sites", deviceId: "br-sw-01" }), /tidak mendukung filter/);
    assert.deepEqual(store.db.prepare("SELECT sql FROM sqlite_master ORDER BY name").all(), schema);
    assert.deepEqual(store.db.prepare("SELECT * FROM audit").all(), audit);
    assert.equal(store.count("devices"), 25);
    assert.equal(store.count("documents"), 10);
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});
