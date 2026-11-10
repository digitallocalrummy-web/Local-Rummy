/**
 * One rummy table: seats, cards, turns and timers. Pure game logic, no database or sockets.
 * The manager wires it to Socket.io and the wallet through the callbacks in `TableHooks`.
 */
import { randomInt } from 'node:crypto';
import {
  arrange, bestDiscard, botWantsOpenCard, buildShoe, checkDeclaration, decksFor, label, shuffle, sortHand,
  type Card, type Rank,
} from '@local-rummy/rummy';
import type { GameConfig, ModeId } from '../config';

export type SeatStatus = 'playing' | 'dropped' | 'invalid' | 'left';

export interface Seat {
  idx: number;
  kind: 'human' | 'bot';
  playerId?: string;
  name: string;
  code: string;
  color: string;
  hand: Card[];
  status: SeatStatus;
  drawn: boolean;
  missed: number;
  moves: number;
  dropPoints?: number;
  lastThrown?: Card;
  connected: boolean;
  escrow: number;
}

export interface SeatResult {
  idx: number; name: string; code: string; color: string; kind: Seat['kind']; playerId?: string;
  points: number; chips: number; won: boolean; status: SeatStatus; melds?: Card[][];
}
export interface TableResult { winnerIdx: number | null; reason: string; seats: SeatResult[] }

export type TableEvent =
  | { type: 'dealt'; order: number[]; perSeat: number }
  | { type: 'wild'; card: Card }
  | { type: 'turn'; seat: number; deadline: number | null }
  | { type: 'drew'; seat: number; from: 'deck' | 'open'; card?: Card }
  | { type: 'discarded'; seat: number; card: Card }
  | { type: 'dropped'; seat: number; points: number }
  | { type: 'declared'; seat: number; valid: boolean; reason?: string }
  | { type: 'timeout'; seat: number }
  | { type: 'chat'; seat: number; text: string }
  | { type: 'ended'; result: TableResult };

export interface TableHooks {
  /** Something changed: send each human their own view. */
  onChange(t: Table): void;
  onEvent(t: Table, e: TableEvent): void;
  /** The deal is over; settle chips and save history. */
  onEnd(t: Table, r: TableResult): void;
}

const BOT_NAMES = [
  ['Arjun', 'AR', '#8C3B2E'], ['Meera', 'ME', '#3B5E8C'], ['Kabir', 'KB', '#5C3B7A'], ['Sana', 'SN', '#2E6E8C'],
  ['Dev', 'DV', '#8C6A2E'], ['Priya', 'PR', '#7A3B5C'], ['Tejas', 'TJ', '#4A7A3B'], ['Ananya', 'AN', '#8C2E4A'],
  ['Vikram', 'VK', '#3B4A8C'], ['Isha', 'IS', '#6B4A1F'], ['Rahul', 'RH', '#2E5E4A'], ['Neel', 'NL', '#5E2E6B'],
] as const;

const cryptoRng = () => randomInt(0, 2 ** 32) / 2 ** 32;

export class Table {
  /** Short unique code, e.g. T-7K3QZ, shown in the app and admin and stored with chip moves. */
  readonly id = `T-${randomInt(36 ** 4, 36 ** 5).toString(36).toUpperCase()}`;
  phase: 'waiting' | 'playing' | 'ended' = 'waiting';
  seats: Seat[] = [];
  deck: Card[] = [];
  /** Open pile; the last card is the one players can pick. */
  pile: { card: Card; by: number }[] = [];
  wild: Card | null = null;
  wildRank: Rank | null = null;
  turn = -1;
  deadline: number | null = null;
  turnCount = 0;
  readonly createdAt = Date.now();
  startedAt = 0;
  lastActionAt = Date.now();
  result: TableResult | null = null;
  private timers = new Set<NodeJS.Timeout>();
  private turnTimer: NodeJS.Timeout | null = null;

  constructor(
    readonly mode: ModeId,
    readonly size: number,
    readonly entry: number,
    readonly cfg: GameConfig,
    private hooks: TableHooks,
  ) {}

  get humans() { return this.seats.filter((s) => s.kind === 'human'); }
  get active() { return this.seats.filter((s) => s.status === 'playing'); }
  get isFull() { return this.seats.length >= this.size; }
  get solo() { return this.size === 1; }

  seatOf(playerId: string) { return this.seats.find((s) => s.playerId === playerId && s.kind === 'human'); }

