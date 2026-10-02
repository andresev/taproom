# 0006: Token page, part 2: price, market cap, liquidity, holders

Date: 2026-10-02. Status: accepted.

## Context

0005 left the token page without price, market cap, liquidity or holders. The
indexer knew launches, pools and trades only.

## Decisions

- **Money figures are in the pair asset, not USD.** "0.000000008 WBNB", "8.01 WBNB".
  USD needs a price for every pair asset: a confirmed WBNB/stablecoin pool, and a
  chain of prices for tokens brewed with other memecoins. That is a follow-up.
- **Price, market cap and liquidity are read live from the chain by the app,** in
  one multicall over the public RPC: the pool's `slot0`, the token's total supply,
  and both tokens' balances in the pool. They are always current and need nothing
  indexed. A read that fails shows "Unknown", never zero.
- **Market cap is spot price times current total supply.** Burned tokens sitting
  at the burn address still count in total supply, so this is not a circulating
  figure.
- **Liquidity is what the pool holds:** the pair-asset balance, with the token
  balance alongside. It is not a USD total value locked.
- **Price maths is exact bigint arithmetic in `shared/src/price.ts`,** from the
  pool's `sqrtPriceX96`, tested against a real pool. Prices use 36 decimals so
  very small ones do not round to zero.
- **PancakeSwap V3's `slot0` is not Uniswap V3's.** Its `feeProtocol` is a uint32;
  the ABI in `app/src/lib/chain/abis` reflects that and was checked on a live pool.
- **Holders are indexed from every Brew token's `Transfer` events** into a `holder`
  table, with a running count in `token_stats`. The count includes the pool and the
  burn address, as block explorers do; the zero address is never a holder.
- **"Top 10 hold X%" leaves out the token's pools and the burn address**
  (`0x…dEaD`, where Brew sends the token side of its fee). Known exchange wallets
  are not excluded yet; there is no list of them.
- **Each trade now stores the pool price right after it** (`trade.sqrtPriceX96`).
  Nothing reads it yet: it is there so receipts (step 7) can show market cap at
  entry without re-indexing.

## Known limits

- Only the token's first pool is priced. Standard-factory tokens have one.
- Holder balances assume plain transfers. A token that changes balances without
  emitting `Transfer` (rebasing, reflections) would drift from the chain.
- A token indexed from after its first block has incomplete balances; a balance
  that would go negative is clamped to zero.
- Indexing every transfer makes the first sync several times longer.
- Live reads depend on a free public RPC from the device.

## Since then

- 2026-10-02: the safety checks use the top-10 holder share computed here (0009),
  and receipts read `trade.sqrtPriceX96` for market cap at entry (0010).
- 2026-10-02: figures are still in the pair asset. Trader records (0011, MVP step 9)
  will need a way to compare results across pair assets, which is the USD follow-up
  noted above.
