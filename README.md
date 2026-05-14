# @pollinateresearch/mako-mcp

MAKO's paid x402 endpoints (route, pulse, pricing, reputation, verify, markets-aggregate, governance proposal-signal + weekly-brief) wrapped as installable MCP tools. One line of config and any MCP-native agent — Claude Desktop, Hermes Agent, OpenClaw, Cline, Continue.dev — can route through MAKO's trust layer.

## What it does

Exposes 8 tools to your agent:

| Tool | Endpoint | Cost (USDC) | Purpose |
|---|---|---|---|
| `mako_route` | `POST /api/route` | $0.05 | Recommend the best x402 service for a task; returns ranked candidates and a signed receipt |
| `mako_pulse` | `GET /api/pulse/score` | $0.02 | Reliability score for a specific endpoint (status, latency, success rates) |
| `mako_pricing` | `GET /api/pricing/index` | $0.02 | Live price percentiles for x402 services by category |
| `mako_reputation` | `GET /api/reputation/wallet` | $0.03 | Operator wallet reputation across MAKO's verification history |
| `mako_verify` | `POST /api/agent-commerce/verify` | $0.25 | Deep verification of an unfamiliar endpoint (schema, settlement, risk, call plan) |
| `mako_markets_aggregate` | `GET /api/markets/aggregate` | $0.05 | Top prediction markets across Polymarket + Kalshi + Limitless, normalized and signed. For trading bots, sentiment readers, audit trails. |
| `mako_governance_proposal_signal` | `GET /api/governance/proposal-signal` | $0.05 | Recent Snapshot proposals for a DAO space — deadlines, choices, scores, urgency. For hourly governance polling. |
| `mako_governance_weekly_brief` | `POST /api/governance/weekly-brief` | $1.00 | Full source-linked DAO governance weekly brief from Snapshot + Tally, summarized via local Gemma. Markdown + structured metadata. |

Every tool call is paid via x402 from your buyer wallet on Base mainnet. The server transparently handles the 402 → EIP-3009 sign → 200 retry flow. Each response includes a `_payment` block with the on-chain transaction hash so the agent has proof of payment.

## Install

No install needed if you use `npx`:

```bash
npx -y @pollinateresearch/mako-mcp
```

Or install globally:

```bash
npm install -g @pollinateresearch/mako-mcp
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
      "args": ["-y", "@pollinateresearch/mako-mcp"],
      "env": {
        "X402_BUYER_PRIVATE_KEY": "0xYOUR_BUYER_PRIVATE_KEY_HERE"
      }
    }
  }
}
```

Restart Claude Desktop. The 8 `mako_*` tools will appear in the tool picker.

## Connect to Hermes Agent

Hermes loads MCP servers via its agent config. See [Hermes Agent docs](https://github.com/NousResearch/hermes-agent) for the latest schema. Example:

```yaml
mcp_servers:
  - name: mako
    command: npx
    args: ["-y", "@pollinateresearch/mako-mcp"]
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
"args": ["-y", "@pollinateresearch/mako-mcp"],
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

### `mako_markets_aggregate`

Top prediction markets across Polymarket, Kalshi, and Limitless, normalized into one signed response.

```jsonc
{
  "query": "bitcoin",                          // optional substring filter on market title
  "category": "crypto",                        // optional: "crypto" | "sports" | "politics" | "world" | "culture" | "economics" | "entertainment"
  "sources": "polymarket,kalshi,limitless",    // optional comma-separated source list
  "top_n": 10,                                 // optional, max 50
  "min_volume_24h_usd": 1000,                  // optional volume floor (USD)
  "min_liquidity_usd": 0,                      // optional liquidity floor — Limitless doesn't report liquidity, so any min > 0 will skip Limitless markets
  "include_resolved": false                    // optional; include recently-resolved markets
}
```

Returns ranked markets with normalized fields (title, outcomes, prices, 24h volume, liquidity, expiration, source URL), per-platform editorial reliability scores flagged `score_source: static_v1` (live pulse-ledger probes coming in v0.3), and an EIP-191 signed receipt over RFC 8785 canonical JSON.

Use cases: trading bots that need one-call multi-source market data, AI agents reading market sentiment as a forward-looking signal, compliance-conscious traders who want signed attestations of point-in-time market state.

### `mako_governance_proposal_signal`

Recent Snapshot proposals for a DAO space. Lightweight ($0.05) polling tool — agents call this hourly and only escalate to the full weekly brief when something interesting hits.

```jsonc
{
  "snapshot_space": "arbitrumfoundation.eth",     // default 'arbitrumfoundation.eth'
  "snapshot_state": ["active", "pending"],        // subset of ["active","pending","closed"]
  "snapshot_order_direction": "asc",              // "asc" | "desc"
  "limit": 5                                      // 1-25, default 5
}
```

Returns proposal metadata (title, body excerpt, choices, scores, state, end timestamp, urgency flags) with a signed receipt. No model summarization — pure source-linked passthrough.

### `mako_governance_weekly_brief`

Premium tier ($1.00) — the canonical "one-call DAO weekly digest" product. Pulls from Snapshot + Tally, summarizes via local Gemma model, returns Markdown + structured proposal metadata.

```jsonc
{
  "client_name": "Agentic Market Buyer",          // optional, default "Agentic Market Buyer"
  "snapshot_spaces": ["arbitrumfoundation.eth"],  // up to 10 spaces
  "snapshot_states": ["active", "pending"],       // subset of ["active","pending","closed"]
  "snapshot_order_direction": "asc",
  "tally_governor_ids": [],                       // optional Tally governor IDs
  "tally_organization_ids": [],                   // optional Tally org IDs
  "limit": 5,                                     // proposals per source, max 25
  "max_summaries": 10,                            // optional cap on model summaries
  "max_body_chars": 4000,                         // optional body truncation
  "num_predict": 256,                             // optional model token budget
  "timeout": 30,                                  // optional per-summary timeout seconds
  "skip_model": false,                            // true → deterministic excerpts only
  "write_artifacts": false                        // true → server persists brief artifacts
}
```

Returns `{ markdown, proposals[], request_id, receipt, _payment }`. Use `skip_model: true` for fully deterministic output (no LLM, faster, lower-variance) when downstream consumers need byte-stable input.

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
