import assert from "node:assert/strict";
import { test } from "node:test";
import { createSeed } from "../server/seed.js";
import { NetworkStore } from "../server/store.js";
import { AppError, NetworkService } from "../server/service.js";
import type { ChangeInput } from "../shared/schemas.js";

function fixture() {
  const store = new NetworkStore(":memory:");
  store.ingest(createSeed());
  return { store, service: new NetworkService(store) };
}
const newDevice = {
  id: "demo-sw-01", hostname: "DEMO-SW-01", type: "switch" as const,
  vendor: "Simulator", model: "Demo", firmware: "demo-1.0", managementIp: "10.30.0.250",
  siteId: "site-br", status: "healthy" as const, description: "Device untuk demo CRUD.",
};
const reason = "Pengujian perubahan database simulasi.";

test("REQ-007: preview dan request tidak menulis target sebelum approval", () => {
  const { store, service } = fixture();
  try {
    const input: ChangeInput = {
      reason, operation: { kind: "update_interface", interfaceId: "br-sw-01-gi02", expectedVersion: 1, patch: { vlanId: "br-vlan-20" } },
    };
    const preview = service.previewChange(input);
    assert.equal(preview.before && "vlanId" in preview.before && preview.before.vlanId, "br-vlan-10");
    const request = service.createChange(input, "agent");
    assert.equal(service.networkInterface("br-sw-01-gi02").vlanId, "br-vlan-10");
    assert.equal(request.status, "pending");
    const approved = service.decideChange(request.id, "approve");
    assert.equal(approved.status, "applied");
    assert.equal(service.networkInterface("br-sw-01-gi02").vlanId, "br-vlan-20");
    assert.equal(service.networkInterface("br-sw-01-gi02").version, 2);
    assert.equal(service.getDevice("br-sw-01").alerts.length, 1);
    assert.ok(service.audit().some((entry) => entry.action === "change.approved_and_applied"));
    assert.throws(() => service.decideChange(request.id, "approve"), /sudah diproses/);
  } finally { store.close(); }
});

test("REQ-007: stale request gagal dan tidak menimpa perubahan yang lebih baru", () => {
  const { store, service } = fixture();
  try {
    const input: ChangeInput = { reason, operation: {
      kind: "update_device", deviceId: "br-sw-01", expectedVersion: 1, patch: { description: "Perubahan pertama." },
    } };
    const first = service.createChange(input, "agent");
    const second = service.createChange({ ...input, operation: {
      ...input.operation, patch: { description: "Perubahan kedaluwarsa." },
    } }, "operator");
    service.decideChange(first.id, "approve");
    assert.throws(() => service.decideChange(second.id, "approve"), (error) =>
      error instanceof AppError && error.code === "STALE_VERSION");
    assert.equal(service.getChange(second.id).status, "failed");
    assert.equal(service.device("br-sw-01").description, "Perubahan pertama.");
  } finally { store.close(); }
});

test("REQ-007: reject tidak mengubah data dan VLAN cross-site ditolak", () => {
  const { store, service } = fixture();
  try {
    const input: ChangeInput = { reason, operation: {
      kind: "update_interface", interfaceId: "br-sw-01-gi02", expectedVersion: 1, patch: { adminStatus: "down" },
    } };
    const request = service.createChange(input, "operator");
    service.decideChange(request.id, "reject");
    assert.equal(service.networkInterface("br-sw-01-gi02").adminStatus, "up");
    assert.equal(service.getChange(request.id).status, "rejected");
    assert.throws(() => service.previewChange({ reason, operation: {
      kind: "update_interface", interfaceId: "br-sw-01-gi02", expectedVersion: 1, patch: { vlanId: "hq-vlan-20" },
    } }), /site yang sama/);
  } finally { store.close(); }
});

