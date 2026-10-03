import { describe, expect, it } from "vitest";

import { buildPosition, buildTraderRecord, type PositionFacts, type PositionLeg } from "./record.js";

const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const BREW = "0xfa6d9b504848606eb9aec04ccc161d169b3f2159";
const CAKE = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82";
const MIXUX = "0x8fa39ff32b316e2296630aa05bdd6a4a2e4b7598";

const leg = (pairToken: `0x${string}`, pairSymbol: string, fields: Partial<PositionLeg>): PositionLeg => ({
  pairToken,
  pairSymbol,
  pairDecimals: 18,
  buys: 0,
  sells: 0,
  tokensBought: 0n,
  tokensSold: 0n,
  paid: 0n,
  received: 0n,
  ...fields,
});

// Real positions, as the indexer's POST /record returned them on 2026-10-02.

// Wallet 0x71cd9e116c36bb7133f731b0bc185413805cc852: one open, one gain, one loss.
const bka: PositionFacts = {
  token: "0x806126b2b2b6815b2ae2b753a33d8eb0e30963b2",
  symbol: "BKA",
  name: "BREW KNOW ALPHA",
  decimals: 18,
  legs: [leg(BREW, "BREW", { buys: 1, tokensBought: 74469625729390315039559n, paid: 46000000000000000000n })],
  firstTradeAt: 1790857797,
  lastTradeAt: 1790857797,
  balance: 74469625729390315039559n,
};
const bstocks: PositionFacts = {
  token: "0x1ed947149d29905d3b51460a149e20bcab8d8361",
  symbol: "bstocks",
  name: "binancestocks",
  decimals: 18,
  legs: [
    leg(WBNB, "WBNB", {
      buys: 1,
      sells: 1,
      tokensBought: 62821424164992187241664n,
      tokensSold: 62821424164992187241664n,
      paid: 500000000000000n,
      received: 491623595429202n,
    }),
  ],
  firstTradeAt: 1790857550,
  lastTradeAt: 1790857697,
  balance: 0n,
};
const xuewang: PositionFacts = {
  token: "0xbe215dad3a44e7cac0bd40d6f3d86093a2d8e900",
  symbol: "雪王币",
  name: "雪王币",
  decimals: 18,
  legs: [
    leg(MIXUX, "MIXUx", {
      buys: 1,
      sells: 1,
      tokensBought: 76145374782751286248770n,
      tokensSold: 76145374782751286248770n,
      paid: 14000000000000000n,
      received: 14056213743856882n,
    }),
  ],
  firstTradeAt: 1790831412,
  lastTradeAt: 1790832063,
  balance: 0n,
};

// Wallet 0xcf12d1d44a5a3273487b2df796e79da1397fc51e: MSTOCK bought for WBNB and sold for Cake.
const mstock: PositionFacts = {
  token: "0xc3d89f45d7f571471b682ad31b27c5d3fb44ddba",
  symbol: "MSTOCK",
  name: "Mystery Stock",
  decimals: 18,
  legs: [
    leg(CAKE, "Cake", { sells: 1, tokensSold: 35118624798636441632734635n, received: 78088392950620333982n }),
    leg(WBNB, "WBNB", { buys: 1, tokensBought: 35118624798636441632734635n, paid: 297000000000000000n }),
  ],
  firstTradeAt: 1790875784,
  lastTradeAt: 1790877322,
  balance: 0n,
};
const rsun: PositionFacts = {
  token: "0xa908182208fd07b4d790faef7bbdab26afa2fa2f",
  symbol: "RSUN",
  name: "RISING SUN",
  decimals: 18,
  legs: [
    leg(WBNB, "WBNB", {
      buys: 1,
      sells: 1,
      tokensBought: 26152473213130460490332607n,
      tokensSold: 26152473213130460490332607n,
      paid: 297000000000000000n,
      received: 220292056070589769n,
    }),
  ],
  firstTradeAt: 1790874384,
  lastTradeAt: 1790875054,
  balance: 0n,
};
const effortless: PositionFacts = {
  token: "0xf5b8c162ead83e25b6773a5ad85fba89aef39fc4",
  symbol: "EFFORTLESS",
  name: "Effortless Token",
  decimals: 18,
  legs: [
    leg(WBNB, "WBNB", {
      buys: 2,
      sells: 1,
      tokensBought: 29174774429652499379292554n,
      tokensSold: 29174774429652499379292554n,
      paid: 445500000000000000n,
      received: 453686598635669231n,
    }),
  ],
  firstTradeAt: 1790867654,
  lastTradeAt: 1790869130,
  balance: 0n,
};

