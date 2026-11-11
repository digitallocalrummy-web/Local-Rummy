import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Crown } from '../components/Decor';
import { useStage } from '../game/Stage';
import { useLayout } from '../hooks/useLayout';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';

const HOSTESS = require('../../assets/images/hostess.webp');
const LOAD_MS = 2300;

/** Splash, same as the web version: hostess photo on the left, logo, loading bar, then TAP TO PLAY. */
export default function Splash() {
  const L = useLayout();
  const st = useStage(L);
  const { z } = st;
  const { tap } = useSettings();
  const [pct, setPct] = useState(0);

  const hero = useSharedValue(0);
  const crown = useSharedValue(0);
  const logo = useSharedValue(0);
  const tag = useSharedValue(0);
  const enter = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    hero.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) });
    crown.value = withDelay(300, withSpring(1, { damping: 9, stiffness: 160 }));
    logo.value = withDelay(450, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    tag.value = withDelay(800, withTiming(1, { duration: 800 }));
    // loading bar: ease-out from 0 to 100 % over 2.3 s
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / LOAD_MS);
      setPct(Math.round(100 * (1 - Math.pow(1 - k, 2))));
      if (k >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [hero, crown, logo, tag]);

  const ready = pct >= 100;
  useEffect(() => {
    if (!ready) return;
    enter.value = withTiming(1, { duration: 400 });
    pulse.value = withDelay(1000, withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1));
  }, [ready, enter, pulse]);

  // plain numbers: animation worklets can't call z()
  const rise = z(8);
  const heroStyle = useAnimatedStyle(() => ({ opacity: hero.value, transform: [{ scale: 1.06 - hero.value * 0.06 }] }));
  const crownStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, crown.value), transform: [{ scale: 0.4 + crown.value * 0.6 }] }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ scaleX: 1.25 - logo.value * 0.25 }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * rise }] }));
  const enterStyle = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: (1 - enter.value) * rise }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scaleX: 1 + pulse.value * 0.14 }, { scaleY: 1 + pulse.value * 0.5 }] }));

  // photo is 1236×853: full height on the left, width follows
  const imgW = (L.H * 1236) / 853;
  // title column: the space right of the photo, but never narrower than 300 stage units
  const brandW = Math.max(z(300), L.W - imgW * 0.9 - L.insets.right);
  const brandLeft = L.W - L.insets.right - brandW;
  const fadeFrom = Math.max(0, Math.min(0.9, (brandLeft - z(170)) / L.W));
  const fadeTo = Math.max(fadeFrom + 0.05, Math.min(0.97, (brandLeft + z(30)) / L.W));
  const play = () => { tap('success'); router.replace('/lobby'); };

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0B06', overflow: 'hidden' }}>
      {/* soft, blurred copy of the photo fills the whole screen, so the title sits on the same scene */}
      <Image source={HOSTESS} resizeMode="cover" blurRadius={22} style={{ position: 'absolute', left: 0, top: 0, width: L.W, height: L.H }} />

      {/* the sharp photo, always shown top to bottom so her face and hair are never cut */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: imgW, height: L.H }, heroStyle]}>
        <Image source={HOSTESS} resizeMode="cover" style={{ width: '100%', height: '100%' }}
          accessibilityLabel="Local Rummy hostess beside an emerald card table under a gold chandelier" />
      </Animated.View>

      {/* one smooth dark wash from the photo into the title side, plus a soft bottom edge
          (gradients live in the same Svg: on Android a gradient from another Svg draws black) */}
      <Svg pointerEvents="none" width={L.W} height={L.H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="splash-r" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#0E0B06" stopOpacity={0} />
            <Stop offset={String(fadeFrom)} stopColor="#0E0B06" stopOpacity={0} />
            <Stop offset={String(fadeTo)} stopColor="#0E0B06" stopOpacity={0.78} />
            <Stop offset="1" stopColor="#0E0B06" stopOpacity={0.84} />
          </LinearGradient>
          <LinearGradient id="splash-seam" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#0E0B06" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#0E0B06" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#0E0B06" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="splash-b" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.8" stopColor="#0E0B06" stopOpacity={0} />
            <Stop offset="1" stopColor="#0E0B06" stopOpacity={0.55} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={L.W} height={L.H} fill="url(#splash-r)" />
        {/* hides the edge where the sharp photo meets its blurred copy */}
        <Rect x={imgW - z(90)} y={0} width={z(180)} height={L.H} fill="url(#splash-seam)" />
        <Rect x={0} y={0} width={L.W} height={L.H} fill="url(#splash-b)" />
      </Svg>

      {/* brand column */}
      <View style={{ position: 'absolute', left: brandLeft, top: 0, width: brandW, height: L.H, alignItems: 'center', justifyContent: 'center', gap: z(10) }}>
        <Animated.View style={crownStyle}>
          <Crown width={z(58)} />
        </Animated.View>
        <Animated.Text accessibilityRole="header" style={[{
          fontFamily: fonts.display, fontSize: z(50), lineHeight: z(52), letterSpacing: z(6), textAlign: 'center', color: '#F2D27E',
          textShadowColor: '#7a5a1c', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0,
        }, logoStyle]}>
          {'LOCAL\nRUMMY'}
        </Animated.Text>
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: z(10) }, tagStyle]}>
          <View style={{ width: z(34), height: 1, backgroundColor: colors.goldDeep }} />
          <Text style={{ fontFamily: fonts.uiBold, fontSize: z(11), letterSpacing: z(4), color: colors.textWarm }}>INDIAN 13 CARD RUMMY</Text>
          <View style={{ width: z(34), height: 1, backgroundColor: colors.goldDeep }} />
        </Animated.View>

        <View style={{ marginTop: z(22), width: z(220), height: z(5), borderRadius: z(3), backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: '100%', borderRadius: z(3), backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }} />
        </View>
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.uiBold, fontSize: z(10), letterSpacing: z(3), color: '#A8997A' }}>
          {(ready ? 'READY · ' : 'SHUFFLING THE DECK · ') + pct + '%'}
        </Text>

        <Animated.View pointerEvents={ready ? 'auto' : 'none'} style={[{ marginTop: z(6) }, enterStyle]}>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: z(22), backgroundColor: colors.gold }, ringStyle]} />
          <Pressable onPress={play} accessibilityRole="button" accessibilityLabel="Tap to play"
            style={({ pressed }) => ({
              height: Math.max(44, z(44)), paddingHorizontal: z(26), borderRadius: z(22), backgroundColor: colors.gold, justifyContent: 'center',
              borderBottomWidth: z(3), borderBottomColor: colors.goldShadow, transform: [{ scale: pressed ? 0.94 : 1 }],
              shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
            })}>
            <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(14), letterSpacing: z(3), color: colors.goldInk }}>TAP TO PLAY</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
