import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("requires a BSC RPC url", () => {
    expect(() => loadEnv({})).toThrow(/BSC_RPC_URL/);
  });

  it("treats empty values as unset", () => {
    const env = loadEnv({ BSC_RPC_URL: "https://rpc.example", DATABASE_URL: "" });
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("does not echo values in errors", () => {
    expect(() => loadEnv({ BSC_RPC_URL: "not-a-url-secret" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("not-a-url-secret") }),
    );
  });
});
