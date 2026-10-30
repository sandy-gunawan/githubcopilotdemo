import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { startHarness } from "./harness.js";

const harness = await startHarness();
try {
  console.log("Menghubungkan GitHub Copilot SDK dengan login lokal. Test ini menggunakan model sungguhan.");
  console.log(await harness.agent.connect());
  const response = await harness.agent.chat(
    "Gunakan network_overview, get_device untuk BR-SW-01, search_documents dengan keyword congestion, dan get_document untuk doc-branch-runbook serta doc-branch-log. Jelaskan alasan branch lambat berdasarkan structured dan unstructured data. Sebut angka utilisasi dan packet loss. Jangan membuat perubahan.",
  );
  assert.ok(response.traces.some((trace) => trace.tool === "network_overview" && trace.success));
  assert.ok(response.traces.some((trace) => trace.tool === "get_device" && trace.success));
  assert.ok(response.traces.some((trace) => trace.tool === "search_documents" && trace.success));
  assert.ok(response.traces.some((trace) => trace.tool === "get_document" && trace.success));
  assert.match(response.content, /95/);
  assert.match(response.content, /3[.,]2/);
  assert.match(response.content.toLowerCase(), /simulasi|dummy/);
  const writeResponse = await harness.agent.chat(
    "Sekarang baca ulang BR-SW-01 dan list_vlans site-br. Buat SATU change request untuk mengubah Gi0/2 dari VLAN 10 ke VLAN 20, alasan demonstrasi pemindahan port ke Operations. Gunakan preview_change lalu create_change_request. Jangan approve atau apply. Jangan membuat request lain.",
    response.conversationId,
  );
  assert.ok(writeResponse.traces.some((trace) => trace.tool === "preview_change" && trace.success));
  assert.ok(writeResponse.traces.some((trace) => trace.tool === "create_change_request" && trace.success));
  const changes = harness.service.listChanges();
  assert.equal(changes.length, 1);
  assert.equal(changes[0].status, "pending");
  assert.equal(harness.service.networkInterface("br-sw-01-gi02").vlanId, "br-vlan-10");
  const directory = resolve("data", "runtime");
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, "agent-smoke-result.json"), JSON.stringify({
    investigation: response, changeRequest: writeResponse, pendingChangeId: changes[0].id,
    targetUnchangedBeforeApproval: true,
  }, null, 2), "utf8");
  console.log(response.content);
  console.log(writeResponse.content);
  console.log(`AGENT PASS: ${response.traces.length + writeResponse.traces.length} actual MCP calls; request pending, target unchanged. Hasil lokal: data\\runtime\\agent-smoke-result.json`);
} finally {
  await harness.close();
}
