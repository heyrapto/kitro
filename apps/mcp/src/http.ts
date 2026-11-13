import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { McpServer } from "./server.js";
import type { JsonRpcRequest } from "./types.js";
import { randomUUID } from "node:crypto";

const app = new Hono();
const mcpServer = new McpServer();

const MCP_API_KEY = process.env.KITRO_MCP_API_KEY;
const PORT = Number(process.env.MCP_PORT ?? process.env.PORT ?? 3001);

// Enable CORS for web/remote agent clients
app.use("*", cors());

// Bearer token authentication middleware
app.use("*", async (c, next) => {
  // Allow health endpoint unauthenticated
  if (c.req.path === "/health") {
    return next();
  }

  if (MCP_API_KEY) {
    const authHeader = c.req.header("Authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    const token = match?.[1];

    if (!token || token !== MCP_API_KEY) {
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

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "kitro-mcp-server",
    transports: ["stdio", "streamable-http", "sse"],
    authenticated: Boolean(MCP_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Standard HTTP POST JSON-RPC 2.0 endpoint (ChatGPT Actions, remote curl, HTTP agents)
app.post("/mcp", async (c) => {
  try {
    const body = (await c.req.json()) as JsonRpcRequest | JsonRpcRequest[];

    if (Array.isArray(body)) {
      const responses = await Promise.all(
        body.map((req) => mcpServer.handleMessage(req)),
      );
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

// Root path alias for convenience
app.post("/", async (c) => {
  const req = (await c.req.json()) as JsonRpcRequest;
  const res = await mcpServer.handleMessage(req);
  return res ? c.json(res) : c.body(null, 204);
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

      // Register session
      sseSessions.set(sessionId, (data: string) => {
        sendEvent("message", data);
      });

      // Send initial endpoint event as specified in MCP SSE spec
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

console.error(`[KITRO-MCP] Remote Streamable HTTP Server starting on port ${PORT}...`);
console.error(`[KITRO-MCP] MCP JSON-RPC endpoint: http://localhost:${PORT}/mcp`);
console.error(`[KITRO-MCP] MCP SSE endpoint:      http://localhost:${PORT}/sse`);
if (MCP_API_KEY) {
  console.error(`[KITRO-MCP] Authentication: Bearer token enforced.`);
} else {
  console.error(`[KITRO-MCP] Authentication: Unauthenticated development mode.`);
}

serve({
  fetch: app.fetch,
  port: PORT,
});
