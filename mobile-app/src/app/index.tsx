import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, G, LinearGradient, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Crown } from '../components/Decor';
import { useStage } from '../game/Stage';
import { useLayout } from '../hooks/useLayout';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';

const BACKGROUND = require('../../assets/images/splash-wide.webp');
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

  // splash-wide.webp is the hostess photo (left 1236 of 2089 px) extended into the dark room on the right,
  // so the title sits on the same scene. Height fills the screen; it only crops on extra-wide screens.
  const bgW = Math.max(L.W, (L.H * 2089) / 853);
  const bgH = (bgW * 853) / 2089;
  const photoRight = (bgW * 1236) / 2089;
  // title column: the space right of the photo, never narrower than 300 stage units
  const brandW = Math.max(z(300), L.W - photoRight * 0.92 - L.insets.right);
  const brandLeft = L.W - L.insets.right - brandW;
  const fadeFrom = Math.max(0, Math.min(0.9, (brandLeft - z(150)) / L.W));
  const fadeTo = Math.max(fadeFrom + 0.05, Math.min(0.97, (brandLeft + z(40)) / L.W));
  const logoW = z(300);
  const play = () => { tap('success'); router.replace('/lobby'); };

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0B06', overflow: 'hidden' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: bgW, height: bgH }, heroStyle]}>
        <Image source={BACKGROUND} resizeMode="cover" style={{ width: '100%', height: '100%' }}
          accessibilityLabel="Local Rummy hostess beside an emerald card table under a gold chandelier" />
      </Animated.View>

      {/* gentle shade behind the title so it reads, plus a soft bottom edge
          (gradients live in the same Svg: on Android a gradient from another Svg draws black) */}
      <Svg pointerEvents="none" width={L.W} height={L.H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="splash-r" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#0A0805" stopOpacity={0} />
            <Stop offset={String(fadeFrom)} stopColor="#0A0805" stopOpacity={0} />
            <Stop offset={String(fadeTo)} stopColor="#0A0805" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#0A0805" stopOpacity={0.6} />
          </LinearGradient>
          <LinearGradient id="splash-b" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.82" stopColor="#0A0805" stopOpacity={0} />
            <Stop offset="1" stopColor="#0A0805" stopOpacity={0.5} />
          </LinearGradient>
          <RadialGradient id="splash-glow" cx="50%" cy="45%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#E8C66A" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#E8C66A" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={L.W} height={L.H} fill="url(#splash-r)" />
        <Rect x={0} y={0} width={L.W} height={L.H} fill="url(#splash-b)" />
        {/* warm candle-light glow behind the logo, as if from the chandelier */}
        <Rect x={brandLeft} y={0} width={brandW} height={L.H * 0.8} fill="url(#splash-glow)" />
      </Svg>

      {/* brand column */}
      <View style={{ position: 'absolute', left: brandLeft, top: 0, width: brandW, height: L.H, alignItems: 'center', justifyContent: 'center', gap: z(10) }}>
        <Animated.View style={crownStyle}>
          <Crown width={z(58)} />
        </Animated.View>
        <Animated.View style={logoStyle} accessible accessibilityRole="header" accessibilityLabel="Local Rummy">
          <Svg width={logoW} height={z(112)}>
            <Defs>
              <LinearGradient id="logo-gold" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFF3C8" />
                <Stop offset="0.45" stopColor="#F2D27E" />
                <Stop offset="1" stopColor="#B7862F" />
              </LinearGradient>
            </Defs>
            {(['LOCAL', 'RUMMY'] as const).map((w, i) => (
              <G key={w}>
                {/* engraved shadow */}
                <SvgText x={logoW / 2} y={z(48 + i * 56) + z(2.5)} textAnchor="middle" fontFamily={fonts.display} fontSize={z(48)} letterSpacing={z(5)} fill="#3A2708" opacity={0.9}>{w}</SvgText>
                <SvgText x={logoW / 2} y={z(48 + i * 56)} textAnchor="middle" fontFamily={fonts.display} fontSize={z(48)} letterSpacing={z(5)} fill="url(#logo-gold)" stroke="#6E4E16" strokeWidth={z(0.6)}>{w}</SvgText>
              </G>
            ))}
          </Svg>
        </Animated.View>
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: z(10) }, tagStyle]}>
          <View style={{ width: z(34), height: 1, backgroundColor: colors.goldDeep }} />
          <Text style={{ fontFamily: fonts.uiBold, fontSize: z(11), letterSpacing: z(4), color: colors.textWarm }}>INDIAN 13 CARD RUMMY</Text>
          <View style={{ width: z(34), height: 1, backgroundColor: colors.goldDeep }} />
        </Animated.View>

        <View style={{ marginTop: z(18), width: z(220), height: z(4), borderRadius: z(3), backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: '100%', borderRadius: z(3), backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }} />
        </View>
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.uiBold, fontSize: z(10), letterSpacing: z(3), color: '#A8997A' }}>
          {(ready ? 'READY · ' : 'SHUFFLING THE DECK · ') + pct + '%'}
        </Text>

        <Animated.View pointerEvents={ready ? 'auto' : 'none'} style={[{ marginTop: z(6) }, enterStyle]}>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: z(22), backgroundColor: colors.gold }, ringStyle]} />
          <Pressable onPress={play} accessibilityRole="button" accessibilityLabel="Tap to play"
            style={({ pressed }) => ({
              height: Math.max(44, z(46)), width: z(200), borderRadius: z(23), justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
              borderWidth: 1, borderColor: '#FFE9A8', transform: [{ scale: pressed ? 0.95 : 1 }],
              shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
            })}>
            <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
              <Defs>
                <LinearGradient id="btn-gold" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FBE7A6" />
                  <Stop offset="0.5" stopColor="#E8C66A" />
                  <Stop offset="1" stopColor="#B98A30" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#btn-gold)" />
              <Rect x="6%" y="8%" width="88%" height="38%" rx={z(12)} fill="#FFFFFF" opacity={0.18} />
            </Svg>
            <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(14), letterSpacing: z(3.5), color: '#2A1D05' }}>TAP TO PLAY</Text>
          </Pressable>
        </Animated.View>
      </View>

      <Text style={{ position: 'absolute', left: brandLeft, width: brandW, bottom: Math.max(z(12), L.insets.bottom + z(6)), textAlign: 'center', fontFamily: fonts.uiBold, fontSize: z(9), letterSpacing: z(1.6), color: 'rgba(232,220,190,0.55)' }}>
        VIRTUAL CHIPS ONLY · NO REAL MONEY · 18+
      </Text>
    </View>
  );
}
