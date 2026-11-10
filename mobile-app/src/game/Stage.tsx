/**
 * The game table laid out exactly like the web version: a 960×432 stage, scaled to fit the phone.
 * All positions below are in stage units and converted with `k` (scale) and `ox/oy` (offset).
 */
import { ArrowDownUp, Layers, LogOut, Smile } from 'lucide-react-native';
import { memo, useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { CardBack, PlayingCard } from '../components/PlayingCard';
import type { Layout } from '../hooks/useLayout';
import type { SeatView } from '../net/session';
import { colors, fonts } from '../theme';
import type { Card } from '../types';

export const STAGE_W = 960;
export const STAGE_H = 432;
const GOLD3 = '#C9A24A';
const MUTE = '#9FC2AD';

export interface Stage { k: number; ox: number; oy: number; x: (n: number) => number; y: (n: number) => number; z: (n: number) => number }

export function useStage(L: Layout): Stage {
  const k = L.s;
  const ox = L.insets.left + (L.safeW - STAGE_W * k) / 2;
  const oy = L.insets.top + (L.safeH - STAGE_H * k) / 2;
  return { k, ox, oy, x: (n) => ox + n * k, y: (n) => oy + n * k, z: (n) => n * k };
}

/** Absolute box at stage coordinates. */
export function At({ st, x, y, w, h, children, style, pointerEvents }: {
  st: Stage; x: number; y: number; w?: number; h?: number; children?: ReactNode; style?: ViewStyle; pointerEvents?: 'none' | 'box-none' | 'auto';
}) {
  return (
    <View pointerEvents={pointerEvents} style={[{ position: 'absolute', left: st.x(x), top: st.y(y), width: w != null ? st.z(w) : undefined, height: h != null ? st.z(h) : undefined }, style]}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- felt

export function Felt({ st }: { st: Stage }) {
  const z = st.z;
  return (
    <>
      {/* outer dark band and thin gold rim around the felt */}
      <At st={st} x={14 - 5} y={12 - 5} w={806 + 10} h={408 + 10} style={{ borderRadius: z(35), borderWidth: z(1), borderColor: '#8a6a2a', backgroundColor: '#2a1d08' }} pointerEvents="none" />
      <At st={st} x={14} y={12} w={806} h={408} pointerEvents="none"
        style={{ borderRadius: z(30), borderWidth: Math.max(2, z(3)), borderColor: GOLD3, backgroundColor: '#127a44', overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }}>
        {/* soft light in the middle, darker edges */}
        <View style={{ position: 'absolute', left: '8%', top: '8%', width: '84%', height: '84%', borderRadius: z(200), backgroundColor: '#168049', opacity: 0.55 }} />
        <View style={{ position: 'absolute', left: '22%', top: '18%', width: '56%', height: '60%', borderRadius: z(200), backgroundColor: '#1b8a52', opacity: 0.35 }} />
        <View style={{ position: 'absolute', left: z(10), top: z(10), right: z(10), bottom: z(10), borderRadius: z(22), borderWidth: 1, borderColor: 'rgba(232,198,106,0.28)' }} />
      </At>
      {/* the oval under the deck */}
      <At st={st} x={267} y={125} w={300} h={150} pointerEvents="none" style={{ borderRadius: z(150), borderWidth: 1, borderColor: 'rgba(232,198,106,0.16)' }} />
    </>
  );
}

// ---------------------------------------------------------------- seats

/** Seat centres for 0–9 opponents, in turn order (clockwise from your left). Same as the web version. */
const T = (x: number) => ({ x, y: 46 });
const SL = { x: 80, y: 124 }, TL = { x: 84, y: 46 }, TR = { x: 746, y: 46 }, SR = { x: 770, y: 124 }, SR2 = { x: 770, y: 200 };
export const SEAT_LAYOUTS: { x: number; y: number }[][] = [
  [], [T(415)], [T(250), T(580)], [SL, T(415), SR], [SL, T(290), T(540), SR],
  [SL, T(220), T(415), T(610), SR], [SL, T(200), T(330), T(460), T(590), SR],
  [SL, TL, T(250), T(415), T(580), TR, SR], [SL, TL, T(215), T(345), T(475), T(605), TR, SR],
  [SL, TL, T(215), T(345), T(475), T(605), TR, SR, SR2],
];

export const MiniCard = ({ card, w }: { card: Card; w: number }) => (
  <View style={{ width: w, height: w * 1.41, borderRadius: w * 0.14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd3bd', alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontFamily: fonts.card, fontSize: w * 0.45, lineHeight: w * 0.52, color: card.rank === 'JK' ? colors.joker : card.suit === '♥' || card.suit === '♦' ? '#C8102E' : '#16181D' }}>{card.rank === 'JK' ? 'J' : card.rank}</Text>
    <Text style={{ fontSize: w * 0.45, lineHeight: w * 0.5, color: card.suit === '♥' || card.suit === '♦' ? '#C8102E' : '#16181D' }}>{card.suit}</Text>
  </View>
);

export const OpponentSeat = memo(function OpponentSeat({ st, at, seat, cards, active, status, turnSeconds }: {
  st: Stage; at: { x: number; y: number }; seat: SeatView; cards: number; active: boolean; status: string; turnSeconds?: number;
}) {
  const z = st.z;
  const out = seat.status !== 'playing';
  return (
    <At st={st} x={at.x - 48} y={at.y - 35} w={96} h={70}
      style={{
        borderRadius: z(12), borderWidth: Math.max(1.5, z(2)), borderColor: active ? '#F5C542' : GOLD3, backgroundColor: 'rgba(6,40,24,0.93)',
        alignItems: 'center', justifyContent: 'center', gap: z(1), opacity: out ? 0.6 : 1, zIndex: 3,
        shadowColor: active ? '#F5C542' : '#000', shadowOpacity: active ? 0.8 : 0.35, shadowRadius: active ? 14 : 7, shadowOffset: { width: 0, height: active ? 0 : 4 }, elevation: active ? 10 : 4,
      }}>
      <View accessible accessibilityLabel={`${seat.name}, ${cards} cards, ${status}`} style={{ flexDirection: 'row', alignItems: 'center', gap: z(7) }}>
        <View style={{ width: z(40), height: z(40), alignItems: 'center', justifyContent: 'center' }}>
          <PlayerAvatar player={{ name: seat.name, initials: seat.code, color: seat.color }} size={z(30)} badge={cards} turnSeconds={turnSeconds} />
        </View>
        <View style={{ width: z(22), height: z(31), alignItems: 'center', justifyContent: 'center' }}>
          {seat.lastThrown ? <MiniCard card={seat.lastThrown} w={z(22)} /> : <CardBack width={z(20)} showMark={false} />}
        </View>
      </View>
      <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: z(11), lineHeight: z(13), color: '#F4EEDC', maxWidth: z(90) }}>{seat.name}</Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: z(8), lineHeight: z(10), letterSpacing: z(1), color: active ? '#F5C542' : MUTE, maxWidth: z(90) }}>{status}</Text>
    </At>
  );
});

// ---------------------------------------------------------------- centre

export function Tray({ st, recent, seats }: { st: Stage; recent: { card: Card; by: number }[]; seats: SeatView[] }) {
  const z = st.z;
  const rots = [-18, -6, 6, 16];
  return (
    <At st={st} x={40} y={166} w={186} h={114} pointerEvents="none" style={{ borderRadius: z(12), backgroundColor: 'rgba(4,40,22,0.55)', borderWidth: 1, borderColor: 'rgba(232,198,106,0.2)' }}>
      <Text style={{ position: 'absolute', left: z(12), top: z(8), fontFamily: fonts.uiHeavy, fontSize: z(9), letterSpacing: z(1.6), color: MUTE }}>DISCARDS · WHO THREW</Text>
      {recent.length === 0 ? (
        <Text style={{ position: 'absolute', left: 0, right: 0, top: z(52), textAlign: 'center', fontFamily: fonts.ui, fontSize: z(10), color: 'rgba(207,227,214,0.55)' }}>No cards thrown yet</Text>
      ) : recent.map((d, i) => {
        const by = d.by >= 0 ? seats[d.by] : null;
        return (
          <View key={d.card.id + i} style={{ position: 'absolute', left: z(16 + i * 32), top: z(28 + Math.abs(i - 1.5) * 4), transform: [{ rotate: `${rots[i]}deg` }] }}>
            <PlayingCard card={d.card} width={z(46)} />
            {by ? (
              <View style={{ position: 'absolute', right: -z(6), bottom: -z(6), width: z(20), height: z(20), borderRadius: z(10), borderWidth: 1.5, borderColor: colors.gold, backgroundColor: by.color, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(8), color: '#FFF4DA' }}>{by.code}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </At>
  );
}

export function Banner({ st, text, who, hot }: { st: Stage; text: string; who: { code: string; color: string }; hot: boolean }) {
  const z = st.z;
  return (
    <At st={st} x={290} y={122} w={360} pointerEvents="none" style={{ alignItems: 'center' }}>
      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: z(8), paddingLeft: z(6), paddingRight: z(14), paddingVertical: z(5), borderRadius: z(16), backgroundColor: 'rgba(0,0,0,0.42)', borderWidth: 1, borderColor: hot ? 'rgba(245,197,66,0.9)' : 'rgba(232,198,106,0.4)' }}>
        <View style={{ width: z(20), height: z(20), borderRadius: z(10), borderWidth: 1.5, borderColor: colors.gold, backgroundColor: who.color, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(8), color: '#FFF4DA' }}>{who.code}</Text>
        </View>
        <Text numberOfLines={1} style={{ fontFamily: fonts.uiBold, fontSize: z(11), letterSpacing: z(0.5), color: '#F7E7B6', maxWidth: z(320) }}>{text}</Text>
      </View>
    </At>
  );
}

/** Gold pulse around something the player can tap. */
function Glow({ on, z, radius }: { on: boolean; z: (n: number) => number; radius: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = on ? withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }), -1, true) : withTiming(0, { duration: 150 });
  }, [on, p]);
  const style = useAnimatedStyle(() => ({ opacity: on ? 0.45 + p.value * 0.55 : 0 }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: Math.max(2, z(2)), borderColor: '#F5C542', shadowColor: '#F5C542', shadowOpacity: 0.8, shadowRadius: 9, elevation: 8 }, style]} />
  );
}