describe("buildPosition", () => {
  it("leaves a position open while less has been sold than bought, with no result", () => {
    expect(buildPosition(bka)).toMatchObject({ status: "open", result: null, transfers: "none" });
  });

  it("closes a position sold in full and states the loss", () => {
    expect(buildPosition(bstocks)).toMatchObject({
      status: "closed",
      transfers: "none",
      result: {
        pairSymbol: "WBNB",
        paid: 500000000000000n,
        received: 491623595429202n,
        net: -8376404570798n,
        multipleHundredths: 98,
        outcome: "loss",
      },
    });
  });

  it("states a gain in the pair asset it was made in, truncating the multiple", () => {
    expect(buildPosition(xuewang).result).toMatchObject({
      pairSymbol: "MIXUx",
      net: 56213743856882n,
      multipleHundredths: 100,
      outcome: "win",
    });
    expect(buildPosition(effortless).result).toMatchObject({ net: 8186598635669231n, multipleHundredths: 101 });
  });

  it("gives no result for a position bought in one pair asset and sold in another", () => {
    const position = buildPosition(mstock);
    expect(position).toMatchObject({ status: "closed", mixedPairs: true, result: null });
    expect(position.tokensBought).toBe(position.tokensSold);
  });

  it("treats a sale with no indexed buy as exit-only, with no result", () => {
    const position = buildPosition({ ...rsun, legs: [leg(WBNB, "WBNB", { sells: 1, tokensSold: 5n, received: 9n })] });
    expect(position).toMatchObject({ status: "exit-only", result: null });
  });

  it("reports an even result when received equals paid", () => {
    const even = buildPosition({
      ...rsun,
      legs: [leg(WBNB, "WBNB", { buys: 1, sells: 1, tokensBought: 5n, tokensSold: 5n, paid: 7n, received: 7n })],
    });
    expect(even.result).toMatchObject({ net: 0n, outcome: "even", multipleHundredths: 100 });
  });

  it("flags a balance that the trades do not explain", () => {
    expect(buildPosition({ ...bka, balance: bka.legs[0]!.tokensBought + 1n }).transfers).toBe("in");
    expect(buildPosition({ ...bka, balance: 0n }).transfers).toBe("out");
    expect(buildPosition({ ...bstocks, balance: 10n }).transfers).toBe("in");
    expect(buildPosition({ ...bka, balance: null }).transfers).toBe("unknown");
  });
});

describe("buildTraderRecord", () => {
  it("counts the gain, the loss and the open position, newest trade first", () => {
    const record = buildTraderRecord([xuewang, bka, bstocks]);
    expect(record.positions.map((position) => position.facts.symbol)).toEqual(["BKA", "bstocks", "雪王币"]);
    expect(record).toMatchObject({ open: 1, closed: 2, exitOnly: 0, wins: 1, losses: 1, even: 0, closedWithoutResult: 0 });
  });

  it("keeps a total per pair asset and never adds them together", () => {
    const record = buildTraderRecord([xuewang, bka, bstocks]);
    expect(record.totals).toEqual([
      {
        pairToken: MIXUX,
        pairSymbol: "MIXUx",
        pairDecimals: 18,
        positions: 1,
        paid: 14000000000000000n,
        received: 14056213743856882n,
        net: 56213743856882n,
      },
      {
        pairToken: WBNB,
        pairSymbol: "WBNB",
        pairDecimals: 18,
        positions: 1,
        paid: 500000000000000n,
        received: 491623595429202n,
        net: -8376404570798n,
      },
    ]);
  });

  it("adds closed positions in the same pair asset, losses included", () => {
    const record = buildTraderRecord([mstock, rsun, effortless]);
    expect(record).toMatchObject({ closed: 3, wins: 1, losses: 1, closedWithoutResult: 1 });
    expect(record.totals).toEqual([
      {
        pairToken: WBNB,
        pairSymbol: "WBNB",
        pairDecimals: 18,
        positions: 2,
        paid: 742500000000000000n,
        received: 673978654706259000n,
        net: -68521345293741000n,
      },
    ]);
  });

  it("is empty for a wallet with no indexed trades", () => {
    expect(buildTraderRecord([])).toMatchObject({ positions: [], open: 0, closed: 0, totals: [] });
  });
});