  addHuman(p: { id: string; name: string; code: string; color: string }, escrow: number): Seat {
    if (this.phase !== 'waiting' || this.isFull) throw new Error('Table is not open');
    const seat: Seat = { idx: this.seats.length, kind: 'human', playerId: p.id, name: p.name, code: p.code, color: p.color, hand: [], status: 'playing', drawn: false, missed: 0, moves: 0, connected: true, escrow };
    this.seats.push(seat);
    this.touch();
    if (this.isFull) this.start();
    return seat;
  }

  /** Removes a seat before the deal starts. Returns the seat so its escrow can be refunded. */
  removeWaiting(playerId: string): Seat | undefined {
    if (this.phase !== 'waiting') return undefined;
    const s = this.seatOf(playerId);
    if (!s) return undefined;
    this.seats = this.seats.filter((x) => x !== s).map((x, i) => ({ ...x, idx: i }));
    this.touch();
    return s;
  }

  fillWithBots() {
    if (this.phase !== 'waiting') return;
    const used = new Set(this.seats.map((s) => s.code));
    for (const [name, code, color] of BOT_NAMES) {
      if (this.isFull) break;
      if (used.has(code)) continue;
      this.seats.push({ idx: this.seats.length, kind: 'bot', name, code, color, hand: [], status: 'playing', drawn: false, missed: 0, moves: 0, connected: true, escrow: 0 });
    }
    if (this.isFull) this.start();
  }

  private start() {
    this.phase = 'playing';
    this.startedAt = Date.now();
    this.deck = shuffle(buildShoe(decksFor(this.size), this.cfg.printedJokers), cryptoRng);
    for (let r = 0; r < 13; r++) for (const s of this.seats) s.hand.push(this.deck.pop()!);
    this.seats.forEach((s) => { s.hand = sortHand(s.hand); });
    // the card under the deck decides the wild rank; a printed joker means aces are wild
    // it stays face up at the bottom of the deck (index 0 is drawn last)
    this.wild = this.deck[0];
    this.wildRank = this.wild.rank === 'JK' ? 'A' : this.wild.rank;
    const first = this.drawFromDeck();
    this.pile.push({ card: first, by: -1 });
    const order = this.seats.map((s) => s.idx);
    this.hooks.onEvent(this, { type: 'dealt', order, perSeat: 13 });
    this.hooks.onEvent(this, { type: 'wild', card: this.wild });
    this.hooks.onChange(this);
    // give the apps time to play the shuffle and deal animation
    const dealMs = 1200 + Math.min(2600, 13 * this.size * 22);
    this.later(dealMs, () => this.beginTurn(randomInt(0, this.size)));
  }

  private drawFromDeck(): Card {
    if (this.deck.length <= 1) {
      // reshuffle the open pile, keeping its top card
      const top = this.pile.pop();
      const rest = this.pile.map((p) => p.card);
      this.pile = top ? [top] : [];
      this.deck = [...this.deck, ...shuffle(rest, cryptoRng)];
    }
    return this.deck.pop()!;
  }

  private beginTurn(idx: number) {
    if (this.phase !== 'playing') return;
    const s = this.seats[idx];
    this.turn = idx;
    s.drawn = false;
    this.turnCount++;
    this.deadline = this.solo ? null : Date.now() + this.cfg.turnSeconds * 1000;
    this.hooks.onEvent(this, { type: 'turn', seat: idx, deadline: this.deadline });
    this.hooks.onChange(this);
    this.clearTurnTimer();
    if (s.kind === 'bot') this.later(900 + randomInt(0, 1400), () => this.botPlay(idx));
    else if (this.deadline) this.turnTimer = setTimeout(() => this.onTimeout(idx), this.cfg.turnSeconds * 1000 + 300);
  }

  private nextTurn() {
    if (this.phase !== 'playing') return;
    if (this.active.length <= 1 && !this.solo) { this.finish(this.active[0]?.idx ?? null, 'others_dropped'); return; }
    for (let k = 1; k <= this.size; k++) {
      const i = (this.turn + k) % this.size;
      if (this.seats[i].status === 'playing') { this.later(this.seats[i].kind === 'bot' ? 350 : 150, () => this.beginTurn(i)); return; }
    }
  }

  private onTimeout(idx: number) {
    if (this.turn !== idx || this.phase !== 'playing') return;
    const s = this.seats[idx];
    s.missed++;
    this.hooks.onEvent(this, { type: 'timeout', seat: idx });
    if (s.missed >= this.cfg.autoDropAfter) { this.drop(idx); return; }
    if (!s.drawn) this.draw(idx, 'deck');
    // throw the highest-value non-wild card so the timed-out player loses the least
    const pick = bestDiscard(s.hand, this.wildRank).card;
    this.discard(idx, pick.id);
  }

  // ---------- player actions (each returns an error message or null) ----------

