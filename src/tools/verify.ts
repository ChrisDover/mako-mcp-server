import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const inputSchema = z.object({
  target_url: z
    .string()
    .url()
    .max(500)
    .describe("Required. The URL of the agent-commerce endpoint to verify."),
  intended_task: z
    .string()
    .max(300)
    .optional()
    .describe("Optional. Free-text description of the task you want the endpoint to perform."),
  max_price_usdc: z
    .number()
    .min(0)
    .optional()
    .describe("Optional. Maximum acceptable price in USDC."),
  required_output: z
    .string()
    .optional()
    .describe("Optional. Expected output format, e.g. 'json'."),
  risk_mode: z
    .enum(["standard", "strict"])
    .optional()
    .describe("Optional. 'standard' or 'strict'. Default 'standard'."),
});

export const verifyTool: ToolDefinition<typeof inputSchema> = {
  name: "mako_verify",
  description:
    "Run a full agent-commerce verification of an x402 endpoint: schema validation, settlement readiness check, risk scoring, recommended call plan, and signed receipt. The deepest single check MAKO offers — use before integrating an unfamiliar endpoint. Cost: $0.25 USDC paid via x402 from your buyer wallet on Base mainnet.",
  inputSchema: {
    type: "object",
    properties: {
      target_url: {
        type: "string",
        format: "uri",
        maxLength: 500,
        description: "Required. The URL of the agent-commerce endpoint to verify.",
      },
      intended_task: {
        type: "string",
        maxLength: 300,
        description: "Optional. Free-text description of the task you want the endpoint to perform.",
      },
      max_price_usdc: {
        type: "number",
        minimum: 0,
        description: "Optional. Maximum acceptable price in USDC.",
      },
      required_output: {
        type: "string",
        description: "Optional. Expected output format, e.g. 'json'.",
      },
      risk_mode: {
        type: "string",
        enum: ["standard", "strict"],
        description: "Optional. 'standard' or 'strict'. Default 'standard'.",
      },
    },
    required: ["target_url"],
  },
  zodSchema: inputSchema,
  async handler(input, ctx) {
    const body: Record<string, unknown> = { target_url: input.target_url };
    if (input.intended_task !== undefined) body.intended_task = input.intended_task;
    if (input.max_price_usdc !== undefined) body.max_price_usdc = input.max_price_usdc;
    if (input.required_output !== undefined) body.required_output = input.required_output;
    if (input.risk_mode !== undefined) body.risk_mode = input.risk_mode;

    const result = await ctx.client.call({
      method: "POST",
      path: "/api/agent-commerce/verify",
      body,
    });
    return { ...(result.data as object), _payment: result.payment };
  },
};
