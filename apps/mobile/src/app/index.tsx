import { router } from 'expo-router';
import { CircleHelp, Play, Settings } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AnimatedModal } from '../components/AnimatedModal';
import { HowToPlayContent } from '../components/Controls';
import { Crown, RadialFill } from '../components/Decor';
import { GameButton } from '../components/GameButton';
import { PlayingCard } from '../components/PlayingCard';
import { makeCard } from '../data/sample';
import { useLayout } from '../hooks/useLayout';
import { colors, fonts, motion } from '../theme';

const ace = makeCard('A', '♠');
const king = makeCard('K', '♦');

function ChipStack({ count, color, edge, s }: { count: number; color: string; edge: string; s: number }) {
  return (
    <View style={{ width: 40 * s, height: (14 + count * 6) * s }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute', left: 0, bottom: i * 6 * s, width: 40 * s, height: 14 * s, borderRadius: 20 * s,
            backgroundColor: color, borderWidth: 1.5, borderStyle: 'dashed', borderColor: edge,
            borderBottomWidth: 3 * s,
          }}
        />
      ))}
    </View>
  );
}

/** Splash that settles into the Welcome screen. */
export default function SplashWelcome() {
  const { s, safeH, W, H } = useLayout();
  const [phase, setPhase] = useState<'splash' | 'welcome'>('splash');
  const [rulesOpen, setRulesOpen] = useState(false);

  const logo = useSharedValue(0);
  const glow = useSharedValue(0);
  const cards = useSharedValue(0);
  const chips = useSharedValue(0);
  const progress = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    logo.value = withSpring(1, { damping: 14, stiffness: 120 });
    glow.value = withDelay(400, withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0.35, { duration: 1400 })), -1));
    cards.value = withDelay(350, withSpring(1, motion.card));
    chips.value = withDelay(550, withSpring(1, { damping: 12, stiffness: 180 }));
    progress.value = withDelay(
      300,
      withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.cubic) }, (done) => {
        'worklet';
        if (done) scheduleOnRN(setPhase, 'welcome');
      }),
    );
  }, [logo, glow, cards, chips, progress]);

  useEffect(() => {
    if (phase === 'welcome') lift.value = withSpring(1, motion.soft);
  }, [phase, lift]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [{ translateY: (1 - logo.value) * -20 * s - lift.value * 14 * s }, { scale: 0.85 + logo.value * 0.15 - lift.value * 0.1 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.55 }));
  const leftCard = useAnimatedStyle(() => ({
    opacity: cards.value,
    transform: [{ translateY: (1 - cards.value) * 80 * s }, { rotate: `${-12 - (1 - cards.value) * 20}deg` }],
  }));
  const rightCard = useAnimatedStyle(() => ({
    opacity: cards.value,
    transform: [{ translateY: (1 - cards.value) * 90 * s }, { rotate: `${9 + (1 - cards.value) * 20}deg` }],
  }));
  const chipStyle = useAnimatedStyle(() => ({ opacity: chips.value, transform: [{ translateY: (1 - chips.value) * -40 * s }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const tableTop = H * 0.35;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep, overflow: 'hidden' }}>
      <RadialFill inner="#1D2A22" mid="#0B120E" outer="#040705" cy="38%" id="splash-bg" />

      {/* Table */}
      <View pointerEvents="none" style={{ position: 'absolute', left: (W - 740 * s) / 2, top: tableTop, width: 740 * s, height: 330 * s }}>
        <View style={[styles.oval, { borderRadius: 370 * s, backgroundColor: '#3A2610', borderTopWidth: 4 * s, borderColor: '#B88A3A' }]} />
        <View style={[styles.oval, { margin: 18 * s, borderRadius: 360 * s, borderWidth: 3 * s, borderColor: '#D4AF5A' }]} />
        <View style={[styles.oval, { margin: 30 * s, borderRadius: 340 * s, overflow: 'hidden' }]}>
          <RadialFill inner="#1B7A4A" mid="#0F5735" outer="#083620" cy="35%" id="splash-felt" />
        </View>
        <View style={[styles.oval, { marginHorizontal: 120 * s, marginTop: 64 * s, marginBottom: 76 * s, borderRadius: 250 * s, borderWidth: 1, borderColor: 'rgba(232,198,106,0.35)' }]} />
      </View>

      {/* Cards and chips on the table */}
      <View pointerEvents="none" style={{ position: 'absolute', left: W / 2 - 70 * s, top: tableTop + 100 * s, width: 140 * s, height: 100 * s }}>
        <Animated.View style={[{ position: 'absolute', left: 6 * s, top: 6 * s }, leftCard]}>
          <PlayingCard card={ace} width={58 * s} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: 60 * s, top: 0 }, rightCard]}>
          <PlayingCard card={king} width={58 * s} />
        </Animated.View>
      </View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: W / 2 + 120 * s, top: tableTop + 90 * s, flexDirection: 'row', alignItems: 'flex-end' }, chipStyle]}>
        <ChipStack count={7} color={colors.goldDeep} edge="#6B4E14" s={s} />
        <View style={{ marginLeft: -6 * s }}><ChipStack count={4} color="#E8D7A8" edge="#8A6A2A" s={s} /></View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: W / 2 - 180 * s, top: tableTop + 120 * s }, chipStyle]}>
        <ChipStack count={5} color={colors.cardBack} edge="#F4EBD5" s={s} />
      </Animated.View>

      {/* Logo */}
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: H * 0.09, alignItems: 'center', gap: 6 * s }, logoStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 20 * s, width: 420 * s, height: 70 * s, borderRadius: 60 * s, backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 1, shadowRadius: 40, shadowOffset: { width: 0, height: 0 }, transform: [{ scaleY: 0.5 }] },
            { opacity: 0 },
            glowStyle,
          ]}
        />
        <Crown width={52 * s} />
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: fonts.display, fontSize: 54 * s, letterSpacing: 8 * s, color: '#F2D27E',
            textShadowColor: '#7A5A1C', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0,
          }}
        >
          LOCAL RUMMY
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 * s }}>
          <View style={{ width: 60 * s, height: 1, backgroundColor: colors.goldDeep }} />
          <Text style={{ fontFamily: fonts.uiBold, fontSize: 12 * s, letterSpacing: 5 * s, color: colors.textWarm }}>INDIAN 13 CARD RUMMY</Text>
          <View style={{ width: 60 * s, height: 1, backgroundColor: colors.goldDeep }} />
        </View>
      </Animated.View>

      {/* Bottom: loading bar, then welcome actions */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(18 * s, (H - safeH) / 2 + 18 * s), alignItems: 'center' }}>
        {phase === 'splash' ? (
          <Pressable onPress={() => setPhase('welcome')} accessibilityLabel="Loading. Tap to skip" style={{ alignItems: 'center', gap: 8 * s, padding: 8 * s }}>
            <View style={{ width: 220 * s, height: 5 * s, borderRadius: 3 * s, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
              <Animated.View style={[{ height: '100%', borderRadius: 3 * s, backgroundColor: colors.gold }, barStyle]} />
            </View>
            <Text style={{ fontFamily: fonts.uiBold, fontSize: 10 * s, letterSpacing: 3 * s, color: colors.textWarm }}>SHUFFLING THE DECK</Text>
          </Pressable>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 * s }}>
            <Animated.View entering={FadeInDown.delay(60).springify().damping(16)}>
              <GameButton s={s} variant="outline" label="How to Play" width={160} onPress={() => setRulesOpen(true)} icon={<CircleHelp size={18 * s} color={colors.gold} />} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(0).springify().damping(16)}>
              <GameButton s={s} label="PLAY NOW" width={200} height={52} onPress={() => router.replace('/lobby')} icon={<Play size={18 * s} color={colors.goldInk} fill={colors.goldInk} />} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(120).springify().damping(16)}>
              <GameButton s={s} variant="outline" label="Settings" width={160} onPress={() => router.push('/settings')} icon={<Settings size={18 * s} color={colors.gold} />} />
            </Animated.View>
          </Animated.View>
        )}
      </View>

      <AnimatedModal visible={rulesOpen} title="HOW TO PLAY" onClose={() => setRulesOpen(false)}>
        <HowToPlayContent s={s} />
      </AnimatedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  oval: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
});
