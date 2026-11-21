import { describe, expect, it } from 'vitest';
import { shareText } from '../../src/game/share';
import { challengeUrl, decodeChallenge, encodeChallenge } from '../../src/game/challenge';

describe('SHARE-1 share text', () => {
  it('matches the spec example and gives nothing away', () => {
    const t = shareText({
      mode: 'daily',
      puzzleNo: 12,
      worldName: 'Harbour',
      found: 9,
      total: 9,
      timeMs: 161000,
      hints: 0,
      stars: 3,
      streak: 5,
      url: 'https://example.com/',
    });
    expect(t).toBe(
      'Hidden Worlds No. 12 · Harbour\n9 of 9 found · 2:41 · no hints · ★★★\nStreak 5\nhttps://example.com/',
    );
  });
  it('handles hints, preview, explore and no streak', () => {
    expect(
      shareText({
        mode: 'daily',
        puzzleNo: null,
        worldName: 'Meadow',
        found: 6,
        total: 6,
        timeMs: 5000,
        hints: 2,
        stars: 1,
        streak: 0,
        url: 'u',
      }),
    ).toBe('Hidden Worlds Preview · Meadow\n6 of 6 found · 0:05 · 2 hints · ★☆☆\nu');
    expect(
      shareText({
        mode: 'explore',
        puzzleNo: null,
        level: 7,
        worldName: 'Night Market',
        found: 8,
        total: 8,
        timeMs: 3_725_000,
        hints: 1,
        stars: 1,
        streak: null,
        url: 'u',
      }),
    ).toBe('Hidden Worlds · Night Market level 7\n8 of 8 found · 1:02:05 · 1 hint · ★☆☆\nu');
  });
});

describe('SHARE-4 challenge codec', () => {
  it('round-trips', () => {
    for (const c of [
      { date: '2026-12-03', timeS: 161, misses: 2, hints: 0 },
      { date: '2028-02-29', timeS: 1, misses: 0, hints: 99 },
      { date: '2026-01-01', timeS: 86400, misses: 999, hints: 3 },
    ]) {
      const code = encodeChallenge(c);
      expect(code.length).toBeLessThan(24);
      expect(decodeChallenge(code)).toEqual(c);
    }
    expect(challengeUrl('https://x.test/', { date: '2026-12-03', timeS: 161, misses: 2, hints: 0 })).toMatch(
      /^https:\/\/x\.test\/\?c=[0-9a-z.]+$/,
    );
  });
  it('rejects malformed, tampered and out-of-range input', () => {
    const good = encodeChallenge({ date: '2026-12-03', timeS: 161, misses: 2, hints: 0 });
    const parts = good.split('.');
    const bad = [
      null,
      '',
      'hello',
      '1.2.3',
      good + '.x',
      good.toUpperCase(),
      parts.slice(0, 4).join('.') + '.zz',
      [parts[0], '5a', parts[2], parts[3], parts[4]].join('.'), // changed time, stale check
      'x'.repeat(60),
      '-1.2.3.4.ab',
      '1.2.3.4.5.6',
    ];
    for (const b of bad) expect(decodeChallenge(b)).toBeNull();
    // out-of-range values are refused even with a correct check
    expect(
      decodeChallenge(encodeChallenge({ date: '2026-12-03', timeS: 0, misses: 0, hints: 0 })),
    ).toBeNull();
    expect(
      decodeChallenge(encodeChallenge({ date: '2026-12-03', timeS: 90000, misses: 0, hints: 0 })),
    ).toBeNull();
    expect(
      decodeChallenge(encodeChallenge({ date: '2026-12-03', timeS: 10, misses: 1000, hints: 0 })),
    ).toBeNull();
    expect(
      decodeChallenge(encodeChallenge({ date: '2026-12-03', timeS: 10, misses: 0, hints: 100 })),
    ).toBeNull();
  });
});
