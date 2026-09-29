import { describe, expect, it } from "vitest";
import { baseUnitsFromJSON, baseUnitsToJSON, formatBaseUnits, toBaseUnits } from "./money.js";

describe("toBaseUnits", () => {
  it("parses whole and fractional amounts", () => {
    expect(toBaseUnits("1.5", 9)).toBe(1_500_000_000n);
    expect(toBaseUnits("0.000001", 6)).toBe(1n);
    expect(toBaseUnits("42", 0)).toBe(42n);
    expect(toBaseUnits("-2.25", 2)).toBe(-225n);
  });

  it("is exact where floats are not", () => {
    // 0.1 + 0.2 !== 0.3 in floating point; base units don't care.
    expect(toBaseUnits("0.1", 9) + toBaseUnits("0.2", 9)).toBe(toBaseUnits("0.3", 9));
  });

  it("handles amounts beyond Number.MAX_SAFE_INTEGER", () => {
    expect(toBaseUnits("1000000000000.123456789", 9)).toBe(1_000_000_000_000_123_456_789n);
  });

  it("rejects too much precision and junk input", () => {
    expect(() => toBaseUnits("1.1234567", 6)).toThrow(RangeError);
    expect(() => toBaseUnits("1e5", 6)).toThrow(TypeError);
    expect(() => toBaseUnits("", 6)).toThrow(TypeError);
    expect(() => toBaseUnits("1", -1)).toThrow(RangeError);
  });
});

describe("formatBaseUnits", () => {
  it("round-trips", () => {
    for (const [amt, dec] of [["1.5", 9], ["0.000001", 6], ["42", 0], ["-2.25", 2]] as const) {
      expect(formatBaseUnits(toBaseUnits(amt, dec), dec)).toBe(amt);
    }
  });

  it("pads small values", () => {
    expect(formatBaseUnits(5n, 9)).toBe("0.000000005");
    expect(formatBaseUnits(0n, 6)).toBe("0");
  });
});

describe("JSON helpers", () => {
  it("serializes bigint as a string", () => {
    expect(baseUnitsFromJSON(baseUnitsToJSON(123456789012345678901n))).toBe(123456789012345678901n);
    expect(() => baseUnitsFromJSON("1.5")).toThrow(TypeError);
  });
});
