/**
 * Melds, declarations and scoring.
 *
 * Rules used (standard Indian 13-card rummy):
 *  - A sequence is 3+ cards of one suit in consecutive order. Ace can be low (A-2-3) or high (Q-K-A), not both.
 *  - A pure sequence uses no wild card as a substitute. A wild-rank card in its natural place keeps it pure.
 *  - A set is 3 or 4 cards of one rank in different suits. Wild cards may fill in.
 *  - A valid declaration groups all 13 cards, with at least two sequences, at least one of them pure.
 *  - Losing players count unmatched cards (A, K, Q, J = 10, number cards face value, wild cards 0), capped at 80.
 *    With no pure sequence every card counts; with a pure sequence but no second sequence only the
 *    pure sequence is exempt.
 */
import { cardPoints, isPrintedJoker, isWild, rankNumber, type Card, type Rank, type Suit } from './cards';

export type MeldType = 'pure' | 'impure' | 'set';

export interface Meld {
  type: MeldType;
  cards: Card[];
}

export const MAX_POINTS = 80;

/** Classifies one group of cards, or returns null if it is not a valid meld. */
export function classifyGroup(cards: Card[], wildRank: Rank | null): MeldType | null {
  if (cards.length < 3) return null;
  if (isPureSequence(cards)) return 'pure';
  if (isImpureSequence(cards, wildRank)) return 'impure';
  if (isSet(cards, wildRank)) return 'set';
  return null;
}

function consecutive(values: number[]): boolean {
  const v = values.slice().sort((a, b) => a - b);
  for (let i = 1; i < v.length; i++) if (v[i] !== v[i - 1] + 1) return false;
  return true;
}

export function isPureSequence(cards: Card[]): boolean {
  if (cards.length < 3 || cards.some(isPrintedJoker)) return false;
  const suit = cards[0].suit;
  if (cards.some((c) => c.suit !== suit)) return false;
  const low = cards.map((c) => rankNumber(c.rank));
  if (consecutive(low)) return true;
  const high = low.map((n) => (n === 1 ? 14 : n));
  return consecutive(high);
}

export function isImpureSequence(cards: Card[], wildRank: Rank | null): boolean {
  if (cards.length < 3 || cards.length > 13) return false;
  const naturals = cards.filter((c) => !isWild(c, wildRank));
  const wilds = cards.length - naturals.length;
  if (naturals.length === 0) return true; // all wild cards
  const suit = naturals[0].suit;
  if (naturals.some((c) => c.suit !== suit)) return false;
  const fits = (vals: number[]) => {
    if (new Set(vals).size !== vals.length) return false;
    const min = Math.min(...vals), max = Math.max(...vals);
    const gaps = max - min + 1 - vals.length;
    // wilds fill the gaps, the rest extend the run, which can be at most 13 long
    return gaps <= wilds && cards.length <= 13 && max - min + 1 <= 13;
  };
  const low = naturals.map((c) => rankNumber(c.rank));
  if (fits(low)) return true;
  return fits(low.map((n) => (n === 1 ? 14 : n)));
}

export function isSet(cards: Card[], wildRank: Rank | null): boolean {
  if (cards.length < 3 || cards.length > 4) return false;
  const naturals = cards.filter((c) => !isWild(c, wildRank));
  if (naturals.length === 0) return true;
  const rank = naturals[0].rank;
  if (naturals.some((c) => c.rank !== rank)) return false;
  return new Set(naturals.map((c) => c.suit)).size === naturals.length;
}

export interface ArrangeResult {
  melds: Meld[];
  /** Cards left unmatched (wild leftovers are attached to melds when a declaration is possible). */
  deadwood: Card[];
  /** Penalty points under the rules above, capped at 80. */
  points: number;
  /** True when this arrangement is a valid declaration. */
  valid: boolean;
}

/** Score of an arrangement, applying the pure-sequence and second-sequence rules. */
export function scoreArrangement(melds: Meld[], deadwood: Card[], wildRank: Rank | null): number {
  const pure = melds.filter((m) => m.type === 'pure').length;
  const seqs = melds.filter((m) => m.type !== 'set').length;
  let counted: Card[];
  if (pure === 0) counted = [...melds.flatMap((m) => m.cards), ...deadwood];
  else if (seqs < 2) counted = [...melds.filter((m) => m.type !== 'pure').flatMap((m) => m.cards), ...deadwood];
  else counted = deadwood;
  return Math.min(MAX_POINTS, counted.reduce((s, c) => s + cardPoints(c, wildRank), 0));
}

