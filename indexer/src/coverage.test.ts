import { DEPLOYMENT_BLOCKS } from "@repo/shared";
import { describe, expect, it } from "vitest";

import { buildCoverage } from "./coverage";

const factory = (coverage: ReturnType<typeof buildCoverage>, name: string) =>
  coverage.factories.find((item) => item.name === name);

describe("buildCoverage", () => {
  it("reports nothing as complete when the indexer started at the chain head", () => {
    const coverage = buildCoverage(undefined);
    expect(coverage.complete).toBe(false);
    for (const item of coverage.factories) {
      expect(item.fromBlock).toBeNull();
      expect(item.complete).toBe(false);
    }
  });

  it("reports a start after deployment as partial history", () => {
    const coverage = buildCoverage(125_035_000);
    expect(factory(coverage, "standard")).toMatchObject({ indexed: true, fromBlock: 125_035_000, complete: false });
    expect(coverage.complete).toBe(false);
  });

  it("reports indexed factories as complete from the standard factory's deployment block", () => {
    const coverage = buildCoverage(DEPLOYMENT_BLOCKS.brewFactory);
    expect(factory(coverage, "standard")).toMatchObject({
      fromBlock: DEPLOYMENT_BLOCKS.brewFactory,
      complete: true,
    });
    // Later factories are indexed from their own deployment block, not before it.
    expect(factory(coverage, "multiPairV1")).toMatchObject({
      fromBlock: DEPLOYMENT_BLOCKS.brewMultiPairFactory,
      complete: true,
    });
    expect(factory(coverage, "multiPairV2")).toMatchObject({
      fromBlock: DEPLOYMENT_BLOCKS.brewMultiPairFactoryV2,
      complete: true,
    });
  });

  it("is not complete overall while a factory is not indexed", () => {
    const coverage = buildCoverage(DEPLOYMENT_BLOCKS.brewFactory);
    expect(factory(coverage, "dividend")).toMatchObject({ indexed: false, fromBlock: null, complete: false });
    expect(coverage.complete).toBe(false);
  });

  it("is partial for a factory deployed before the configured start", () => {
    const coverage = buildCoverage(DEPLOYMENT_BLOCKS.brewMultiPairFactoryV2);
    expect(factory(coverage, "standard")?.complete).toBe(false);
    expect(factory(coverage, "multiPairV2")?.complete).toBe(true);
  });
});
