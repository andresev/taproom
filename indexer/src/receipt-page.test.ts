import { buildReceipt, type Receipt, type ReceiptTradeRow } from "@repo/shared";
import { describe, expect, it } from "vitest";

import { renderNoReceiptPage, renderReceiptPage, TRADE_ID } from "./receipt-page";

// A real RSUN buy (BSC, 2026-10-01), the same trade as shared/src/receipt.test.ts.
const row: ReceiptTradeRow = {
  id: "0xea19a9b3582c0c50cad461c0aaa4b388d8ffbd6b2f2552b566fd56f86dae9bde-62",
  txHash: "0xea19a9b3582c0c50cad461c0aaa4b388d8ffbd6b2f2552b566fd56f86dae9bde",
  wallet: "0x123aa559ad5381de95d194a73b0db7d229444ada",
  side: "buy",
  amountBaseUnits: "68947798563584582769212",
  pairAmountBaseUnits: "1287000000000000",
  sqrtPriceX96: "7089255887273613681284658",
  blockTime: "1790879964",
  tokenInfo: {
    address: "0xa908182208fd07b4d790faef7bbdab26afa2fa2f",
    symbol: "RSUN",
    name: "RISING SUN",
    decimals: 18,
    totalSupply: "1000000000000000000000000000",
  },
  poolInfo: {
    address: "0x2bf04ebf4e269305b7856cd44d36bf76605f8695",
    pairSymbol: "WBNB",
    pairDecimals: 18,
    tokenIsToken0: true,
  },
};
const entryCap = 8006489484138914645n;

function receipt(currentMarketCap: bigint | null, overrides: Partial<ReceiptTradeRow> = {}): Receipt {
  const result = buildReceipt({ ...row, ...overrides }, currentMarketCap);
  if (!result.ok) throw new Error(result.reason);
  return result.receipt;
}

const checkedAt = new Date("2026-10-02T21:00:00Z");
const url = `https://receipts.example.com/r/${row.id}`;

describe("renderReceiptPage", () => {
  const html = renderReceiptPage(receipt(entryCap * 2n), checkedAt, url);

  it("prints the receipt's figures, the full wallet and the transaction link", () => {
    expect(html).toContain("<h1>RSUN</h1>");
    expect(html).toContain('<div class="multiple">2x</div>');
    expect(html).toContain("0.001287 WBNB");
    expect(html).toContain("2026-10-01 18:39 UTC");
    expect(html).toContain(row.wallet);
    expect(html).toContain(`https://bscscan.com/tx/${row.txHash}`);
    expect(html).toContain("Market cap now was read at 2026-10-02 21:00 UTC");
  });

  it("says what a receipt proves and what it does not, and that Tapped is not Brew", () => {
    expect(html).toContain("It does not show whether the wallet still holds the token or made a profit.");
    expect(html).toContain("Not affiliated with Brew.");
  });

  it("gives link previews a title, a description and its own address", () => {
    expect(html).toContain("<title>RSUN receipt · Tapped</title>");
    expect(html).toContain(`<meta property="og:url" content="${url}">`);
    expect(html).toContain("bought 68,947.7985 RSUN for 0.001287 WBNB");
  });

  it("shows a loss as it is, and Unknown when the current market cap could not be read", () => {
    expect(renderReceiptPage(receipt(entryCap / 4n), checkedAt, url)).toContain('<div class="multiple">0.24x</div>');
    const unknown = renderReceiptPage(receipt(null), checkedAt, url);
    expect(unknown).toContain('<div class="multiple">—</div>');
    expect(unknown).toContain("<span>Unknown</span>");
  });

  it("escapes a token name chosen by its deployer", () => {
    const hostile = renderReceiptPage(
      receipt(entryCap, {
        tokenInfo: { ...row.tokenInfo!, symbol: '<script>alert("x")</script>', name: "A & B" },
      }),
      checkedAt,
      url,
    );
    expect(hostile).not.toContain("<script>alert");
    expect(hostile).toContain("&#60;script&#62;alert(&#34;x&#34;)&#60;/script&#62;");
    expect(hostile).toContain("A &#38; B");
  });
});

describe("renderNoReceiptPage", () => {
  it("states the reason, escaped", () => {
    expect(renderNoReceiptPage("A receipt proves a buy. <b>")).toContain("<p>A receipt proves a buy. &#60;b&#62;</p>");
  });
});

describe("TRADE_ID", () => {
  it("accepts a trade id and nothing else", () => {
    expect(TRADE_ID.test(row.id)).toBe(true);
    expect(TRADE_ID.test(`${row.id}; drop`)).toBe(false);
    expect(TRADE_ID.test(row.txHash)).toBe(false);
  });
});
