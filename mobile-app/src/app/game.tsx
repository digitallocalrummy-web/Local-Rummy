import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { AnimatedModal } from '../components/AnimatedModal';
import { ChipBalance, formatChips } from '../components/ChipBalance';
import { SuitPattern } from '../components/Decor';
import { GameButton } from '../components/GameButton';
import { OpponentPanel, OpponentPill } from '../components/PlayerInfo';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { PlayingCard } from '../components/PlayingCard';
import { MODE_LABEL } from '../components/TableSetup';
import { HandCard, type Point } from '../game/HandCard';
import { BottomControls, CardDeck, DiscardFan, DiscardPile, GameHeader, GameTable, StatusBanner } from '../game/TableParts';
import { handSlots, useGameLayout } from '../game/useGameLayout';
import { useLayout } from '../hooks/useLayout';
import { initialsOf, useSession, type SeatView, type TableEvent } from '../net/session';
import { useSettings } from '../state/settings';
import { colors, fonts, motion } from '../theme';
import type { Card, Opponent } from '../types';

const suitOrder: Record<string, number> = { '♠': 0, '♥': 1, '♣': 2, '♦': 3, '★': 4 };
const rankOrder = (r: string) => ({ A: 1, J: 11, Q: 12, K: 13, JK: 14 } as Record<string, number>)[r] ?? parseInt(r, 10);
const sortCards = (cards: Card[]) => [...cards].sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || rankOrder(a.rank) - rankOrder(b.rank));
const emotes = ['Good luck!', 'Well played', 'Nice move', 'Hurry up!'];
const label = (c: Card) => (c.rank === 'JK' ? 'Joker' : c.rank + c.suit);

function toOpponent(seat: SeatView, turn: number): Opponent {
  const out = seat.status !== 'playing';
  return {
    id: `seat${seat.idx}`, name: seat.name, initials: seat.code || initialsOf(seat.name), color: seat.color, chips: 0,
    cardCount: seat.cards, isAI: seat.isBot, lastCard: seat.lastThrown ?? undefined,
    status: out ? 'dropped' : seat.idx === turn ? 'thinking' : seat.lastThrown ? 'last-played' : 'waiting',
  };
}

/** Compact seat for tables with 4–9 opponents. */
function SeatChip({ o, s, active, away }: { o: Opponent; s: number; active: boolean; away: boolean }) {
  return (
    <View accessible accessibilityLabel={`${o.name}, ${o.cardCount} cards${active ? ', playing now' : ''}`}
      style={{ width: 84 * s, alignItems: 'center', gap: 2 * s, paddingVertical: 4 * s, borderRadius: 12 * s, borderWidth: active ? 2 : 1, borderColor: active ? colors.goldBright : 'rgba(201,162,74,0.5)', backgroundColor: 'rgba(6,40,24,0.93)', opacity: o.status === 'dropped' ? 0.55 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * s }}>
        <PlayerAvatar player={o} size={26 * s} badge={o.cardCount} />
        {o.lastCard ? <PlayingCard card={o.lastCard} width={18 * s} /> : null}
      </View>
      <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: 10 * s, color: colors.textWhite, maxWidth: 78 * s }}>{o.name}</Text>
      <Text style={{ fontFamily: fonts.uiBold, fontSize: 7.5 * s, letterSpacing: 1, color: active ? colors.goldBright : colors.textMuted }}>
        {away ? 'OFFLINE' : o.status === 'dropped' ? 'DROPPED' : active ? 'PLAYING' : o.isAI ? 'AI' : 'WAITING'}
      </Text>
    </View>
  );
}

