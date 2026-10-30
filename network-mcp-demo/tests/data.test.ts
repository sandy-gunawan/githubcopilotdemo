import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createSeed } from "../server/seed.js";
import { NetworkStore } from "../server/store.js";
import { NetworkService } from "../server/service.js";
import { loadSeedDirectory } from "../server/ingestion.js";
import { resolve } from "node:path";

test("REQ-002/004: seed deterministik mempunyai relasi dan tiga skenario persis", () => {
  const first = createSeed();
  assert.deepEqual(first, createSeed());
  assert.equal(first.sites.length, 3);
  assert.equal(first.devices.length, 25);
  assert.equal(first.metrics.length, 600);
  assert.equal(first.documents.length, 10);
  assert.equal(first.alerts.length, 3);
  assert.equal(first.interfaces.find((item) => item.id === "br-sw-01-gi01")?.utilizationPct, 95);
  assert.equal(first.interfaces.find((item) => item.id === "dc-sw-02-gi02")?.operStatus, "down");
  assert.equal(first.metrics.filter((item) => item.deviceId === "hq-fw-01").at(-1)?.cpuPct, 92);
});

test("REQ-003/004/009: ingest idempotent, FTS bekerja, data persisten", () => {
  const directory = mkdtempSync(join(tmpdir(), "network-demo-test-"));
  const filename = join(directory, "network.sqlite");
  const store = new NetworkStore(filename);
  try {
    assert.equal(store.ingest(createSeed()).inserted, true);
    assert.equal(store.ingest(createSeed()).inserted, false);
    const service = new NetworkService(store);
    assert.equal(service.overview().counts.devices, 25);
    const hits = service.searchDocuments("congestion");
    assert.ok(hits.some((item) => item.id === "doc-branch-runbook"));
    assert.match(service.getDocument("doc-branch-log").content, /95/);
    store.close();
    const reopened = new NetworkStore(filename);
    try {
      assert.equal(new NetworkService(reopened).overview().counts.devices, 25);
    } finally {
      reopened.close();
    }
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("REQ-004: seed yang melanggar foreign key di-rollback seluruhnya", () => {
  const store = new NetworkStore(":memory:");
  try {
    const seed = createSeed();
    seed.interfaces[0].deviceId = "does-not-exist";
    assert.throws(() => store.ingest(seed), /FOREIGN KEY/);
    assert.equal(store.count("devices"), 0);
    assert.equal(store.count("documents"), 0);
    assert.equal(store.ingest(createSeed()).inserted, true);
  } finally {
    store.close();
  }
});

test("REQ-004: file sumber hasil generator identik dengan bundle bawaan", () => {
  assert.deepEqual(loadSeedDirectory(resolve("data", "seed")), createSeed());
});

test("REQ-009: perubahan approved, versi dan audit tetap ada setelah reopen", () => {
  const directory = mkdtempSync(join(tmpdir(), "network-persistence-test-"));
  const filename = join(directory, "network.sqlite");
  const store = new NetworkStore(filename);
  try {
    store.ingest(createSeed());
    const service = new NetworkService(store);
    const change = service.createChange({
      reason: "Memverifikasi persistence setelah restart database.",
      operation: {
        kind: "update_device", deviceId: "br-sw-01", expectedVersion: 1,
        patch: { description: "Deskripsi persisten sesudah restart." },
      },
    }, "operator");
    service.decideChange(change.id, "approve");
    store.close();
    const reopened = new NetworkStore(filename);
    try {
      const after = new NetworkService(reopened);
      assert.equal(after.device("br-sw-01").description, "Deskripsi persisten sesudah restart.");
      assert.equal(after.device("br-sw-01").version, 2);
      assert.equal(after.getChange(change.id).status, "applied");
      assert.ok(after.audit().some((entry) => entry.targetId === change.id && entry.action === "change.approved_and_applied"));
      assert.equal(reopened.ingest(createSeed()).inserted, false);
      assert.equal(after.device("br-sw-01").version, 2);
    } finally { reopened.close(); }
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("REQ-004: reset gagal tidak menghapus data lama atau audit", () => {
  const store = new NetworkStore(":memory:");
  try {
    store.ingest(createSeed());
    const seed = createSeed();
    seed.documents[0].deviceId = "device-missing";
    assert.throws(() => store.ingest(seed, true), /FOREIGN KEY/);
    assert.equal(store.count("devices"), 25);
    assert.equal(store.count("documents"), 10);
    assert.equal(new NetworkService(store).audit().length, 1);
  } finally { store.close(); }
});
