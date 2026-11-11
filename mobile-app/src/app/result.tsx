import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStage } from '../game/Stage';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { formatChips } from '../components/ChipBalance';
import { Crown, RadialFill } from '../components/Decor';
import { GameButton } from '../components/GameButton';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { MODE_LABEL } from '../components/TableSetup';
import { initialsOf, useSession } from '../net/session';
import { useLayout } from '../hooks/useLayout';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';

const confettiColors = [colors.gold, colors.goldBright, colors.danger, colors.success, '#FFFFFF'];

/** One falling confetti strip, looping from above the screen. */
function Confetto({ x, delay, color, w, h, H, duration, sway }: { x: number; delay: number; color: string; w: number; h: number; H: number; duration: number; sway: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1));
  }, [t, delay, duration]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -30 + t.value * (H + 60) },
      { translateX: Math.sin(t.value * Math.PI * 4) * sway },
      { rotate: `${t.value * 720}deg` },
    ],
  }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: 0, width: w, height: h, backgroundColor: color, borderRadius: 1 }, style]} />;
}

export default function Result() {
  const L = useLayout();
  const { s, W, H } = L;
  const st = useStage(L);
  const { animations: anim, tap, sfx } = useSettings();
  const { lastResult, me, seat } = useSession();
  const result = lastResult?.result;
  const t = lastResult?.table;
  const you = t?.you ?? -1;
  const won = !!result && result.winnerIdx === you;
  const resultRows = (result?.seats ?? [])
    .slice()
    .sort((a, b) => Number(b.won) - Number(a.won) || a.points - b.points)
    .map((r) => ({ player: { id: String(r.idx), name: r.name, initials: r.code || initialsOf(r.name), color: r.color, chips: 0 }, points: r.points, chips: r.chips, isYou: r.idx === you }));
  const mine = result?.seats.find((r) => r.idx === you);
  const small = resultRows.length > 5;
  const resultStats = [
    { label: 'Players', value: String(t?.size ?? '—') },
    { label: 'Your points', value: String(mine?.points ?? '—') },
    { label: 'Balance', value: formatChips(me?.chips ?? 0) },
  ];
  const title = !result ? 'DEAL OVER' : result.reason === 'cancelled' ? 'DEAL CANCELLED' : won ? (t?.size === 1 ? 'HAND COMPLETE' : 'YOU WIN') : 'DEAL OVER';
  const sub = !result ? '' : result.reason === 'cancelled' ? 'ENDED BY LOCAL RUMMY · ENTRIES REFUNDED'
    : `${won ? 'VALID DECLARATION' : `${result.seats.find((r) => r.won)?.name?.toUpperCase() ?? 'NOBODY'} WON`} · ${t ? MODE_LABEL[t.mode] : ''}`;
  const animations = anim && won;
  const crown = useSharedValue(0);
  const shine = useSharedValue(0.4);

  useEffect(() => {
    // fanfare when you win, a soft falling phrase otherwise (nothing for a cancelled deal)
    if (result && result.reason !== 'cancelled') sfx(won ? 'win' : 'lose');
    tap('success');
    crown.value = withSpring(1, { damping: 9, stiffness: 140 });
    shine.value = withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0.4, { duration: 1100 })), -1);
    // once, when the result screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crown, shine, tap]);

  const crownStyle = useAnimatedStyle(() => ({
    opacity: crown.value,
    transform: [{ scale: 0.4 + crown.value * 0.6 }, { rotate: `${(1 - crown.value) * -25}deg` }],
  }));
  const titleGlow = useAnimatedStyle(() => ({ opacity: 0.85 + shine.value * 0.15 }));

  const confetti = useMemo(
    () =>
      Array.from({ length: animations ? 36 : 0 }, (_, i) => ({
        x: i % 2 === 0 ? ((i * 37) % 180) * s : W - ((i * 29) % 180) * s - 10,
        delay: (i * 137) % 2400,
        color: confettiColors[i % confettiColors.length],
        w: (4 + (i % 3) * 2) * s,
        h: (8 + (i % 4) * 2) * s,
        duration: 2600 + ((i * 211) % 1800),
        sway: (8 + (i % 5) * 4) * s,
      })),
    [W, s, animations],
  );

  const panelW = 660 * s;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep, overflow: 'hidden' }}>
      <RadialFill inner="#1D3A2A" mid="#0A1510" outer="#040705" cy="30%" id="result-bg" />
      {confetti.map((c, i) => (
        <Confetto key={i} {...c} H={H} />
      ))}

      <View style={{ position: 'absolute', left: 0, right: 0, top: st.y(20), alignItems: 'center', gap: 4 * s }}>
        <Animated.View style={crownStyle}>
          <Crown width={56 * s} />
        </Animated.View>
        <View>
          <Animated.Text
            entering={FadeIn.delay(150).duration(400)}
            accessibilityRole="header"
            style={[{ fontFamily: fonts.display, fontSize: 40 * s, letterSpacing: 6 * s, color: '#F2D27E', textShadowColor: 'rgba(242,210,126,0.45)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 26 }, titleGlow]}
          >
            {title}
          </Animated.Text>
        </View>
        <Text style={{ fontFamily: fonts.uiBold, fontSize: 12 * s, letterSpacing: 3 * s, color: colors.textWarm }}>{sub}</Text>
      </View>

      <Animated.View
        entering={FadeInDown.delay(250).springify().damping(18)}
        style={[styles.panel, { position: 'absolute', left: st.x(150), top: st.y(134), width: panelW, height: 206 * s, borderRadius: 18 * s }]}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16 * s, paddingVertical: 12 * s, gap: 4 * s }} showsVerticalScrollIndicator={false}>
          <View style={[styles.row, { paddingHorizontal: 8 * s, paddingBottom: 4 * s }]}>
            <Text style={[styles.th, { flex: 1.6, fontSize: 9 * s }]}>PLAYER</Text>
            <Text style={[styles.th, { flex: 0.8, fontSize: 9 * s }]}>POINTS</Text>
            <Text style={[styles.th, { flex: 1, fontSize: 9 * s, textAlign: 'right' }]}>CHIPS</Text>
          </View>
          {resultRows.map((r, i) => (
            <Animated.View
              key={r.player.id}
              entering={FadeInRight.delay(400 + i * 90).springify().damping(18)}
              accessible
              accessibilityLabel={`${r.player.name}, ${r.points} points, ${r.chips > 0 ? 'won' : 'lost'} ${formatChips(Math.abs(r.chips))} chips`}
              style={[styles.row, { height: (small ? 28 : 38) * s, paddingHorizontal: 8 * s, borderRadius: 10 * s, backgroundColor: r.isYou ? 'rgba(232,198,106,0.16)' : 'rgba(255,255,255,0.04)' }]}
            >
              <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 8 * s }}>
                <PlayerAvatar player={r.player} size={(small ? 22 : 28) * s} />
                <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.uiBold, fontSize: (small ? 12 : 13) * s, color: colors.textWhite }}>
                  {r.player.name}
                  {r.isYou ? ' (You)' : ''}
                </Text>
              </View>
              <Text style={{ flex: 0.8, fontFamily: fonts.uiBold, fontSize: 13 * s, color: '#DCE9E0' }}>{r.points}</Text>
              <Text style={{ flex: 1, textAlign: 'right', fontFamily: fonts.uiHeavy, fontSize: 13 * s, color: r.chips > 0 ? colors.goldBright : r.chips < 0 ? colors.loss : '#DCE9E0' }}>
                {r.chips > 0 ? '+' : r.chips < 0 ? '−' : ''}
                {formatChips(Math.abs(r.chips))}
              </Text>
            </Animated.View>
          ))}
        </ScrollView>
        <View style={{ width: 170 * s, borderLeftWidth: 1, borderLeftColor: 'rgba(232,198,106,0.2)', padding: 14 * s, paddingHorizontal: 16 * s, gap: 10 * s }}>
          <Text style={[styles.th, { fontSize: 9 * s }]}>GAME STATS</Text>
          {resultStats.map((st) => (
            <View key={st.label}>
              <Text style={{ fontFamily: fonts.ui, fontSize: 10 * s, color: colors.textMutedGreen }}>{st.label}</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 18 * s, color: colors.goldBright }}>{st.value}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(700)} style={{ position: 'absolute', left: 0, right: 0, top: st.y(358), flexDirection: 'row', justifyContent: 'center', gap: 14 * s }}>
        <GameButton s={s} variant="outline" label="Back to Lobby" width={180} height={46} onPress={() => router.replace('/lobby')} />
        <GameButton s={s} label="Play Again" width={180} height={46} onPress={async () => {
          if (!t) { router.replace('/lobby'); return; }
          const r = await seat(t.mode, t.size, t.entry);
          router.replace(r.ok ? '/game' : '/lobby');
        }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: 'rgba(8,40,24,0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(201,162,74,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  th: { fontFamily: 'Manrope_800ExtraBold', letterSpacing: 1.6, color: colors.textMutedGreen },
});
