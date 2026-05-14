import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const PROPOSAL_STATES = ["active", "pending", "closed"] as const;

const inputSchema = z.object({
  client_name: z
    .string()
    .max(120)
    .default("Agentic Market Buyer")
    .describe("Caller label used in the brief preamble. Default 'Agentic Market Buyer'."),
  snapshot_spaces: z
    .array(z.string().max(120))
    .max(10)
    .default(["arbitrumfoundation.eth"])
    .describe("Snapshot space slugs to include. Default ['arbitrumfoundation.eth']."),
  snapshot_states: z
    .array(z.enum(PROPOSAL_STATES))
    .max(5)
    .default(["active", "pending"])
    .describe(
      `Snapshot proposal states. Subset of [${PROPOSAL_STATES.join(", ")}]. Default ['active','pending'].`,
    ),
  snapshot_order_direction: z
    .enum(["asc", "desc"])
    .default("asc")
    .describe("Order direction. Default 'asc'."),
  tally_governor_ids: z
    .array(z.string())
    .max(10)
    .default([])
    .describe("Optional Tally governor IDs to include."),
  tally_organization_ids: z
    .array(z.number().int())
    .max(10)
    .default([])
    .describe("Optional Tally organization IDs to include."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(5)
    .describe("Max proposals per source. 1-25. Default 5."),
  max_summaries: z
    .number()
    .int()
    .min(0)
    .max(25)
    .optional()
    .describe("Optional. Cap on number of proposals to summarize via model."),
  max_body_chars: z
    .number()
    .int()
    .optional()
    .describe("Optional. Truncate proposal body before summarization."),
  num_predict: z
    .number()
    .int()
    .optional()
    .describe("Optional. Model token budget per summary."),
  timeout: z
    .number()
    .int()
    .optional()
    .describe("Optional. Per-summary model timeout (seconds)."),
  skip_model: z
    .boolean()
    .default(false)
    .describe("If true, return deterministic excerpts instead of model summaries. Default false."),
  write_artifacts: z
    .boolean()
    .default(false)
    .describe("If true, persist server-side brief artifacts. Default false."),
});

export const governanceWeeklyBriefTool: ToolDefinition<typeof inputSchema> = {
  name: "mako_governance_weekly_brief",
  description:
    "Full source-linked DAO governance weekly brief. Pulls from Snapshot + Tally, summarizes via local Gemma model (or skip_model=true for deterministic excerpts). Returns Markdown + structured proposal metadata. Premium tier — most expensive MAKO tool ($1.00/call) but the canonical 'one-call DAO weekly digest' product. Paid via x402 from your buyer wallet on Base mainnet.",
  inputSchema: {
    type: "object",
    properties: {
      client_name: {
        type: "string",
        maxLength: 120,
        description: "Caller label. Default 'Agentic Market Buyer'.",
      },
      snapshot_spaces: {
        type: "array",
        items: { type: "string", maxLength: 120 },
        maxItems: 10,
        description: "Snapshot space slugs. Default ['arbitrumfoundation.eth'].",
      },
      snapshot_states: {
        type: "array",
        items: { type: "string", enum: [...PROPOSAL_STATES] },
        maxItems: 5,
        description: `Subset of [${PROPOSAL_STATES.join(", ")}]. Default ['active','pending'].`,
      },
      snapshot_order_direction: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Default 'asc'.",
      },
      tally_governor_ids: {
        type: "array",
        items: { type: "string" },
        maxItems: 10,
        description: "Optional Tally governor IDs.",
      },
      tally_organization_ids: {
        type: "array",
        items: { type: "integer" },
        maxItems: 10,
        description: "Optional Tally organization IDs.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 25,
        description: "Max proposals per source. Default 5.",
      },
      max_summaries: {
        type: "integer",
        minimum: 0,
        maximum: 25,
        description: "Optional. Cap on proposals summarized via model.",
      },
      max_body_chars: {
        type: "integer",
        description: "Optional. Truncate proposal body before summarization.",
      },
      num_predict: {
        type: "integer",
        description: "Optional. Model token budget per summary.",
      },
      timeout: {
        type: "integer",
        description: "Optional. Per-summary model timeout (seconds).",
      },
      skip_model: {
        type: "boolean",
        description: "If true, deterministic excerpts only. Default false.",
      },
      write_artifacts: {
        type: "boolean",
        description: "Persist server-side artifacts. Default false.",
      },
    },
  },
  zodSchema: inputSchema,
  async handler(input, ctx) {
    const result = await ctx.client.call({
      method: "POST",
      path: "/api/governance/weekly-brief",
      body: input,
    });
    return { ...(result.data as object), _payment: result.payment };
  },
};
