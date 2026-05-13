import { describe, it, expect, vi, beforeEach } from "vitest";
import { ALL_TOOLS, routeTool, pulseTool, pricingTool, reputationTool, verifyTool } from "../src/tools/index.js";
import type { ToolContext } from "../src/tools/types.js";
import type { MakoClient, PaidCallOptions, PaidCallResult } from "../src/x402/client.js";

const BUYER = "0x" + "a".repeat(40);

interface MockClient {
  client: MakoClient;
  calls: PaidCallOptions[];
}

function mockClient(responseData: unknown = { ok: true }): MockClient {
  const calls: PaidCallOptions[] = [];
  const fakeClient = {
    async call<T>(opts: PaidCallOptions): Promise<PaidCallResult<T>> {
      calls.push(opts);
      return {
        data: responseData as T,
        payment: {
          amount_usdc: null,
          tx_hash: "0xtx",
          network: "base",
          payer: BUYER,
          request_id: "rt_test",
        },
      };
    },
  } as unknown as MakoClient;
  return { client: fakeClient, calls };
}

function ctx(client: MakoClient): ToolContext {
  return {
    client,
    buyerWallet: BUYER,
    config: {
      baseUrl: "https://mako.test",
      network: "base",
      timeoutMs: 1000,
      maxPaymentBaseUnits: 500_000n,
      privateKey: "0x" + "1".repeat(64),
    },
  };
}

describe("ALL_TOOLS", () => {
  it("exposes 6 tools with unique names", () => {
    expect(ALL_TOOLS).toHaveLength(6);
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(6);
    expect(names).toEqual([
      "mako_route",
      "mako_pulse",
      "mako_pricing",
      "mako_reputation",
      "mako_verify",
      "mako_markets_aggregate",
    ]);
  });

  it("every tool has a description, input schema, and zod schema", () => {
    for (const t of ALL_TOOLS) {
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.inputSchema).toBeTypeOf("object");
      expect(t.zodSchema).toBeDefined();
    }
  });
});

describe("mako_route", () => {
  it("posts to /api/route with execution_mode=recommend and buyer_wallet", async () => {
    const m = mockClient({ verdict: "callable", recommendation: { endpoint: "x" } });
    const result = await routeTool.handler(
      { task: "crypto-data" },
      ctx(m.client),
    );
    expect(m.calls).toHaveLength(1);
    expect(m.calls[0].method).toBe("POST");
    expect(m.calls[0].path).toBe("/api/route");
    expect(m.calls[0].body).toEqual({
      task: "crypto-data",
      execution_mode: "recommend",
      buyer_wallet: BUYER,
    });
    expect((result as Record<string, unknown>)._payment).toBeDefined();
  });

  it("attaches constraints only when provided", async () => {
    const m = mockClient();
    await routeTool.handler(
      {
        task: "search",
        max_price_usdc: "0.50",
        min_reliability_score: 0.8,
        preferred_jurisdictions: ["US"],
      },
      ctx(m.client),
    );
    expect(m.calls[0].body).toEqual({
      task: "search",
      execution_mode: "recommend",
      buyer_wallet: BUYER,
      constraints: {
        max_price_usdc: "0.50",
        min_reliability_score: 0.8,
        preferred_jurisdictions: ["US"],
      },
    });
  });

  it("rejects empty task via zod", () => {
    expect(() => routeTool.zodSchema.parse({ task: "" })).toThrow();
  });
});

describe("mako_pulse", () => {
  it("GETs /api/pulse/score with endpoint + window", async () => {
    const m = mockClient();
    await pulseTool.handler(
      { endpoint: "https://example.com/foo", window: "7d" },
      ctx(m.client),
    );
    expect(m.calls[0].method).toBe("GET");
    expect(m.calls[0].path).toBe("/api/pulse/score");
    expect(m.calls[0].query).toEqual({
      endpoint: "https://example.com/foo",
      window: "7d",
    });
  });

  it("rejects invalid endpoint URL", () => {
    expect(() => pulseTool.zodSchema.parse({ endpoint: "not-a-url" })).toThrow();
  });

  it("rejects unknown window", () => {
    expect(() =>
      pulseTool.zodSchema.parse({ endpoint: "https://x.com", window: "1d" }),
    ).toThrow();
  });
});

describe("mako_pricing", () => {
  it("GETs /api/pricing/index with optional params", async () => {
    const m = mockClient();
    await pricingTool.handler({ category: "governance" }, ctx(m.client));
    expect(m.calls[0].method).toBe("GET");
    expect(m.calls[0].path).toBe("/api/pricing/index");
    expect(m.calls[0].query).toEqual({ category: "governance", window: undefined });
  });

  it("accepts no parameters", async () => {
    const m = mockClient();
    await pricingTool.handler({}, ctx(m.client));
    expect(m.calls[0].query).toEqual({ category: undefined, window: undefined });
  });

  it("rejects unknown category", () => {
    expect(() => pricingTool.zodSchema.parse({ category: "bogus" })).toThrow();
  });
});

describe("mako_reputation", () => {
  it("GETs /api/reputation/wallet with address + window", async () => {
    const m = mockClient();
    await reputationTool.handler(
      { address: BUYER, window: "30d" },
      ctx(m.client),
    );
    expect(m.calls[0].method).toBe("GET");
    expect(m.calls[0].path).toBe("/api/reputation/wallet");
    expect(m.calls[0].query).toEqual({ address: BUYER, window: "30d" });
  });

  it("rejects malformed address", () => {
    expect(() => reputationTool.zodSchema.parse({ address: "0x123" })).toThrow();
    expect(() =>
      reputationTool.zodSchema.parse({ address: "not-an-address" }),
    ).toThrow();
  });
});

describe("mako_verify", () => {
  it("POSTs to /api/agent-commerce/verify with target_url", async () => {
    const m = mockClient();
    await verifyTool.handler(
      {
        target_url: "https://example.com/x",
        intended_task: "fetch crypto price",
        risk_mode: "strict",
      },
      ctx(m.client),
    );
    expect(m.calls[0].method).toBe("POST");
    expect(m.calls[0].path).toBe("/api/agent-commerce/verify");
    expect(m.calls[0].body).toEqual({
      target_url: "https://example.com/x",
      intended_task: "fetch crypto price",
      risk_mode: "strict",
    });
  });

  it("rejects missing target_url", () => {
    expect(() => verifyTool.zodSchema.parse({})).toThrow();
  });

  it("rejects target_url > 500 chars", () => {
    const long = "https://example.com/" + "x".repeat(500);
    expect(() => verifyTool.zodSchema.parse({ target_url: long })).toThrow();
  });
});
