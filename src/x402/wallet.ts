import { createSigner, type Signer } from "x402-fetch";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Config } from "../config.js";

export async function buildSigner(config: Config): Promise<Signer> {
  return createSigner(config.network, config.privateKey as Hex);
}

export function buyerAddress(config: Config): string {
  return privateKeyToAccount(config.privateKey as Hex).address;
}
