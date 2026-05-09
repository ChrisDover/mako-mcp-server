# @pollinate/mako-mcp

MAKO's paid x402 endpoints (route, pulse, pricing, reputation, verify) wrapped as installable MCP tools. One line of config and any MCP-native agent — Claude Desktop, Hermes Agent, OpenClaw, Cline, Continue.dev — can route through MAKO's trust layer.

## What it does

Exposes 5 tools to your agent:

| Tool | Endpoint | Cost (USDC) | Purpose |
|---|---|---|---|
| `mako_route` | `POST /api/route` | $0.05 | Recommend the best x402 service for a task; returns ranked candidates and a signed receipt |
| `mako_pulse` | `GET /api/pulse/score` | $0.02 | Reliability score for a specific endpoint (status, latency, success rates) |
| `mako_pricing` | `GET /api/pricing/index` | $0.02 | Live price percentiles for x402 services by category |
| `mako_reputation` | `GET /api/reputation/wallet` | $0.03 | Operator wallet reputation across MAKO's verification history |
| `mako_verify` | `POST /api/agent-commerce/verify` | $0.25 | Deep verification of an unfamiliar endpoint (schema, settlement, risk, call plan) |

Every tool call is paid via x402 from your buyer wallet on Base mainnet. The server transparently handles the 402 → EIP-3009 sign → 200 retry flow. Each response includes a `_payment` block with the on-chain transaction hash so the agent has proof of payment.

## Install

No install needed if you use `npx`:

```bash
npx -y @pollinate/mako-mcp
```

Or install globally:

```bash
npm install -g @pollinate/mako-mcp
mako-mcp
```

## Configure

The server reads configuration from environment variables.

| Variable | Required | Default | Description |
|---|---|---|---|
| `X402_BUYER_PRIVATE_KEY` | Yes | — | Hex-encoded private key (`0x...`, 32 bytes) for the buyer wallet on Base mainnet. Must hold a small USDC balance plus a few cents of ETH for gas. The server refuses to start without this. |
| `MAKO_BASE_URL` | No | `https://mako.pollinateresearch.com` | Override the MAKO API host. |
| `MAKO_NETWORK` | No | `base` | x402 network. Accepts viem network names (`base`, `base-sepolia`) or x402 chain IDs (`eip155:8453`). |
| `MAKO_TIMEOUT_MS` | No | `60000` | HTTP timeout per request. |
| `MAKO_MAX_PAYMENT_USDC` | No | `0.50` | Maximum USDC the server will pay for any single tool call. Safety cap. |

### Security caveats — read this

The buyer private key controls real money. To minimize blast radius:

- **Use a dedicated buyer wallet, not your main wallet.** Generate a fresh key for this. Never reuse a wallet that holds significant balances.
- **Top up periodically; don't park a large balance.** $5–10 of USDC lasts weeks at typical agent volumes (100 route calls = $5).
- **The server never logs or transmits the private key.** It signs in-process and discards.
- **`MAKO_MAX_PAYMENT_USDC` is a hard ceiling.** Even if MAKO returned a malformed 402 asking for $1000, the wrapper refuses anything above your configured max.

## Connect to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "mako": {
      "command": "npx",
      "args": ["-y", "@pollinate/mako-mcp"],
      "env": {
        "X402_BUYER_PRIVATE_KEY": "0xYOUR_BUYER_PRIVATE_KEY_HERE"
      }
    }
  }
}
```

Restart Claude Desktop. The 5 `mako_*` tools will appear in the tool picker.

## Connect to Hermes Agent

Hermes loads MCP servers via its agent config. See [Hermes Agent docs](https://github.com/NousResearch/hermes-agent) for the latest schema. Example:

```yaml
mcp_servers:
  - name: mako
    command: npx
    args: ["-y", "@pollinate/mako-mcp"]
    env:
      X402_BUYER_PRIVATE_KEY: ${X402_BUYER_PRIVATE_KEY}
