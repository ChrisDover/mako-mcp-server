# OpenClaw integration

[OpenClaw](https://github.com/openclaw) is an MCP-native agent framework. [openclaw-x402](https://github.com/scottcjn/openclaw-x402) adds x402 payment support — `mako-mcp` slots in above it as the routing/trust layer.

## Add `mako-mcp` to your OpenClaw config

In your OpenClaw `mcp_servers` block:

```yaml
mcp_servers:
  mako:
    command: npx
    args:
      - -y
      - "@pollinate/mako-mcp"
    env:
      X402_BUYER_PRIVATE_KEY: ${X402_BUYER_PRIVATE_KEY}
      MAKO_MAX_PAYMENT_USDC: "0.50"
```

## Stack pattern

```
        ┌──────────────────────┐
        │  OpenClaw agent      │
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐    "find me the best service for X"
        │  mako-mcp tools      │  → mako_route returns ranked endpoint
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐    actually call the recommended endpoint
        │  openclaw-x402       │  → handles per-call x402 payment
        └──────────────────────┘
```

The two layers compose cleanly. `mako-mcp` decides *which* endpoint to call; `openclaw-x402` (or any x402 client) makes the actual call.

## Wallet sharing

If you already have a buyer wallet configured for `openclaw-x402`, you can use the same key for `mako-mcp` (or use a separate dedicated one — recommended for clean accounting).
