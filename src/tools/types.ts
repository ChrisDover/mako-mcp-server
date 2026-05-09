import type { z } from "zod";
import type { MakoClient } from "../x402/client.js";
import type { Config } from "../config.js";

export interface ToolContext {
  client: MakoClient;
  config: Config;
  buyerWallet: string;
}

export interface ToolDefinition<
  S extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  zodSchema: S;
  handler: (input: z.infer<S>, ctx: ToolContext) => Promise<unknown>;
}
