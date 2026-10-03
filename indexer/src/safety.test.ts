import { toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import { FACTORIES } from "./factories";
import { RSUN_CODE, SUPER_INU_CODE } from "./fixtures/token-code";
import {
  lastToFirstPriceBps,
  matchesTemplate,
  roundTripLossBps,
  safetyRequestSchema,
  scanBytecode,
  shareBps,
  topTenShareBps,
} from "./safety";

const push4 = (signature: string) => `63${toFunctionSelector(signature).slice(2)}`;

describe("scanBytecode", () => {
  it("finds nothing in a plain token", () => {
    const code = `0x6080${push4("transfer(address,uint256)")}14${push4("approve(address,uint256)")}14` as const;
    expect(scanBytecode(code)).toEqual({ ownerFunctions: [], riskyFunctions: [] });
  });

  it("reports owner and risky functions separately", () => {
    const code = `0x6080${push4("owner()")}14${push4("mint(address,uint256)")}14${push4("setTaxes(uint256,uint256)")}14` as const;
    expect(scanBytecode(code)).toEqual({
      ownerFunctions: ["owner()"],
      riskyFunctions: ["mint(address,uint256)", "setTaxes(uint256,uint256)"],
    });
  });

  it("ignores a selector that is not a PUSH4 operand", () => {
    const bare = toFunctionSelector("mint(address,uint256)").slice(2);
    expect(scanBytecode(`0x6080ff${bare}00`).riskyFunctions).toEqual([]);
  });

  it("ignores letter case in the bytecode", () => {
    const code = `0x${push4("blacklist(address)").toUpperCase()}` as `0x${string}`;
    expect(scanBytecode(code).riskyFunctions).toEqual(["blacklist(address)"]);
  });

  it("finds nothing in an empty account", () => {
    expect(scanBytecode("0x")).toEqual({ ownerFunctions: [], riskyFunctions: [] });
  });
});

describe("roundTripLossBps", () => {
  it("matches a real simulation: two 1% pool fees", () => {
    // 0.0005 BNB in, 490050307363441 wei back (BSC, 2026-10-02).
    expect(roundTripLossBps(500_000_000_000_000n, 490_050_307_363_441n)).toBe(198);
  });

  it("is zero when nothing was lost and never negative", () => {
    expect(roundTripLossBps(100n, 100n)).toBe(0);
    expect(roundTripLossBps(100n, 150n)).toBe(0);
  });

  it("is 100% when nothing comes back", () => {
    expect(roundTripLossBps(100n, 0n)).toBe(10_000);
  });

  it("rejects a non-positive input", () => {
    expect(() => roundTripLossBps(0n, 0n)).toThrow(RangeError);
  });
});

describe("safetyRequestSchema", () => {
  it("lowercases the token address", () => {
    const token = "0xA908182208Fd07B4D790fAEf7BbdAb26AFA2FA2F";
    expect(safetyRequestSchema.parse({ token })).toEqual({ token: token.toLowerCase() });
  });

  it("rejects anything that is not an address", () => {
    for (const bad of [{}, { token: "RSUN" }, { token: "0x1234" }, { token: 5 }]) {
      expect(safetyRequestSchema.safeParse(bad).success).toBe(false);
    }
  });
});

const template = (name: string) => {
  const found = FACTORIES.find((factory) => factory.name === name)?.template;
  if (!found) throw new Error(`no template for ${name}`);
  return found;
};

/** Changes one byte of `code` at `offset`. */
const tamper = (code: `0x${string}`, offset: number) => {
  const at = 2 + offset * 2;
  const byte = code.slice(at, at + 2) === "00" ? "01" : "00";
  return `${code.slice(0, at)}${byte}${code.slice(at + 2)}` as `0x${string}`;
};

describe("matchesTemplate", () => {
  it("matches real tokens to their own factory's template", () => {
    expect(matchesTemplate(RSUN_CODE, template("standard"))).toBe(true);
    expect(matchesTemplate(SUPER_INU_CODE, template("multiPairV1"))).toBe(true);
  });

  it("does not match a token to another factory's template", () => {
    expect(matchesTemplate(RSUN_CODE, template("multiPairV1"))).toBe(false);
    expect(matchesTemplate(SUPER_INU_CODE, template("standard"))).toBe(false);
    expect(matchesTemplate(SUPER_INU_CODE, template("multiPairV2"))).toBe(false);
  });

  it("ignores the deployer's address and nothing else", () => {
    const standard = template("standard");
    expect(matchesTemplate(tamper(RSUN_CODE, standard.deployerOffset + 5), standard)).toBe(true);
    expect(matchesTemplate(tamper(RSUN_CODE, standard.deployerOffset - 1), standard)).toBe(false);
    expect(matchesTemplate(tamper(RSUN_CODE, standard.deployerOffset + 20), standard)).toBe(false);
    expect(matchesTemplate(tamper(RSUN_CODE, 0), standard)).toBe(false);
  });

  it("finds RSUN's deployer where the template says it is", () => {
    const { deployerOffset } = template("standard");
    expect(RSUN_CODE.slice(2 + deployerOffset * 2, 2 + (deployerOffset + 20) * 2)).toBe(
      "77de6a0ed0ad7479e2e7de553cfe9452438cd8b5",
    );
  });

  it("rejects code of the wrong length", () => {
    expect(matchesTemplate(`${RSUN_CODE}00`, template("standard"))).toBe(false);
  });
});

describe("lastToFirstPriceBps", () => {
  const q96 = 2n ** 96n;

  it("is 10,000 when the price has not moved", () => {
    expect(lastToFirstPriceBps(q96, q96, true)).toBe(10_000);
  });

  it("reads a fall for a token that is token0: the pool price is the token's own price", () => {
    // sqrt price halves, so the price is a quarter of what it was.
    expect(lastToFirstPriceBps(q96, q96 / 2n, true)).toBe(2_500);
  });

  it("inverts for a token that is token1", () => {
    // The pool price doubling in sqrt terms means the token is worth a quarter.
    expect(lastToFirstPriceBps(q96, q96 * 2n, false)).toBe(2_500);
    expect(lastToFirstPriceBps(q96, q96 / 2n, false)).toBe(40_000);
  });

  it("caps a very large rise", () => {
    expect(lastToFirstPriceBps(1n, q96, true)).toBe(1_000_000_000);
  });

  it("refuses a missing price", () => {
    expect(() => lastToFirstPriceBps(0n, q96, true)).toThrow(RangeError);
  });
});

describe("shareBps", () => {
  it("is part over whole in basis points, truncated", () => {
    expect(shareBps(1n, 3n)).toBe(3_333);
    expect(shareBps(5n, 5n)).toBe(10_000);
  });

  it("is null when there is nothing to divide by", () => {
    expect(shareBps(5n, 0n)).toBeNull();
  });
});

describe("topTenShareBps", () => {
  it("adds the ten largest balances as a share of supply", () => {
    const balances = [50n, 40n, 30n, 20n, 10n, 9n, 8n, 7n, 6n, 5n, 4n, 3n];
    // The two smallest, 4 and 3, are left out: 185 of 1,000.
    expect(topTenShareBps(balances, 1000n)).toBe(1850);
  });

  it("does not depend on the order given", () => {
    expect(topTenShareBps([1n, 300n, 2n], 1000n)).toBe(3030);
  });

  it("is zero with no holders and null with no supply", () => {
    expect(topTenShareBps([], 1000n)).toBe(0);
    expect(topTenShareBps([5n], 0n)).toBeNull();
  });
});
