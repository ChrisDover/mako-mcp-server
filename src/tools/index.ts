import { routeTool } from "./route.js";
import { pulseTool } from "./pulse.js";
import { pricingTool } from "./pricing.js";
import { reputationTool } from "./reputation.js";
import { verifyTool } from "./verify.js";
import { marketsAggregateTool } from "./marketsAggregate.js";
import { governanceProposalSignalTool } from "./governanceProposalSignal.js";
import { governanceWeeklyBriefTool } from "./governanceWeeklyBrief.js";
import type { ToolDefinition } from "./types.js";

export const ALL_TOOLS: ToolDefinition<any>[] = [
  routeTool,
  pulseTool,
  pricingTool,
  reputationTool,
  verifyTool,
  marketsAggregateTool,
  governanceProposalSignalTool,
  governanceWeeklyBriefTool,
];

export {
  routeTool,
  pulseTool,
  pricingTool,
  reputationTool,
  verifyTool,
  marketsAggregateTool,
  governanceProposalSignalTool,
  governanceWeeklyBriefTool,
};
