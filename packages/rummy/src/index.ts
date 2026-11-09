export * from './cards';
export * from './melds';

import { cardPoints, isWild, type Card, type Rank } from './cards';
import { arrange } from './melds';

/** Bot helper: should the bot take the open card instead of drawing blind? */
export function botWantsOpenCard(hand: Card[], open: Card | null, wildRank: Rank | null): boolean {
  if (!open) return false;
  if (isWild(open, wildRank)) return true;
  const before = arrange(hand, wildRank, 8000).points;
  const withIt = bestDiscard([...hand, open], wildRank);
  return withIt.pointsAfter < before - 1 && withIt.card.id !== open.id;
}

/** Bot helper: which card to throw so the remaining 13 cards score lowest. Never throws a wild card. */
export function bestDiscard(hand14: Card[], wildRank: Rank | null): { card: Card; pointsAfter: number } {
  let best: { card: Card; pointsAfter: number } | null = null;
  const seen = new Set<string>();
  for (const c of hand14) {
    const key = c.rank + c.suit;
    if (seen.has(key) || isWild(c, wildRank)) continue;
    seen.add(key);
    const rest = hand14.filter((x) => x.id !== c.id);
    const p = arrange(rest, wildRank, 8000).points;
    if (!best || p < best.pointsAfter || (p === best.pointsAfter && cardPoints(c, wildRank) > cardPoints(best.card, wildRank))) {
      best = { card: c, pointsAfter: p };
    }
  }
  return best ?? { card: hand14[hand14.length - 1], pointsAfter: arrange(hand14.slice(0, -1), wildRank).points };
}
