/**
 * Governance smoke test — $0.05 proposal-signal probe.
 * Usage: X402_BUYER_PRIVATE_KEY=0x... npx tsx examples/inline-test-governance.ts
 */
import { loadConfig } from "../src/config.js";
import { buildX402Client } from "../src/x402/wallet.js";
import { MakoClient } from "../src/x402/client.js";
import { ALL_TOOLS } from "../src/tools/index.js";
import type { ToolContext } from "../src/tools/types.js";

(async () => {
  const config = loadConfig();
  const { client: x402, buyerAddress } = buildX402Client(config);
  const client = new MakoClient(config, x402);
  const ctx: ToolContext = { client, config, buyerWallet: buyerAddress };

  console.log(`buyer wallet: ${ctx.buyerWallet}`);
  console.log(`base url:     ${config.baseUrl}\n`);

  const tool = ALL_TOOLS.find((t) => t.name === "mako_governance_proposal_signal");
  if (!tool) {
    console.error(
      "mako_governance_proposal_signal not registered. Registered:",
      ALL_TOOLS.map((t) => t.name).join(", "),
    );
    process.exit(1);
  }

  const input = {
    snapshot_space: "arbitrumfoundation.eth",
    snapshot_state: ["active", "pending"],
    limit: 3,
  };
  console.log(`→ invoking mako_governance_proposal_signal`);
  console.log(`input: ${JSON.stringify(input)}\n`);

  try {
    const validated = tool.zodSchema.parse(input);
    const result = await tool.handler(validated, ctx);
    console.log("result:", JSON.stringify(result, null, 2).slice(0, 3000));
  } catch (err) {
    console.error("FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
