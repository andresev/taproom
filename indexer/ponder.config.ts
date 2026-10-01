import { createConfig } from "ponder";
import { loadEnv } from "./src/env";

const env = loadEnv();

export default createConfig({
  database: env.DATABASE_URL
    ? { kind: "postgres", connectionString: env.DATABASE_URL }
    : { kind: "pglite" },
  chains: {
    bsc: { id: 56, rpc: env.BSC_RPC_URL },
  },
  // No contracts yet on purpose. The Brew launch factory address and launch event
  // are unconfirmed (see CLAUDE.md "Open questions"), and PancakeSwap V3 pools are
  // discovered from launches. Add them here, with ABIs in ./abis and the source
  // tx linked in a comment, once confirmed. Never guess an address or ABI.
  contracts: {},
});
