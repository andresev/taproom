import { describe, expect, it } from 'vitest';

import { formatMultiple, formatTimeAgo, formatTokenAmount, formatUsdCompact, shortAddress } from './format';

describe('shortAddress', () => {
  it('shortens an address', () => {
    expect(shortAddress('0xfa6d9b504848606eb9aec04ccc161d169b3f2159')).toBe('0xfa6d…2159');
  });
  it('leaves short strings alone', () => {
    expect(shortAddress('0x1234')).toBe('0x1234');
  });
});

describe('formatTokenAmount', () => {
  it('groups thousands and trims trailing zeros', () => {
    expect(formatTokenAmount(1_234_567_500000000000000000n, 18)).toBe('1,234,567.5');
    expect(formatTokenAmount(1_000000000000000000n, 18)).toBe('1');
  });
  it('truncates instead of rounding up', () => {
    expect(formatTokenAmount(1_999999n, 6, 2)).toBe('1.99');
  });
  it('never shows a non-zero amount as zero', () => {
    expect(formatTokenAmount(1n, 18)).toBe('<0.0001');
    expect(formatTokenAmount(0n, 18)).toBe('0');
  });
  it('keeps precision beyond Number.MAX_SAFE_INTEGER', () => {
    expect(formatTokenAmount(123456789012345678901234567890n, 18)).toBe('123,456,789,012.3456');
  });
});

describe('formatUsdCompact', () => {
  it('formats across magnitudes', () => {
    expect(formatUsdCompact(1_234_567)).toBe('$1.23M');
    expect(formatUsdCompact(45_600)).toBe('$45.6K');
    expect(formatUsdCompact(2_000_000_000)).toBe('$2B');
    expect(formatUsdCompact(812.4)).toBe('$812');
    expect(formatUsdCompact(0.0000123)).toBe('$0.000012');
    expect(formatUsdCompact(0)).toBe('$0');
  });
  it('shows a dash for unusable values', () => {
    expect(formatUsdCompact(Number.NaN)).toBe('—');
    expect(formatUsdCompact(-1)).toBe('—');
  });
});

describe('formatMultiple', () => {
  it('formats multiples', () => {
    expect(formatMultiple(3.2)).toBe('3.2x');
    expect(formatMultiple(0.5)).toBe('0.5x');
    expect(formatMultiple(12.34)).toBe('12.3x');
  });
});

describe('formatTimeAgo', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

  it('uses the largest whole unit', () => {
    expect(formatTimeAgo(ago(2), now)).toBe('now');
    expect(formatTimeAgo(ago(45), now)).toBe('45s');
    expect(formatTimeAgo(ago(12 * 60 + 30), now)).toBe('12m');
    expect(formatTimeAgo(ago(3 * 3600 + 59), now)).toBe('3h');
    expect(formatTimeAgo(ago(5 * 86400), now)).toBe('5d');
  });

  it('treats a block time slightly ahead of the device clock as now', () => {
    expect(formatTimeAgo(ago(-3), now)).toBe('now');
  });

  it('returns a dash for an invalid date', () => {
    expect(formatTimeAgo(new Date(NaN), now)).toBe('—');
  });
});
