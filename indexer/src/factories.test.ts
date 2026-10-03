import { ADDRESSES, DEPLOYMENT_BLOCKS } from "@repo/shared";
import { decodeEventLog, encodeAbiParameters, getAbiItem } from "viem";
import { describe, expect, it } from "vitest";

import { brewMultiPairFactoryAbi, brewMultiPairFactoryV2Abi } from "../abis/brew-factory";
import {
  FACTORIES,
  MAX_PAIRS,
  MULTI_PAIR_V1_POOL_OFFSETS,
  firstIndexedBlock,
  multiPairPoolOffset,
  multiPairPoolOffsets,
} from "./factories";

// The first multi-pair v1 launch (BSC, 2026-09-07), two pairs:
// tx 0x52b080cb4bda9e9ad45259ffb649c1a668dfc2c313efbab2dc30243ee973aafb
const launchTopics = [
  "0x8a0aa86db72b89a6c7da0573f94add1ed245a0f1b498afeaa58b7c3c3c60f763",
  "0x000000000000000000000000d980c0a36475b3aba17482d5ed84339992d6171a",
  "0x000000000000000000000000a0b5405e488e09deb986275c84a38993be392b5f",
] as const;
const launchWords = [
  "000000000000000000000000a0b5405e488e09deb986275c84a38993be392b5f",
  "0000000000000000000000000000000000000000000000000000000000002710",
  "0000000000000000000000000000000000000000033b2e3c9fd0803ce8000000",
  "0000000000000000000000000000000000000000000000000000000000000120",
  "0000000000000000000000000000000000000000000000000000000000000180",
  "00000000000000000000000000000000000000000000000000000000000001e0",
  "0000000000000000000000000000000000000000000000000000000000000240",
  "0000000000000000000000000000000000000000000000000000000000000280",
  "00000000000000000000000000000000000000000000000000000000000002c0",
  "0000000000000000000000000000000000000000000000000000000000000002",
  "00000000000000000000000002fca66c1d1afb4e2a7884261eb00f63598a7436",
  "0000000000000000000000005b1910eaad6450e50f816082aa078c41f10c292f",
  "0000000000000000000000000000000000000000000000000000000000000002",
  "000000000000000000000000f542b8db22405139ed095a49a752d190a08e9a5f",
  "000000000000000000000000aff5f661840d604f90ba6243ac250a481c54a15a",
  "0000000000000000000000000000000000000000000000000000000000000002",
  "00000000000000000000000000000000000000000000000000000000007048d1",
  "00000000000000000000000000000000000000000000000000000000007048d2",
  "0000000000000000000000000000000000000000000000000000000000000005",
  "7465737474000000000000000000000000000000000000000000000000000000",
  "0000000000000000000000000000000000000000000000000000000000000005",
  "7465737474000000000000000000000000000000000000000000000000000000",
  "0000000000000000000000000000000000000000000000000000000000000081",
  "646174613a6170706c69636174696f6e2f6a736f6e3b6261736536342c65794a",
  "32496a6f784c434a706257466e5a534936496d397559326868615734364c7938",
  "314e69387765474a6d4d325a684d54686c4f5445794e4463795a44566d59544e",
  "684e5455314f4463334d6d55324d475a6c5a57497a4e324d305a6a6b6966513d",
  "3d00000000000000000000000000000000000000000000000000000000000000",
];
const launchData = `0x${launchWords.join("")}` as const;

/** The address Ponder reads at a byte offset: the low 20 bytes of that 32-byte word. */
const addressAt = (data: string, offset: number) => `0x${data.slice(2 + offset * 2 + 24, 2 + offset * 2 + 64)}`;

describe("multi-pair v1 launch event", () => {
  const decoded = decodeEventLog({
    abi: brewMultiPairFactoryAbi,
    data: launchData,
    topics: [...launchTopics],
    strict: true,
  });

  it("decodes the real launch", () => {
    expect(decoded.eventName).toBe("TokenLaunchedMultiPair");
    expect(decoded.args.token.toLowerCase()).toBe("0xd980c0a36475b3aba17482d5ed84339992d6171a");
    expect(decoded.args.creator.toLowerCase()).toBe("0xa0b5405e488e09deb986275c84a38993be392b5f");
    expect(decoded.args.symbol).toBe("testt");
    expect(decoded.args.fee).toBe(10000);
    expect(decoded.args.totalSupply).toBe(1_000_000_000n * 10n ** 18n);
    expect(decoded.args.pools.map((pool) => pool.toLowerCase())).toEqual([
      "0xf542b8db22405139ed095a49a752d190a08e9a5f",
      "0xaff5f661840d604f90ba6243ac250a481c54a15a",
    ]);
    expect(decoded.args.quoteTokens).toHaveLength(2);
  });

  it("finds each pool of the real launch at its computed offset", () => {
    const pools = decoded.args.pools;
    pools.forEach((pool, index) => {
      expect(addressAt(launchData, multiPairPoolOffset(pools.length, index))).toBe(pool.toLowerCase());
    });
  });
});

