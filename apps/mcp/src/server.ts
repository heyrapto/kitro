import { executeMcpTool, MCP_TOOLS } from "./tools.js";
import type { JsonRpcRequest, JsonRpcResponse } from "./types.js";
import { KitroClient } from "@kitro/client";

export class McpServer {
  private client: KitroClient;

  constructor(client?: KitroClient) {
    this.client = client ?? new KitroClient();
  }

  async handleMessage(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const id = request.id !== undefined ? request.id : null;

    // Handle notifications (no response required)
    if (request.id === undefined && request.method === "notifications/initialized") {
      return null;
    }

    try {
      switch (request.method) {
        case "initialize": {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {
                  listChanged: false,
                },
              },
              serverInfo: {
                name: "kitro-mcp-server",
                version: "0.1.0",
              },
            },
          };
        }

        case "ping": {
          return {
            jsonrpc: "2.0",
            id,
            result: {},
          };
        }

        case "tools/list": {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              tools: MCP_TOOLS,
            },
          };
        }

        case "tools/call": {
          const { name, arguments: toolArgs } = request.params ?? {};
          if (!name || typeof name !== "string") {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: "Invalid params: 'name' is required and must be a string",
              },
            };
          }

          const result = await executeMcpTool(name, toolArgs ?? {}, this.client);
          return {
            jsonrpc: "2.0",
            id,
            result,
          };
        }

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: `Internal error: ${msg}`,
        },
      };
    }
  }
}
