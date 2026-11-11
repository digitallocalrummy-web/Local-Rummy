import { router } from 'expo-router';
import { Bot, Star, Zap } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSession, type ModeId } from '../net/session';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';
import { formatChips } from './ChipBalance';
import { MODE_LABEL } from './TableSetup';

type Z = (n: number) => number;
const MUTEB = '#B5BFD3';
const LINE = 'rgba(255,255,255,0.08)';
const GOLD3 = '#C9A24A';

export const boxStyle = (z: Z): ViewStyle => ({ borderRadius: z(14), backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: LINE, paddingVertical: z(12), paddingHorizontal: z(14), gap: z(10) });
export const Lbl = ({ z, children, color = MUTEB }: { z: Z; children: ReactNode; color?: string }) => (
  <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(9), letterSpacing: z(1.6), color }}>{children}</Text>
);

/** Segmented choice buttons, like `.seg` on the web. */
export function Seg<T extends string | number>({ z, items, value, onChange, dot }: {
  z: Z; items: { v: T; label: string; a11y?: string }[]; value: T; onChange: (v: T) => void; dot?: boolean;
}) {
  const { tap } = useSettings();
  return (
    <View style={{ flexDirection: 'row', gap: z(6) }}>
      {items.map((it) => {
        const on = it.v === value;
        return (
          <Pressable key={String(it.v)} onPress={() => { tap(); onChange(it.v); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={it.a11y ?? it.label}
            style={{ flex: 1, height: z(34), minHeight: 34, borderRadius: z(10), borderWidth: 1.5, borderColor: on ? colors.gold : 'rgba(255,255,255,0.14)', backgroundColor: on ? 'rgba(232,198,106,0.16)' : 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: z(5) }}>
            {dot && <View style={{ width: z(8), height: z(8), borderRadius: z(4), backgroundColor: on ? colors.gold : '#C3CDE2' }} />}
            <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(11), letterSpacing: z(0.6), color: on ? colors.goldBright : '#C3CDE2' }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Gold pill button (`.btn-gold`) or outline (`.btn-line`), sized in stage units. */
export function Pill({ z, label, onPress, h = 44, line, disabled, busy, style, fs }: {
  z: Z; label: string; onPress: () => void; h?: number; line?: boolean; disabled?: boolean; busy?: boolean; style?: ViewStyle; fs?: number;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={({ pressed }) => [{
        height: z(h), minHeight: 40, borderRadius: z(h / 2), alignItems: 'center', justifyContent: 'center', paddingHorizontal: z(fs ? 6 : 16),
        backgroundColor: line ? 'transparent' : colors.gold, borderWidth: line ? 1.5 : 0, borderColor: colors.gold,
        borderBottomWidth: line ? 1.5 : z(3), borderBottomColor: line ? colors.gold : colors.goldShadow,
        opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.95 : 1 }],
        shadowColor: '#000', shadowOpacity: line ? 0 : 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: line ? 0 : 4,
      }, style]}>
      {busy ? <ActivityIndicator color={line ? colors.gold : colors.goldInk} size="small" />
        : <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: z(fs ?? (h >= 40 ? 15 : 12)), letterSpacing: z(0.6), color: line ? colors.goldBright : colors.goldInk }}>{label}</Text>}
    </Pressable>
  );
}

/** Sit down at a public table and open the game screen. */
function useSeat() {
  const { seat } = useSession();
  const { tap } = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async (mode: ModeId, players: number, entry: number) => {
    setBusy(true); setError(null);
    const r = await seat(mode, players, entry);
    setBusy(false);
    if (!r.ok) { setError(r.error ?? 'Could not find a table.'); return; }
    tap('success');
    router.push('/game');
  };
  return { busy, error, go };
}

// ---------------------------------------------------------------- Quick play

export function QuickPlayPane({ z }: { z: Z }) {
  const { config, me } = useSession();
  const enabled = (['points', 'pool', 'deals'] as ModeId[]).filter((m) => config?.modes[m]?.enabled);
  const [mode, setMode] = useState<ModeId>(enabled[0] ?? 'points');
  const m = config?.modes[mode];
  const max = m?.maxPlayers ?? 4;
  const [players, setPlayers] = useState(Math.min(4, max));
  const entries = m?.entries ?? [];
  const [entry, setEntry] = useState(entries[1] ?? entries[0] ?? 0);
  const { busy, error, go } = useSeat();

  const pick = (id: ModeId) => {
    setMode(id);
    const c = config?.modes[id];
    if (!c) return;
    setPlayers((p) => Math.min(p, c.maxPlayers));
    setEntry((e) => (c.entries.includes(e) ? e : c.entries[0] ?? 0));
  };
  const n = Math.min(players, max);
  const cost = n === 1 ? 0 : entry;
  const short = !!me && cost > me.chips;

  if (!enabled.length) return <Text style={{ fontFamily: fonts.uiBold, fontSize: z(13), color: MUTEB }}>No tables are open right now.</Text>;

  return (
    <>
      <View style={[boxStyle(z), { flex: 1.35 }]}>
        <Lbl z={z}>GAME TYPE</Lbl>
        <Seg z={z} value={mode} onChange={pick} items={enabled.map((id) => ({ v: id, label: MODE_LABEL[id] }))} />
        <Lbl z={z}>PLAYERS AT TABLE (1–{max})</Lbl>
        <Seg z={z} value={n} onChange={setPlayers} items={Array.from({ length: max }, (_, i) => ({ v: i + 1, label: String(i + 1), a11y: `${i + 1} players` }))} />
        <Lbl z={z}>ENTRY (VIRTUAL CHIPS)</Lbl>
        <Seg z={z} dot value={entry} onChange={setEntry} items={entries.map((e) => ({ v: e, label: formatChips(e), a11y: `Entry ${e} chips` }))} />
      </View>
      <View style={{ flex: 1, borderRadius: z(14), borderWidth: 2, borderColor: GOLD3, backgroundColor: '#13643c', padding: z(14), alignItems: 'center', justifyContent: 'center', gap: z(8), overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: '-20%', top: '-30%', width: '140%', height: '110%', borderRadius: 999, backgroundColor: '#1b7a4a', opacity: 0.6 }} />
        <Zap size={z(30)} color={colors.gold} />
        <Text style={{ fontFamily: fonts.display, fontSize: z(14), letterSpacing: z(1.5), color: colors.goldBright, textAlign: 'center' }}>
          {MODE_LABEL[mode]} · {n}P · {cost ? formatChips(cost) : 'FREE'}
        </Text>
        <Text style={{ fontFamily: fonts.uiBold, fontSize: z(11), color: '#CFE3D6', textAlign: 'center' }}>
          {n === 1 ? 'Solo practice · just you and the deck' : 'Seat in a few seconds · AI fills empty seats'}
        </Text>
        {short && <Text style={{ fontFamily: fonts.uiBold, fontSize: z(11), color: colors.loss, textAlign: 'center' }}>You need {formatChips(cost)} chips. Collect your daily bonus.</Text>}
        {error && <Text style={{ fontFamily: fonts.uiBold, fontSize: z(11), color: colors.loss, textAlign: 'center' }}>{error}</Text>}
        <Pill z={z} label="FIND A SEAT" busy={busy} disabled={short} onPress={() => go(mode, n, cost)} style={{ alignSelf: 'stretch', marginTop: z(4) }} />
      </View>
    </>
  );
}

// ---------------------------------------------------------------- Practice

const LEVELS = [
  { name: 'BEGINNER', stars: 1, players: 2, color: '#1F6B4A' },
  { name: 'SKILLED', stars: 2, players: 4, color: '#2E5AA8' },
  { name: 'EXPERT', stars: 3, players: 6, color: '#8E2433' },
];

export function PracticePane({ z }: { z: Z }) {
  const { config } = useSession();
  const mode = (['points', 'pool', 'deals'] as ModeId[]).find((m) => config?.modes[m]?.enabled);
  const max = mode ? config!.modes[mode].maxPlayers : 0;
  const { busy, error, go } = useSeat();
  const [which, setWhich] = useState<number | null>(null);
  const row = (label: string, value: ReactNode) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.ui, fontSize: z(11), color: MUTEB }}>{label}</Text>
      {typeof value === 'string' ? <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(11), color: colors.text }}>{value}</Text> : value}
    </View>
  );
  if (!mode) return <Text style={{ fontFamily: fonts.uiBold, fontSize: z(13), color: MUTEB }}>Practice tables are closed right now.</Text>;
  return (
    <>
      {LEVELS.map((lv, i) => {
        const n = Math.min(lv.players, max);
        return (
          <Animated.View key={lv.name} entering={FadeInDown.delay(60 + i * 70).springify().damping(18)}
            style={{ flex: 1, borderRadius: z(14), backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: LINE, paddingTop: z(10), paddingHorizontal: z(12), paddingBottom: z(12), gap: z(8) }}>
            <View style={{ height: z(88), borderRadius: z(10), borderWidth: 2, borderColor: GOLD3, backgroundColor: '#13643c', alignItems: 'center', justifyContent: 'center', gap: z(6), overflow: 'hidden' }}>
              <View pointerEvents="none" style={{ position: 'absolute', left: '-10%', top: '-40%', width: '120%', height: '120%', borderRadius: 999, backgroundColor: '#1b7a4a', opacity: 0.6 }} />
              <View style={{ width: z(36), height: z(36), borderRadius: z(18), borderWidth: 2, borderColor: colors.gold, backgroundColor: lv.color, alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={z(18)} color="#FFF4DA" />
              </View>
              <Text style={{ fontFamily: fonts.display, fontSize: z(13), letterSpacing: z(1.2), color: colors.goldBright }}>{lv.name}</Text>
              <View style={{ position: 'absolute', right: z(8), top: z(8), paddingHorizontal: z(6), paddingVertical: z(1), borderRadius: z(6), backgroundColor: 'rgba(0,0,0,0.45)' }}>
                <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(9), color: '#CFE3D6' }}>AI</Text>
              </View>
            </View>
            {row('Difficulty', (
              <View style={{ flexDirection: 'row', gap: z(2) }} accessibilityLabel={`${lv.stars} of 3 stars`}>
                {[0, 1, 2].map((k) => <Star key={k} size={z(11)} color={k < lv.stars ? colors.gold : '#5E6676'} fill={k < lv.stars ? colors.gold : '#5E6676'} />)}
              </View>
            ))}
            {row('Suggested', `${n} players`)}
            {row('Entry', <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(11), color: '#5FD39A' }}>FREE</Text>)}
            <Pill z={z} line h={36} label="START PRACTICE" busy={busy && which === i} onPress={() => { setWhich(i); go(mode, n, 0); }} style={{ marginTop: 'auto' }} />
            {error && which === i && <Text style={{ fontFamily: fonts.uiBold, fontSize: z(10), color: colors.loss }}>{error}</Text>}
          </Animated.View>
        );
      })}
    </>
  );
}
