/**
 * Manual smoke test that bypasses the MCP transport and calls each tool directly.
 *
 * Usage:
 *   X402_BUYER_PRIVATE_KEY=0x... npx tsx examples/inline-test.ts
 *
 * WARNING: Each invocation spends real USDC on Base mainnet:
 *   - mako_pulse:      $0.02
 *   - mako_pricing:    $0.02
 *   - mako_reputation: $0.03
 *   - mako_route:      $0.05
 *   - mako_verify:     $0.25  (skipped by default)
 * Total per full run (sans verify): $0.12
 */
import { loadConfig } from "../src/config.js";
import { buildSigner, buyerAddress } from "../src/x402/wallet.js";
import { MakoClient } from "../src/x402/client.js";
import { ALL_TOOLS } from "../src/tools/index.js";
import type { ToolContext } from "../src/tools/types.js";

const SAMPLE_INPUTS: Record<string, unknown> = {
  mako_route: { task: "crypto-data" },
  mako_pulse: {
    endpoint: "https://mako.pollinateresearch.com/api/agent-commerce/verify",
    window: "30d",
  },
  mako_pricing: { window: "30d" },
  mako_reputation: {
    address: "0x6e4DfBe49858E9Cb93162352D75DBD1E409A7737",
    window: "30d",
  },
  // mako_verify costs $0.25 — uncomment to include it
  // mako_verify: { target_url: "https://mako.pollinateresearch.com/api/pulse/score" },
};

async function main(): Promise<void> {
  const config = loadConfig();
  const signer = await buildSigner(config);
  const client = new MakoClient(config, signer);
  const ctx: ToolContext = { client, config, buyerWallet: buyerAddress(config) };

  console.log(`buyer wallet: ${ctx.buyerWallet}`);
  console.log(`base url:     ${config.baseUrl}`);
  console.log(`network:      ${config.network}\n`);

  for (const tool of ALL_TOOLS) {
    const input = SAMPLE_INPUTS[tool.name];
    if (input === undefined) {
      console.log(`---\n${tool.name} — SKIPPED (no sample input)\n`);
      continue;
    }
    console.log(`---\n${tool.name}`);
    console.log(`input: ${JSON.stringify(input)}`);
    try {
      const validated = tool.zodSchema.parse(input);
      const result = await tool.handler(validated, ctx);
      console.log("result:", JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`FAILED:`, err instanceof Error ? err.message : err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
