import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkDeclaration } from '@local-rummy/rummy';
import { defaultConfig } from '../config';
import { Table, type TableResult } from './table';

test('an all-bot table plays a full deal and the pot balances', { timeout: 240_000 }, async () => {
  const result = await new Promise<{ r: TableResult; t: Table }>((resolve) => {
    const t = new Table('points', 3, 80, defaultConfig, {
      onChange: () => {}, onEvent: () => {},
      onEnd: (tt, r) => resolve({ r, t: tt }),
    });
    t.fillWithBots();
  });
  const { r, t } = result;
  assert.equal(t.phase, 'ended');
  assert.equal(r.seats.length, 3);
  const winner = r.seats.find((s) => s.won);
  if (winner) {
    // the winner's hand is a valid declaration and collects exactly what the losers pay
    assert.ok(checkDeclaration(t.seats[winner.idx].hand, t.wildRank).valid);
    assert.equal(r.seats.reduce((s, x) => s + x.chips, 0), 0);
    for (const s of r.seats.filter((x) => !x.won)) assert.ok(s.chips <= 0 && s.chips >= -80);
  }
  // every card is accounted for: hands + deck + open pile = whole shoe (2 decks + 2 jokers)
  const total = t.seats.reduce((s, x) => s + x.hand.length, 0) + t.deck.length + t.pile.length;
  assert.equal(total, 106);
  t.dispose();
});
