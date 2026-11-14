import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { McpServer } from "./server.js";
import type { JsonRpcRequest } from "./types.js";
import { randomUUID, timingSafeEqual } from "node:crypto";

const app = new Hono();
const mcpServer = new McpServer();

const MCP_API_KEY = process.env.KITRO_MCP_API_KEY;
const PORT = Number(process.env.MCP_PORT ?? process.env.PORT ?? 3001);
const HOST = process.env.MCP_HOST ?? "127.0.0.1";

// Security requirement: Never bind externally without authentication
const isLoopback = HOST === "127.0.0.1" || HOST === "localhost";
if (!isLoopback && !MCP_API_KEY) {
  console.error("FATAL SECURITY ERROR: External MCP server binding without KITRO_MCP_API_KEY is prohibited.");
  console.error("To expose MCP beyond loopback, set KITRO_MCP_API_KEY in your environment.");
  process.exit(1);
}

// Restrict CORS to configured or trusted origins
const allowedOriginsConfig = process.env.KITRO_ALLOWED_ORIGINS;
const trustedOrigins = allowedOriginsConfig
  ? allowedOriginsConfig.split(",").map((o) => o.trim()).filter(Boolean)
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return null;
      if (trustedOrigins.includes(origin) || trustedOrigins.includes("*")) {
        return origin;
      }
      return null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Constant-time token verification
function secureCompare(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Simple in-memory rate limiter (sliding window per minute)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 180;
const RATE_LIMIT_WINDOW = 60_000;

app.use("*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || "local";
  const now = Date.now();
  const entry = rateLimits.get(ip) ?? { count: 0, resetAt: now + RATE_LIMIT_WINDOW };

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW;
  } else {
    entry.count++;
  }
  rateLimits.set(ip, entry);

  if (entry.count > RATE_LIMIT_MAX) {
    return c.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32029, message: "Too many requests. Rate limit exceeded." },
      },
      429,
    );
  }

  await next();
});

// Authentication middleware
app.use("*", async (c, next) => {
  if (c.req.path === "/health") {
    return next();
  }

  if (MCP_API_KEY) {
    const authHeader = c.req.header("Authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    const token = match?.[1];

    if (!token || !secureCompare(token, MCP_API_KEY)) {
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: "Unauthorized: Valid Bearer token required in Authorization header",
          },
        },
        401,
      );
    }
  }

  await next();
});

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "kitro-mcp-server",
    transports: ["stdio", "streamable-http", "sse"],
    authenticated: Boolean(MCP_API_KEY),
    loopbackOnly: isLoopback,
    timestamp: new Date().toISOString(),
  });
});

// Standard HTTP POST JSON-RPC 2.0 endpoint
app.post("/mcp", async (c) => {
  try {
    const body = (await c.req.json()) as JsonRpcRequest | JsonRpcRequest[];

    if (Array.isArray(body)) {
      const responses = await Promise.all(body.map((req) => mcpServer.handleMessage(req)));
      return c.json(responses.filter(Boolean));
    }

    const response = await mcpServer.handleMessage(body);
    if (!response) {
      return c.body(null, 204);
    }
    return c.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
          data: msg,
        },
      },
      400,
    );
  }
});

// SSE Transport for MCP clients supporting Server-Sent Events
const sseSessions = new Map<string, (data: string) => void>();

app.get("/sse", (c) => {
  const sessionId = randomUUID();
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: string) => {
        controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      sseSessions.set(sessionId, (data: string) => {
        sendEvent("message", data);
      });

      sendEvent("endpoint", `/message?sessionId=${sessionId}`);
    },
    cancel() {
      sseSessions.delete(sessionId);
    },
  });

  return c.body(stream);
});

app.post("/message", async (c) => {
  const sessionId = c.req.query("sessionId");
  if (!sessionId || !sseSessions.has(sessionId)) {
    return c.json({ error: "Invalid or expired sessionId" }, 400);
  }

  const send = sseSessions.get(sessionId)!;
  try {
    const request = (await c.req.json()) as JsonRpcRequest;
    const response = await mcpServer.handleMessage(request);
    if (response) {
      send(JSON.stringify(response));
    }
    return c.text("Accepted", 202);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 400);
  }
});

console.error(`[KITRO-MCP] Streamable HTTP Server starting on http://${HOST}:${PORT}...`);
console.error(`[KITRO-MCP] JSON-RPC endpoint: http://${HOST}:${PORT}/mcp`);
console.error(`[KITRO-MCP] SSE endpoint:      http://${HOST}:${PORT}/sse`);
if (MCP_API_KEY) {
  console.error(`[KITRO-MCP] Security: Bearer token authentication enforced.`);
} else {
  console.error(
    `[KITRO-MCP] WARNING: Running unauthenticated on loopback (${HOST}) for local development only. Do not tunnel publicly.`,
  );
}

serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST,
});
