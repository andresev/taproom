import { z } from "zod";

/**
 * All config comes from env and is validated once at boot.
 * In development, third-party keys are optional so the server runs before
 * accounts exist; in production every key is required.
 */
const optionalInDev = (isProd: boolean) => (isProd ? z.string().min(1) : z.string().min(1).optional());

export function loadEnv(source: NodeJS.ProcessEnv = process.env) {
  const isProd = source.NODE_ENV === "production";
  const key = optionalInDev(isProd);

  const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default("0.0.0.0"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

    SUPABASE_URL: isProd ? z.url() : z.url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: key,

    HELIUS_API_KEY: key,
    /** Shared secret Helius sends in the Authorization header of each webhook call. */
    HELIUS_WEBHOOK_SECRET: key,

    BIRDEYE_API_KEY: key,
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