interface Slotted { naturals: number[]; wilds: number; type: MeldType }

/**
 * Finds the arrangement of a hand with the fewest penalty points (exact for normal hands,
 * bounded search for unusual ones). Used to validate declarations, score losers and drive bots.
 */
export function arrange(hand: Card[], wildRank: Rank | null, nodeLimit = 60000): ArrangeResult {
  const n = hand.length;
  const wildIdx = hand.map((c, i) => (isWild(c, wildRank) ? i : -1)).filter((i) => i >= 0);
  const wildSet = new Set(wildIdx);
  // naturals in DFS order: high-value cards first so they get matched before low ones
  const order = hand.map((_, i) => i).filter((i) => !wildSet.has(i))
    .sort((a, b) => cardPoints(hand[b], wildRank) - cardPoints(hand[a], wildRank));

  let best: { melds: Slotted[]; dead: number[]; score: number } | null = null;
  let nodes = 0;
  const used = new Array<boolean>(n).fill(false);

  const freeWilds = () => wildIdx.filter((i) => !used[i]);
  /** Free card of this suit and value; ordinary cards before wild-rank ones. */
  const findNatural = (suit: Suit, value: number, taken: Set<number>): number => {
    const want = value === 14 ? 1 : value;
    let wildMatch = -1;
    for (let j = 0; j < n; j++) {
      if (used[j] || taken.has(j) || isPrintedJoker(hand[j])) continue;
      if (hand[j].suit === suit && rankNumber(hand[j].rank) === want) {
        if (!wildSet.has(j)) return j;
        if (wildMatch < 0) wildMatch = j;
      }
    }
    return wildMatch;
  };

  // candidate melds that contain natural card i
  const candidates = (i: number): Slotted[] => {
    const c = hand[i];
    const v = rankNumber(c.rank);
    const out: Slotted[] = [];
    const wildPool = freeWilds().length;
    const values = v === 1 ? [1, 14] : [v];
    for (const val of values) {
      for (let len = 3; len <= 9; len++) {
        for (let start = val - len + 1; start <= val; start++) {
          const end = start + len - 1;
          if (start < 1 || end > 14) continue;
          const taken = new Set<number>([i]);
          const nats: number[] = [i];
          let need = 0;
          for (let x = start; x <= end; x++) {
            if (x === val) continue;
            const j = findNatural(c.suit, x, taken);
            if (j >= 0) { taken.add(j); nats.push(j); } else need++;
          }
          const wildsAsNatural = nats.filter((j) => wildSet.has(j)).length;
          if (need > wildPool - wildsAsNatural) continue;
          out.push({ naturals: nats, wilds: need, type: need === 0 ? 'pure' : 'impure' });
          // the same run with wild-rank naturals swapped out (keeps them free as jokers)
          if (wildsAsNatural && need === 0) {
            const plain = nats.filter((j) => !wildSet.has(j));
            if (plain.length && wildsAsNatural <= wildPool) out.push({ naturals: plain, wilds: wildsAsNatural, type: 'impure' });
          }
        }
      }
    }
    // sets
    const same: number[] = [];
    const suits = new Set<Suit>([c.suit]);
    for (let j = 0; j < n; j++) {
      if (j === i || used[j] || isPrintedJoker(hand[j]) || hand[j].rank !== c.rank || suits.has(hand[j].suit)) continue;
      suits.add(hand[j].suit);
      same.push(j);
    }
    const subsets: number[][] = [[]];
    for (const j of same) for (const s of subsets.slice()) subsets.push([...s, j]);
    for (const s of subsets) {
      const nats = [i, ...s];
      for (const size of [3, 4]) {
        const need = size - nats.length;
        if (need < 0) continue;
        const wildsAsNatural = nats.filter((j) => wildSet.has(j)).length;
        if (need > wildPool - wildsAsNatural) continue;
        out.push({ naturals: nats, wilds: need, type: 'set' });
      }
    }
    // prefer pure, then larger melds, then fewer wilds
    const rankType = { pure: 0, impure: 1, set: 2 } as const;
    return out.sort((a, b) => rankType[a.type] - rankType[b.type] || (b.naturals.length + b.wilds) - (a.naturals.length + a.wilds) || a.wilds - b.wilds);
  };

  const deadPoints = (dead: number[]) => dead.reduce((s, j) => s + cardPoints(hand[j], wildRank), 0);

  const evaluate = (melds: Slotted[], dead: number[]) => {
    // wild cards score 0, so naturals alone decide the score
    const built: Meld[] = melds.map((m) => ({ type: m.type, cards: m.naturals.map((j) => hand[j]) }));
    const score = scoreArrangement(built, dead.map((j) => hand[j]), wildRank);
    if (!best || score < best.score || (score === best.score && melds.length > best.melds.length)) {
      best = { melds: melds.map((m) => ({ ...m, naturals: m.naturals.slice() })), dead: dead.slice(), score };
    }
  };

  const dfs = (k: number, melds: Slotted[], dead: number[]) => {
    if (++nodes > nodeLimit) return;
    if (best && deadPoints(dead) > best.score) return;
    while (k < order.length && used[order[k]]) k++;
    if (k >= order.length) { evaluate(melds, dead); return; }
    const i = order[k];
    for (const cand of candidates(i)) {
      cand.naturals.forEach((j) => (used[j] = true));
      // reserve wilds by marking the first free ones as used
      const reserved = freeWilds().slice(0, cand.wilds);
      reserved.forEach((j) => (used[j] = true));
      melds.push(cand);
      dfs(k + 1, melds, dead);
      melds.pop();
      reserved.forEach((j) => (used[j] = false));
      cand.naturals.forEach((j) => (used[j] = false));
      if (nodes > nodeLimit) break;
    }
    used[i] = true;
    dead.push(i);
    dfs(k + 1, melds, dead);
    dead.pop();
    used[i] = false;
  };

  dfs(0, [], []);
  if (!best) evaluate([], []);
  const b = best as unknown as { melds: Slotted[]; dead: number[]; score: number };

  // rebuild concrete melds: wilds are taken in order from the ones not used as naturals
  const naturalUsed = new Set(b.melds.flatMap((m) => m.naturals));
  const pool = wildIdx.filter((j) => !naturalUsed.has(j));
  const melds: Meld[] = b.melds.map((m) => {
    const cards = m.naturals.map((j) => hand[j]);
    for (let k = 0; k < m.wilds; k++) cards.push(hand[pool.shift()!]);
    return { type: m.type, cards };
  });
  const deadwood = b.dead.map((j) => hand[j]);
  let leftovers = pool.map((j) => hand[j]);

  const pure = melds.filter((m) => m.type === 'pure').length;
  const seqs = melds.filter((m) => m.type !== 'set').length;
  let valid = deadwood.length === 0 && pure >= 1 && seqs >= 2;
  if (valid && leftovers.length) {
    // attach leftover wild cards so every card sits in a meld
    if (leftovers.length >= 3) { melds.push({ type: 'impure', cards: leftovers }); leftovers = []; }
    for (const w of leftovers.splice(0)) {
      const target = melds.find((m) => m.type === 'impure' && m.cards.length < 13)
        ?? melds.find((m) => m.type === 'set' && m.cards.length < 4)
        ?? (pure >= 2 ? melds.find((m) => m.type === 'pure') : melds.filter((m) => m.type === 'pure')[1]);
      if (target) { target.cards.push(w); if (target.type === 'pure') target.type = 'impure'; } else { leftovers.push(w); }
    }
    valid = leftovers.length === 0;
  }
  return { melds, deadwood: [...deadwood, ...leftovers], points: valid ? 0 : b.score, valid };
}

/** Penalty points of a hand using its best arrangement. */
export function handPoints(hand: Card[], wildRank: Rank | null): number {
  return arrange(hand, wildRank).points;
}

/** Checks a declaration of exactly 13 cards. */
export function checkDeclaration(hand: Card[], wildRank: Rank | null): { valid: boolean; melds: Meld[]; reason?: string } {
  if (hand.length !== 13) return { valid: false, melds: [], reason: 'A declaration needs exactly 13 cards.' };
  const r = arrange(hand, wildRank);
  if (r.valid) return { valid: true, melds: r.melds };
  const pure = r.melds.filter((m) => m.type === 'pure').length;
  const seqs = r.melds.filter((m) => m.type !== 'set').length;
  const reason = pure === 0 ? 'You need at least one pure sequence (no joker).'
    : seqs < 2 ? 'You need a second sequence.'
    : 'Some cards are not in a set or sequence.';
  return { valid: false, melds: r.melds, reason };
}
