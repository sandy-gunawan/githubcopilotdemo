import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";
import { deviceSchema, documentSchema, type ChangeInput } from "../shared/schemas.js";
import { inspectDatabase } from "../server/inspection.js";
import { startHarness, readMcpData } from "./harness.js";

const harness = await startHarness();
const client = new Client({ name: "netops-live-data-proof", version: "1.0.0" });
const marker = `BUKTI-LIVE-${randomUUID().slice(0, 8)}`;
const textMarker = `BUKTI-TEKS-${randomUUID().slice(0, 8)}`;
const transport = new StreamableHTTPClientTransport(new URL(`${harness.baseUrl}/mcp`), {
  requestInit: { headers: { Authorization: `Bearer ${harness.mcpToken}` } },
});
const evidence: { stage: string; observedAt: string; detail: unknown }[] = [];
function record(stage: string, detail: unknown) {
  const observedAt = new Date().toISOString();
  evidence.push({ stage, observedAt, detail });
  console.log(`\n${stage} | ${observedAt}`);
  console.log(JSON.stringify(detail, null, 2));
}
function readDeviceSql() {
  const inspection = inspectDatabase(harness.databasePath, { table: "devices", deviceId: "br-sw-01", limit: 1 });
  return { inspection, device: deviceSchema.parse(inspection.query?.rows[0]) };
}
function readDocumentSql() {
  const inspection = inspectDatabase(harness.databasePath, { table: "documents", deviceId: "br-sw-01", limit: 100 });
  const row = inspection.query?.rows.find((item) => item.id === "doc-branch-incident");
  assert.ok(row);
  return { inspection, document: documentSchema.parse({ ...row, tags: JSON.parse(z.string().parse(row.tags)) }) };
}
async function call(name: string, args: Record<string, unknown> = {}) {
  return readMcpData(await client.callTool({ name, arguments: args }));
}
async function requestChange(input: ChangeInput) {
  await call("preview_change", input);
  return z.object({ id: z.string(), status: z.literal("pending") }).parse(
    await call("create_change_request", input),
  );
}
async function approveViaWeb(id: string) {
  const response = await fetch(`${harness.baseUrl}/api/changes/${id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-NetOps-Client": "web" },
    body: JSON.stringify({ decision: "approve" }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(z.object({ status: z.string() }).parse(await response.json()).status, "applied");
}

try {
  console.log("BUKTI PEMBACAAN LIVE: koneksi SQL read-only terpisah dibandingkan dengan MCP HTTP sungguhan.");
  console.log("Data network tetap simulasi. Tidak memakai AI, tidak menyentuh database demo utama.");
  console.log(`Database test sementara: ${harness.databasePath}`);
  await client.connect(transport);

  const before = readDeviceSql();
  const mcpBefore = z.object({ device: deviceSchema }).parse(await call("get_device", { deviceId: "BR-SW-01" }));
  assert.equal(mcpBefore.device.description, before.device.description);
  record("1. SEBELUM: SQL dan MCP membaca nilai yang sama", {
    source: before.inspection.databasePath, sql: before.inspection.query?.sql,
    parameters: before.inspection.query?.parameters, description: before.device.description, version: before.device.version,
  });
  const request = await requestChange({
    reason: "Pembuktian perubahan commit terlihat oleh pembaca SQL independen dan MCP.",
    operation: {
      kind: "update_device", deviceId: before.device.id, expectedVersion: before.device.version,
      patch: { description: marker },
    },
  });
  const pending = readDeviceSql();
  const mcpPending = z.object({ device: deviceSchema }).parse(await call("get_device", { deviceId: "BR-SW-01" }));
  assert.equal(pending.device.description, before.device.description);
  assert.equal(mcpPending.device.description, before.device.description);
  record("2. PENDING: target belum berubah", { changeId: request.id, status: request.status, description: pending.device.description });

  await approveViaWeb(request.id);
  const after = readDeviceSql();
  const mcpAfter = z.object({ device: deviceSchema }).parse(await call("get_device", { deviceId: "BR-SW-01" }));
  assert.equal(after.device.description, marker);
  assert.equal(mcpAfter.device.description, marker);
  assert.equal(after.device.version, before.device.version + 1);
  assert.equal(mcpAfter.device.version, after.device.version);
  record("3. SETELAH APPROVAL: SQL baru dan MCP membaca marker unik terbaru", {
    expectedMarker: marker, sqlValue: after.device.description, mcpValue: mcpAfter.device.description,
    version: after.device.version, databasePath: after.inspection.databasePath, queryExecutedAt: after.inspection.executedAt,
  });

  const textBefore = readDocumentSql();
  const documentRequest = await requestChange({
    reason: "Pembuktian body unstructured dan index search berubah sesudah approval.",
    operation: {
      kind: "update_document", documentId: textBefore.document.id, expectedVersion: textBefore.document.version,
      patch: { content: `${textBefore.document.content}\nKode pembuktian pembacaan terbaru: ${textMarker}\n` },
    },
  });
  assert.ok(!readDocumentSql().document.content.includes(textMarker));
  const emptyHits = z.array(z.object({ id: z.string() })).parse(
    await call("search_documents", { query: textMarker, deviceId: "br-sw-01" }),
  );
  assert.equal(emptyHits.length, 0);
  record("4. DOKUMEN PENDING: marker belum ada di body maupun hasil search", { marker: textMarker, hits: emptyHits.length });

  await approveViaWeb(documentRequest.id);
  const textAfter = readDocumentSql();
  const mcpDocument = documentSchema.parse(await call("get_document", { documentId: textBefore.document.id }));
  const hits = z.array(z.object({ id: z.string(), version: z.number() })).parse(
    await call("search_documents", { query: textMarker, deviceId: "br-sw-01" }),
  );
  assert.ok(textAfter.document.content.includes(textMarker));
  assert.equal(mcpDocument.content, textAfter.document.content);
  assert.equal(textAfter.document.version, textBefore.document.version + 1);
  assert.ok(hits.some((item) => item.id === textBefore.document.id && item.version === textAfter.document.version));
  record("5. DOKUMEN APPLIED: SQL, get_document dan search melihat isi baru", {
    marker: textMarker, documentId: textAfter.document.id, version: textAfter.document.version,
    sqlContainsMarker: true, mcpContainsMarker: true, searchHits: hits,
  });

} finally {
  try { await client.close(); }
  finally { await harness.close(); }
}
assert.equal(existsSync(harness.databasePath), false, "Database test sementara belum dibersihkan.");
const output = resolve("data", "runtime", "live-data-proof.json");
mkdirSync(resolve("data", "runtime"), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  simulation: true, passed: true, isolatedTestDatabase: true, databaseRemovedAfterTest: true,
  databasePath: harness.databasePath, markers: { structured: marker, unstructured: textMarker }, evidence,
}, null, 2)}\n`, "utf8");
console.log("\nPASS: pembacaan SQL independen dan MCP melihat commit terbaru, bukan nilai hardcoded.");
console.log(`Bukti run: ${output}`);
console.log("Database test sudah dibersihkan; database demo utama tidak diubah.");
