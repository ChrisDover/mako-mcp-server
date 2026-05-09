import { routeTool } from "./route.js";
import { pulseTool } from "./pulse.js";
import { pricingTool } from "./pricing.js";
import { reputationTool } from "./reputation.js";
import { verifyTool } from "./verify.js";
import type { ToolDefinition } from "./types.js";

export const ALL_TOOLS: ToolDefinition<any>[] = [
  routeTool,
  pulseTool,
  pricingTool,
  reputationTool,
  verifyTool,
];

export { routeTool, pulseTool, pricingTool, reputationTool, verifyTool };