export function Deck({ st, joker, showJoker, showDeck, can, onDraw }: {
  st: Stage; joker: Card | null; showJoker: boolean; showDeck: boolean; can: boolean; onDraw: () => void;
}) {
  const z = st.z;
  const red = joker && (joker.suit === '♥' || joker.suit === '♦');
  const jx = useSharedValue(0);
  useEffect(() => { jx.value = withTiming(showJoker ? 1 : 0, { duration: 500, easing: Easing.out(Easing.cubic) }); }, [showJoker, jx]);
  const jStyle = useAnimatedStyle(() => ({ opacity: jx.value, transform: [{ translateX: interpolate(jx.value, [0, 1], [-z(20), 0]) }] }));
  return (
    <At st={st} x={352} y={162} w={62} h={88}>
      {joker ? (
        <Animated.View style={[{ position: 'absolute', left: z(20), top: z(22), width: z(76), height: z(54), borderRadius: z(6), backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D0BA', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingRight: z(8), gap: z(2), elevation: 3 }, jStyle]}>
          <Text style={{ fontFamily: fonts.card, fontSize: z(15), color: joker.rank === 'JK' ? colors.joker : red ? '#C8102E' : '#16181D' }}>{joker.rank === 'JK' ? 'J' : joker.rank}</Text>
          <Text style={{ fontSize: z(15), color: red ? '#C8102E' : '#16181D' }}>{joker.suit}</Text>
        </Animated.View>
      ) : null}
      {showDeck ? (
        <>
          {/* stacked edge under the top card */}
          {[4, 3, 2, 1].map((d) => (
            <View key={d} style={{ position: 'absolute', left: 0, top: z(d), width: z(62), height: z(88), borderRadius: z(6), backgroundColor: d % 2 ? '#cfc3a6' : '#F4EBD5' }} />
          ))}
          <Pressable onPress={onDraw} disabled={!can} accessibilityRole="button" accessibilityLabel="Draw from the closed deck" accessibilityState={{ disabled: !can }}
            style={({ pressed }) => ({ position: 'absolute', left: 0, top: 0, transform: [{ translateY: pressed ? -z(4) : 0 }] })}>
            <CardBack width={z(62)} />
            <Glow on={can} z={z} radius={z(6)} />
          </Pressable>
        </>
      ) : null}
      <Text style={{ position: 'absolute', top: z(96), left: 0, width: z(200), fontFamily: fonts.uiHeavy, fontSize: z(9), letterSpacing: z(1.4), color: '#CFE3D6' }}>
        {showJoker && joker ? `DECK · JOKER ${joker.rank === 'JK' ? 'A' : joker.rank}${joker.rank === 'JK' ? '' : joker.suit}` : 'DECK'}
      </Text>
    </At>
  );
}

export function OpenPile({ st, card, wild, can, onDraw }: { st: Stage; card: Card | null; wild: boolean; can: boolean; onDraw: () => void }) {
  const z = st.z;
  return (
    <At st={st} x={500} y={162} w={62} h={88}>
      <View style={{ ...StyleSheet.absoluteFill, borderRadius: z(6), borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(232,198,106,0.35)' }} />
      {card ? (
        <Pressable onPress={onDraw} disabled={!can} accessibilityRole="button" accessibilityLabel={`Pick up ${card.rank === 'JK' ? 'Joker' : card.rank + card.suit} from the open pile`}
          style={{ position: 'absolute', left: -z(2), top: -z(4), transform: [{ scale: 0.94 }] }}>
          <PlayingCard card={card} width={z(66)} wild={wild} />
          <Glow on={can} z={z} radius={z(7)} />
        </Pressable>
      ) : null}
      <Text style={{ position: 'absolute', top: z(96), left: 0, width: z(120), fontFamily: fonts.uiHeavy, fontSize: z(9), letterSpacing: z(1.4), color: '#CFE3D6' }}>OPEN PILE</Text>
    </At>
  );
}

// ---------------------------------------------------------------- you and the right rail

export function Me({ st, name, initials, color, chips, turnSeconds }: { st: Stage; name: string; initials: string; color: string; chips: string; turnSeconds?: number }) {
  const z = st.z;
  return (
    <At st={st} x={30} y={318} w={92} style={{ alignItems: 'center', gap: z(4) }}>
      <View style={{ width: z(52), height: z(52), alignItems: 'center', justifyContent: 'center' }}>
        <PlayerAvatar player={{ name, initials, color }} size={z(42)} turnSeconds={turnSeconds} />
      </View>
      <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: z(12), color: '#F4EEDC', maxWidth: z(118) }}>{name} (You)</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(4), paddingHorizontal: z(8), paddingVertical: z(2), borderRadius: z(10), backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ width: z(9), height: z(9), borderRadius: z(5), backgroundColor: colors.gold, borderWidth: 1.5, borderColor: '#8a6a2a' }} />
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(10), color: colors.goldBright }}>{chips}</Text>
      </View>
    </At>
  );
}

