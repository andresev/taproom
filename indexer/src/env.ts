import { z } from "zod";

/**
 * All config comes from env and is validated once at boot.
 * RPC provider keys live here, server-side only — never in an EXPO_PUBLIC_* var.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env) {
  const schema = z.object({
    /** BSC JSON-RPC endpoint (may embed a provider key). */
    BSC_RPC_URL: z.url(),
    /** Postgres connection string. Unset in development falls back to Ponder's embedded PGlite. */
    DATABASE_URL: z.url().optional(),
    /**
     * First block to index. Unset starts from the chain head, so nothing older is
     * indexed; set it to the standard factory's deployment block
     * (DEPLOYMENT_BLOCKS in @repo/shared) for the full history.
     */
    START_BLOCK: z.coerce.number().int().positive().optional(),
  });

  // `KEY=` in a .env file means "not set", not "set to empty string".
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ""));
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    // Print field names only — never echo secret values.
    const fields = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${fields}`);
  }
  return parsed.data;
}

export type Env = ReturnType<typeof loadEnv>;
