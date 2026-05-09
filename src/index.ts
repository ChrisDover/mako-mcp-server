#!/usr/bin/env node
import { startStdioServer } from "./server.js";

startStdioServer().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`mako-mcp failed to start: ${message}\n`);
  process.exit(1);
});
