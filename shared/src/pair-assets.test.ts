import { describe, expect, it } from "vitest";

import { ADDRESSES } from "./addresses.js";
import { KNOWN_PAIR_ASSETS, knownPairAsset } from "./pair-assets.js";

describe("KNOWN_PAIR_ASSETS", () => {
  it("holds lowercase addresses, each once", () => {
    for (const asset of KNOWN_PAIR_ASSETS) expect(asset.address, asset.symbol).toMatch(/^0x[0-9a-f]{40}$/);
    expect(new Set(KNOWN_PAIR_ASSETS.map((asset) => asset.address)).size).toBe(KNOWN_PAIR_ASSETS.length);
  });

  it("agrees with the address book on WBNB and $BREW", () => {
    expect(knownPairAsset(ADDRESSES.wbnb)).toMatchObject({ symbol: "WBNB", kind: "major" });
    expect(knownPairAsset(ADDRESSES.brewToken)).toMatchObject({ symbol: "BREW", kind: "brew" });
  });

  it("finds a tokenized stock regardless of address casing", () => {
    expect(knownPairAsset("0x80106cb3EAD06659A5ad19DF39D9b4733863B9b0")).toMatchObject({
      symbol: "MSFTB",
      kind: "tokenized-stock",
    });
  });

  it("returns null for a token not in Brew's list", () => {
    expect(knownPairAsset("0x8fa39ff32b316e2296630aa05bdd6a4a2e4b7598")).toBeNull();
  });
});
