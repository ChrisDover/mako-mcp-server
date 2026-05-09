import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const CATEGORIES = [
  "crypto_intelligence",
  "trading_signals",
  "governance",
  "compliance",
  "trust_layer",
  "data_feeds",
  "ai_inference",
  "agent_infrastructure",
  "other",
] as const;

const inputSchema = z.object({
  category: z
    .enum(CATEGORIES)
    .optional()
    .describe(
      `Optional. Category to filter the pricing index by. One of: ${CATEGORIES.join(", ")}.`,
    ),
  window: z
    .enum(["7d", "30d", "all"])
    .optional()
    .describe("Optional. Lookback window. Default '30d'."),
});

export const pricingTool: ToolDefinition<typeof inputSchema> = {
  name: "mako_pricing",
  description:
    "Get the live pricing index for x402 services across MAKO's verified endpoint set. Returns price percentiles (p25/median/p75/p95), endpoint count by price band, and freshness. Useful for setting fair prices or checking what others charge. Cost: $0.02 USDC paid via x402 from your buyer wallet on Base mainnet.",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [...CATEGORIES],
        description: `Optional. Category to filter the pricing index by. One of: ${CATEGORIES.join(", ")}.`,
      },
      window: {
        type: "string",
        enum: ["7d", "30d", "all"],
        description: "Optional. Lookback window. Default '30d'.",
      },
    },
  },
  zodSchema: inputSchema,
  async handler(input, ctx) {
    const result = await ctx.client.call({
      method: "GET",
      path: "/api/pricing/index",
      query: { category: input.category, window: input.window },
    });
    return { ...(result.data as object), _payment: result.payment };
  },
};
