/** BscScan links. Shared by the app and the indexer's public receipt page. */
const BSCSCAN = 'https://bscscan.com';

// `as const` keeps the "https://…" template type, which typed routes need for external links.
export const bscscanTxUrl = (txHash: string) => `${BSCSCAN}/tx/${txHash}` as const;
export const bscscanAddressUrl = (address: string) => `${BSCSCAN}/address/${address}` as const;
export const bscscanTokenUrl = (address: string) => `${BSCSCAN}/token/${address}` as const;
