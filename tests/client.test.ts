import { describe, it, expect, vi } from "vitest";
import { MakoClient } from "../src/x402/client.js";
import type { Config } from "../src/config.js";

const config: Config = {
  baseUrl: "https://mako.test",
  network: "base",
  timeoutMs: 5000,
  maxPaymentBaseUnits: 500_000n,
  privateKey: "0x" + "1".repeat(64),
};

vi.mock("x402-fetch", () => ({
  wrapFetchWithPayment: (fetchImpl: typeof fetch) => fetchImpl,
  decodeXPaymentResponse: (header: string) => {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  },
}));

function makeFetch(response: Response): typeof fetch {
  return vi.fn(async () => response) as unknown as typeof fetch;
}

function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("MakoClient.call", () => {
  it("builds full URL with path joined to baseUrl", async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({ ok: true, request_id: "rt_1" }),
    );
    const client = new MakoClient(
      config,
      {} as never,
      fetchSpy as unknown as typeof fetch,
    );
    await client.call({ method: "GET", path: "/api/pulse/score" });
    const calledUrl = (fetchSpy.mock.calls[0]?.[0] as string) ?? "";
    expect(calledUrl).toBe("https://mako.test/api/pulse/score");
  });

  it("appends query parameters, skipping null/undefined", async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({}));
    const client = new MakoClient(
      config,
      {} as never,
      fetchSpy as unknown as typeof fetch,
    );
    await client.call({
      method: "GET",
      path: "/api/x",
      query: { a: "1", b: undefined, c: null, d: 42 },
    });
    const url = new URL((fetchSpy.mock.calls[0]?.[0] as string) ?? "");
    expect(url.searchParams.get("a")).toBe("1");
    expect(url.searchParams.has("b")).toBe(false);
    expect(url.searchParams.has("c")).toBe(false);
    expect(url.searchParams.get("d")).toBe("42");
  });

  it("serializes JSON body and sets content-type header", async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({ ok: true }));
    const client = new MakoClient(
      config,
      {} as never,
      fetchSpy as unknown as typeof fetch,
    );
    await client.call({
      method: "POST",
      path: "/api/route",
      body: { task: "search" },
    });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"task":"search"}');
    expect((init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
  });

  it("extracts request_id from response body", async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({ verdict: "callable", request_id: "rt_42" }),
    );
    const client = new MakoClient(
      config,
      {} as never,
      fetchSpy as unknown as typeof fetch,
    );
    const result = await client.call({ method: "POST", path: "/api/route", body: {} });
    expect(result.payment.request_id).toBe("rt_42");
  });

  it("decodes x-payment-response header into tx_hash + payer", async () => {
    const paymentHeader = Buffer.from(
      JSON.stringify({
        transaction: "0xdeadbeef",
        network: "base",
        payer: "0xaaaa",
      }),
    ).toString("base64");
    const fetchSpy = vi.fn(async () =>
      jsonResponse({}, { "x-payment-response": paymentHeader }),
    );
    const client = new MakoClient(
      config,
      {} as never,
      fetchSpy as unknown as typeof fetch,
    );
    const result = await client.call({ method: "GET", path: "/api/pulse/score" });
    expect(result.payment.tx_hash).toBe("0xdeadbeef");
    expect(result.payment.network).toBe("base");
    expect(result.payment.payer).toBe("0xaaaa");
  });

  it("throws on non-OK responses", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response("internal error", { status: 500, statusText: "Server Error" }),
    );
    const client = new MakoClient(
      config,
      {} as never,
      fetchSpy as unknown as typeof fetch,
    );
    await expect(
      client.call({ method: "GET", path: "/api/pulse/score" }),
    ).rejects.toThrow(/500.*Server Error/);
  });
});
