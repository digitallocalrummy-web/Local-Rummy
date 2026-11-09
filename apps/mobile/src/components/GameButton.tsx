import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSettings } from '../state/settings';
import { colors, fonts, fontSize, motion } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'gold' | 'danger' | 'outline' | 'dark' | 'ghost';

interface Props {
  label?: string;
  onPress?: () => void;
  variant?: Variant;
  s: number;
  icon?: ReactNode;
  /** Icon above label (compact tile) instead of beside it. */
  stacked?: boolean;
  width?: number;
  height?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  round?: boolean;
}

const palette: Record<Variant, { bg: string; fg: string; border?: string; inset?: string }> = {
  gold: { bg: colors.gold, fg: colors.goldInk, inset: colors.goldShadow },
  danger: { bg: colors.danger, fg: colors.textWhite, inset: colors.dangerDeep },
  outline: { bg: 'rgba(6,40,24,0.92)', fg: colors.goldBright, border: colors.goldDeep },
  dark: { bg: 'rgba(255,255,255,0.05)', fg: colors.text, border: 'rgba(255,255,255,0.15)' },
  ghost: { bg: 'transparent', fg: colors.goldBright, border: 'rgba(232,198,106,0.5)' },
};

/** Tactile game button: springs down on press, gold or red with a carved bottom edge. */
export function GameButton({
  label, onPress, variant = 'gold', s, icon, stacked, width, height = 44, disabled, accessibilityLabel, style, round,
}: Props) {
  const scale = useSharedValue(1);
  const { tap } = useSettings();
  const p = palette[variant];
  const h = Math.max(height * s, 44); // Keep touch targets at least 44dp.

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        scale.set(withSpring(0.94, motion.press));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, motion.press));
      }}
      onPress={() => {
        tap('light');
        onPress?.();
      }}
      hitSlop={6}
      style={[
        styles.base,
        {
          height: h,
          width: round ? h : width ? width * s : undefined,
          paddingHorizontal: round || width ? 0 : 18 * s,
          borderRadius: stacked ? 12 * s : h / 2,
          backgroundColor: p.bg,
          borderWidth: p.border ? 1.5 : 0,
          borderColor: p.border,
          borderBottomWidth: p.inset ? 3 * s : p.border ? 1.5 : 0,
          borderBottomColor: p.inset ?? p.border,
          opacity: disabled ? 0.45 : 1,
          flexDirection: stacked ? 'column' : 'row',
          gap: stacked ? 2 * s : 8 * s,
        },
        p.inset ? styles.raised : null,
        anim,
        style,
      ]}
    >
      {icon ? <View>{icon}</View> : null}
      {label ? (
        <Text
          numberOfLines={1}
          style={{
            color: p.fg,
            fontFamily: fonts.uiHeavy,
            fontSize: (stacked ? fontSize.caption : fontSize.button) * s,
            letterSpacing: stacked ? 0.8 : 0.4,
          }}
        >
          {label}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
