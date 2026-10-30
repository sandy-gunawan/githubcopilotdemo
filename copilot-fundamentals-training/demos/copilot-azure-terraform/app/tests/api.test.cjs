"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { once } = require("node:events");
const { createApp } = require("../server.js");

const valid = { customerLabel: "Nasabah Contoh Uji", title: "Keluhan transfer dummy", category: "Transfer", channel: "Mobile", priority: "Sedang", description: "Deskripsi rekaan untuk memeriksa penyimpanan lokal." };
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "portal-api-"));
  const app = await createApp({ dataDir: directory, logging: false });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await fs.rm(directory, { recursive: true }); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const json = (route, body, method = "POST", headers = {}) => fetch(url + route, { method, headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const upload = (id, name, bytes, type) => {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type }), name);
    return fetch(`${url}/api/complaints/${id}/attachments`, { method: "POST", body: form });
  };
  return { directory, url, json, upload };
}
test("health and eight synthetic cases are served; internal files are not public", async t => {
  const f = await fixture(t);
  const health = await fetch(f.url + "/health");
  assert.equal((await health.json()).storage, "local-json");
  const response = await fetch(f.url + "/api/complaints");
  assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
  const records = (await response.json()).complaints;
  assert.equal(records.length, 8);
  assert.deepEqual(records.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] || 0) + 1 }), {}), { Baru: 3, Diproses: 3, Selesai: 2 });
  assert.equal((await fetch(f.url + "/data/complaints.json")).status, 404);
  assert.equal((await fetch(f.url + "/fixtures/complaints.json")).status, 404);
});
test("create and status writes persist on disk and survive opening the store again", async t => {
  const f = await fixture(t);
  const response = await f.json("/api/complaints", valid);
  assert.equal(response.status, 201);
  const { complaint } = await response.json();
  assert.equal(complaint.status, "Baru");
  const updated = await f.json(`/api/complaints/${complaint.id}/status`, { status: "Selesai" }, "PATCH");
  assert.equal((await updated.json()).complaint.status, "Selesai");
  const disk = JSON.parse(await fs.readFile(path.join(f.directory, "complaints.json"), "utf8"));
  assert.equal(disk.length, 9);
  assert.equal(disk.find(row => row.id === complaint.id).status, "Selesai");
  const restarted = await createApp({ dataDir: f.directory, logging: false });
  const server = restarted.listen(0, "127.0.0.1"); await once(server, "listening");
  try { assert.equal((await (await fetch(`http://127.0.0.1:${server.address().port}/api/complaints`)).json()).complaints.length, 9); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test("concurrent requests do not lose persisted complaints", async t => {
  const f = await fixture(t);
  const responses = await Promise.all(Array.from({ length: 10 }, (_, i) => f.json("/api/complaints", { ...valid, title: `Keluhan dummy paralel ${i}` })));
  assert.ok(responses.every(response => response.status === 201));
  await Promise.all(responses.map(response => response.json()));
  const disk = JSON.parse(await fs.readFile(path.join(f.directory, "complaints.json"), "utf8"));
  assert.equal(disk.length, 18);
  assert.equal(new Set(disk.map(row => row.id)).size, 18);
});
test("invalid inputs, unknown cases, malformed JSON and cross-site writes fail explicitly", async t => {
  const f = await fixture(t);
  const bad = await f.json("/api/complaints", { ...valid, title: "", priority: "Urgent" });
  assert.equal(bad.status, 400);
  assert.ok((await bad.json()).error.fields.title);
  assert.equal((await f.json("/api/complaints/DEMO-C001/status", { status: "Invented" }, "PATCH")).status, 400);
  assert.equal((await fetch(f.url + "/api/complaints/UNKNOWN")).status, 404);
  assert.equal((await fetch(f.url + "/api/complaints", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })).status, 400);
  assert.equal((await f.json("/api/complaints", valid, "POST", { Origin: "https://example.invalid" })).status, 403);
  assert.equal((await (await fetch(f.url + "/api/complaints")).json()).complaints.length, 8);
});
test("a real dummy attachment is stored outside public and downloads byte-for-byte", async t => {
  const f = await fixture(t);
  const bytes = Buffer.from("Bukti transfer rekaan. Tidak ada data nasabah.");
  const response = await f.upload("DEMO-C001", "bukti-dummy.txt", bytes, "text/plain");
  assert.equal(response.status, 201, await response.clone().text());
  const attachment = (await response.json()).complaint.attachments[0];
  assert.match(attachment.storedName, /^[0-9a-f-]{36}\.txt$/);
  const download = await fetch(`${f.url}/api/complaints/DEMO-C001/attachments/${attachment.id}`);
  assert.equal(download.status, 200);
  assert.match(download.headers.get("content-disposition"), /attachment/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  assert.equal((await fetch(f.url + "/uploads/" + attachment.storedName)).status, 404);
  assert.deepEqual(await fs.readFile(path.join(f.directory, "uploads", attachment.storedName)), bytes);
  const maximum = await f.upload("DEMO-C001", "batas-2mb.txt", Buffer.alloc(2 * 1024 * 1024, 65), "text/plain");
  assert.equal(maximum.status, 201);
  assert.equal((await maximum.json()).complaint.attachments[1].size, 2 * 1024 * 1024);
  await fs.rm(path.join(f.directory, "uploads", attachment.storedName));
  const missing = await fetch(`${f.url}/api/complaints/DEMO-C001/attachments/${attachment.id}`);
  assert.equal(missing.status, 404);
  assert.match((await missing.json()).error.message, /tidak tersedia/);
});
test("oversized, executable, empty and forged image uploads are rejected without leftover files", async t => {
  const f = await fixture(t);
  for (const [name, bytes, type, status] of [
    ["huge.txt", Buffer.alloc(2 * 1024 * 1024 + 1, 65), "text/plain", 413],
    ["script.html", Buffer.from("<script>alert(1)</script>"), "text/html", 400],
    ["empty.txt", Buffer.alloc(0), "text/plain", 400],
    ["fake.png", Buffer.from("not a PNG"), "image/png", 400],
  ]) {
    const response = await f.upload("DEMO-C001", name, bytes, type);
    assert.equal(response.status, status, await response.text());
  }
  assert.equal((await f.upload("UNKNOWN", "dummy.txt", "dummy", "text/plain")).status, 404);
  assert.deepEqual(await fs.readdir(path.join(f.directory, "uploads")), []);
});
test("a corrupt existing store stops startup instead of silently reseeding", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "portal-corrupt-"));
  t.after(() => fs.rm(directory, { recursive: true }));
  await fs.writeFile(path.join(directory, "complaints.json"), "{");
  await assert.rejects(() => createApp({ dataDir: directory, logging: false }), /File lama tidak di-reset/);
  assert.equal(await fs.readFile(path.join(directory, "complaints.json"), "utf8"), "{");
});
