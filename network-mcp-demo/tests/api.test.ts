import assert from "node:assert/strict";
import { test } from "node:test";
import { request as httpRequest } from "node:http";
import { z } from "zod";
import { deviceSchema, documentSchema, interfaceSchema } from "../shared/schemas.js";
import { startHarness } from "../scripts/harness.js";
import { AgentError, type AgentGateway } from "../server/agent.js";

const errorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });
const changeSchema = z.object({ id: z.string(), status: z.string() });

test("REQ-008: semua endpoint REST baca merespons dan filter akurat", async () => {
  const harness = await startHarness();
  try {
    const routes = [
      "/api/health", "/api/overview", "/api/sites", "/api/devices", "/api/devices/BR-SW-01",
      "/api/topology", "/api/vlans?siteId=site-br", "/api/alerts",
      "/api/documents", "/api/documents/search?query=congestion",
      "/api/documents/doc-branch-runbook", "/api/changes", "/api/audit", "/api/agent/status",
    ];
    for (const route of routes) {
      const response = await fetch(harness.baseUrl + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get("content-type") || "", /application\/json/, route);
    }
    const filtered = z.array(deviceSchema).parse(await (await fetch(harness.baseUrl + "/api/devices?siteId=site-br")).json());
    assert.equal(filtered.length, 7);
    assert.ok(filtered.every((item) => item.siteId === "site-br"));
    const missing = await fetch(harness.baseUrl + "/api/devices/not-found");
    assert.equal(missing.status, 404);
    assert.equal(errorSchema.parse(await missing.json()).error.code, "DEVICE_NOT_FOUND");
    assert.equal((await fetch(harness.baseUrl + "/api/no-such-route")).status, 404);
    const search = await fetch(harness.baseUrl + "/api/documents/search?query=%22%20OR%20%2A");
    assert.equal(search.status, 200);
  } finally { await harness.close(); }
});

test("REQ-007: API mutation wajib header, preview/request/decision konsisten", async () => {
  const harness = await startHarness();
  const payload = {
    reason: "Pindahkan port demo ke VLAN Operations.",
    operation: { kind: "update_interface", interfaceId: "br-sw-01-gi02", expectedVersion: 1, patch: { vlanId: "br-vlan-20" } },
  };
  const post = (path: string, body: unknown) => fetch(harness.baseUrl + path, {
    method: "POST", headers: { "Content-Type": "application/json", "X-NetOps-Client": "web" }, body: JSON.stringify(body),
  });
  try {
    const denied = await fetch(harness.baseUrl + "/api/changes", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    assert.equal(denied.status, 403);
    assert.equal((await post("/api/changes/preview", payload)).status, 200);
    const requestResponse = await post("/api/changes", payload);
    assert.equal(requestResponse.status, 201);
    const request = changeSchema.parse(await requestResponse.json());
    assert.equal(request.status, "pending");
    assert.equal(harness.service.networkInterface("br-sw-01-gi02").vlanId, "br-vlan-10");
    const decision = await post(`/api/changes/${request.id}/decision`, { decision: "approve" });
    assert.equal(decision.status, 200);
    assert.equal(changeSchema.parse(await decision.json()).status, "applied");
    assert.equal(harness.service.networkInterface("br-sw-01-gi02").vlanId, "br-vlan-20");
    assert.equal((await post(`/api/changes/${request.id}/decision`, { decision: "approve" })).status, 409);
    assert.equal((await post("/api/changes/preview", { ...payload, approve: true })).status, 400);
    assert.equal((await post("/api/chat", { message: " " })).status, 400);
    const malformed = await fetch(harness.baseUrl + "/api/changes", {
      method: "POST", headers: { "Content-Type": "application/json", "X-NetOps-Client": "web" }, body: "{invalid",
    });
    assert.equal(malformed.status, 400);
    const oversized = await post("/api/changes/preview", { content: "x".repeat(200_000) });
    assert.equal(oversized.status, 413);
    assert.equal(errorSchema.parse(await oversized.json()).error.code, "BODY_TOO_LARGE");
    assert.equal((await post("/api/demo/reset", { confirmation: "wrong" })).status, 400);
    assert.equal((await post("/api/demo/reset", { confirmation: "RESET DEMO" })).status, 200);
    assert.equal(harness.service.networkInterface("br-sw-01-gi02").vlanId, "br-vlan-10");
    assert.equal(harness.service.listChanges().length, 0);
    assert.equal(interfaceSchema.parse(harness.service.networkInterface("br-sw-01-gi02")).version, 1);
  } finally { await harness.close(); }
});

test("REQ-001: host/origin asing ditolak; MCP tanpa token tidak dapat digunakan", async () => {
  const harness = await startHarness();
  try {
    const hostStatus = await new Promise<number>((resolve, reject) => {
      const request = httpRequest(harness.baseUrl + "/api/overview", { headers: { Host: "attacker.example" } }, (response) => {
        response.resume();
        resolve(response.statusCode || 0);
      });
      request.on("error", reject);
      request.end();
    });
    assert.equal(hostStatus, 403);
    assert.equal((await fetch(harness.baseUrl + "/api/overview", { headers: { Origin: "https://attacker.example" } })).status, 403);
    assert.equal((await fetch(harness.baseUrl + "/mcp", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    })).status, 401);
    assert.equal((await fetch(harness.baseUrl + "/mcp", {
      headers: { Authorization: `Bearer ${harness.mcpToken}` },
    })).status, 405);
    const document = documentSchema.parse(await (await fetch(harness.baseUrl + "/api/documents/doc-change-policy")).json());
    assert.ok(document.content.includes("approval"));
  } finally { await harness.close(); }
});

test("REQ-011: provider gagal ditampilkan eksplisit dan tidak diganti jawaban dummy", async () => {
  const unavailable: AgentGateway = {
    status: () => ({ status: "unavailable", provider: "GitHub Copilot SDK", model: "test", message: "Login diperlukan." }),
    connect: async () => { throw new AgentError("Login diperlukan.", []); },
    chat: async () => { throw new AgentError("Login diperlukan.", []); },
    clear: async () => {},
    hasInFlight: () => false,
    stop: async () => {},
  };
  const harness = await startHarness(unavailable);
  try {
    const options = { method: "POST", headers: { "Content-Type": "application/json", "X-NetOps-Client": "web" } };
    const connect = await fetch(harness.baseUrl + "/api/agent/connect", { ...options, body: "{}" });
    assert.equal(connect.status, 503);
    const chat = await fetch(harness.baseUrl + "/api/chat", { ...options, body: JSON.stringify({ message: "Network sehat?" }) });
    assert.equal(chat.status, 503);
    const body = errorSchema.parse(await chat.json());
    assert.equal(body.error.code, "AGENT_UNAVAILABLE");
    assert.equal(body.error.message, "Login diperlukan.");
    assert.equal((await fetch(harness.baseUrl + "/api/overview")).status, 200);
  } finally { await harness.close(); }
});
