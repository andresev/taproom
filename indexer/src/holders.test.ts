import { describe, expect, it } from "vitest";
import { ZERO_ADDRESS, applyTransfer, holderId } from "./holders";

const alice = "0x00000000000000000000000000000000000000A1";
const bob = "0x00000000000000000000000000000000000000b2";

describe("applyTransfer", () => {
  it("mints to a new holder", () => {
    expect(applyTransfer(ZERO_ADDRESS, alice, 100n, 0n, 0n)).toEqual({
      fromBalance: null,
      toBalance: 100n,
      holderDelta: 1,
    });
  });

  it("moves part of a balance to a new holder", () => {
    expect(applyTransfer(alice, bob, 40n, 100n, 0n)).toEqual({ fromBalance: 60n, toBalance: 40n, holderDelta: 1 });
  });

  it("moves a whole balance to an existing holder", () => {
    expect(applyTransfer(alice, bob, 100n, 100n, 5n)).toEqual({ fromBalance: 0n, toBalance: 105n, holderDelta: -1 });
  });

  it("moves a whole balance to a new holder without changing the count", () => {
    expect(applyTransfer(alice, bob, 100n, 100n, 0n)).toEqual({ fromBalance: 0n, toBalance: 100n, holderDelta: 0 });
  });

  it("burns to the zero address", () => {
    expect(applyTransfer(alice, ZERO_ADDRESS, 100n, 100n, 0n)).toEqual({
      fromBalance: 0n,
      toBalance: null,
      holderDelta: -1,
    });
  });

  it("changes nothing for a transfer to self or of zero", () => {
    expect(applyTransfer(alice, alice.toLowerCase() as `0x${string}`, 50n, 100n, 100n)).toEqual({
      fromBalance: 100n,
      toBalance: 100n,
      holderDelta: 0,
    });
    expect(applyTransfer(alice, bob, 0n, 100n, 0n)).toEqual({ fromBalance: 100n, toBalance: 0n, holderDelta: 0 });
  });

  it("clamps at zero when earlier transfers were missed", () => {
    expect(applyTransfer(alice, bob, 100n, 30n, 0n)).toEqual({ fromBalance: 0n, toBalance: 100n, holderDelta: 0 });
    expect(applyTransfer(alice, bob, 100n, 0n, 0n)).toEqual({ fromBalance: 0n, toBalance: 100n, holderDelta: 1 });
  });
});

describe("holderId", () => {
  it("is the lowercase token and holder", () => {
    expect(holderId("0xABC", alice)).toBe(`0xabc-${alice.toLowerCase()}`);
  });
});