  private check(idx: number): string | null {
    if (this.phase !== 'playing') return 'The deal is not running.';
    if (this.turn !== idx) return 'It is not your turn.';
    if (this.seats[idx]?.status !== 'playing') return 'You are out of this deal.';
    return null;
  }

  draw(idx: number, from: 'deck' | 'open'): string | null {
    const err = this.check(idx);
    if (err) return err;
    const s = this.seats[idx];
    if (s.drawn) return 'You already drew a card.';
    let card: Card;
    if (from === 'open') {
      const top = this.pile[this.pile.length - 1];
      if (!top) return 'The open pile is empty.';
      card = this.pile.pop()!.card;
    } else card = this.drawFromDeck();
    s.hand.push(card);
    s.drawn = true;
    this.touch();
    // others only learn which card was taken from the open pile
    this.hooks.onEvent(this, { type: 'drew', seat: idx, from, card: from === 'open' ? card : undefined });
    this.hooks.onChange(this);
    return null;
  }

  discard(idx: number, cardId: string): string | null {
    const err = this.check(idx);
    if (err) return err;
    const s = this.seats[idx];
    if (!s.drawn) return 'Draw a card first.';
    const k = s.hand.findIndex((c) => c.id === cardId);
    if (k < 0) return 'That card is not in your hand.';
    const [card] = s.hand.splice(k, 1);
    s.drawn = false;
    s.moves++;
    s.lastThrown = card;
    this.pile.push({ card, by: idx });
    this.touch();
    this.hooks.onEvent(this, { type: 'discarded', seat: idx, card });
    this.hooks.onChange(this);
    this.clearTurnTimer();
    this.nextTurn();
    return null;
  }

  /** Throws `cardId` to finish and shows the remaining 13 cards. */
  declare(idx: number, cardId: string): string | null {
    const err = this.check(idx);
    if (err) return err;
    const s = this.seats[idx];
    if (!s.drawn) return 'Draw a card first.';
    const k = s.hand.findIndex((c) => c.id === cardId);
    if (k < 0) return 'That card is not in your hand.';
    const rest = s.hand.filter((c) => c.id !== cardId);
    const check = checkDeclaration(rest, this.wildRank);
    this.hooks.onEvent(this, { type: 'declared', seat: idx, valid: check.valid, reason: check.reason });
    if (check.valid) {
      const [card] = s.hand.splice(k, 1);
      this.pile.push({ card, by: idx });
      this.finish(idx, 'declared');
      return null;
    }
    if (this.solo) return check.reason ?? 'That is not a valid declaration yet.';
    // wrong declaration: full penalty and out of the deal
    s.status = 'invalid';
    s.dropPoints = this.cfg.drops.full;
    s.drawn = false;
    this.hooks.onChange(this);
    this.clearTurnTimer();
    this.nextTurn();
    return null;
  }

  drop(idx: number): string | null {
    if (this.phase !== 'playing') return 'The deal is not running.';
    const s = this.seats[idx];
    if (!s || s.status !== 'playing') return 'You are out of this deal.';
    if (this.solo) { this.finish(null, 'left'); return null; }
    const points = s.moves === 0 && !s.drawn ? this.cfg.drops.first : this.cfg.drops.middle;
    s.status = 'dropped';
    s.dropPoints = points;
    // a drawn card goes back on the open pile
    if (s.drawn && s.hand.length === 14) { const c = s.hand.pop()!; this.pile.push({ card: c, by: idx }); }
    s.drawn = false;
    this.touch();
    this.hooks.onEvent(this, { type: 'dropped', seat: idx, points });
    this.hooks.onChange(this);
    if (this.turn === idx) { this.clearTurnTimer(); this.nextTurn(); }
    else if (this.active.length <= 1) this.finish(this.active[0]?.idx ?? null, 'others_dropped');
    return null;
  }

  chat(idx: number, text: string) {
    if (!this.cfg.quickChat) return;
    this.hooks.onEvent(this, { type: 'chat', seat: idx, text: text.slice(0, 40) });
  }

  setConnected(playerId: string, on: boolean) {
    const s = this.seatOf(playerId);
    if (s) { s.connected = on; this.hooks.onChange(this); }
  }

  // ---------- bots ----------

  private botPlay(idx: number) {
    if (this.turn !== idx || this.phase !== 'playing') return;
    const s = this.seats[idx];
    const top = this.pile[this.pile.length - 1]?.card ?? null;
    this.draw(idx, botWantsOpenCard(s.hand, top, this.wildRank) ? 'open' : 'deck');
    this.later(500 + randomInt(0, 700), () => {
      if (this.turn !== idx || this.phase !== 'playing') return;
      const { card } = bestDiscard(s.hand, this.wildRank);
      const rest = s.hand.filter((c) => c.id !== card.id);
      if (arrange(rest, this.wildRank).valid) this.declare(idx, card.id);
      else this.discard(idx, card.id);
    });
  }

