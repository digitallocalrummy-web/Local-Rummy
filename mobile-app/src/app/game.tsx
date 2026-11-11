import { arrange, bestDiscard, type Card as RCard, type Rank } from '@local-rummy/rummy';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { AnimatedModal } from '../components/AnimatedModal';
import { formatChips } from '../components/ChipBalance';
import { SuitPattern } from '../components/Decor';
import { GameButton } from '../components/GameButton';
import { MODE_LABEL } from '../components/TableSetup';
import { HandCard } from '../game/HandCard';
import {
  Banner, Deck, Felt, FlyCard, Me, OpenPile, OpponentSeat, Riffle, RightRail, SEAT_LAYOUTS, Tray, useStage, type Flight,
} from '../game/Stage';
import { WaitingRoom } from '../game/WaitingRoom';
import { useLayout } from '../hooks/useLayout';
import { initialsOf, useSession, type SeatView, type TableEvent } from '../net/session';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';
import type { Card } from '../types';

const suitOrder: Record<string, number> = { '♠': 0, '♥': 1, '♣': 2, '♦': 3, '★': 4 };
const rankOrder = (r: string) => ({ A: 1, J: 11, Q: 12, K: 13, JK: 14 } as Record<string, number>)[r] ?? parseInt(r, 10);
const sortCards = (cards: Card[]) => [...cards].sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || rankOrder(a.rank) - rankOrder(b.rank));
const emotes = ['Good luck!', 'Well played', 'Nice move', 'Hurry up!'];
const label = (c: Card) => (c.rank === 'JK' ? 'Joker' : c.rank + c.suit);

/** Deal animation timing, the same as the web version (the server waits for it before the first turn). */
const RIFFLE_MS = 960;
const FLY_MS = 260;
const dealGap = (total: number) => Math.max(16, Math.min(80, Math.round(2200 / total)));
function dealTimeline(size: number) {
  const total = 13 * size, gap = dealGap(total);
  const lastLand = RIFFLE_MS + (total - 1) * gap + FLY_MS;
  const jokerAt = lastLand + 150;
  const openAt = jokerAt + 500;
  return { total, gap, lastLand, jokerAt, openAt, openLand: openAt + 300, end: openAt + 1300 };
}

/** Hand positions in stage units, the same formula as the web version. */
function handXs(hand: Card[], grouped: boolean) {
  const n = hand.length, gap = grouped ? 14 : 0;
  let breaks = 0;
  for (let i = 1; i < n; i++) if (hand[i].suit !== hand[i - 1].suit) breaks++;
  const area = 600, step = Math.min(44, (area - 66 - breaks * gap) / Math.max(1, n - 1));
  const total = step * (n - 1) + 66 + breaks * gap;
  let x = 150 + (area - total) / 2;
  return hand.map((c, i) => { if (i > 0) { x += step; if (grouped && c.suit !== hand[i - 1].suit) x += gap; } return x; });
}

function seatStatus(seat: SeatView, active: boolean) {
  if (!seat.connected) return 'OFFLINE';
  if (seat.status === 'dropped') return 'DROPPED';
  if (seat.status === 'invalid') return 'WRONG SHOW';
  if (active) return 'THINKING…';
  if (seat.lastThrown) return `THREW ${label(seat.lastThrown)}`;
  return seat.isBot ? 'WAITING · AI' : 'WAITING';
}

