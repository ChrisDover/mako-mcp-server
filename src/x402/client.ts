import {
  wrapFetchWithPayment,
  decodePaymentResponseHeader,
  type x402Client,
} from "@x402/fetch";
import type { Config } from "../config.js";

export interface PaymentMetadata {
  amount_usdc: string | null;
  tx_hash: string | null;
  network: string | null;
  payer: string | null;
  request_id: string | null;
}

export interface PaidCallResult<T = unknown> {
  data: T;
  payment: PaymentMetadata;
}

export interface PaidCallOptions {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | undefined | null | string[]>;
  body?: unknown;
}

export class MakoClient {
  private readonly fetchWithPay: (
    input: Parameters<typeof fetch>[0],
    init?: RequestInit,
  ) => Promise<Response>;

  constructor(
    private readonly config: Config,
    x402: x402Client,
    fetchImpl: typeof fetch = globalThis.fetch,
  ) {
    this.fetchWithPay = wrapFetchWithPayment(fetchImpl, x402);
  }

  async call<T = unknown>(opts: PaidCallOptions): Promise<PaidCallResult<T>> {
    const url = this.buildUrl(opts.path, opts.query);
    const init: RequestInit = {
      method: opts.method,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    };
    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
      init.headers = { "content-type": "application/json" };
    }
    const response = await this.fetchWithPay(url, init);
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `MAKO ${opts.method} ${opts.path} failed: ${response.status} ${response.statusText} — ${text.slice(0, 500)}`,
      );
    }
    let data: T;
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      throw new Error(
        `MAKO ${opts.method} ${opts.path} returned non-JSON body: ${text.slice(0, 200)}`,
      );
    }
    return { data, payment: extractPayment(response, data) };
  }

  private buildUrl(
    path: string,
    query?: PaidCallOptions["query"],
  ): string {
    const url = new URL(path, this.config.baseUrl + "/");
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const v of value) url.searchParams.append(key, String(v));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
}

function extractPayment(response: Response, data: unknown): PaymentMetadata {
  const header =
    response.headers.get("payment-response") ||
    response.headers.get("x-payment-response");
  let tx_hash: string | null = null;
  let network: string | null = null;
  let payer: string | null = null;
  if (header) {
    try {
      const decoded = decodePaymentResponseHeader(header) as Record<string, unknown>;
      tx_hash = (decoded?.transaction as string) ?? null;
      network = (decoded?.network as string) ?? null;
      payer = (decoded?.payer as string) ?? null;
    } catch {
      // header was present but unparseable — leave fields null
    }
  }
  const reqIdFromBody =
    typeof data === "object" && data !== null && "request_id" in data
      ? (data as { request_id?: unknown }).request_id
      : undefined;
  const request_id = typeof reqIdFromBody === "string" ? reqIdFromBody : null;
  return { amount_usdc: null, tx_hash, network, payer, request_id };
}
