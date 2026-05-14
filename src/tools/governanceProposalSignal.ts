import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const PROPOSAL_STATES = ["active", "pending", "closed"] as const;

const inputSchema = z.object({
  snapshot_space: z
    .string()
    .max(120)
    .default("arbitrumfoundation.eth")
    .describe(
      "Snapshot space slug. Default 'arbitrumfoundation.eth'.",
    ),
  snapshot_state: z
    .array(z.enum(PROPOSAL_STATES))
    .max(5)
    .default(["active", "pending"])
    .describe(
      `Snapshot proposal states to include. Subset of [${PROPOSAL_STATES.join(", ")}]. Default ['active','pending'].`,
    ),
  snapshot_order_direction: z
    .enum(["asc", "desc"])
    .default("asc")
    .describe("Order direction for proposals. Default 'asc'."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(5)
    .describe("Max proposals to return. 1-25. Default 5."),
});

export const governanceProposalSignalTool: ToolDefinition<typeof inputSchema> = {
  name: "mako_governance_proposal_signal",
  description:
    "Recent Snapshot proposals for a DAO space — deadlines, choices, scores, urgency flags. Source-linked, no LLM tax. For agents polling governance hourly that only escalate to a full brief when something interesting hits. Cost: $0.05 USDC paid via x402 from your buyer wallet on Base mainnet.",
  inputSchema: {
    type: "object",
    properties: {
      snapshot_space: {
        type: "string",
        maxLength: 120,
        description: "Snapshot space slug. Default 'arbitrumfoundation.eth'.",
      },
      snapshot_state: {
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
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 25,
        description: "Max proposals to return. 1-25. Default 5.",
      },
    },
  },
  zodSchema: inputSchema,
  async handler(input, ctx) {
    const query: Record<string, string | number | string[]> = {
      snapshot_space: input.snapshot_space,
      snapshot_state: input.snapshot_state,
      snapshot_order_direction: input.snapshot_order_direction,
      limit: input.limit,
    };
    const result = await ctx.client.call({
      method: "GET",
      path: "/api/governance/proposal-signal",
      query,
    });
    return { ...(result.data as object), _payment: result.payment };
  },
};
