import { toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import { roundTripLossBps, safetyRequestSchema, scanBytecode } from "./safety";

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
