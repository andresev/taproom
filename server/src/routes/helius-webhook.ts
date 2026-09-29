import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

/**
 * Helius enhanced-transaction webhook receiver.
 *
 * Current behavior (setup stub): authenticate, validate the envelope, log each
 * signature, ack 200. Parsing swaps + storing trades deduped by signature is the
 * "Ingestion spike" in STATUS.md.
 *
 * Ack fast: Helius retries on non-2xx/timeouts, so heavy work belongs in a queue
 * or worker, not in this handler. Retries mean duplicates are normal — the
 * signature unique constraint is what makes them harmless.
 */

// Only the fields we rely on are checked; everything else passes through.
const heliusTx = z.looseObject({
  signature: z.string().min(32),
  timestamp: z.number().optional(),
  type: z.string().optional(),
});
const heliusPayload = z.array(heliusTx);

function secretMatches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const heliusWebhookRoutes = (opts: { secret: string | undefined }): FastifyPluginAsync =>
  async (app) => {
    app.post("/webhooks/helius", { bodyLimit: 5 * 1024 * 1024 }, async (req, reply) => {
      if (!opts.secret) {
        req.log.error("HELIUS_WEBHOOK_SECRET not set; refusing webhook");
        return reply.code(503).send({ error: "webhook not configured" });
      }
      if (!secretMatches(req.headers.authorization, opts.secret)) {
        req.log.warn("helius webhook: bad auth header");
        return reply.code(401).send({ error: "unauthorized" });
      }

      const parsed = heliusPayload.safeParse(req.body);
      if (!parsed.success) {
        req.log.warn({ issues: parsed.error.issues.slice(0, 5) }, "helius webhook: invalid payload");
        return reply.code(400).send({ error: "invalid payload" });
      }

      for (const tx of parsed.data) {
        req.log.info({ signature: tx.signature, txType: tx.type }, "helius tx received");
      }
      return reply.code(200).send({ received: parsed.data.length });
    });
  };
