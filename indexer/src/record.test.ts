import { describe, expect, it } from "vitest";

import { recordRequestSchema, toPositions, type LegRow, type TokenInfo } from "./record";

const wbnb = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const brew = "0xfa6d9b504848606eb9aec04ccc161d169b3f2159";
// Super Inu, a real two-pool multi-pair v1 token (BREW and WBNB), and a standard token.
const si = "0xe9f391838761905282487a14d946e13d8d3043e0";
const other = "0x4d8d8605abfb10c2e85acce0dec0cee24e20a71c";
const unlaunched = "0x000000000000000000000000000000000000beef";

const leg = (overrides: Partial<LegRow>): LegRow => ({
  token: si,
  pairToken: wbnb,
  pairSymbol: "WBNB",
  pairDecimals: 18,
  buys: 1,
  sells: 0,
  tokensBought: "1000",
  tokensSold: "0",
  paid: "10",
  received: "0",
  firstTradeAt: "1790850000",
  lastTradeAt: "1790850000",
  ...overrides,
});

const tokens = new Map<`0x${string}`, TokenInfo>([
  [si, { symbol: "SI", name: "Super Inu", decimals: 18 }],
  [other, { symbol: "OTHER", name: "Other", decimals: 18 }],
]);

describe("toPositions", () => {
  it("puts both pair assets of one token into one position, with its time span and balance", () => {
    const { positions } = toPositions(
      [
        leg({ pairToken: wbnb, firstTradeAt: "1790850100", lastTradeAt: "1790850500" }),
        leg({ pairToken: brew, pairSymbol: "BREW", firstTradeAt: "1790850000", lastTradeAt: "1790850300" }),
      ],
      tokens,
      new Map([[si, "1500"]]),
    );
    expect(positions).toHaveLength(1);
    expect(positions[0]).toMatchObject({
      token: si,
      symbol: "SI",
      firstTradeAt: 1790850000,
      lastTradeAt: 1790850500,
      balance: "1500",
    });
    expect(positions[0]?.legs.map((item) => item.pairToken)).toEqual([wbnb, brew].sort());
  });

  it("orders positions by their newest trade", () => {
    const { positions } = toPositions(
      [leg({ token: si, lastTradeAt: "100" }), leg({ token: other, lastTradeAt: "200" })],
      tokens,
      new Map(),
    );
    expect(positions.map((item) => item.token)).toEqual([other, si]);
  });

  it("gives a null balance when the wallet has no holder row", () => {
    expect(toPositions([leg({})], tokens, new Map()).positions[0]?.balance).toBeNull();
  });

  it("leaves out a token launched outside the indexed history", () => {
    expect(toPositions([leg({ token: unlaunched })], tokens, new Map()).positions).toEqual([]);
  });

  it("cuts the list at the limit and says so", () => {
    const rows = [leg({ token: si, lastTradeAt: "100" }), leg({ token: other, lastTradeAt: "200" })];
    expect(toPositions(rows, tokens, new Map(), 1)).toMatchObject({ truncated: true, positions: [{ token: other }] });
    expect(toPositions(rows, tokens, new Map(), 2).truncated).toBe(false);
  });
});

describe("recordRequestSchema", () => {
  it("lowercases the wallet and rejects anything that is not an address", () => {
    expect(recordRequestSchema.parse({ wallet: "0xE9F391838761905282487A14D946E13D8D3043E0" }).wallet).toBe(si);
    expect(recordRequestSchema.safeParse({ wallet: "0x123" }).success).toBe(false);
  });
});
