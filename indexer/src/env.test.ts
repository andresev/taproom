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

  it("parses an optional start block", () => {
    expect(loadEnv({ BSC_RPC_URL: "https://rpc.example" }).START_BLOCK).toBeUndefined();
    expect(loadEnv({ BSC_RPC_URL: "https://rpc.example", START_BLOCK: "" }).START_BLOCK).toBeUndefined();
    expect(loadEnv({ BSC_RPC_URL: "https://rpc.example", START_BLOCK: "125000000" }).START_BLOCK).toBe(125000000);
    expect(() => loadEnv({ BSC_RPC_URL: "https://rpc.example", START_BLOCK: "soon" })).toThrow(/START_BLOCK/);
  });

  it("does not echo values in errors", () => {
    expect(() => loadEnv({ BSC_RPC_URL: "not-a-url-secret" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("not-a-url-secret") }),
    );
  });
});
