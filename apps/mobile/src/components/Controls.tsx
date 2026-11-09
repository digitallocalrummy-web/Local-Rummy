import { useEffect, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, useTapGesture, useCompetingGestures } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { colors, fonts, motion } from '../theme';
import { howToPlay } from '../data/sample';

/** Animated on/off switch. */
export function Toggle({ value, onChange, label, s }: { value: boolean; onChange: (v: boolean) => void; label: string; s: number }) {
  const w = 48 * s;
  const h = 28 * s;
  const knob = 22 * s;
  const x = useSharedValue(value ? w - knob - 3 * s : 3 * s);
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    x.value = withSpring(value ? w - knob - 3 * s : 3 * s, motion.press);
    on.value = withTiming(value ? 1 : 0, { duration: motion.fast });
  }, [value, w, knob, s, x, on]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const trackStyle = useAnimatedStyle(() => ({ opacity: on.value }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={10}
      style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', overflow: 'hidden' }}
    >
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: colors.success }, trackStyle]} />
      <Animated.View style={[{ width: knob, height: knob, borderRadius: knob / 2, backgroundColor: '#fff' }, knobStyle]} />
    </Pressable>
  );
}

/** Gold slider driven by a pan gesture, values 0–100. */
export function Slider({ value, onChange, label, s }: { value: number; onChange: (v: number) => void; label: string; s: number }) {
  const [width, setWidth] = useState(1);
  const pos = useSharedValue(0);
  const w = useSharedValue(1);
  const thumb = 22 * s;

  useEffect(() => {
    pos.set((value / 100) * width);
  }, [value, width, pos]);

  const emit = (v: number) => onChange(v);

  const setFromX = (xPos: number) => {
    'worklet';
    const clamped = Math.min(Math.max(xPos, 0), w.value);
    pos.set(clamped);
    scheduleOnRN(emit, Math.round((clamped / w.value) * 100));
  };

  const pan = usePanGesture({
    minDistance: 0,
    onBegin: (e) => {
      'worklet';
      setFromX(e.x - thumb / 2);
    },
    onUpdate: (e) => {
      'worklet';
      setFromX(e.x - thumb / 2);
    },
  });
  const tap = useTapGesture({
    onActivate: (e) => {
      'worklet';
      setFromX(e.x - thumb / 2);
    },
  });
  const gesture = useCompetingGestures(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({ width: pos.value + thumb / 2 }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const inner = e.nativeEvent.layout.width - thumb;
    setWidth(inner);
    w.set(inner);
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(ev) => onChange(Math.min(100, Math.max(0, value + (ev.nativeEvent.actionName === 'increment' ? 10 : -10))))}
        onLayout={onLayout}
        style={{ flex: 1, height: 44 * s, justifyContent: 'center' }}
      >
        <View style={{ position: 'absolute', left: thumb / 2, right: thumb / 2, height: 6 * s, borderRadius: 3 * s, backgroundColor: 'rgba(255,255,255,0.14)' }} />
        <Animated.View style={[{ position: 'absolute', left: 0, height: 6 * s, borderRadius: 3 * s, backgroundColor: colors.gold }, fillStyle]} />
        <Animated.View
          style={[
            { width: thumb, height: thumb, borderRadius: thumb / 2, backgroundColor: colors.goldBright, borderWidth: 3, borderColor: colors.goldShadow },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

/** Numbered rules list used by the How to Play dialog. */
export function HowToPlayContent({ s }: { s: number }) {
  return (
    <View style={{ gap: 8 * s }}>
      {howToPlay.map((line, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 * s, alignItems: 'flex-start' }}>
          <View style={{ width: 22 * s, height: 22 * s, borderRadius: 11 * s, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 11 * s, color: colors.goldInk }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.ui, fontSize: 13 * s, lineHeight: 18 * s, color: colors.text }}>{line}</Text>
        </View>
      ))}
    </View>
  );
}
