import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import {
  alertSchema,
  changeInputSchema,
  deviceSchema,
  documentSchema,
  interfaceSchema,
  linkSchema,
  metricSchema,
  siteSchema,
  vlanSchema,
} from "../shared/schemas";
import type {
  AgentStatus,
  AuditEntry,
  ChangePreview,
  ChangeRequest,
  ChatResponse,
  DeviceDetail,
  DocumentSearchHit,
  DocumentSummary,
  Overview,
  ToolTrace,
  Topology,
} from "../shared/schemas";

const summarySchema: z.ZodType<DocumentSummary> = documentSchema.omit({ content: true });
const searchHitSchema: z.ZodType<DocumentSearchHit> = documentSchema
  .omit({ content: true })
  .extend({ excerpt: z.string(), score: z.number() });
const traceSchema: z.ZodType<ToolTrace> = z.object({
  id: z.string(),
  tool: z.string(),
  arguments: z.unknown(),
  result: z.unknown().optional(),
  success: z.boolean().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});
const previewSchema: z.ZodType<ChangePreview> = z.object({
  operation: changeInputSchema.shape.operation,
  before: z.union([deviceSchema, interfaceSchema, documentSchema]).nullable(),
  after: z.union([deviceSchema, interfaceSchema, documentSchema]).nullable(),
  impact: z.array(z.string()),
});
const changeSchema: z.ZodType<ChangeRequest> = changeInputSchema.extend({
  id: z.string(),
  status: z.enum(["pending", "applied", "rejected", "failed"]),
  requestedBy: z.enum(["agent", "operator"]),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
  error: z.string().nullable(),
  preview: previewSchema,
});
const overviewSchema: z.ZodType<Overview> = z.object({
  simulation: z.literal(true),
  datasetVersion: z.string(),
  snapshotAt: z.string(),
  sites: z.array(siteSchema),
  counts: z.object({
    devices: z.number(),
    interfaces: z.number(),
    links: z.number(),
    documents: z.number(),
    metrics: z.number(),
  }),
  health: z.object({
    healthy: z.number(),
    warning: z.number(),
    critical: z.number(),
    offline: z.number(),
  }),
  alerts: z.array(alertSchema),
  scenarios: z.array(z.object({
    id: z.string(),
    title: z.string(),
    deviceId: z.string(),
    evidence: z.string(),
  })),
});
const topologySchema: z.ZodType<Topology> = z.object({
  sites: z.array(siteSchema),
  devices: z.array(deviceSchema),
  interfaces: z.array(interfaceSchema),
  links: z.array(linkSchema),
});
const detailSchema: z.ZodType<DeviceDetail> = z.object({
  device: deviceSchema,
  site: siteSchema,
  interfaces: z.array(interfaceSchema),
  metrics: z.array(metricSchema),
  alerts: z.array(alertSchema),
  documents: z.array(summarySchema),
});
const agentSchema: z.ZodType<AgentStatus> = z.object({
  status: z.enum(["not_started", "ready", "unavailable"]),
  provider: z.literal("GitHub Copilot SDK"),
  model: z.string(),
  message: z.string(),
});
const chatSchema: z.ZodType<ChatResponse> = z.object({
  conversationId: z.string(),
  content: z.string(),
  traces: z.array(traceSchema),
  provider: z.literal("GitHub Copilot SDK"),
});
const auditSchema: z.ZodType<AuditEntry> = z.object({
  id: z.number(),
  timestamp: z.string(),
  actor: z.string(),
  action: z.string(),
  targetId: z.string(),
  detail: z.string(),
});
const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
  traces: z.array(traceSchema).optional(),
  conversationId: z.string().optional(),
});

export const codecs = {
  health: z.object({
    status: z.literal("ok"),
    simulation: z.literal(true),
    mcpEndpoint: z.literal("/mcp"),
  }),
  overview: overviewSchema,
  sites: z.array(siteSchema),
  devices: z.array(deviceSchema),
  device: detailSchema,
  topology: topologySchema,
  vlans: z.array(vlanSchema),
  alerts: z.array(alertSchema),
  documents: z.array(summarySchema),
  searchHits: z.array(searchHitSchema),
  document: documentSchema,
  preview: previewSchema,
  change: changeSchema,
  changes: z.array(changeSchema),
  audit: z.array(auditSchema),
  agent: agentSchema,
  chat: chatSchema,
};

export class ApiError extends Error {
  readonly code: string;
  readonly traces: ToolTrace[];
  readonly conversationId: string | undefined;

  constructor(message: string, code: string, traces: ToolTrace[] = [], conversationId?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.traces = traces;
    this.conversationId = conversationId;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.message} (${error.code})`;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan yang tidak dikenali. Silakan coba lagi.";
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function fetchResponse(path: string, options: RequestOptions = {}): Promise<Response> {
  const method = options.method ?? "GET";
  const headers = new Headers({ Accept: "application/json" });
  if (method !== "GET") headers.set("X-NetOps-Client", "web");
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 25_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (timeout.aborted && !options.signal?.aborted) {
      throw new ApiError(
        "Batas waktu permintaan terlewati. Periksa status server; untuk perubahan, periksa antrean sebelum mengirim ulang.",
        "CLIENT_TIMEOUT",
      );
    }
    throw error;
  }
  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError(
        `Server mengembalikan HTTP ${response.status} ${response.statusText}, tanpa detail JSON. Pastikan backend demo berjalan pada origin yang sama.`,
        `HTTP_${response.status}`,
      );
    }
    const parsed = errorSchema.safeParse(payload);
    if (parsed.success) {
      throw new ApiError(
        parsed.data.error.message,
        parsed.data.error.code,
        parsed.data.traces,
        parsed.data.conversationId,
      );
    }
    throw new ApiError(
      `Permintaan gagal (HTTP ${response.status}); format error server tidak sesuai kontrak.`,
      `HTTP_${response.status}`,
    );
  }
  return response;
}

export async function request<T>(
  path: string,
  codec: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetchResponse(path, options);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError("Respons server bukan JSON yang valid.", "INVALID_JSON");
  }
  const parsed = codec.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "respons"}: ${issue.message}`)
      .join("; ");
    throw new ApiError(`Respons API tidak sesuai kontrak: ${issues}`, "INVALID_RESPONSE");
  }
  return parsed.data;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await fetchResponse(`/api/chat/${encodeURIComponent(conversationId)}`, { method: "DELETE" });
}

export interface Remote<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useRemote<T>(path: string | null, codec: z.ZodType<T>, revision = 0): Remote<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const reload = useCallback(() => setRetry((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError(null);
    if (path === null) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    request(path, codec, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, codec, revision, retry]);

  return { data, loading, error, reload };
}

export function useDebounced(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function queryPath(path: string, filters: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
