import type { Address } from "./types.js";

/**
 * What kind of asset a pair token is, as Brew's own site groups the assets a
 * token can be brewed with: "Majors", "Protocol" ($BREW), "Tokenized stocks" and
 * "Gold".
 */
export type PairAssetKind = "major" | "brew" | "tokenized-stock" | "gold";

export interface KnownPairAsset {
  address: Address;
  symbol: string;
  name: string;
  kind: PairAssetKind;
}

/**
 * The pair assets Brew's launch form offers, read on 2026-10-02 from the list in
 * Brew's site bundle (https://brew.family/assets/index-B4iKBQfu.js), with each
 * entry's group. Each address was checked to have code on BSC and to return the
 * listed symbol from symbol() (CAKE returns "Cake", XAUT "XAUt"). A pair token
 * not listed here is another token: often another Brew token or a memecoin.
 */
export const KNOWN_PAIR_ASSETS: readonly KnownPairAsset[] = [
  { address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", kind: "major" },
  { address: "0x55d398326f99059ff775485246999027b3197955", symbol: "USDT", name: "Tether USD", kind: "major" },
  { address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", symbol: "USDC", name: "USD Coin", kind: "major" },
  { address: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", symbol: "CAKE", name: "PancakeSwap", kind: "major" },
  { address: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", symbol: "BTCB", name: "BTCB", kind: "major" },
  { address: "0x2170ed0880ac9a755fd29b2688956bd959f933f8", symbol: "ETH", name: "Ethereum", kind: "major" },
  { address: "0xfa6d9b504848606eb9aec04ccc161d169b3f2159", symbol: "BREW", name: "Brew", kind: "brew" },
  { address: "0x02fca66c1d1afb4e2a7884261eb00f63598a7436", symbol: "NVDAB", name: "NVIDIA", kind: "tokenized-stock" },
  { address: "0x5b1910eaad6450e50f816082aa078c41f10c292f", symbol: "TSLAB", name: "Tesla", kind: "tokenized-stock" },
  { address: "0x431a3bee82e2ca41e49895cbece5bb0f76a89b7a", symbol: "AAPLB", name: "Apple", kind: "tokenized-stock" },
  { address: "0x3f53de71c126bdabae20f9cd64848d317f6c3238", symbol: "GOOGLB", name: "Alphabet", kind: "tokenized-stock" },
  { address: "0x205812cdbed920aff76c6580abd681a46d11efc7", symbol: "QQQB", name: "Invesco QQQ", kind: "tokenized-stock" },
  { address: "0x7138b48df7d98d7e3cc221bfe7192d0a178182d8", symbol: "SPYB", name: "S&P 500 (SPY)", kind: "tokenized-stock" },
  { address: "0xbe9d156892e55e7154bcd3cb0fea677f9d3103e1", symbol: "SPCXB", name: "SpaceX", kind: "tokenized-stock" },
  { address: "0x4ef9d3062c7f6eba4aae4990c5036598c6eff4ec", symbol: "BABAB", name: "Alibaba", kind: "tokenized-stock" },
  { address: "0x46ceefda28dd7207059ed19b0acdc026955bb15c", symbol: "GMEB", name: "GameStop", kind: "tokenized-stock" },
  { address: "0x5fd86da9b05abe396fe9d02a4a213a7c00556503", symbol: "MRNAB", name: "Moderna", kind: "tokenized-stock" },
  { address: "0x80106cb3ead06659a5ad19df39d9b4733863b9b0", symbol: "MSFTB", name: "Microsoft", kind: "tokenized-stock" },
  { address: "0x7425889fe94f9d693e8daefe88bcced6acfef4c0", symbol: "METAB", name: "Meta Platforms", kind: "tokenized-stock" },
  { address: "0x75fd4cf6f8392e41e70391d60c90c0d5211603a1", symbol: "AMDB", name: "Advanced Micro Devices Inc", kind: "tokenized-stock" },
  { address: "0x80f3d493ebce97e343c53d29a137942416b4ffc0", symbol: "CRCLB", name: "Circle Internet Group Inc.", kind: "tokenized-stock" },
  { address: "0xcdf2f3e0fa43c47a6662a91c9e4a7c5f69762699", symbol: "MUB", name: "Micron Technology Inc", kind: "tokenized-stock" },
  { address: "0x0ca5d51d0277bd006fd9607d3e560785ebad8222", symbol: "PLTRB", name: "Palantir Technologies", kind: "tokenized-stock" },
  { address: "0x21caef8a43163eea865baee23b9c2e327696a3bf", symbol: "XAUT", name: "Tether Gold", kind: "gold" },
];

/** The listed asset at `address`, or null when it is not in Brew's list. */
export function knownPairAsset(address: string): KnownPairAsset | null {
  const lower = address.toLowerCase();
  return KNOWN_PAIR_ASSETS.find((asset) => asset.address === lower) ?? null;
}
