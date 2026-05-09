# Changelog

## 0.1.0 — initial release

- 5 MCP tools: `mako_route`, `mako_pulse`, `mako_pricing`, `mako_reputation`, `mako_verify`
- x402 payment flow handled transparently via `x402-fetch` (Base mainnet, USDC)
- Stdio transport for Claude Desktop, Hermes Agent, OpenClaw, Cline, Continue.dev, etc.
- Configurable via `X402_BUYER_PRIVATE_KEY` env var; refuses to start without it
- `MAKO_MAX_PAYMENT_USDC` safety cap (default $0.50 per call)
- 30 unit tests, no live network calls in CI