  // ---------- ending ----------

  finish(winnerIdx: number | null, reason: string) {
    if (this.phase === 'ended') return;
    this.phase = 'ended';
    this.clearAll();
    const seats: SeatResult[] = this.seats.map((s) => {
      const won = s.idx === winnerIdx;
      let points = 0;
      let melds: Card[][] | undefined;
      if (!won) {
        if (s.dropPoints != null) points = s.dropPoints;
        else {
          const a = arrange(s.hand, this.wildRank);
          points = a.points;
          melds = a.melds.map((m) => m.cards);
        }
      } else melds = arrange(s.hand, this.wildRank).melds.map((m) => m.cards);
      const pay = this.entry && reason !== 'cancelled' ? Math.min(this.entry, Math.round((points * this.entry) / 80)) : 0;
      return { idx: s.idx, name: s.name, code: s.code, color: s.color, kind: s.kind, playerId: s.playerId, points, chips: -pay, won, status: s.status, melds };
    });
    const winnerSeat = seats.find((r) => r.won);
    if (winnerSeat) winnerSeat.chips = seats.reduce((sum, r) => sum + (r.won ? 0 : -r.chips), 0);
    this.result = { winnerIdx, reason, seats };
    this.hooks.onEvent(this, { type: 'ended', result: this.result });
    this.hooks.onChange(this);
    this.hooks.onEnd(this, this.result);
  }

  /** Admin action: stop the deal and give every human their entry back. */
  cancel() { this.finish(null, 'cancelled'); }

  // ---------- views ----------

  /** What one seat (or a spectator, seat = -1) is allowed to see. */
  view(forSeat: number) {
    const me = this.seats[forSeat];
    return {
      id: this.id,
      mode: this.mode,
      size: this.size,
      entry: this.entry,
      phase: this.phase,
      you: forSeat,
      hand: me ? me.hand : [],
      canDraw: !!me && this.turn === forSeat && me.status === 'playing' && !me.drawn && this.phase === 'playing',
      canDiscard: !!me && this.turn === forSeat && me.drawn && this.phase === 'playing',
      seats: this.seats.map((s) => ({
        idx: s.idx, name: s.name, code: s.code, color: s.color, isBot: s.kind === 'bot',
        cards: s.hand.length, status: s.status, lastThrown: s.lastThrown ?? null, connected: s.connected,
      })),
      open: this.pile[this.pile.length - 1] ?? null,
      recent: this.pile.slice(-4).map((p) => ({ card: p.card, by: p.by })),
      deckCount: this.deck.length,
      wild: this.wild,
      wildRank: this.wildRank,
      turn: this.turn,
      deadline: this.deadline,
      result: this.result,
    };
  }

  /** Admin view: everything, including hands. */
  adminView() {
    const stuck = this.phase === 'playing' && Date.now() - this.lastActionAt > 5 * 60_000;
    return {
      id: this.id, mode: this.mode, size: this.size, entry: this.entry, phase: this.phase,
      status: this.phase === 'waiting' ? 'waiting' : stuck ? 'stuck' : this.phase,
      seated: this.seats.length, humans: this.humans.length,
      startedAt: this.startedAt || null, createdAt: this.createdAt, lastActionAt: this.lastActionAt,
      turnCount: this.turnCount, deckCount: this.deck.length, open: this.pile[this.pile.length - 1]?.card ?? null,
      wild: this.wild, turn: this.turn,
      seats: this.seats.map((s) => ({ idx: s.idx, name: s.name, code: s.code, color: s.color, isBot: s.kind === 'bot', playerId: s.playerId ?? null, cards: s.hand.length, status: s.status, connected: s.connected, points: s.status === 'playing' ? arrange(s.hand.slice(0, 13), this.wildRank, 4000).points : s.dropPoints ?? null })),
    };
  }

  describe() { return `${this.id} ${this.mode} ${this.seats.length}/${this.size} entry ${this.entry}`; }

  // ---------- timers ----------

  private touch() { this.lastActionAt = Date.now(); }
  private later(ms: number, fn: () => void) {
    const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms);
    this.timers.add(t);
  }
  private clearTurnTimer() { if (this.turnTimer) clearTimeout(this.turnTimer); this.turnTimer = null; }
  private clearAll() { this.clearTurnTimer(); this.timers.forEach(clearTimeout); this.timers.clear(); }
  dispose() { this.clearAll(); }
}

export { label };
