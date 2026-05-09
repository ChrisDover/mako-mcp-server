export const DEFAULT_BASE_URL = "https://mako.pollinateresearch.com";
export const DEFAULT_NETWORK = "base";
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_MAX_PAYMENT_BASE_UNITS = 500_000n;

export interface Config {
  baseUrl: string;
  network: string;
  timeoutMs: number;
  maxPaymentBaseUnits: bigint;
  privateKey: string;
}

function normalizeNetwork(raw: string | undefined): string {
  if (!raw) return DEFAULT_NETWORK;
  if (raw === "eip155:8453") return "base";
  if (raw === "eip155:84532") return "base-sepolia";
  return raw;
}

function parseMaxPayment(raw: string | undefined): bigint {
  if (!raw) return DEFAULT_MAX_PAYMENT_BASE_UNITS;
  const usdc = Number(raw);
  if (!Number.isFinite(usdc) || usdc <= 0) {
    throw new Error(
      `MAKO_MAX_PAYMENT_USDC must be a positive number, got: ${raw}`,
    );
  }
  return BigInt(Math.round(usdc * 1_000_000));
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const privateKey = env.X402_BUYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "X402_BUYER_PRIVATE_KEY is required. Use a dedicated low-balance " +
        "buyer wallet on Base mainnet with a small USDC balance.",
    );
  }
  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    throw new Error(
      "X402_BUYER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string.",
    );
  }
  const timeoutRaw = env.MAKO_TIMEOUT_MS;
  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`MAKO_TIMEOUT_MS must be a positive integer, got: ${timeoutRaw}`);
  }
  return {
    baseUrl: (env.MAKO_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    network: normalizeNetwork(env.MAKO_NETWORK),
    timeoutMs,
    maxPaymentBaseUnits: parseMaxPayment(env.MAKO_MAX_PAYMENT_USDC),
    privateKey,
  };
}
