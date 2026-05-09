# Hermes Agent integration

[Hermes Agent](https://github.com/NousResearch/hermes-agent) is Nous Research's open-source agent framework. It supports MCP servers natively.

## Add `mako-mcp` to your agent config

Edit your Hermes agent config (typically `agent.yaml` or wherever your `mcp_servers` block lives):

```yaml
mcp_servers:
  - name: mako
    description: "MAKO trust layer — paid x402 endpoint routing, scoring, verification"
    command: npx
    args: ["-y", "@pollinate/mako-mcp"]
    env:
      X402_BUYER_PRIVATE_KEY: ${X402_BUYER_PRIVATE_KEY}
      MAKO_MAX_PAYMENT_USDC: "0.50"
```

Set `X402_BUYER_PRIVATE_KEY` in your shell environment before starting the agent — never commit it to the YAML file.

## Use in a prompt

```
You have access to mako_route, mako_pulse, mako_pricing, mako_reputation,
and mako_verify tools. Before calling any unfamiliar x402 endpoint, use
mako_verify on it. Before paying for a service, use mako_route to find the
best provider for your task.
```

## Wallet setup

Generate a dedicated buyer wallet (do NOT reuse your main wallet):

```bash
node -e "console.log(require('viem/accounts').generatePrivateKey())"
```

Fund it on Base mainnet:
- $5–10 of USDC (covers hundreds of tool calls)
- $0.05 of ETH (gas)

Export the key:

```bash
export X402_BUYER_PRIVATE_KEY=0x...
```

## Cost expectations

At Hermes-typical volumes (10 tool calls per agent session), expect:
- 5 sessions/day × 10 calls × $0.05 (route) = $2.50/day = ~$75/month
- A pre-funded $10 buyer wallet lasts about 4 days at that rate; top up weekly

Monitor balance: `https://basescan.org/address/<your-buyer-address>`
