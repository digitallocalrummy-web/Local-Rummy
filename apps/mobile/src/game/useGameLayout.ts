import { useMemo } from 'react';
import { CARD_RATIO } from '../components/PlayingCard';
import type { Layout } from '../hooks/useLayout';

export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Every position on the game table, in the safe-area container's coordinates.
 * Computed in one place so card animations (deal, draw, discard) can fly
 * between real on-screen positions.
 */
export function useGameLayout({ s, safeW, safeH }: Layout) {
  return useMemo(() => {
    const pad = 12 * s;
    const rightCol = 122 * s;
    const felt: Rect = { x: 2 * s, y: pad, w: safeW - rightCol - 6 * s, h: safeH - pad * 2 };
    const feltRight = felt.x + felt.w;
    const feltBottom = felt.y + felt.h;

    const cardW = 66 * s;
    const cardH = cardW * CARD_RATIO;
    const pileW = 62 * s;
    const pileH = pileW * CARD_RATIO;

    const cx = felt.x + felt.w * 0.52;
    const pileY = felt.y + Math.max(felt.h * 0.36, 120 * s);
    const deck: Rect = { x: cx - pileW - 34 * s, y: pileY, w: pileW, h: pileH };
    const open: Rect = { x: cx + 28 * s, y: pileY, w: pileW, h: pileH };

    const hand = {
      left: felt.x + 124 * s,
      right: feltRight - 14 * s,
      top: feltBottom - cardH - 4 * s,
      cardW,
      cardH,
      lift: 18 * s,
    };

    return {
      s,
      felt,
      deck,
      open,
      hand,
      status: { x: deck.x - 40 * s, y: pileY - 38 * s, w: open.x + pileW - deck.x + 80 * s },
      discards: { x: felt.x + 26 * s, y: pileY + 4 * s, w: 178 * s, h: 112 * s },
      leftSeat: { x: felt.x + 18 * s, y: felt.y + 16 * s },
      topSeat: { x: felt.x, y: felt.y + 10 * s, w: felt.w * 0.9 },
      rightSeat: { x: feltRight - 50 * s, y: felt.y + 96 * s },
      points: { x: feltRight - 166 * s, y: felt.y + 12 * s },
      emote: { x: feltRight - 58 * s, y: felt.y + 14 * s },
      me: { x: felt.x + 14 * s, y: hand.top + 6 * s },
      rightCol: { x: feltRight + 14 * s, w: rightCol - 20 * s, bottom: feltBottom },
    };
  }, [s, safeW, safeH]);
}

export type GameLayout = ReturnType<typeof useGameLayout>;

/** Hand slot x positions; `grouped` adds a gap wherever the suit changes. */
export function handSlots(suits: string[], layout: GameLayout, grouped: boolean) {
  const { left, right, cardW } = layout.hand;
  const n = suits.length;
  if (n === 0) return { xs: [] as number[], step: 0, start: left };
  const gap = grouped ? 14 * layout.s : 0;
  let breaks = 0;
  for (let i = 1; i < n; i++) if (suits[i] !== suits[i - 1]) breaks++;
  const area = right - left;
  const step = Math.min(46 * layout.s, (area - cardW - breaks * gap) / Math.max(1, n - 1));
  const total = step * (n - 1) + cardW + breaks * gap;
  let x = left + (area - total) / 2;
  const xs: number[] = [];
  suits.forEach((suit, i) => {
    if (i > 0) {
      x += step;
      if (grouped && suit !== suits[i - 1]) x += gap;
    }
    xs.push(x);
  });
  return { xs, step, start: xs[0] };
}