test("REQ-007: device CRUD lengkap dan delete dengan dependensi ditolak", () => {
  const { store, service } = fixture();
  try {
    assert.throws(() => service.previewChange({ reason, operation: {
      kind: "delete_device", deviceId: "br-sw-01", expectedVersion: 1,
    } }), /masih dirujuk/);
    const added = service.createChange({ reason, operation: { kind: "add_device", device: newDevice } }, "operator");
    assert.equal(service.listDevices().length, 25);
    service.decideChange(added.id, "approve");
    assert.equal(service.listDevices().length, 26);
    const update = service.createChange({ reason, operation: {
      kind: "update_device", deviceId: newDevice.id, expectedVersion: 1, patch: { description: "Sudah diubah." },
    } }, "operator");
    service.decideChange(update.id, "approve");
    assert.equal(service.device(newDevice.id).description, "Sudah diubah.");
    const deletion = service.createChange({ reason, operation: {
      kind: "delete_device", deviceId: newDevice.id, expectedVersion: 2,
    } }, "operator");
    service.decideChange(deletion.id, "approve");
    assert.equal(service.listDevices().length, 25);
    assert.throws(() => service.device(newDevice.id), /tidak ditemukan/);
  } finally { store.close(); }
});

test("REQ-003/007: document CRUD dan index FTS berubah hanya sesudah approval", () => {
  const { store, service } = fixture();
  try {
    const added = service.createChange({ reason, operation: { kind: "add_document", document: {
      id: "doc-crud-demo", title: "Catatan pengujian", kind: "incident",
      content: "Token pencarian demonstrasizebra.", tags: ["demo"], siteId: "site-br", deviceId: null,
    } } }, "operator");
    assert.equal(service.searchDocuments("demonstrasizebra").length, 0);
    service.decideChange(added.id, "approve");
    assert.equal(service.searchDocuments("demonstrasizebra")[0].id, "doc-crud-demo");
    const update = service.createChange({ reason, operation: {
      kind: "update_document", documentId: "doc-crud-demo", expectedVersion: 1,
      patch: { content: "Konten baru demonstrasiharimau." },
    } }, "agent");
    service.decideChange(update.id, "approve");
    assert.equal(service.searchDocuments("demonstrasizebra").length, 0);
    assert.equal(service.searchDocuments("demonstrasiharimau")[0].version, 2);
    const deletion = service.createChange({ reason, operation: {
      kind: "delete_document", documentId: "doc-crud-demo", expectedVersion: 2,
    } }, "operator");
    service.decideChange(deletion.id, "approve");
    assert.equal(service.searchDocuments("demonstrasiharimau").length, 0);
    assert.throws(() => service.getDocument("doc-crud-demo"), /tidak ditemukan/);
  } finally { store.close(); }
});

test("REQ-010: graph downstream branch punya empat device dan tidak memakai port ganda", () => {
  const { store, service } = fixture();
  try {
    const downstream = service.neighbors("BR-SW-01").potentialDownstream.map((device) => device.id).sort();
    assert.deepEqual(downstream, ["br-ap-01", "br-ap-02", "br-sw-02", "br-sw-03"]);
    const topology = service.topology();
    const ports = topology.links.flatMap((link) => [link.sourceInterfaceId, link.targetInterfaceId]);
    assert.equal(new Set(ports).size, ports.length);
    assert.equal(topology.links.length, 24);
    assert.equal(topology.interfaces.length, 102);
  } finally { store.close(); }
});

test("REQ-007: admin down memperbarui link, admin up tidak memalsukan recovery", () => {
  const { store, service } = fixture();
  try {
    const down = service.createChange({ reason, operation: {
      kind: "update_interface", interfaceId: "br-sw-01-gi01", expectedVersion: 1, patch: { adminStatus: "down" },
    } }, "operator");
    service.decideChange(down.id, "approve");
    assert.equal(service.networkInterface("br-sw-01-gi01").operStatus, "down");
    assert.equal(service.topology().links.find((item) => item.targetInterfaceId === "br-sw-01-gi01")?.status, "down");
    const up = service.createChange({ reason, operation: {
      kind: "update_interface", interfaceId: "br-sw-01-gi01", expectedVersion: 2, patch: { adminStatus: "up" },
    } }, "operator");
    service.decideChange(up.id, "approve");
    assert.equal(service.networkInterface("br-sw-01-gi01").operStatus, "down");
  } finally { store.close(); }
});
