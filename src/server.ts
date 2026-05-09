import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { z } from "zod";
import { loadConfig } from "./config.js";
import { buildSigner, buyerAddress } from "./x402/wallet.js";
import { MakoClient } from "./x402/client.js";
import { ALL_TOOLS } from "./tools/index.js";
import type { ToolContext, ToolDefinition } from "./tools/types.js";

export interface CreateServerOptions {
  client?: MakoClient;
  buyerWallet?: string;
  config?: ReturnType<typeof loadConfig>;
}

export async function createServer(opts: CreateServerOptions = {}): Promise<McpServer> {
  const config = opts.config ?? loadConfig();
  let client = opts.client;
  let buyerWallet = opts.buyerWallet;
  if (!client) {
    const signer = await buildSigner(config);
    client = new MakoClient(config, signer);
  }
  if (!buyerWallet) {
    buyerWallet = buyerAddress(config);
  }
  const ctx: ToolContext = { client, config, buyerWallet };

  const server = new McpServer(
    { name: "mako-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  for (const tool of ALL_TOOLS) {
    registerTool(server, tool, ctx);
  }

  return server;
}

function registerTool(
  server: McpServer,
  tool: ToolDefinition<z.ZodObject<z.ZodRawShape>>,
  ctx: ToolContext,
): void {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.zodSchema.shape,
    },
    (async (args: unknown) => {
      try {
        const validated = tool.zodSchema.parse(args ?? {});
        const result = await tool.handler(validated, ctx);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            { type: "text" as const, text: `Error calling ${tool.name}: ${message}` },
          ],
          isError: true,
        };
      }
    }) as never,
  );
}

export async function startStdioServer(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
