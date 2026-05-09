import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const CANONICAL_TASKS = [
  "endpoint-verification",
  "pulse-score",
  "pricing-data",
  "reputation-data",
  "governance-brief",
  "proposal-signal",
  "crypto-data",
  "market-data",
  "search",
  "image-generation",
  "ai-inference",
  "data-extraction",
  "agent-storage",
] as const;

const inputSchema = z.object({
  task: z
    .string()
    .min(1)
    .max(64)
    .describe(
      `Canonical task name. v1 supports: ${CANONICAL_TASKS.join(", ")}.`,
    ),
  max_price_usdc: z
    .string()
    .optional()
    .describe(
      "Optional. Maximum acceptable price in USDC, decimal string e.g. '0.50'.",
    ),
  min_reliability_score: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Optional. 0.0-1.0. Default 0.50."),
  min_reputation_score: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Optional. 0.0-1.0. Default 0.50."),
  preferred_jurisdictions: z
    .array(z.string())
    .optional()
    .describe("Optional. ISO country codes, e.g. ['US', 'EU']."),
  prohibited_operators: z
    .array(z.string())
    .optional()
    .describe("Optional. EVM wallet addresses to exclude."),
  deadline_unix: z
    .number()
    .int()
    .optional()
    .describe("Optional. Unix timestamp by which the recommendation must be valid."),
});

export const routeTool: ToolDefinition<typeof inputSchema> = {
  name: "mako_route",
  description:
    "Recommend the best x402 service to call for a given task. Returns a single signed recommendation plus up to 3 ranked alternatives. Composes MAKO's reliability, pricing, and reputation signals into one answer. Cost: $0.05 USDC paid via x402 from your buyer wallet on Base mainnet.",
  inputSchema: {
    type: "object",
    properties: {
      task: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        description: `Canonical task name. v1 supports: ${CANONICAL_TASKS.join(", ")}.`,
      },
      max_price_usdc: {
        type: "string",
        description: "Optional. Maximum acceptable price in USDC, decimal string e.g. '0.50'.",
      },
      min_reliability_score: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Optional. 0.0-1.0. Default 0.50.",
      },
      min_reputation_score: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Optional. 0.0-1.0. Default 0.50.",
      },
      preferred_jurisdictions: {
        type: "array",
        items: { type: "string" },
        description: "Optional. ISO country codes, e.g. ['US', 'EU'].",
      },
      prohibited_operators: {
        type: "array",
        items: { type: "string" },
        description: "Optional. EVM wallet addresses to exclude.",
      },
      deadline_unix: {
        type: "integer",
        description: "Optional. Unix timestamp by which the recommendation must be valid.",
      },
    },
    required: ["task"],
  },
  zodSchema: inputSchema,
  async handler(input, ctx) {
    const constraints: Record<string, unknown> = {};
    if (input.max_price_usdc !== undefined) constraints.max_price_usdc = input.max_price_usdc;
    if (input.min_reliability_score !== undefined)
      constraints.min_reliability_score = input.min_reliability_score;
    if (input.min_reputation_score !== undefined)
      constraints.min_reputation_score = input.min_reputation_score;
    if (input.preferred_jurisdictions !== undefined)
      constraints.preferred_jurisdictions = input.preferred_jurisdictions;
    if (input.prohibited_operators !== undefined)
      constraints.prohibited_operators = input.prohibited_operators;

    const body: Record<string, unknown> = {
      task: input.task,
      execution_mode: "recommend",
      buyer_wallet: ctx.buyerWallet,
    };
    if (Object.keys(constraints).length > 0) body.constraints = constraints;
    if (input.deadline_unix !== undefined) body.deadline_unix = input.deadline_unix;

    const result = await ctx.client.call({
      method: "POST",
      path: "/api/route",
      body,
    });
    return { ...(result.data as object), _payment: result.payment };
  },
};
