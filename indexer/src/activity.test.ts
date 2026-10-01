import { describe, expect, it } from "vitest";
import { activityRequestSchema } from "./activity";

const wallet = "0x1677F2B196e87020BF4b03f9F938a738Fd3247D9";

describe("activityRequestSchema", () => {
  it("accepts a request without wallets", () => {
    expect(activityRequestSchema.parse({ since: 1790000000, sort: "trending" })).toEqual({
      since: 1790000000,
      sort: "trending",
    });
  });

  it("lowercases wallet addresses so they match stored ones", () => {
    const parsed = activityRequestSchema.parse({ since: 0, sort: "latest", wallets: [wallet] });
    expect(parsed.wallets).toEqual([wallet.toLowerCase()]);
  });

  it("rejects malformed input", () => {
    const bad = [
      { since: -1, sort: "trending" },
      { since: 1.5, sort: "trending" },
      { since: 0, sort: "hot" },
      { since: 0, sort: "trending", wallets: [] },
      { since: 0, sort: "trending", wallets: ["0x1234"] },
      { since: 0, sort: "trending", wallets: [`${wallet}; drop table trade`] },
      { sort: "trending" },
    ];
    for (const body of bad) expect(activityRequestSchema.safeParse(body).success, JSON.stringify(body)).toBe(false);
  });

  it("caps how many wallets one request may name", () => {
    const many = Array.from({ length: 501 }, () => wallet);
    expect(activityRequestSchema.safeParse({ since: 0, sort: "trending", wallets: many }).success).toBe(false);
  });
});
