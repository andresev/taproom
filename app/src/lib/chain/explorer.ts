const BSCSCAN = 'https://bscscan.com';

export const bscscanTxUrl = (txHash: string) => `${BSCSCAN}/tx/${txHash}`;
export const bscscanAddressUrl = (address: string) => `${BSCSCAN}/address/${address}`;
export const bscscanTokenUrl = (address: string) => `${BSCSCAN}/token/${address}`;
