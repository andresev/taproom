import { describe, expect, it } from "vitest";
import { isToken0, tradeFromSwap, tradeId } from "./swap";

// Two real Brew launches by the same wallet, minutes apart (BSC, 2026-10-01).
// Launch A: tx 0xc647d09d80d7669c628d668dec0c8f6e2872907c89d688fd22f9ca2f26f8ea1a
const tokenA = "0x06e248C4a57F89cDA03dB94C04fe2d9b3525b528";
const pairA = "0xb9E1Fd5A02D3A33b25a14d661414E6ED6954a721";
// Launch B, brewed with token A: tx 0xb6dcea0690408fe9299bb09ce6538327d33d245dd6bd6b5bac9b1231d2e60d5a
const tokenB = "0x612242d04F949E7EB0863ad27d24e426d37fEaAC";
const pairB = tokenA;

describe("isToken0", () => {
  it("matches the token order of the real pools", () => {
    // pool 0x7A03…41c4: token0 is the launched token
    expect(isToken0(tokenA, pairA)).toBe(true);
    // pool 0x5720…cBA7: token0 is the pair token
    expect(isToken0(tokenB, pairB)).toBe(false);
  });

  it("ignores address casing", () => {
    expect(isToken0(tokenA.toLowerCase() as `0x${string}`, pairA)).toBe(true);
  });

  it("rejects a token paired with itself", () => {
    expect(() => isToken0(tokenA, tokenA)).toThrow(/itself/);
  });
});

describe("tradeFromSwap", () => {
  it("reads launch A's initial buy: pool pays out token0, takes in token1", () => {
    expect(tradeFromSwap(true, { amount0: -76584927178228361186774n, amount1: 800000000000000000n })).toEqual({
      side: "buy",
      amountBaseUnits: 76584927178228361186774n,
      pairAmountBaseUnits: 800000000000000000n,
    });
  });

  it("reads launch B's initial buy: the token is token1 and the pair is token0", () => {
    expect(
      tradeFromSwap(false, { amount0: 76584927178228361186774n, amount1: -74312311158086064830861n }),
    ).toEqual({
      side: "buy",
      amountBaseUnits: 74312311158086064830861n,
      pairAmountBaseUnits: 76584927178228361186774n,
    });
  });

  it("reads a sell when the pool takes the token in", () => {
    expect(tradeFromSwap(true, { amount0: 500n, amount1: -3n })).toEqual({
      side: "sell",
      amountBaseUnits: 500n,
      pairAmountBaseUnits: 3n,
    });
    expect(tradeFromSwap(false, { amount0: -3n, amount1: 500n })).toEqual({
      side: "sell",
      amountBaseUnits: 500n,
      pairAmountBaseUnits: 3n,
    });
  });

  it("returns null when the swap is neither a buy nor a sell", () => {
    expect(tradeFromSwap(true, { amount0: 0n, amount1: 0n })).toBeNull();
    expect(tradeFromSwap(true, { amount0: 0n, amount1: 5n })).toBeNull();
    expect(tradeFromSwap(true, { amount0: 5n, amount1: 5n })).toBeNull();
    expect(tradeFromSwap(true, { amount0: -5n, amount1: -5n })).toBeNull();
  });
});

describe("tradeId", () => {
  it("is the lowercase transaction hash and the log index", () => {
    expect(tradeId("0xABCDEF", 7)).toBe("0xabcdef-7");
  });
});