export default function GameScreen() {
  const screen = useLayout();
  const L = useGameLayout(screen);
  const { s, insets } = screen;
  const { animations, tap } = useSettings();
  const { table, me, config, connected, draw, discard, declare, drop, leave, chat, onEvent } = useSession();

  const deckPoint = useMemo(() => ({ x: L.deck.x + 2 * s, y: L.deck.y }), [L.deck, s]);
  const openPoint = useMemo(() => ({ x: L.open.x + 2 * s, y: L.open.y }), [L.open, s]);

  // the player's own arrangement of their cards; the server only knows which cards they hold
  const [order, setOrder] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [grouped, setGrouped] = useState(false);
  const [entering, setEntering] = useState<Record<string, { from: Point; delay: number }>>({});
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastFrom = useRef<'deck' | 'open' | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const flash = useCallback((msg: string, ms = 2600) => { setToast(msg); later(ms, () => setToast((t) => (t === msg ? null : t))); }, [later]);

  const serverHand = table?.hand;
  useEffect(() => {
    if (!serverHand) return;
    setOrder((prev) => {
      const ids = new Set(serverHand.map((c) => c.id));
      const kept = prev.filter((id) => ids.has(id));
      const added = serverHand.filter((c) => !kept.includes(c.id));
      if (!prev.length && added.length >= 13) {
        // first deal: every card flies in from the deck, then the hand is sorted
        const sorted = sortCards(added).map((c) => c.id);
        setEntering(Object.fromEntries(sorted.map((id, i) => [id, { from: deckPoint, delay: 200 + i * motion.dealStagger }])));
        return sorted;
      }
      if (added.length) {
        const from = lastFrom.current === 'open' ? openPoint : deckPoint;
        setEntering((e) => ({ ...e, ...Object.fromEntries(added.map((c) => [c.id, { from, delay: 0 }])) }));
        setSelected(added.map((c) => c.id));
      }
      return [...kept, ...added.map((c) => c.id)];
    });
  }, [serverHand, deckPoint, openPoint]);

  // table events: chat bubbles, declarations and the end of the deal
  useEffect(() => onEvent((e: TableEvent) => {
    const name = (i: number) => (i < 0 ? 'Local Rummy' : table?.seats[i]?.name ?? 'Player');
    if (e.type === 'chat') flash(`${name(e.seat)}: ${e.text}`);
    if (e.type === 'dropped' && e.seat !== table?.you) flash(`${name(e.seat)} dropped (${e.points} pts)`);
    if (e.type === 'declared' && e.seat !== table?.you) flash(e.valid ? `${name(e.seat)} declared!` : `${name(e.seat)} made a wrong show`);
    if (e.type === 'timeout' && e.seat === table?.you) flash('Time’s up · a card was played for you');
    if (e.type === 'ended') { tap('success'); later(1400, () => router.replace('/result')); }
  }), [onEvent, flash, later, tap, table?.seats, table?.you]);

  const byId = useMemo(() => new Map((table?.hand ?? []).map((c) => [c.id, c])), [table?.hand]);
  const hand = useMemo(() => order.map((id) => byId.get(id)).filter(Boolean) as Card[], [order, byId]);
  const slots = useMemo(() => handSlots(hand.map((c) => c.suit), L, grouped), [hand, L, grouped]);

  const myTurn = !!table && table.turn === table.you && table.phase === 'playing';
  const mySeat = table?.seats[table.you];
  const out = !!mySeat && mySeat.status !== 'playing';
  const canDraw = !!table?.canDraw && !busy;
  const canPickDiscard = !!table?.canDiscard && !discardingId && !busy;
  const canDiscard = canPickDiscard && selected.length === 1;

  const toggleSelect = useCallback((id: string) => {
    tap('light');
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  }, [tap]);

  const onDrop = useCallback((id: string, finalX: number) => {
    setOrder((o) => {
      const from = o.indexOf(id);
      if (from < 0) return o;
      let to = 0, best = Infinity;
      slots.xs.forEach((x, i) => { const d = Math.abs(x - finalX); if (d < best) { best = d; to = i; } });
      if (to === from) return o;
      const next = [...o];
      next.splice(to, 0, next.splice(from, 1)[0]);
      tap('light');
      setGrouped(false);
      return next;
    });
  }, [slots.xs, tap]);

  const doDraw = useCallback(async (from: 'deck' | 'open') => {
    if (!canDraw) return;
    setBusy(true);
    lastFrom.current = from;
    tap('medium');
    const r = await draw(from);
    setBusy(false);
    if (!r.ok) flash(r.error ?? 'Could not draw');
  }, [canDraw, draw, flash, tap]);

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

  // ---------- opponents ----------
  const opps = useMemo(() => {
    if (!table) return [] as { seat: SeatView; o: Opponent }[];
    const n = table.seats.length;
    const list: { seat: SeatView; o: Opponent }[] = [];
    for (let k = 1; k < n; k++) { const seat = table.seats[(table.you + k) % n]; list.push({ seat, o: toOpponent(seat, table.turn) }); }
    return list;
  }, [table]);

  const turnSeat = table && table.turn >= 0 ? table.seats[table.turn] : null;
  const status = !table ? 'Finding a seat…'
    : table.phase === 'waiting' ? `Waiting for players · ${table.seats.length}/${table.size}`
    : table.phase === 'ended' ? 'Deal over'
    : out ? 'You are out of this deal · watching'
    : table.turn < 0 ? 'Dealing cards…'
    : myTurn ? (table.canDraw ? 'Your turn · draw from the deck or open pile' : selected.length === 1 ? 'Tap Discard or drag the card up to throw it' : 'Select one card to discard')
    : `${turnSeat?.name ?? 'Opponent'} is playing…`;

  const recent = (table?.recent ?? []).slice(0, -1).map((r) => r.card);
  const meAsPlayer = { id: me?.id ?? 'me', name: me?.name ?? 'You', initials: initialsOf(me?.name ?? 'You'), color: me?.color ?? '#1F6B4A', chips: me?.chips ?? 0 };

  if (!table) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgTable, alignItems: 'center', justifyContent: 'center', gap: 14 * s }}>
        <ActivityIndicator color={colors.gold} />
        <Text style={{ fontFamily: fonts.uiBold, fontSize: 14 * s, color: colors.textWhite }}>{connected ? 'Finding a seat…' : 'Connecting…'}</Text>
        <GameButton s={s} variant="outline" label="Back to lobby" width={180} onPress={() => router.replace('/lobby')} />
      </View>
    );
  }

  const many = opps.length > 3;
  const topRowY = L.felt.y + 8 * s;
  const rowW = L.felt.w - 330 * s;
  const perRow = opps.length > 5 ? Math.ceil(opps.length / 2) : opps.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgTable }}>
      <SuitPattern />
      <View style={{ flex: 1, marginLeft: insets.left, marginRight: insets.right, marginTop: insets.top, marginBottom: insets.bottom }}>
        <GameTable rect={L.felt} s={s} />

        {/* Opponents */}
        {!many && opps.length === 1 && (
          <View pointerEvents="none" style={{ position: 'absolute', left: L.topSeat.x, top: L.topSeat.y, width: L.topSeat.w, alignItems: 'center' }}><OpponentPill opponent={opps[0].o} s={s} /></View>
        )}
        {!many && opps.length >= 2 && (
          <>
            <View style={{ position: 'absolute', left: L.leftSeat.x, top: L.leftSeat.y }}><OpponentPanel opponent={opps[0].o} s={s} /></View>
            {opps.length === 3 && <View pointerEvents="none" style={{ position: 'absolute', left: L.topSeat.x, top: L.topSeat.y, width: L.topSeat.w, alignItems: 'center' }}><OpponentPill opponent={opps[1].o} s={s} /></View>}
            <View style={{ position: 'absolute', left: L.rightSeat.x, top: L.rightSeat.y, zIndex: 2 }}><OpponentPanel opponent={opps[opps.length - 1].o} s={s} /></View>
          </>
        )}
        {many && opps.map(({ seat, o }, i) => {
          const row = i < perRow ? 0 : 1;
          const col = row === 0 ? i : i - perRow;
          const count = row === 0 ? perRow : opps.length - perRow;
          const gap = Math.min(92 * s, rowW / Math.max(1, count));
          const x = L.felt.x + 150 * s + col * gap + (row === 1 ? gap / 2 : 0);
          return (
            <View key={seat.idx} style={{ position: 'absolute', left: x, top: topRowY + row * 74 * s }}>
              <SeatChip o={o} s={s} active={seat.idx === table.turn} away={!seat.connected} />
            </View>
          );
        })}

        <GameHeader layout={L} onEmote={() => setEmoteOpen(true)} />

        {/* Centre */}
        <DiscardFan layout={L} cards={recent} />
        <StatusBanner layout={L} text={status} />
        {table.wild ? <CardDeck layout={L} joker={table.wild} active={canDraw} onDraw={() => doDraw('deck')} /> : null}
        {table.open ? <DiscardPile layout={L} card={table.open.card} active={canDraw} onDraw={() => doDraw('open')} /> : null}

        {/* You */}
        <View style={{ position: 'absolute', left: L.me.x, top: L.me.y, width: 100 * s, alignItems: 'center', gap: 4 * s }}>
          <PlayerAvatar player={meAsPlayer} size={42 * s} turnSeconds={myTurn && table.deadline ? config?.turnSeconds ?? 30 : undefined} />
          <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: 12 * s, color: colors.textWhite, maxWidth: 96 * s }}>{meAsPlayer.name} (You)</Text>
          <ChipBalance amount={me?.chips ?? 0} s={s} compact />
          {bubble ? (
            <Animated.View entering={FadeInUp.springify()} exiting={FadeOutUp}
              style={{ position: 'absolute', bottom: 100 * s, left: 0, paddingHorizontal: 12 * s, paddingVertical: 6 * s, borderRadius: 14 * s, backgroundColor: colors.goldBright }}>
              <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 12 * s, color: colors.goldInk }}>{bubble}</Text>
            </Animated.View>
          ) : null}
        </View>

        {/* Hand */}
        {hand.map((card, i) => (
          <HandCard
            key={card.id}
            card={card}
            index={i}
            x={slots.xs[i] ?? L.hand.left}
            y={L.hand.top}
            width={L.hand.cardW}
            lift={L.hand.lift}
            selected={selected.includes(card.id)}
            from={entering[card.id]?.from}
            delay={entering[card.id]?.delay}
            discardTo={openPoint}
            discarding={discardingId === card.id}
            canDiscard={canPickDiscard}
            animate={animations}
            onTap={toggleSelect}
            onDrop={onDrop}
            onDiscarded={onDiscarded}
          />
        ))}

        {/* Right rail */}
        <View style={{ position: 'absolute', left: L.rightCol.x + L.rightCol.w - 40 * s, top: L.felt.y + 14 * s }}>
          <GameButton s={s} round height={40} variant="outline" accessibilityLabel="Leave table" onPress={() => setLeaveOpen(true)} icon={<LogOut size={18 * s} color={colors.gold} />} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: L.rightCol.x, top: L.felt.y + 64 * s, width: L.rightCol.w, gap: 2 * s }}>
          <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 10 * s, color: colors.textWhite }}>{MODE_LABEL[table.mode]} · {table.id}</Text>
          <Text style={{ fontFamily: fonts.uiBold, fontSize: 9 * s, color: colors.gold }}>{table.size === 1 ? 'SOLO' : `${table.size} PLAYERS`} · {table.entry ? formatChips(table.entry) : 'FREE'}</Text>
          <Text style={{ fontFamily: fonts.uiBold, fontSize: 9 * s, color: colors.textMuted }}>Deck {table.deckCount}</Text>
        </View>
        <BottomControls
          layout={L}
          canDiscard={canDiscard}
          onSort={() => { setGrouped(false); setOrder(sortCards(hand).map((c) => c.id)); }}
          onGroup={() => { setOrder(sortCards(hand).map((c) => c.id)); setGrouped(true); }}
          onDiscard={() => { if (canDiscard) setDiscardingId(selected[0]); }}
          onDeclare={() => { if (table.canDiscard) setDeclareOpen(true); else flash('Draw a card first, then Declare.'); }}
        />

        {toast ? (
          <Animated.View entering={FadeIn} pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center', left: 0, right: 0, top: L.status.y - 34 * s, alignItems: 'center' }}>
            <Text style={{ overflow: 'hidden', paddingHorizontal: 14 * s, paddingVertical: 6 * s, borderRadius: 14 * s, backgroundColor: 'rgba(0,0,0,0.75)', fontFamily: fonts.uiBold, fontSize: 12 * s, color: colors.goldBright }}>{toast}</Text>
          </Animated.View>
        ) : null}

        {table.phase === 'waiting' && (
          <View style={{ position: 'absolute', left: L.felt.x, top: L.felt.y, width: L.felt.w, height: L.felt.h, alignItems: 'center', justifyContent: 'center', gap: 10 * s }}>
            <ActivityIndicator color={colors.gold} />
            <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 15 * s, color: colors.textWhite }}>Waiting for players · {table.seats.length}/{table.size}</Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: 12 * s, color: colors.textMuted }}>AI players fill the empty seats in a few seconds</Text>
          </View>
        )}
        {!connected && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 6 * s, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' }}>
            <Text style={{ paddingHorizontal: 14 * s, paddingVertical: 5 * s, borderRadius: 12 * s, backgroundColor: 'rgba(200,52,59,0.9)', fontFamily: fonts.uiBold, fontSize: 11 * s, color: '#fff', overflow: 'hidden' }}>Reconnecting… your turns are auto-played until you are back</Text>
          </View>
        )}
      </View>

      <AnimatedModal visible={declareOpen} title="DECLARE HAND?" onClose={() => setDeclareOpen(false)} width={460}>
        <Text style={{ fontFamily: fonts.ui, fontSize: 13 * s, lineHeight: 19 * s, color: colors.text, marginBottom: 16 * s }}>
          {selected.length === 1
            ? `You will throw ${label(hand.find((c) => c.id === selected[0]) ?? hand[0])} and show your other 13 cards. The server checks them: you need two sequences, one of them pure. A wrong show costs ${80} points.`
            : 'First select the one card you want to throw. Your other 13 cards are then checked.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 * s }}>
          <GameButton s={s} variant="outline" label="Keep playing" style={{ flex: 1 }} onPress={() => setDeclareOpen(false)} />
          <GameButton s={s} label="Declare" style={{ flex: 1 }} disabled={selected.length !== 1} onPress={doDeclare} />
        </View>
      </AnimatedModal>

      <AnimatedModal visible={leaveOpen} title="LEAVE TABLE?" onClose={() => setLeaveOpen(false)} width={440}>
        <Text style={{ fontFamily: fonts.ui, fontSize: 13 * s, lineHeight: 19 * s, color: colors.text, marginBottom: 16 * s }}>
          {table.phase === 'playing' && !out
            ? `Leaving now counts as a drop (${table.entry ? 'you pay the drop points' : 'free table'}).`
            : 'You can leave this table now.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 * s }}>
          <GameButton s={s} variant="outline" label="Stay" style={{ flex: 1 }} onPress={() => setLeaveOpen(false)} />
          {table.phase === 'playing' && !out && table.size > 1 ? (
            <GameButton s={s} variant="outline" label="Drop, keep watching" style={{ flex: 1.3 }} onPress={async () => { setLeaveOpen(false); const r = await drop(); if (!r.ok) flash(r.error ?? 'Could not drop'); }} />
          ) : null}
          <GameButton s={s} variant="danger" label="Leave" style={{ flex: 1 }} onPress={exit} />
        </View>
      </AnimatedModal>

      <AnimatedModal visible={emoteOpen} title="QUICK CHAT" onClose={() => setEmoteOpen(false)} width={420}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 * s }}>
          {(config?.quickChat === false ? [] : emotes).map((e) => (
            <Pressable key={e} accessibilityRole="button"
              onPress={() => { setEmoteOpen(false); setBubble(e); chat(e); later(2200, () => setBubble(null)); }}
              style={{ minHeight: 44, paddingHorizontal: 16 * s, justifyContent: 'center', borderRadius: 22 * s, borderWidth: 1, borderColor: colors.goldLine, backgroundColor: 'rgba(232,198,106,0.08)' }}>
              <Text style={{ fontFamily: fonts.uiBold, fontSize: 13 * s, color: colors.goldBright }}>{e}</Text>
            </Pressable>
          ))}
          {config?.quickChat === false && <Text style={{ fontFamily: fonts.ui, fontSize: 13 * s, color: colors.text }}>Quick chat is turned off right now.</Text>}
        </View>
      </AnimatedModal>
    </View>
  );
}
