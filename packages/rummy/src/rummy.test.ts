import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  arrange, bestDiscard, buildShoe, checkDeclaration, classifyGroup, decksFor, handPoints, shuffle,
  type Card, type Rank, type Suit,
} from './index';

let n = 0;
const c = (s: string): Card => {
  if (s === 'JK') return { id: `t${n++}`, rank: 'JK', suit: '★' };
  const suit = s.slice(-1) as Suit;
  return { id: `t${n++}`, rank: s.slice(0, -1) as Rank, suit };
};
const cs = (s: string) => s.split(' ').map(c);

test('shoe sizes', () => {
  assert.equal(buildShoe(2).length, 106);
  assert.equal(buildShoe(3).length, 159);
  assert.equal(decksFor(6), 2);
  assert.equal(decksFor(7), 3);
  assert.equal(new Set(buildShoe(3).map((x) => x.id)).size, 159);
  assert.equal(shuffle(buildShoe(2)).length, 106);
});

test('group classification', () => {
  assert.equal(classifyGroup(cs('4♠ 5♠ 6♠'), '9'), 'pure');
  assert.equal(classifyGroup(cs('Q♥ K♥ A♥'), '9'), 'pure');
  assert.equal(classifyGroup(cs('A♥ 2♥ 3♥'), '9'), 'pure');
  assert.equal(classifyGroup(cs('K♥ A♥ 2♥'), '9'), null, 'no wrap-around');
  assert.equal(classifyGroup(cs('4♠ JK 6♠'), '9'), 'impure');
  assert.equal(classifyGroup(cs('4♠ 9♦ 6♠ 7♠'), '9'), 'impure', 'wild rank fills the gap');
  assert.equal(classifyGroup(cs('8♠ 9♠ 10♠'), '9'), 'pure', 'wild rank in its natural place stays pure');
  assert.equal(classifyGroup(cs('7♣ 7♦ 7♥'), '9'), 'set');
  assert.equal(classifyGroup(cs('7♣ 7♦ JK'), '9'), 'set');
  assert.equal(classifyGroup(cs('7♣ 7♣ 7♥'), '9'), null, 'set needs different suits');
  assert.equal(classifyGroup(cs('7♣ 7♦ 7♥ 7♠ JK'), '9'), null, 'set is at most 4');
  assert.equal(classifyGroup(cs('4♠ 5♥ 6♠'), '9'), null);
});

test('valid declaration', () => {
  const hand = cs('A♠ 2♠ 3♠ 5♥ 6♥ JK 8♥ K♦ K♣ K♥ 9♣ 9♦ 9♠');
  const r = checkDeclaration(hand, '4');
  assert.equal(r.valid, true, r.reason);
  assert.equal(handPoints(hand, '4'), 0);
});

test('declaration with wild-rank jokers', () => {
  // wild = 5: 5♣ and 5♦ act as jokers
  const hand = cs('10♦ J♦ Q♦ 3♣ 5♣ 5♦ 7♥ 7♠ 7♣ 2♠ 3♠ 4♠ 5♠');
  const r = checkDeclaration(hand, '5');
  assert.equal(r.valid, true, r.reason);
});

test('no pure sequence is invalid and every card counts', () => {
  const hand = cs('4♠ JK 6♠ 7♥ 8♥ JK K♦ K♣ K♥ 9♣ 9♦ 9♠ 2♥');
  const r = checkDeclaration(hand, '3');
  assert.equal(r.valid, false);
  assert.match(r.reason ?? '', /pure sequence/);
  // all non-wild cards count: 4+6+7+8+10+10+10+9+9+9+2 = 84 → capped at 80
  assert.equal(handPoints(hand, '3'), 80);
});

test('pure sequence but no second sequence: only the pure sequence is exempt', () => {
  const hand = cs('A♠ 2♠ 3♠ K♦ K♣ K♥ 9♣ 9♦ 9♠ 2♥ 4♣ 6♦ 8♥');
  // sets do not count yet: 10+10+10+9+9+9+2+4+6+8 = 77
  assert.equal(handPoints(hand, '5'), 77);
});

test('two sequences: only unmatched cards count', () => {
  const hand = cs('A♠ 2♠ 3♠ 5♥ 6♥ 7♥ K♦ K♣ K♥ 9♣ 2♦ 4♣ Q♥');
  // unmatched 9♣ 2♦ 4♣ Q♥ = 9+2+4+10
  assert.equal(handPoints(hand, '8'), 25);
});

test('arrange handles a 2-deck hand with duplicates', () => {
  const hand = cs('7♠ 7♠ 8♠ 9♠ 10♠ 10♠ J♠ Q♠ 3♦ 3♣ 3♥ JK 6♠');
  const r = arrange(hand, '5');
  assert.equal(r.valid, true);
});

test('bot discards the most useless card', () => {
  const hand14 = cs('A♠ 2♠ 3♠ 5♥ 6♥ 7♥ K♦ K♣ K♥ 9♣ 9♦ 9♠ 4♣ Q♦');
  const d = bestDiscard(hand14, '8');
  assert.ok(['4♣', 'Q♦'].includes(d.card.rank + d.card.suit));
  assert.ok(d.pointsAfter <= 10);
});

test('random hands are scored quickly and within limits', () => {
  const t0 = Date.now();
  for (let i = 0; i < 300; i++) {
    const shoe = shuffle(buildShoe(2));
    const hand = shoe.slice(0, 13);
    const p = arrange(hand, shoe[20].rank === 'JK' ? 'A' : shoe[20].rank).points;
    assert.ok(p >= 0 && p <= 80);
  }
  assert.ok(Date.now() - t0 < 8000, `took ${Date.now() - t0} ms`);
});