describe("multiPairPoolOffset", () => {
  const inputs = getAbiItem({ abi: brewMultiPairFactoryAbi, name: "TokenLaunchedMultiPair" }).inputs.filter(
    (input) => !("indexed" in input),
  );
  const address = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as const;

  // No real launch with one, three, four or five pairs was found, so those are
  // checked against viem's encoder instead of the chain.
  it.each([1, 2, 3, 4, 5])("matches the ABI encoding of a launch with %i pairs", (pairs) => {
    const quoteTokens = Array.from({ length: pairs }, (_, i) => address(0xa00 + i));
    const pools = Array.from({ length: pairs }, (_, i) => address(0xb00 + i));
    const positionIds = Array.from({ length: pairs }, (_, i) => BigInt(7_000_000 + i));
    const data = encodeAbiParameters(inputs, [
      address(0xfee),
      10000,
      10n ** 27n,
      quoteTokens,
      pools,
      positionIds,
      "A name long enough to spill past one word of the data",
      "SYM",
      "data:application/json;base64,e30=",
    ]);
    pools.forEach((pool, index) => {
      expect(addressAt(data, multiPairPoolOffset(pairs, index))).toBe(pool);
    });
  });
});

describe("multiPairPoolOffsets", () => {
  it("is what the config registers", () => {
    expect(multiPairPoolOffsets(MAX_PAIRS)).toEqual([...MULTI_PAIR_V1_POOL_OFFSETS]);
  });

  it("covers every pool position up to the pair limit", () => {
    const offsets = multiPairPoolOffsets(MAX_PAIRS);
    for (let pairs = 1; pairs <= MAX_PAIRS; pairs++) {
      for (let index = 0; index < pairs; index++) expect(offsets).toContain(multiPairPoolOffset(pairs, index));
    }
  });
});

describe("multi-pair v2 launch events", () => {
  // Second pool of a real three-pool launch (BSC, 2026-10-01):
  // tx 0x836164196a23c381f3719770ecef8b718aebdf253475aa811e78eaa8c915e825
  it("decodes a real PoolAdded", () => {
    const decoded = decodeEventLog({
      abi: brewMultiPairFactoryV2Abi,
      strict: true,
      topics: [
        "0x0996d1171732a2dfb4b36de16a9c7cdd5d3929c0811cb7a378074ffef8d49a74", 
        "0x000000000000000000000000c3d89f45d7f571471b682ad31b27c5d3fb44ddba", 
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ],
      data: "0x00000000000000000000000080106cb3ead06659a5ad19df39d9b4733863b9b00000000000000000000000003d160b5f377e01e7a76614b38d08e538cefcd36700000000000000000000000000000000000000000000000000000000007401ce",
    });
    expect(decoded.eventName).toBe("PoolAdded");
    if (decoded.eventName !== "PoolAdded") return;
    expect(decoded.args.token.toLowerCase()).toBe("0xc3d89f45d7f571471b682ad31b27c5d3fb44ddba");
    expect(decoded.args.index).toBe(1);
    expect(decoded.args.quoteToken.toLowerCase()).toBe("0x80106cb3ead06659a5ad19df39d9b4733863b9b0");
    expect(decoded.args.pool.toLowerCase()).toBe("0x3d160b5f377e01e7a76614b38d08e538cefcd367");
    expect(decoded.args.lockedPositionId).toBe(7602638n);
  });
});

describe("FACTORIES", () => {
  it("lists each factory once, with the address and block recorded in @repo/shared", () => {
    expect(new Set(FACTORIES.map((factory) => factory.address)).size).toBe(FACTORIES.length);
    expect(FACTORIES.find((factory) => factory.name === "standard")).toMatchObject({
      address: ADDRESSES.brewFactory,
      deploymentBlock: DEPLOYMENT_BLOCKS.brewFactory,
      indexed: true,
    });
  });

  it("leaves the dividend factory out until its open question is settled", () => {
    expect(FACTORIES.find((factory) => factory.name === "dividend")?.indexed).toBe(false);
  });
});

describe("firstIndexedBlock", () => {
  it("starts at the chain head when no start block is configured", () => {
    expect(firstIndexedBlock(undefined, 120_201_671)).toBe("latest");
  });

  it("never starts before the factory existed", () => {
    expect(firstIndexedBlock(1, 120_201_671)).toBe(120_201_671);
    expect(firstIndexedBlock(120_201_671, 121_813_753)).toBe(121_813_753);
  });

  it("keeps a later configured start", () => {
    expect(firstIndexedBlock(125_035_000, 120_201_671)).toBe(125_035_000);
  });
});
