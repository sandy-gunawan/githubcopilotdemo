import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import express, { type ErrorRequestHandler } from "express";
import { z } from "zod";
import {
  changeInputSchema, deviceTypeSchema, documentKindSchema, healthSchema, idSchema,
} from "../shared/schemas.js";
import { AgentError, NetworkAgent, type AgentGateway } from "./agent.js";
import { mountMcp } from "./mcp.js";
import { createSeed } from "./seed.js";
import { AppError, NetworkService } from "./service.js";
import type { NetworkStore } from "./store.js";

export interface AppOptions {
  store: NetworkStore;
  root: string;
  mcpUrl: () => string;
  mcpToken?: string;
  model?: string;
  cliPath?: string;
  agent?: AgentGateway;
}

export function createApp(options: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  const service = new NetworkService(options.store);
  const mcpToken = options.mcpToken || randomBytes(32).toString("hex");
  if (mcpToken.length < 32) throw new Error("MCP_API_TOKEN harus minimal 32 karakter.");
  const agent = options.agent || new NetworkAgent({
    root: options.root, mcpUrl: options.mcpUrl, mcpToken, model: options.model, cliPath: options.cliPath,
  });
  app.use((request, response, next) => {
    response.set("X-Content-Type-Options", "nosniff");
    response.set("Referrer-Policy", "no-referrer");
    response.set("X-Frame-Options", "DENY");
    if (!["127.0.0.1", "localhost"].includes(request.hostname)) {
      next(new AppError(403, "HOST_FORBIDDEN", "Demo hanya menerima hostname loopback localhost/127.0.0.1."));
      return;
    }
    const origin = request.header("origin");
    if (origin && origin !== `http://${request.get("host")}`) {
      next(new AppError(403, "ORIGIN_FORBIDDEN", "Origin lintas situs tidak diizinkan pada demo lokal."));
      return;
    }
    if (request.path.startsWith("/api") || request.path.startsWith("/mcp")) response.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "192kb", strict: true }));
  app.use("/api", (request, _response, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.header("x-netops-client") !== "web") {
      next(new AppError(403, "CLIENT_HEADER_REQUIRED", "Operasi web membutuhkan header X-NetOps-Client: web."));
      return;
    }
    next();
  });
  const stringFilter = z.string().min(1).max(100).optional();
  const docFilters = z.object({
    kind: documentKindSchema.optional(), deviceId: idSchema.optional(), siteId: idSchema.optional(),
  }).strict();
  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok", simulation: true, mcpEndpoint: "/mcp", database: "SQLite", structured: true, unstructured: true });
  });
  app.get("/api/overview", (_request, response) => response.json(service.overview()));
  app.get("/api/sites", (_request, response) => response.json(service.listSites()));
  app.get("/api/devices", (request, response) => {
    const filters = z.object({
      siteId: idSchema.optional(), status: healthSchema.optional(), type: deviceTypeSchema.optional(), query: stringFilter,
    }).strict().parse(request.query);
    response.json(service.listDevices(filters));
  });
  app.get("/api/devices/:id", (request, response) => {
    response.json(service.getDevice(z.string().max(80).parse(request.params.id)));
  });
  app.get("/api/topology", (_request, response) => response.json(service.topology()));
  app.get("/api/vlans", (request, response) => {
    response.json(service.listVlans(z.object({ siteId: idSchema.optional() }).strict().parse(request.query).siteId));
  });
  app.get("/api/alerts", (request, response) => {
    response.json(service.listAlerts(z.object({
      siteId: idSchema.optional(), deviceId: idSchema.optional(), severity: z.enum(["warning", "critical"]).optional(),
    }).strict().parse(request.query)));
  });
  app.get("/api/documents/search", (request, response) => {
    const { query, ...filters } = docFilters.extend({ query: z.string().min(1).max(200) }).parse(request.query);
    response.json(service.searchDocuments(query, filters));
  });
  app.get("/api/documents", (request, response) => {
    response.json(service.listDocuments(docFilters.parse(request.query)));
  });
  app.get("/api/documents/:id", (request, response) => {
    response.json(service.getDocument(idSchema.parse(request.params.id)));
  });
  app.post("/api/changes/preview", (request, response) => {
    response.json(service.previewChange(changeInputSchema.parse(request.body)));
  });
  app.get("/api/changes", (_request, response) => response.json(service.listChanges()));
  app.post("/api/changes", (request, response) => {
    response.status(201).json(service.createChange(changeInputSchema.parse(request.body), "operator"));
  });
  app.post("/api/changes/:id/decision", (request, response) => {
    const { decision } = z.object({ decision: z.enum(["approve", "reject"]) }).strict().parse(request.body);
    response.json(service.decideChange(idSchema.parse(request.params.id), decision));
  });
  app.get("/api/audit", (_request, response) => response.json(service.audit()));
  app.get("/api/agent/status", (_request, response) => response.json(agent.status()));
  app.post("/api/agent/connect", async (_request, response) => response.json(await agent.connect()));
  app.post("/api/chat", async (request, response) => {
    const input = z.object({
      message: z.string().trim().min(1).max(4000), conversationId: z.uuid().optional(),
    }).strict().parse(request.body);
    response.json(await agent.chat(input.message, input.conversationId));
  });
  app.delete("/api/chat/:id", async (request, response) => {
    await agent.clear(z.uuid().parse(request.params.id));
    response.json({ cleared: true });
  });
  app.post("/api/demo/reset", async (request, response) => {
    z.object({ confirmation: z.literal("RESET DEMO") }).strict().parse(request.body);
    if (agent.hasInFlight()) throw new AppError(409, "AGENT_BUSY", "Tunggu agent selesai sebelum reset dataset.");
    await agent.clear();
    options.store.ingest(createSeed(), true);
    response.json(service.overview());
  });
  app.use("/api", (_request, _response, next) => next(new AppError(404, "API_NOT_FOUND", "Endpoint API tidak ditemukan.")));
  mountMcp(app, service, mcpToken);
  app.use("/docs", express.static(resolve(options.root, "docs"), { index: false, dotfiles: "deny" }));

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    const isValidation = error instanceof z.ZodError;
    const isJson = error instanceof SyntaxError && "body" in error;
    const isTooLarge = error instanceof Error && "type" in error && error.type === "entity.too.large";
    const status = error instanceof AppError ? error.status : isTooLarge ? 413 : isValidation || isJson ? 400 : 500;
    const code = error instanceof AppError ? error.code : isTooLarge ? "BODY_TOO_LARGE" : isValidation || isJson ? "INVALID_INPUT" : "INTERNAL_ERROR";
    const message = isValidation
      ? error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ")
      : error instanceof AppError ? error.message : isTooLarge ? "Body request melebihi batas 192 KiB. Perkecil konten dokumen."
        : isJson ? "Body JSON tidak valid." : "Server mengalami kesalahan. Periksa log terminal.";
    console[status >= 500 ? "error" : "warn"](`[api] ${code}:`, error instanceof Error ? error.message : error);
    response.status(status).json({
      error: { code, message },
      ...(error instanceof AgentError ? { traces: error.traces, conversationId: error.conversationId } : {}),
    });
  };
  return { app, service, agent, mcpToken, errorHandler };
}
