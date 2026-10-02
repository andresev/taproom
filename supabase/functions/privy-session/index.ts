// Exchanges a Privy sign-in for a Supabase session.
//
// The app signs users in with Privy, which also creates their embedded wallet.
// Supabase still owns profiles, follows and row-level security, so this function
// turns a verified Privy identity token into a Supabase user, a `profiles` row
// keyed to the embedded wallet, and a one-time token the app trades for a session.
//
// The wallet address is read only from the token Privy signed. Nothing the app
// sends decides which wallet a profile belongs to.

import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

import { embeddedWalletFromClaims, syntheticEmail } from "./claims.ts";

const appId = Deno.env.get("PRIVY_APP_ID");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Privy's public signing keys for this app. Verifying a token needs no secret.
const jwks = appId ? createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`)) : null;

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = "23505";

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Structured log line. Never pass a token, key or email here. */
function log(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ service: "privy-session", event, ...fields }));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  if (!jwks || !appId || !supabaseUrl || !serviceRoleKey) {
    log("misconfigured", { hasAppId: Boolean(appId), hasUrl: Boolean(supabaseUrl), hasKey: Boolean(serviceRoleKey) });
    return json(500, { error: "The sign-in service is not configured." });
  }

  const body = await req.json().catch(() => null);
  const identityToken = typeof body?.identityToken === "string" ? body.identityToken : null;
  const walletHint = typeof body?.walletAddress === "string" ? body.walletAddress : undefined;
  if (!identityToken) return json(400, { error: "Missing identityToken." });

  let claims;
  try {
    ({ payload: claims } = await jwtVerify(identityToken, jwks, { issuer: "privy.io", audience: appId }));
  } catch (error) {
    log("token_rejected", { reason: error instanceof Error ? error.name : "unknown" });
    return json(401, { error: "The Privy sign-in could not be verified." });
  }

  const email = syntheticEmail(claims.sub);
  if (!email) return json(401, { error: "The Privy sign-in has no valid user id." });

  const wallet = embeddedWalletFromClaims(claims.linked_accounts, walletHint);
  if (!wallet.ok) {
    log("no_wallet", { reason: wallet.reason });
    return json(422, { error: wallet.reason });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // app_metadata is set here, by the server; a signed-in user cannot edit it.
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { privy_did: claims.sub, wallet_address: wallet.address },
  });
  if (created.error && created.error.code !== "email_exists") {
    log("create_user_failed", { code: created.error.code ?? null });
    return json(500, { error: "Could not create the account." });
  }

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data.user || !link.data.properties?.hashed_token) {
    log("generate_link_failed", { code: link.error?.code ?? null });
    return json(500, { error: "Could not start the session." });
  }

  const profile = await admin
    .from("profiles")
    .upsert({ id: link.data.user.id, wallet_address: wallet.address }, { onConflict: "id", ignoreDuplicates: true });
  if (profile.error) {
    log("profile_failed", { code: profile.error.code ?? null });
    return profile.error.code === UNIQUE_VIOLATION
      ? json(409, { error: "This wallet already belongs to another profile." })
      : json(500, { error: "Could not create the profile." });
  }

  log("session_issued", { newUser: !created.error });
  return json(200, { tokenHash: link.data.properties.hashed_token, walletAddress: wallet.address });
});
