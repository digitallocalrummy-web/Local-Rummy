/** Cards, decks and card values for Indian 13-card rummy. */

export const SUITS = ['♠', '♥', '♣', '♦'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type Suit = (typeof SUITS)[number] | '★';
export type Rank = (typeof RANKS)[number] | 'JK';

export interface Card {
  /** Unique within one table's shoe, e.g. "d1-7♠" or "d0-JK". */
  id: string;
  rank: Rank;
  suit: Suit;
}

export const CARDS_PER_HAND = 13;

/** Number of 52-card decks (each with one printed joker) for a table size. */
export function decksFor(players: number): number {
  return players > 6 ? 3 : 2;
}

/** Ace low numeric value: A=1 … K=13. Printed joker = 0. */
export function rankNumber(rank: Rank): number {
  if (rank === 'JK') return 0;
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return Number(rank);
}

export function rankFromNumber(n: number): Rank {
  const v = n === 14 ? 1 : n;
  return RANKS[v - 1];
}

export const isPrintedJoker = (c: Card) => c.rank === 'JK';

/** A card is wild when it is a printed joker or has the wild joker's rank. */
export function isWild(c: Card, wildRank: Rank | null | undefined): boolean {
  return c.rank === 'JK' || (!!wildRank && c.rank === wildRank);
}

/** Penalty points of a single unmatched card. Wild cards count 0. */
export function cardPoints(c: Card, wildRank?: Rank | null): number {
  if (isWild(c, wildRank)) return 0;
  const n = rankNumber(c.rank);
  return n === 1 || n > 10 ? 10 : n;
}

export function label(c: Card): string {
  return c.rank === 'JK' ? 'Joker' : c.rank + c.suit;
}

/** Builds an ordered shoe of `decks` decks, each 52 cards plus one printed joker. */
export function buildShoe(decks: number, printedJokers = true): Card[] {
  const out: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS) for (const r of RANKS) out.push({ id: `d${d}-${r}${s}`, rank: r, suit: s });
    if (printedJokers) out.push({ id: `d${d}-JK`, rank: 'JK', suit: '★' });
  }
  return out;
}

export type Rng = () => number;

/** Fisher–Yates shuffle. Pass a cryptographic RNG on the server. */
export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorts by suit then rank, printed jokers last. Does not mutate. */
export function sortHand(hand: Card[]): Card[] {
  const order = (s: Suit) => (s === '★' ? 9 : SUITS.indexOf(s as (typeof SUITS)[number]));
  return hand.slice().sort((a, b) => order(a.suit) - order(b.suit) || rankNumber(a.rank) - rankNumber(b.rank));
}