const IconBtn = ({ st, x, label, onPress, children }: { st: Stage; x: number; label: string; onPress: () => void; children: ReactNode }) => (
  <At st={st} x={x} y={26} w={40} h={40}>
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={st.z(6)}
      style={({ pressed }) => ({ flex: 1, borderRadius: st.z(20), borderWidth: 1.5, borderColor: GOLD3, backgroundColor: 'rgba(6,40,24,0.9)', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
      {children}
    </Pressable>
  </At>
);

export function RightRail({ st, modeName, info, pointsLabel, points, canDiscard, canDeclare, onEmote, onLeave, onSort, onGroup, onDiscard, onDeclare }: {
  st: Stage; modeName: string; info: string; pointsLabel: string; points: string; canDiscard: boolean; canDeclare: boolean;
  onEmote: () => void; onLeave: () => void; onSort: () => void; onGroup: () => void; onDiscard: () => void; onDeclare: () => void;
}) {
  const z = st.z;
  const tile = (label: string, icon: ReactNode, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, height: z(44), minHeight: 40, borderRadius: z(12), borderWidth: 1.5, borderColor: GOLD3, backgroundColor: 'rgba(6,40,24,0.95)', alignItems: 'center', justifyContent: 'center', gap: z(2), transform: [{ scale: pressed ? 0.94 : 1 }] })}>
      {icon}
      <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(10), letterSpacing: z(0.8), color: colors.goldBright }}>{label}</Text>
    </Pressable>
  );
  const big = (label: string, enabled: boolean, onPress: () => void, red: boolean) => (
    <Pressable onPress={onPress} disabled={!enabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => ({
        height: z(44), minHeight: 40, borderRadius: z(22), alignItems: 'center', justifyContent: 'center', opacity: enabled ? 1 : 0.45,
        backgroundColor: red ? '#C8102E' : colors.gold, borderBottomWidth: z(3), borderBottomColor: red ? '#8E1F25' : '#A67F2A',
        transform: [{ scale: pressed ? 0.94 : 1 }], elevation: 4,
      })}>
      <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(14), letterSpacing: z(0.6), color: red ? '#fff' : '#241A05' }}>{label}</Text>
    </Pressable>
  );
  return (
    <>
      <IconBtn st={st} x={852} label="Quick chat" onPress={onEmote}><Smile size={z(18)} color={colors.gold} /></IconBtn>
      <IconBtn st={st} x={900} label="Leave table" onPress={onLeave}><LogOut size={z(18)} color={colors.gold} /></IconBtn>
      <At st={st} x={836} y={74} w={110} pointerEvents="none" style={{ paddingHorizontal: z(10), paddingVertical: z(6), borderRadius: z(12), borderWidth: 1.5, borderColor: 'rgba(201,162,74,0.8)', backgroundColor: 'rgba(6,40,24,0.9)', gap: z(2) }}>
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(11), letterSpacing: z(0.6), color: '#fff' }}>{modeName}</Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: z(9), letterSpacing: z(0.3), color: colors.goldBright }}>{info}</Text>
      </At>
      <At st={st} x={836} y={134} w={110} pointerEvents="none" style={{ alignItems: 'center', paddingHorizontal: z(14), paddingVertical: z(5), borderRadius: z(16), borderWidth: 1.5, borderColor: GOLD3, backgroundColor: 'rgba(6,40,24,0.9)' }}>
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(9), letterSpacing: z(0.8), color: colors.gold }}>{pointsLabel}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: z(16), color: '#fff' }}>{points}<Text style={{ fontFamily: fonts.ui, fontSize: z(12), color: MUTE }}>/80</Text></Text>
      </At>
      <At st={st} x={836} y={262} w={110} style={{ gap: z(8) }}>
        <View style={{ flexDirection: 'row', gap: z(8) }}>
          {tile('SORT', <ArrowDownUp size={z(16)} color={colors.gold} />, onSort)}
          {tile('GROUP', <Layers size={z(16)} color={colors.gold} />, onGroup)}
        </View>
        {big('Discard', canDiscard, onDiscard, true)}
        {big('Declare', canDeclare, onDeclare, false)}
      </At>
    </>
  );
}