export default function GameScreen() {
  const screen = useLayout();
  const st = useStage(screen);
  const { animations, tap, sfx } = useSettings();
  const { table, me, config, connected, draw, discard, declare, drop, leave, chat, onEvent } = useSession();
  const z = st.z;
  const cardW = z(66);
  const deckTL = useMemo(() => ({ x: st.x(352), y: st.y(162) }), [st.x, st.y]); // eslint-disable-line react-hooks/exhaustive-deps
  const openTL = useMemo(() => ({ x: st.x(500) - z(2), y: st.y(162) - z(4) }), [st.x, st.y, z]); // eslint-disable-line react-hooks/exhaustive-deps

  // the player's own arrangement of their cards; the server only knows which cards they hold
  const [order, setOrder] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [grouped, setGrouped] = useState(false);
  const [entering, setEntering] = useState<Record<string, { from: { x: number; y: number }; delay: number }>>({});
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [deal, setDeal] = useState<{ at: number; order: number[]; size: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const lastFrom = useRef<'deck' | 'open' | null>(null);
  const dealRef = useRef<{ at: number; order: number[]; size: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const flash = useCallback((msg: string, ms = 2600) => { setToast(msg); later(ms, () => setToast((t) => (t === msg ? null : t))); }, [later]);

  const tl = useMemo(() => (deal ? dealTimeline(deal.size) : null), [deal]);
  const elapsed = deal ? now - deal.at : Infinity;
  const dealing = !!tl && animations && elapsed < tl.end;

  // tick while the deal animation runs, to reveal the deck, joker and open card on time
  useEffect(() => {
    if (!deal || !tl) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t - deal.at > tl.end) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [deal, tl]);

  // ---------- seats ----------
  const opps = useMemo(() => {
    if (!table) return [] as { seat: SeatView; at: { x: number; y: number } }[];
    const n = table.seats.length;
    const layout = SEAT_LAYOUTS[Math.min(9, n - 1)] ?? [];
    const list: { seat: SeatView; at: { x: number; y: number } }[] = [];
    for (let k = 1; k < n; k++) list.push({ seat: table.seats[(table.you + k) % n], at: layout[k - 1] ?? { x: 415, y: 46 } });
    return list;
  }, [table]);
  const seatCentre = useCallback((idx: number) => {
    const o = opps.find((x) => x.seat.idx === idx);
    return o ? { x: st.x(o.at.x), y: st.y(o.at.y) } : { x: st.x(76), y: st.y(366) };
  }, [opps, st]);
  const seatRef = useRef(seatCentre);
  useEffect(() => { seatRef.current = seatCentre; }, [seatCentre]);

  // ---------- hand ----------
  const serverHand = table?.hand;
  const orderRef = useRef<string[]>([]);
  useEffect(() => { orderRef.current = order; }, [order]);
  const posRef = useRef({ deckTL, openTL });
  useEffect(() => { posRef.current = { deckTL, openTL }; }, [deckTL, openTL]);
  const youRef = useRef(table?.you ?? 0);
  useEffect(() => { youRef.current = table?.you ?? 0; }, [table?.you]);
  useEffect(() => {
    if (!serverHand) return;
    const prev = orderRef.current;
    const ids = new Set(serverHand.map((c) => c.id));
    const kept = prev.filter((id) => ids.has(id));
    const added = serverHand.filter((c) => !kept.includes(c.id));
    if (!added.length && kept.length === prev.length) return; // nothing changed
    const { deckTL: deck, openTL: open } = posRef.current;
    let next: string[];
    if (!kept.length && added.length >= 13) {
      // first deal: each card flies from the deck in its dealing round, then the hand is sorted
      next = sortCards(added).map((c) => c.id);
      const d = dealRef.current;
      const t = Date.now();
      const fresh = !!d && t - d.at < 4000;
      const pos = d && fresh ? Math.max(0, d.order.indexOf(youRef.current)) : 0;
      const gap = d && fresh ? dealGap(13 * d.size) : 0;
      const base = d && fresh ? RIFFLE_MS - (t - d.at) : 0;
      const size = d?.size ?? 1;
      setEntering(Object.fromEntries(next.map((id, i) => [id, { from: deck, delay: Math.max(0, fresh ? base + (i * size + pos) * gap : 120 + i * 40) }])));
    } else {
      next = [...kept, ...added.map((c) => c.id)];
      if (added.length) {
        const from = lastFrom.current === 'open' ? open : deck;
        setEntering((e) => ({ ...e, ...Object.fromEntries(added.map((c) => [c.id, { from, delay: 0 }])) }));
        setSelected(added.map((c) => c.id));
      }
    }
    orderRef.current = next;
    setOrder(next);
  }, [serverHand, deal?.at]);

  // ---------- table events: deal animation, opponents' draws and throws, chat ----------
  useEffect(() => onEvent((e: TableEvent) => {
    const name = (i: number) => (i < 0 ? 'Local Rummy' : table?.seats[i]?.name ?? 'Player');
    const you = table?.you ?? -1;
    if (e.type === 'dealt') {
      const d = { at: Date.now(), order: (e as { order?: number[] }).order ?? [], size: ((e as { order?: number[] }).order ?? []).length || 1 };
      dealRef.current = d;
      orderRef.current = []; setOrder([]); setSelected([]); setGrouped(false);
      setDeal(d); setNow(d.at);
      // riffle, then one flick per card as it flies out (same timing as the animation)
      sfx('shuffle');
      if (animations) {
        const tlx = dealTimeline(d.size);
        for (let n = 0; n < tlx.total; n += 1) later(RIFFLE_MS + n * tlx.gap, () => sfx('deal'));
      }
    }
    if (e.type === 'drew' && e.seat !== you) sfx('card');
    if (e.type === 'discarded') sfx('card');
    if (e.type === 'drew' && e.seat !== you && animations) {
      const to = seatRef.current(e.seat);
      const from = e.from === 'open' ? openTL : deckTL;
      setFlights((f) => [...f, { id: `d${Date.now()}${e.seat}`, card: e.card ?? null, from, to: { x: to.x - cardW / 2, y: to.y - cardW * 0.725 }, delay: 0, dur: 340, s1: 0.4 }]);
    }
    if (e.type === 'discarded' && e.seat !== you && animations) {
      const fromC = seatRef.current(e.seat);
      setFlights((f) => [...f, { id: `t${Date.now()}${e.seat}`, card: e.card, from: { x: fromC.x - cardW / 2, y: fromC.y - cardW * 0.725 }, to: openTL, delay: 0, dur: 420, s0: 0.4, s1: 0.94, r0: fromC.x > st.x(600) ? 20 : -20 }]);
    }
    if (e.type === 'chat') flash(`${name(e.seat)}: ${e.text}`);
    if (e.type === 'dropped' && e.seat !== you) flash(`${name(e.seat)} dropped (${e.points} pts)`);
    if (e.type === 'declared' && e.seat !== you) flash(e.valid ? `${name(e.seat)} declared!` : `${name(e.seat)} made a wrong show`);
    if (e.type === 'timeout' && e.seat === you) flash('Time’s up · a card was played for you');
    if (e.type === 'ended') { tap('success'); later(1400, () => router.replace('/result')); }
  }), [onEvent, flash, later, tap, sfx, table?.seats, table?.you, animations, deckTL, openTL, cardW, st]);

  // remove finished flights
  useEffect(() => {
    if (!flights.length) return;
    const t = setTimeout(() => setFlights([]), 700); // every flight is over by then
    return () => clearTimeout(t);
  }, [flights]);

  // deal flights to every opponent (your own cards fly in as hand cards)
  const dealFlights = useMemo<Flight[]>(() => {
    if (!deal || !tl || !table || !animations) return [];
    const out: Flight[] = [];
    const ord = deal.order.length ? deal.order : table.seats.map((s) => s.idx);
    for (let n = 0; n < tl.total; n++) {
      const who = ord[n % ord.length];
      if (who === table.you) continue;
      const c = seatCentre(who);
      const delay = RIFFLE_MS + n * tl.gap - (now - deal.at);
      if (delay + FLY_MS < 0) continue;
      out.push({ id: `deal${deal.at}-${n}-${opps.length}`, card: null, from: deckTL, to: { x: c.x - cardW / 2, y: c.y - cardW * 0.725 }, delay: Math.max(0, delay), dur: FLY_MS, s1: 0.4, r1: c.x > st.x(600) ? 22 : c.x < st.x(200) ? -22 : 12 });
    }
    return out;
    // rebuilt only when a deal starts or the seats fill in, not on every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.at, opps.length]);

  const byId = useMemo(() => new Map((table?.hand ?? []).map((c) => [c.id, c])), [table?.hand]);
  const hand = useMemo(() => order.map((id) => byId.get(id)).filter(Boolean) as Card[], [order, byId]);
  const xs = useMemo(() => handXs(hand, grouped).map((x) => st.x(x)), [hand, grouped, st]);
  const wildRank = table?.wildRank ?? null;
  const isWild = (c: Card) => c.rank === 'JK' || (!!wildRank && c.rank === wildRank);

  const myPoints = useMemo(() => {
    if (!wildRank || hand.length < 13) return null;
    const h = hand as unknown as RCard[];
    return h.length > 13 ? bestDiscard(h, wildRank as Rank).pointsAfter : arrange(h, wildRank as Rank, 8000).points;
  }, [hand, wildRank]);

  const myTurn = !!table && table.turn === table.you && table.phase === 'playing';
  const mySeat = table?.seats[table.you];
  const out = !!mySeat && mySeat.status !== 'playing';
  const canDraw = !!table?.canDraw && !busy && !dealing;
  const canPickDiscard = !!table?.canDiscard && !discardingId && !busy;
  const canDiscard = canPickDiscard && selected.length === 1;

  // chime when your turn starts, and a soft tick for the last 5 seconds
  const turnKey = myTurn && !dealing ? table?.deadline ?? 0 : null;
  useEffect(() => {
    if (turnKey == null) return;
    sfx('turn');
    if (!turnKey) return;
    let last = -1;
    const id = setInterval(() => {
      const left = Math.ceil((turnKey - Date.now()) / 1000);
      if (left <= 5 && left > 0 && left !== last) { last = left; sfx('tick'); }
    }, 200);
    return () => clearInterval(id);
  }, [turnKey, sfx]);

  const toggleSelect = useCallback((id: string) => {
    tap('light');
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  }, [tap]);

  const onDrop = useCallback((id: string, finalX: number) => {
    setOrder((o) => {
      const from = o.indexOf(id);
      if (from < 0) return o;
      let to = 0, best = Infinity;
      xs.forEach((x, i) => { const d = Math.abs(x - finalX); if (d < best) { best = d; to = i; } });
      if (to === from) return o;
      const next = [...o];
      next.splice(to, 0, next.splice(from, 1)[0]);
      tap('light');
      setGrouped(false);
      return next;
    });
  }, [xs, tap]);

  const doDraw = useCallback(async (from: 'deck' | 'open') => {
    if (!canDraw) return;
    setBusy(true);
    lastFrom.current = from;
    tap('medium');
    const r = await draw(from);
    setBusy(false);
    if (!r.ok) flash(r.error ?? 'Could not draw');
    else sfx('card');
  }, [canDraw, draw, flash, tap, sfx]);

  const onDiscarded = useCallback(async (id: string) => {
    const r = await discard(id);
    setDiscardingId(null);
    setSelected([]);
    if (!r.ok) flash(r.error ?? 'Could not discard');
  }, [discard, flash]);

  const doDeclare = async () => {
    setDeclareOpen(false);
    if (selected.length !== 1) { flash('Select the one card you want to throw, then Declare.'); return; }
    setBusy(true);
    const r = await declare(selected[0]);
    setBusy(false);
    if (!r.ok) flash(r.error ?? 'That is not a valid declaration yet.', 4000);
  };

  const exit = async () => {
    setLeaveOpen(false);
    await leave();
    router.replace('/lobby');
  };

  if (!table) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgTable, alignItems: 'center', justifyContent: 'center', gap: 14 * st.k }}>
        <ActivityIndicator color={colors.gold} />
        <Text style={{ fontFamily: fonts.uiBold, fontSize: 14 * st.k, color: colors.textWhite }}>{connected ? 'Finding a seat…' : 'Connecting…'}</Text>
        <GameButton s={st.k} variant="outline" label="Back to lobby" width={180} onPress={() => router.replace('/lobby')} />
      </View>
    );
  }

  // ---------- what to show ----------
  const turnSeat = table.turn >= 0 ? table.seats[table.turn] : null;
  const wildLabel = table.wild ? (table.wild.rank === 'JK' ? 'A' : table.wild.rank) : '';
  const meName = me?.name ?? 'You';
  const meCode = initialsOf(meName);
  let status: string;
  if (table.phase === 'waiting') status = table.privateCode ? `Table code ${table.privateCode} · ${table.seats.length}/${table.size} joined` : `Waiting for players · ${table.seats.length}/${table.size}`;
  else if (dealing && tl && elapsed < RIFFLE_MS) status = 'Shuffling the deck…';
  else if (dealing && tl && elapsed < tl.jokerAt) status = table.size === 1 ? 'Dealing your 13 cards…' : `Dealing 13 cards to each of ${table.size} players…`;
  else if (dealing && tl && elapsed < tl.openLand + 600) status = `Wild joker is ${wildLabel}${table.wild && table.wild.rank !== 'JK' ? table.wild.suit : ''} · every ${wildLabel} is wild`;
  else if (table.phase === 'ended') status = 'Deal over';
  else if (out) status = 'You are out of this deal · watching';
  else if (table.turn < 0) status = 'Dealing cards…';
  else if (myTurn) status = table.canDraw ? 'Your turn · draw from the deck or open pile' : selected.length === 1 ? 'Tap Discard, or drag the card up onto the table' : 'Select one card to discard';
  else status = `${turnSeat?.name ?? 'Opponent'}’s turn · thinking…`;
  const bannerWho = !dealing && turnSeat && !myTurn ? { code: turnSeat.code, color: turnSeat.color } : { code: meCode, color: me?.color ?? '#1F6B4A' };
  const hot = !dealing && !!turnSeat && !myTurn && table.phase === 'playing';

  // during the deal the seat counters climb as cards land
  const dealtTo = (idx: number) => {
    if (!dealing || !tl || !deal) return null;
    const pos = Math.max(0, deal.order.indexOf(idx));
    const landed = Math.floor((elapsed - RIFFLE_MS - FLY_MS - pos * tl.gap) / (deal.size * tl.gap)) + 1;
    return Math.max(0, Math.min(13, landed));
  };

  const recent = (table.recent ?? []).slice(0, -1);
  const showDeck = !(dealing && elapsed < RIFFLE_MS);
  const showJoker = !dealing || (!!tl && elapsed >= tl.jokerAt);
  const showOpen = !dealing || (!!tl && elapsed >= tl.openLand);
  const mode = MODE_LABEL[table.mode];
  const info = `${table.size === 1 ? 'SOLO' : `${table.size} PLAYERS`} · ${table.entry ? formatChips(table.entry) : 'FREE'}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgTable }}>
      <SuitPattern />
      <Felt st={st} />

      {opps.map(({ seat, at }) => {
        const active = seat.idx === table.turn && table.phase === 'playing' && !dealing;
        const dealt = dealtTo(seat.idx);
        return (
          <OpponentSeat key={seat.idx} st={st} at={at} seat={seat} cards={dealt ?? seat.cards} active={active}
            status={seatStatus(seat, active)} turnSeconds={active && table.deadline ? config?.turnSeconds ?? 30 : undefined} />
        );
      })}

      <Tray st={st} recent={recent} seats={table.seats} />
      <Banner st={st} text={status} who={bannerWho} hot={hot} />
      {table.phase === 'waiting' && !table.privateCode ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: st.x(352), top: st.y(170), width: z(214), alignItems: 'center', gap: z(8) }}>
          <ActivityIndicator color={colors.gold} />
          <Text style={{ fontFamily: fonts.uiBold, fontSize: z(11), color: '#CFE3D6' }}>AI players fill the empty seats soon</Text>
        </View>
      ) : (<>
      <Deck st={st} joker={table.wild} showJoker={showJoker} showDeck={showDeck} can={canDraw} onDraw={() => doDraw('deck')} />
      <OpenPile st={st} card={showOpen ? table.open?.card ?? null : null} wild={!!table.open && isWild(table.open.card)} can={canDraw && !!table.open} onDraw={() => doDraw('open')} />
      </>)}

      <Me st={st} name={meName} initials={meCode} color={me?.color ?? '#1F6B4A'} chips={formatChips(me?.chips ?? 0)}
        turnSeconds={myTurn && table.deadline && !dealing ? config?.turnSeconds ?? 30 : undefined} />
      {bubble ? (
        <Animated.View entering={FadeInUp.springify()} exiting={FadeOutUp} pointerEvents="none"
          style={{ position: 'absolute', left: st.x(30), top: st.y(262), paddingHorizontal: z(12), paddingVertical: z(6), borderRadius: z(14), backgroundColor: colors.goldBright }}>
          <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(12), color: colors.goldInk }}>{bubble}</Text>
        </Animated.View>
      ) : null}

      {hand.map((card, i) => (
        <HandCard
          key={card.id}
          card={card}
          index={i}
          x={xs[i] ?? st.x(150)}
          y={st.y(316)}
          width={cardW}
          lift={z(18)}
          selected={selected.includes(card.id)}
          wild={isWild(card)}
          from={entering[card.id]?.from}
          delay={entering[card.id]?.delay}
          discardTo={openTL}
          discarding={discardingId === card.id}
          canDiscard={canPickDiscard}
          animate={animations}
          onTap={toggleSelect}
          onDrop={onDrop}
          onDiscarded={onDiscarded}
        />
      ))}

      <RightRail
        st={st}
        modeName={mode}
        info={info}
        pointsLabel="YOUR POINTS"
        points={myPoints == null || dealing ? '–' : String(myPoints)}
        canDiscard={canDiscard}
        canDeclare={!!table.canDiscard && !busy}
        onEmote={() => setEmoteOpen(true)}
        onLeave={() => setLeaveOpen(true)}
        onSort={() => { tap(); setGrouped(false); setOrder(sortCards(hand).map((c) => c.id)); }}
        onGroup={() => { tap(); setOrder(sortCards(hand).map((c) => c.id)); setGrouped(true); }}
        onDiscard={() => { if (canDiscard) setDiscardingId(selected[0]); }}
        onDeclare={() => setDeclareOpen(true)}
      />

      {dealing && elapsed < RIFFLE_MS ? <Riffle st={st} ms={RIFFLE_MS} /> : null}
      {dealFlights.map((f) => <FlyCard key={f.id} f={f} w={z(62)} />)}
      {dealing && tl && table.open ? (
        <FlyCard key={`open${deal?.at}`} f={{ id: 'open', card: table.open.card, from: deckTL, to: openTL, delay: Math.max(0, tl.openAt - elapsed), dur: 300, r0: -10, s1: 0.94 }} w={cardW} />
      ) : null}
      {flights.map((f) => <FlyCard key={f.id} f={f} w={cardW} />)}

      {toast ? (
        <Animated.View entering={FadeIn} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: st.y(96), alignItems: 'center' }}>
          <Text style={{ overflow: 'hidden', paddingHorizontal: z(14), paddingVertical: z(6), borderRadius: z(14), backgroundColor: 'rgba(0,0,0,0.75)', fontFamily: fonts.uiBold, fontSize: z(12), color: colors.goldBright }}>{toast}</Text>
        </Animated.View>
      ) : null}

      {table.phase === 'waiting' && !!table.privateCode && <WaitingRoom table={table} rect={{ x: st.x(14), y: st.y(12), w: z(806), h: z(408) }} s={st.k} />}
      {!connected && (
        <View pointerEvents="none" style={{ position: 'absolute', top: st.y(4), left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ paddingHorizontal: z(14), paddingVertical: z(5), borderRadius: z(12), backgroundColor: 'rgba(200,52,59,0.9)', fontFamily: fonts.uiBold, fontSize: z(11), color: '#fff', overflow: 'hidden' }}>Reconnecting… your turns are auto-played until you are back</Text>
        </View>
      )}

      <AnimatedModal visible={declareOpen} title="DECLARE HAND?" onClose={() => setDeclareOpen(false)} width={460}>
        <Text style={{ fontFamily: fonts.ui, fontSize: 13 * st.k, lineHeight: 19 * st.k, color: colors.text, marginBottom: 16 * st.k }}>
          {selected.length === 1
            ? `You will throw ${label(hand.find((c) => c.id === selected[0]) ?? hand[0])} and show your other 13 cards. The server checks them: you need two sequences, one of them pure. A wrong show costs 80 points.`
            : 'First select the one card you want to throw. Your other 13 cards are then checked.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 * st.k }}>
          <GameButton s={st.k} variant="outline" label="Keep playing" style={{ flex: 1 }} onPress={() => setDeclareOpen(false)} />
          <GameButton s={st.k} label="Declare" style={{ flex: 1 }} disabled={selected.length !== 1} onPress={doDeclare} />
        </View>
      </AnimatedModal>

      <AnimatedModal visible={leaveOpen} title="LEAVE TABLE?" onClose={() => setLeaveOpen(false)} width={440}>
        <Text style={{ fontFamily: fonts.ui, fontSize: 13 * st.k, lineHeight: 19 * st.k, color: colors.text, marginBottom: 16 * st.k }}>
          {table.phase === 'playing' && !out ? `Leaving now counts as a drop (${table.entry ? 'you pay the drop points' : 'free table'}).` : 'You can leave this table now.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 * st.k }}>
          <GameButton s={st.k} variant="outline" label="Stay" style={{ flex: 1 }} onPress={() => setLeaveOpen(false)} />
          {table.phase === 'playing' && !out && table.size > 1 ? (
            <GameButton s={st.k} variant="outline" label="Drop, keep watching" style={{ flex: 1.3 }} onPress={async () => { setLeaveOpen(false); const r = await drop(); if (!r.ok) flash(r.error ?? 'Could not drop'); }} />
          ) : null}
          <GameButton s={st.k} variant="danger" label="Leave" style={{ flex: 1 }} onPress={exit} />
        </View>
      </AnimatedModal>

      <AnimatedModal visible={emoteOpen} title="QUICK CHAT" onClose={() => setEmoteOpen(false)} width={420}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 * st.k }}>
          {(config?.quickChat === false ? [] : emotes).map((e) => (
            <Pressable key={e} accessibilityRole="button"
              onPress={() => { setEmoteOpen(false); setBubble(e); chat(e); later(2200, () => setBubble(null)); }}
              style={{ minHeight: 44, paddingHorizontal: 16 * st.k, justifyContent: 'center', borderRadius: 22 * st.k, borderWidth: 1, borderColor: colors.goldLine, backgroundColor: 'rgba(232,198,106,0.08)' }}>
              <Text style={{ fontFamily: fonts.uiBold, fontSize: 13 * st.k, color: colors.goldBright }}>{e}</Text>
            </Pressable>
          ))}
          {config?.quickChat === false && <Text style={{ fontFamily: fonts.ui, fontSize: 13 * st.k, color: colors.text }}>Quick chat is turned off right now.</Text>}
        </View>
      </AnimatedModal>
    </View>
  );
}
