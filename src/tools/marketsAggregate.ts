import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const CATEGORIES = [
  "crypto",
  "sports",
  "politics",
  "world",
  "culture",
  "economics",
  "entertainment",
] as const;

const SOURCES = ["polymarket", "kalshi", "limitless"] as const;

const inputSchema = z.object({
  query: z
    .string()
    .max(200)
    .optional()
    .describe("Optional. Substring filter on market question text (case-insensitive)."),
  category: z
    .enum(CATEGORIES)
    .optional()
    .describe(
      `Optional. One of: ${CATEGORIES.join(", ")}. Omit for any category.`,
    ),
  sources: z
    .array(z.enum(SOURCES))
    .optional()
    .describe(
      `Optional. Subset of [${SOURCES.join(", ")}]. Defaults to all three.`,
    ),
  top_n: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Optional. How many markets to return. 1-50. Default 10."),
  min_volume_24h_usd: z
    .number()
    .min(0)
    .optional()
    .describe("Optional. Filter out low-volume noise. Default $1000."),
  min_liquidity_usd: z
    .number()
    .min(0)
    .optional()
    .describe("Optional. Liquidity floor in USD. Default 0."),
  include_resolved: z
    .boolean()
    .optional()
    .describe("Optional. Include recently-resolved markets. Default false."),
});

export const marketsAggregateTool: ToolDefinition<typeof inputSchema> = {
  name: "mako_markets_aggregate",
  description:
    "Aggregate top prediction markets across Polymarket, Kalshi, and Limitless into one signed response. Returns normalised title, outcomes, outcome_prices, volume_24h_usd, liquidity_usd, expiration_iso, URL, plus a per-market platform reputation tier and settlement chain. Filter by category, query, volume floor, top_n. EIP-191 signed by MAKO. Cost: $0.05 USDC paid via x402 from your buyer wallet on Base mainnet.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        maxLength: 200,
        description: "Optional. Substring filter on market question text (case-insensitive).",
      },
      category: {
        type: "string",
        enum: [...CATEGORIES],
        description: `Optional. One of: ${CATEGORIES.join(", ")}.`,
      },
      sources: {
        type: "array",
        items: { type: "string", enum: [...SOURCES] },
        description: `Optional. Subset of [${SOURCES.join(", ")}]. Defaults to all three.`,
      },
      top_n: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        description: "Optional. How many markets to return. Default 10.",
      },
      min_volume_24h_usd: {
        type: "number",
        minimum: 0,
        description: "Optional. Default $1000.",
      },
      min_liquidity_usd: {
        type: "number",
        minimum: 0,
        description: "Optional. Default 0.",
      },
      include_resolved: {
        type: "boolean",
        description: "Optional. Default false.",
      },
    },
  },
  zodSchema: inputSchema,
  async handler(input, ctx) {
    const query: Record<string, string | number | undefined> = {};
    if (input.query !== undefined) query.query = input.query;
    if (input.category !== undefined) query.category = input.category;
    if (input.sources !== undefined && input.sources.length > 0) {
      query.sources = input.sources.join(",");
    }
    if (input.top_n !== undefined) query.top_n = input.top_n;
    if (input.min_volume_24h_usd !== undefined)
      query.min_volume_24h_usd = input.min_volume_24h_usd;
    if (input.min_liquidity_usd !== undefined)
      query.min_liquidity_usd = input.min_liquidity_usd;
    if (input.include_resolved !== undefined)
      query.include_resolved = input.include_resolved ? "true" : "false";

    const result = await ctx.client.call({
      method: "GET",
      path: "/api/markets/aggregate",
      query,
    });
    return { ...(result.data as object), _payment: result.payment };
  },
};
