import { describe, expect, it } from "vitest";
import { embeddedWalletFromClaims, syntheticEmail } from "./claims";

const embedded = "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e";
const external = "0x1677F2B196e87020BF4b03f9F938a738Fd3247D9";
const email = { type: "email", address: "someone@example.com" };
const embeddedWallet = { type: "wallet", address: embedded, chain_type: "ethereum", wallet_client_type: "privy" };
const externalWallet = { type: "wallet", address: external, chain_type: "ethereum", wallet_client_type: "metamask" };

describe("embeddedWalletFromClaims", () => {
  it("reads the embedded wallet from a stringified claim, lowercased", () => {
    expect(embeddedWalletFromClaims(JSON.stringify([email, embeddedWallet]))).toEqual({
      ok: true,
      address: embedded.toLowerCase(),
    });
  });

  it("accepts an already-parsed array", () => {
    expect(embeddedWalletFromClaims([email, embeddedWallet])).toMatchObject({ ok: true });
  });

  it("prefers the embedded wallet over a linked external one, whatever the order or hint", () => {
    const claim = JSON.stringify([externalWallet, embeddedWallet]);
    expect(embeddedWalletFromClaims(claim, external)).toEqual({ ok: true, address: embedded.toLowerCase() });
  });

  it("uses the hint only to choose among wallets the token lists", () => {
    const unmarked = { type: "wallet", address: embedded };
    expect(embeddedWalletFromClaims([unmarked], embedded.toLowerCase())).toEqual({
      ok: true,
      address: embedded.toLowerCase(),
    });
    expect(embeddedWalletFromClaims([unmarked], external)).toMatchObject({ ok: false });
    expect(embeddedWalletFromClaims([unmarked])).toMatchObject({ ok: false });
  });

  it("never accepts an address that is only in the hint", () => {
    expect(embeddedWalletFromClaims([email], embedded)).toEqual({
      ok: false,
      reason: "The identity token lists no EVM wallet.",
    });
  });

  it("ignores non-EVM and malformed wallets", () => {
    const solana = { type: "wallet", address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", chain_type: "solana", wallet_client_type: "privy" };
    const short = { type: "wallet", address: "0x1234", wallet_client_type: "privy" };
    expect(embeddedWalletFromClaims([solana, short])).toMatchObject({ ok: false });
  });

  it("rejects a claim it cannot read", () => {
    for (const bad of [undefined, null, 42, "not json", "{}", JSON.stringify({ type: "wallet" })]) {
      expect(embeddedWalletFromClaims(bad)).toMatchObject({ ok: false });
    }
  });
});

describe("syntheticEmail", () => {
  it("derives an undeliverable address from the Privy DID", () => {
    expect(syntheticEmail("did:privy:cmAbC123")).toBe("cmabc123@privy-user.invalid");
  });

  it("rejects anything that is not a Privy DID", () => {
    for (const bad of [undefined, "", "cmabc123", "did:privy:", "did:privy:a b", "did:privy:a@evil.com", "did:other:abc"]) {
      expect(syntheticEmail(bad)).toBeNull();
    }
  });
});