```

See `examples/hermes-agent-config.md` for the full integration walkthrough.

## Connect to OpenClaw

OpenClaw's MCP loader: drop the same `npx` command into its `mcp_servers` block. Pairs naturally with [openclaw-x402](https://github.com/scottcjn/openclaw-x402) — `mako-mcp` adds the routing layer above the payment layer. See `examples/openclaw-config.md`.

## Connect to Cline / Continue.dev / Zed / others

Any MCP-native client that accepts a `command` + `env` config works. The pattern is always the same:

```json
"command": "npx",
"args": ["-y", "@pollinate/mako-mcp"],
"env": { "X402_BUYER_PRIVATE_KEY": "0x..." }
```

## Available tools (full reference)

### `mako_route`

Recommend the best x402 service to call for a given task.

```jsonc
{
  "task": "crypto-data",                    // required; canonical task name
  "max_price_usdc": "0.50",                 // optional
  "min_reliability_score": 0.7,             // optional, 0.0-1.0
  "min_reputation_score": 0.6,              // optional, 0.0-1.0
  "preferred_jurisdictions": ["US", "EU"],  // optional
  "prohibited_operators": ["0x..."],        // optional
  "deadline_unix": 1762560000               // optional
}
```

Canonical tasks: `endpoint-verification`, `pulse-score`, `pricing-data`, `reputation-data`, `governance-brief`, `proposal-signal`, `crypto-data`, `market-data`, `search`, `image-generation`, `ai-inference`, `data-extraction`, `agent-storage`.

Returns: `{ verdict, recommendation, alternatives[], candidates_evaluated, request_id, receipt, _payment }`.

### `mako_pulse`

Score the reliability of a specific endpoint.

```jsonc
{
  "endpoint": "https://example.com/api/foo", // required
  "window": "30d"                            // optional: "7d" | "30d" | "90d" | "all"
}
```

### `mako_pricing`

Live pricing index across the x402 ecosystem.

```jsonc
{
  "category": "governance",  // optional
  "window": "30d"            // optional: "7d" | "30d" | "all"
}
```

### `mako_reputation`

Operator wallet reputation.

```jsonc
{
  "address": "0x...",  // required, EVM wallet
  "window": "30d"      // optional: "7d" | "30d" | "90d" | "all"
}
```

### `mako_verify`

Deep verification of a single endpoint.

```jsonc
{
  "target_url": "https://example.com/api/x", // required, max 500 chars
  "intended_task": "fetch BTC price",        // optional, max 300 chars
  "max_price_usdc": 0.10,                    // optional
  "required_output": "json",                 // optional
  "risk_mode": "strict"                      // optional: "standard" | "strict"
}
```

## Manual smoke test

```bash
git clone https://github.com/ChrisDover/mako-mcp-server
cd mako-mcp-server
npm install
npm run build
X402_BUYER_PRIVATE_KEY=0x... node examples/inline-test.ts
```

## Development

```bash
npm install
npm run dev    # tsx src/index.ts
npm test       # vitest run
npm run build  # tsc → dist/
```

Tests mock `x402-fetch` at the module boundary so CI never burns USDC.

## Publishing

For maintainers — see `.github/workflows/publish.yml`. Tag a release and push:

```bash
npm version patch  # or minor/major
git push --follow-tags
```

The workflow runs tests, builds, and publishes to npm using the `NPM_TOKEN` repo secret.

## License

MIT — see [LICENSE](./LICENSE).

## Links

- [MAKO](https://mako.pollinateresearch.com) — the underlying x402 trust layer
- [mako-verifier](https://github.com/ChrisDover/mako-verifier) — Python verifier for x402 endpoints
- [Model Context Protocol](https://modelcontextprotocol.io) — agent tool protocol
- [x402](https://github.com/x402-foundation/x402) — payment-first HTTP protocol
