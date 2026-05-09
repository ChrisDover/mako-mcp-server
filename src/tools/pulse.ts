import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const inputSchema = z.object({
  endpoint: z
    .string()
    .url()
    .describe("Required. The URL of the x402 endpoint to score."),
  window: z
    .enum(["7d", "30d", "90d", "all"])
    .optional()
    .describe("Optional. Lookback window. Default '30d'."),
});

export const pulseTool: ToolDefinition<typeof inputSchema> = {
  name: "mako_pulse",
  description:
    "Score the reliability of a specific x402 endpoint based on MAKO's verification history. Returns reliability score (0-100), status (healthy/degraded/down), latency p50/p95, and signed receipt. Cost: $0.02 USDC paid via x402 from your buyer wallet on Base mainnet.",
  inputSchema: {
    type: "object",
    properties: {
      endpoint: {
        type: "string",
        format: "uri",
        description: "Required. The URL of the x402 endpoint to score.",
      },
      window: {
        type: "string",
        enum: ["7d", "30d", "90d", "all"],
        description: "Optional. Lookback window. Default '30d'.",
      },
    },
    required: ["endpoint"],
  },
  zodSchema: inputSchema,
  async handler(input, ctx) {
    const result = await ctx.client.call({
      method: "GET",
      path: "/api/pulse/score",
      query: { endpoint: input.endpoint, window: input.window },
    });
    return { ...(result.data as object), _payment: result.payment };
  },
};
