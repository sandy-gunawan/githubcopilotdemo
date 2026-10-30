import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";
import { MCP_TOOL_NAMES } from "../server/mcp.js";
import { startHarness, readMcpData as data, mcpTextResultSchema as textResult } from "./harness.js";

const harness = await startHarness();
const client = new Client({ name: "netops-mcp-smoke", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(new URL(`${harness.baseUrl}/mcp`), {
  requestInit: { headers: { Authorization: `Bearer ${harness.mcpToken}` } },
});
try {
  await client.connect(transport);
  const discovery = await client.listTools();
  assert.deepEqual(discovery.tools.map((tool) => tool.name).sort(), [...MCP_TOOL_NAMES].sort());
  assert.ok(!discovery.tools.some((tool) => /approve|apply|execute|shell/.test(tool.name)));
  const resources = await client.listResources();
  assert.equal(resources.resources.length, 2);
  assert.equal((await client.readResource({ uri: "network://schema" })).contents.length, 1);
  const overview = z.object({
    counts: z.object({ devices: z.number(), documents: z.number(), metrics: z.number() }),
    health: z.object({ healthy: z.number(), warning: z.number(), critical: z.number() }),
  }).parse(data(await client.callTool({ name: "network_overview", arguments: {} })));
  assert.deepEqual(overview.counts, { devices: 25, documents: 10, metrics: 600 });
  assert.deepEqual(overview.health, { healthy: 22, warning: 2, critical: 1 });
  const structured = z.object({
    device: z.object({ hostname: z.string() }),
    interfaces: z.array(z.object({ utilizationPct: z.number() })),
  }).parse(data(await client.callTool({ name: "get_device", arguments: { deviceId: "BR-SW-01" } })));
  assert.equal(structured.device.hostname, "BR-SW-01");
  assert.equal(structured.interfaces[0].utilizationPct, 95);
  const hits = z.array(z.object({ id: z.string() })).parse(data(await client.callTool({
    name: "search_documents", arguments: { query: "congestion", deviceId: "br-sw-01" },
  })));
  assert.ok(hits.some((hit) => hit.id === "doc-branch-runbook"));
  const unstructured = z.object({ content: z.string() }).parse(data(await client.callTool({
    name: "get_document", arguments: { documentId: "doc-branch-log" },
  })));
  assert.match(unstructured.content, /packet_loss=3.2%/);
  const changeInput = {
    reason: "Demo MCP VLAN change memerlukan approval manusia.",
    operation: { kind: "update_interface", interfaceId: "br-sw-01-gi02", expectedVersion: 1, patch: { vlanId: "br-vlan-20" } },
  };
  data(await client.callTool({ name: "preview_change", arguments: changeInput }));
  const change = z.object({ id: z.string(), status: z.literal("pending") }).parse(data(
    await client.callTool({ name: "create_change_request", arguments: changeInput }),
  ));
  assert.equal(harness.service.networkInterface("br-sw-01-gi02").vlanId, "br-vlan-10");
  const response = await fetch(`${harness.baseUrl}/api/changes/${change.id}/decision`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-NetOps-Client": "web" },
    body: JSON.stringify({ decision: "approve" }),
  });
  assert.equal(response.status, 200);
  const verified = z.object({ status: z.literal("applied") }).parse(data(await client.callTool({
    name: "get_change_request", arguments: { changeId: change.id },
  })));
  assert.equal(verified.status, "applied");
  assert.equal(harness.service.networkInterface("br-sw-01-gi02").vlanId, "br-vlan-20");
  const invalidTool = textResult.parse(await client.callTool({ name: "approve_change", arguments: { changeId: change.id } }));
  assert.equal(invalidTool.isError, true);
  console.log("MCP PASS: 17 tools, 2 resources, structured + unstructured reads, preview, pending request, human-only approval, verification.");
} finally {
  await client.close();
  await harness.close();
}
