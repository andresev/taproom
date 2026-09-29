import Fastify from "fastify";
import type { Env } from "./env.js";
import { healthRoutes } from "./routes/health.js";
import { heliusWebhookRoutes } from "./routes/helius-webhook.js";

export function buildApp(env: Env) {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // Structured JSON in prod; human-readable locally.
      ...(env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {}),
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
    disableRequestLogging: env.NODE_ENV === "test",
  });

  app.register(healthRoutes);
  app.register(heliusWebhookRoutes({ secret: env.HELIUS_WEBHOOK_SECRET }));

  return app;
}
