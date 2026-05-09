import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const inputSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 0x-prefixed EVM address")
    .describe("Required. EVM wallet address (0x + 40 hex chars)."),
  window: z
    .enum(["7d", "30d", "90d", "all"])
    .optional()
    .describe("Optional. Lookback window. Default '30d'."),
});

export const reputationTool: ToolDefinition<typeof inputSchema> = {
  name: "mako_reputation",
  description:
    "Get the reputation score for a specific operator wallet across all of MAKO's verified endpoint history. Returns reputation score (0-100), tier (trusted/reliable/developing/unreliable), sub-scores (callable rate, schema compliance, settlement success), and signed receipt. Cost: $0.03 USDC paid via x402 from your buyer wallet on Base mainnet.",
  inputSchema: {
    type: "object",
    properties: {
      address: {
        type: "string",
        pattern: "^0x[a-fA-F0-9]{40}$",
        description: "Required. EVM wallet address (0x + 40 hex chars).",
      },
      window: {
        type: "string",
        enum: ["7d", "30d", "90d", "all"],
        description: "Optional. Lookback window. Default '30d'.",
      },
    },
    required: ["address"],
  },
  zodSchema: inputSchema,
  async handler(input, ctx) {
    const result = await ctx.client.call({
      method: "GET",
      path: "/api/reputation/wallet",
      query: { address: input.address, window: input.window },
    });
    return { ...(result.data as object), _payment: result.payment };
  },
};
