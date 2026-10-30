import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";
import type { AgentGateway } from "../server/agent.js";
import { createSeed } from "../server/seed.js";
import { NetworkStore } from "../server/store.js";
import assert from "node:assert/strict";
import { z } from "zod";

export const mcpTextResultSchema = z.object({
  content: z.array(z.object({ type: z.literal("text"), text: z.string() })),
  isError: z.boolean().optional(),
});

export function readMcpData(result: unknown): unknown {
  const parsed = mcpTextResultSchema.parse(result);
  assert.notEqual(parsed.isError, true, parsed.content[0]?.text);
  return z.object({ simulation: z.literal(true), data: z.unknown() }).parse(JSON.parse(parsed.content[0].text)).data;
}

export async function startHarness(agent?: AgentGateway) {
  const directory = mkdtempSync(join(tmpdir(), "netops-smoke-"));
  const databasePath = join(directory, "network.sqlite");
  const store = new NetworkStore(databasePath);
  store.ingest(createSeed());
  let baseUrl = "";
  const runtime = createApp({
    root: process.cwd(), store, mcpUrl: () => `${baseUrl}/mcp`,
    mcpToken: "test-only-network-mcp-token-000000000000", agent,
  });
  runtime.app.use(runtime.errorHandler);
  const server = createServer(runtime.app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Tidak mendapat alamat test server.");
  baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    ...runtime, baseUrl, databasePath,
    async close() {
      try {
        await runtime.agent.stop();
      } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        store.close();
        rmSync(directory, { recursive: true, force: true });
      }
    },
  };
}
