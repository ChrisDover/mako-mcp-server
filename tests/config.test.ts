import { describe, it, expect } from "vitest";
import { loadConfig, DEFAULT_BASE_URL, DEFAULT_NETWORK } from "../src/config.js";

const VALID_KEY = "0x" + "1".repeat(64);

describe("loadConfig", () => {
  it("throws when X402_BUYER_PRIVATE_KEY is missing", () => {
    expect(() => loadConfig({})).toThrow(/X402_BUYER_PRIVATE_KEY/);
  });

  it("throws when key is not 0x-prefixed 32-byte hex", () => {
    expect(() => loadConfig({ X402_BUYER_PRIVATE_KEY: "not-a-key" })).toThrow(
      /0x-prefixed/,
    );
    expect(() => loadConfig({ X402_BUYER_PRIVATE_KEY: "0xabc" })).toThrow(
      /0x-prefixed/,
    );
  });

  it("returns sensible defaults", () => {
    const cfg = loadConfig({ X402_BUYER_PRIVATE_KEY: VALID_KEY });
    expect(cfg.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(cfg.network).toBe(DEFAULT_NETWORK);
    expect(cfg.timeoutMs).toBe(60_000);
    expect(cfg.maxPaymentBaseUnits).toBe(500_000n);
  });

  it("strips trailing slash from base URL", () => {
    const cfg = loadConfig({
      X402_BUYER_PRIVATE_KEY: VALID_KEY,
      MAKO_BASE_URL: "https://example.com/",
    });
    expect(cfg.baseUrl).toBe("https://example.com");
  });

  it("normalizes eip155:8453 to base", () => {
    const cfg = loadConfig({
      X402_BUYER_PRIVATE_KEY: VALID_KEY,
      MAKO_NETWORK: "eip155:8453",
    });
    expect(cfg.network).toBe("base");
  });

  it("converts MAKO_MAX_PAYMENT_USDC to base units", () => {
    const cfg = loadConfig({
      X402_BUYER_PRIVATE_KEY: VALID_KEY,
      MAKO_MAX_PAYMENT_USDC: "1.50",
    });
    expect(cfg.maxPaymentBaseUnits).toBe(1_500_000n);
  });

  it("rejects bogus MAKO_MAX_PAYMENT_USDC", () => {
    expect(() =>
      loadConfig({
        X402_BUYER_PRIVATE_KEY: VALID_KEY,
        MAKO_MAX_PAYMENT_USDC: "abc",
      }),
    ).toThrow(/positive number/);
  });

  it("rejects bogus MAKO_TIMEOUT_MS", () => {
    expect(() =>
      loadConfig({
        X402_BUYER_PRIVATE_KEY: VALID_KEY,
        MAKO_TIMEOUT_MS: "0",
      }),
    ).toThrow(/positive integer/);
  });
});
