#!/usr/bin/env node
import * as readline from "node:readline";
import { McpServer } from "./server.js";
import type { JsonRpcRequest } from "./types.js";

const server = new McpServer();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

process.stderr.write("[KITRO-MCP] STDIO Transport active. Ready for JSON-RPC messages.\n");

rl.on("line", async (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const request = JSON.parse(trimmed) as JsonRpcRequest;
    const response = await server.handleMessage(request);
    if (response) {
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[KITRO-MCP-ERROR] Failed to parse/handle request: ${errorMsg}\n`);
    const errorResponse = {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error",
        data: errorMsg,
      },
    };
    process.stdout.write(JSON.stringify(errorResponse) + "\n");
  }
});

rl.on("close", () => {
  process.stderr.write("[KITRO-MCP] Stdin closed. Shutting down.\n");
  process.exit(0);
});

process.on("SIGINT", () => {
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
