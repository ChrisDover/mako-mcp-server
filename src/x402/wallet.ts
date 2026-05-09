import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { x402Client } from "@x402/fetch";
import { createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import type { Config } from "../config.js";

function chainFor(network: string) {
  switch (network) {
    case "base":
    case "eip155:8453":
      return base;
    case "base-sepolia":
    case "eip155:84532":
      return baseSepolia;
    default:
      throw new Error(
        `Unsupported MAKO_NETWORK: ${network}. Supported: base, base-sepolia.`,
      );
  }
}

function networkId(network: string): `${string}:${string}` {
  switch (network) {
    case "base":
    case "eip155:8453":
      return "eip155:8453";
    case "base-sepolia":
    case "eip155:84532":
      return "eip155:84532";
    default:
      throw new Error(
        `Unsupported MAKO_NETWORK: ${network}. Supported: base, base-sepolia.`,
      );
  }
}

export interface BuiltClient {
  client: x402Client;
  buyerAddress: string;
}

export function buildX402Client(config: Config): BuiltClient {
  const account = privateKeyToAccount(config.privateKey as Hex);
  const chain = chainFor(config.network);
  const publicClient = createPublicClient({ chain, transport: http() });
  const signer = toClientEvmSigner(account, publicClient);

  const client = new x402Client().register(
    networkId(config.network),
    new ExactEvmScheme(signer),
  );

  client.registerPolicy((_version, requirements) => {
    const allowed = requirements.filter(
      (r) => BigInt(r.amount) <= config.maxPaymentBaseUnits,
    );
    if (allowed.length === 0 && requirements.length > 0) {
      const max = requirements
        .map((r) => BigInt(r.amount))
        .reduce((a, b) => (a > b ? a : b), 0n);
      throw new Error(
        `MAKO requested ${max} base units (USDC*1e6), exceeds MAKO_MAX_PAYMENT_USDC cap of ${config.maxPaymentBaseUnits}. Raise the cap or skip this call.`,
      );
    }
    return allowed;
  });

  return { client, buyerAddress: account.address };
}

export function buyerAddress(config: Config): string {
  return privateKeyToAccount(config.privateKey as Hex).address;
}
