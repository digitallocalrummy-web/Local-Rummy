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
    // everyone's cards are shown at the end, grouped
    for (const s of r.seats) assert.equal((s.groups ?? []).reduce((n, g) => n + g.cards.length, 0), t.seats[s.idx].hand.length);
  }
  // every card is accounted for: hands + deck + open pile = whole shoe (2 decks + 2 jokers)
  const total = t.seats.reduce((s, x) => s + x.hand.length, 0) + t.deck.length + t.pile.length;
  assert.equal(total, 106);
  t.dispose();
});

test('a player who drops out keeps their turn for the grace period', { timeout: 60_000 }, async () => {
  const cfg = { ...defaultConfig, turnSeconds: 20, reconnectGraceSeconds: 45 };
  const t = new Table('points', 2, 0, cfg, { onChange: () => {}, onEvent: () => {}, onEnd: () => {} });
  t.addHuman({ id: 'p1', name: 'Asha', code: 'AS', color: '#123' }, 0);
  t.fillWithBots();
  // wait for the human's turn
  for (let i = 0; i < 200 && !(t.phase === 'playing' && t.turn === 0); i++) await new Promise((r) => setTimeout(r, 100));
  assert.equal(t.turn, 0);
  t.setConnected('p1', false);
  const away = t.deadline! - Date.now();
  assert.ok(away > 40_000 && away <= 45_000, `held for ${away}ms`);
  const seat = t.view(0).seats[0] as { reconnectUntil: number | null };
  assert.ok(seat.reconnectUntil && seat.reconnectUntil > Date.now());
  t.setConnected('p1', true);
  const back = t.deadline! - Date.now();
  assert.ok(back <= 20_000, `back to a normal turn: ${back}ms`);
  assert.equal((t.view(0).seats[0] as { reconnectUntil: number | null }).reconnectUntil, null);
  t.dispose();
});
