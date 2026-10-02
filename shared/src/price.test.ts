import { describe, expect, it } from "vitest";
import { quoteAtSpot, spotPriceE36 } from "./price.js";

const Q96 = 2n ** 96n;

describe("quoteAtSpot", () => {
  it("is one for one when sqrtPriceX96 is 2^96", () => {
    expect(quoteAtSpot(Q96, true, 1000n)).toBe(1000n);
    expect(quoteAtSpot(Q96, false, 1000n)).toBe(1000n);
  });

  it("squares the stored square root, and inverts it when the token is token1", () => {
    // sqrt price 2 means 4 token1 per token0.
    expect(quoteAtSpot(Q96 * 2n, true, 1000n)).toBe(4000n);
    expect(quoteAtSpot(Q96 * 2n, false, 1000n)).toBe(250n);
  });

  it("rounds down", () => {
    expect(quoteAtSpot(Q96 * 2n, false, 3n)).toBe(0n);
  });

  it("rejects a price that cannot come from a pool", () => {
    expect(() => quoteAtSpot(0n, true, 1n)).toThrow(RangeError);
    expect(() => quoteAtSpot(-1n, true, 1n)).toThrow(RangeError);
  });
});

describe("spotPriceE36", () => {
  // RSUN/WBNB pool 0x2bf04ebf…8695 on BSC, slot0 read on 2026-10-02: tick -186440.
  const rsunSqrtPriceX96 = 7089255887273613681284658n;

  it("matches a real pool: about 8.0065e-9 WBNB per RSUN", () => {
    const price = spotPriceE36(rsunSqrtPriceX96, true, 18, 18);
    expect(price).toBe(8006489484138914645347359533n);
  });

  it("values the whole supply at that price: about 8.0065 WBNB for 1bn RSUN", () => {
    const supply = 1_000_000_000n * 10n ** 18n;
    expect(quoteAtSpot(rsunSqrtPriceX96, true, supply)).toBe(8006489484138914645n);
  });

  it("accounts for different decimals on each side", () => {
    // 1 raw token0 per raw token1; token has 18 decimals, pair has 6: one token is 10^12 pair units.
    expect(spotPriceE36(Q96, true, 18, 6)).toBe(10n ** 12n * 10n ** 36n);
    expect(spotPriceE36(Q96, true, 6, 18)).toBe(10n ** 24n);
  });
});
