/**
 * Hand helpers for the table: smart grouping into melds, a label for each group,
 * and the points still left in the hand. Kept cheap: one `arrange` call per hand.
 */
import { arrange, cardPoints, checkDeclaration, classifyGroup, scoreArrangement, sortHand, type Card as RCard, type Rank } from '@local-rummy/rummy';
import type { Card } from '../types';

const NODE_LIMIT = 2500; // plenty for 13–14 cards; keeps phones smooth

export type GroupKind = 'pure' | 'impure' | 'set' | 'invalid';
export interface GroupInfo { kind: GroupKind; label: string; points: number }

const ORDER = { pure: 0, impure: 1, set: 2 } as const;

/** Best grouping of the hand: pure sequences, then sequences, then sets, then the leftover cards. */
export function smartGroups(hand: Card[], wildRank: string | null): string[][] {
  if (!hand.length) return [];
  const r = arrange(hand as unknown as RCard[], (wildRank ?? null) as Rank | null, NODE_LIMIT);
  const melds = [...r.melds].sort((a, b) => ORDER[a.type] - ORDER[b.type]);
  const groups = melds.map((m) => sortHand(m.cards).map((c) => c.id));
  const used = new Set(groups.flat());
  const rest = sortHand((hand as unknown as RCard[]).filter((c) => !used.has(c.id)));
  // leftovers: one group per suit so near-sequences sit together
  const bySuit = new Map<string, string[]>();
  for (const c of rest) bySuit.set(c.suit, [...(bySuit.get(c.suit) ?? []), c.id]);
  return [...groups, ...bySuit.values()];
}

/** What a group of cards is, for the label above it. */
export function groupInfo(cards: Card[], wildRank: string | null): GroupInfo {
  const w = (wildRank ?? null) as Rank | null;
  const kind = cards.length >= 3 ? classifyGroup(cards as unknown as RCard[], w) : null;
  if (kind === 'pure') return { kind, label: 'Pure sequence', points: 0 };
  if (kind === 'impure') return { kind, label: 'Sequence', points: 0 };
  if (kind === 'set') return { kind, label: 'Set', points: 0 };
  const points = cards.reduce((n, c) => n + cardPoints(c as unknown as RCard, w), 0);
  // short groups just show their points (a label would not fit over 1–2 cards)
  return { kind: 'invalid', label: cards.length >= 3 ? 'Invalid' : '', points };
}

/**
 * Points left in the hand (what you'd lose if someone declared now), capped at 80.
 * With 14 cards (after drawing) it assumes you throw your highest unmatched card.
 */
export function pointsLeft(hand: Card[], wildRank: string | null): number {
  const w = (wildRank ?? null) as Rank | null;
  const h = hand as unknown as RCard[];
  const r = arrange(h, w, NODE_LIMIT);
  if (h.length <= 13 || !r.deadwood.length) return r.points;
  let worst = 0;
  r.deadwood.forEach((c, i) => { if (cardPoints(c, w) > cardPoints(r.deadwood[worst], w)) worst = i; });
  return scoreArrangement(r.melds, r.deadwood.filter((_, i) => i !== worst), w);
}

const SUIT: Record<string, string> = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
const short = (c: Card) => (c.rank === 'JK' ? 'the Joker' : `${c.rank} of ${SUIT[c.suit] ?? c.suit}`);

/**
 * Before declaring (14 cards): with one card selected, check the other 13; with none selected,
 * look for the card to throw that would make a valid show.
 */
export function declareAdvice(hand: Card[], selected: string[], wildRank: string | null): { ok: boolean; text: string } {
  const w = (wildRank ?? null) as Rank | null;
  if (selected.length === 1) {
    const thrown = hand.find((c) => c.id === selected[0]);
    const rest = hand.filter((c) => c.id !== selected[0]) as unknown as RCard[];
    const r = checkDeclaration(rest, w);
    return r.valid ? { ok: true, text: `Throw ${thrown ? short(thrown) : 'it'} and declare.` } : { ok: false, text: r.reason ?? 'These 13 cards are not valid yet.' };
  }
  const a = arrange(hand as unknown as RCard[], w, NODE_LIMIT);
  if (a.deadwood.length === 1) {
    const rest = (hand as unknown as RCard[]).filter((c) => c.id !== a.deadwood[0].id);
    if (checkDeclaration(rest, w).valid) return { ok: true, text: `Select ${short(a.deadwood[0] as unknown as Card)}, then Declare.` };
  }
  const pure = a.melds.filter((m) => m.type === 'pure').length;
  const seqs = a.melds.filter((m) => m.type !== 'set').length;
  return { ok: false, text: pure === 0 ? 'Make a pure sequence first.' : seqs < 2 ? 'You need a second sequence.' : `${a.deadwood.length} cards are not in a group yet.` };
}