// ---------------------------------------------------------------- flying cards

export interface Flight { id: string; card: Card | null; from: { x: number; y: number }; to: { x: number; y: number }; delay: number; dur: number; s0?: number; s1?: number; r0?: number; r1?: number }

/** One card flying across the table (deal, draw or throw). Positions are screen coords of the card's top-left. */
export const FlyCard = memo(function FlyCard({ f, w }: { f: Flight; w: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(f.delay, withTiming(1, { duration: f.dur, easing: Easing.bezier(0.25, 0.8, 0.3, 1) }));
  }, [f.delay, f.dur, p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value <= 0 || p.value >= 1 ? 0 : 1,
    transform: [
      { translateX: f.from.x + (f.to.x - f.from.x) * p.value },
      { translateY: f.from.y + (f.to.y - f.from.y) * p.value },
      { rotate: `${(f.r0 ?? 0) + ((f.r1 ?? 0) - (f.r0 ?? 0)) * p.value}deg` },
      { scale: (f.s0 ?? 1) + ((f.s1 ?? 1) - (f.s0 ?? 1)) * p.value },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, zIndex: 200, elevation: 30 }, style]}>
      {f.card ? <PlayingCard card={f.card} width={w} /> : <CardBack width={w} />}
    </Animated.View>
  );
});

/** Ten card backs riffling at the deck before the deal (three quick riffles). */
export function Riffle({ st, ms }: { st: Stage; ms: number }) {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => <RiffleCard key={i} st={st} i={i} ms={ms} />)}
    </>
  );
}
function RiffleCard({ st, i, ms }: { st: Stage; i: number; ms: number }) {
  const p = useSharedValue(0);
  const one = ms / 3;
  useEffect(() => {
    const go = withSequence(withTiming(1, { duration: one / 2, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: one / 2, easing: Easing.inOut(Easing.quad) }));
    p.value = withDelay((i % 5) * 8, withSequence(go, go, go));
  }, [i, one, p]);
  const dir = i % 2 ? 1 : -1;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: dir * st.z(44) * p.value }, { translateY: -st.z(10) * p.value }, { rotate: `${dir * 10 * p.value}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: st.x(352), top: st.y(162) - i * 0.6 * st.k, zIndex: 60 + i }, style]}>
      <CardBack width={st.z(62)} />
    </Animated.View>
  );
}
