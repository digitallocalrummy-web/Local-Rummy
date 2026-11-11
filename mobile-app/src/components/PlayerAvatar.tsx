import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '../theme';
import type { Player } from '../types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** `photo` is a full image URL; otherwise `avatar` (an emoji); otherwise the initials. */
  player: Pick<Player, 'initials' | 'color' | 'name'> & { avatar?: string | null; photo?: string | null };
  size: number;
  /** Small gold badge (card count). */
  badge?: number | string;
  /** Show an animated turn timer ring. */
  turnSeconds?: number;
}

/** Circular initials avatar with gold ring, optional count badge and turn timer. */
export function PlayerAvatar({ player, size, badge, turnSeconds }: Props) {
  const ring = size + 10;
  const r = ring / 2 - 2;
  const C = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!turnSeconds) return;
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: turnSeconds * 1000, easing: Easing.linear }), -1, false);
  }, [turnSeconds, progress]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: C * progress.value }));

  return (
    <View style={{ width: turnSeconds ? ring : size, height: turnSeconds ? ring : size, alignItems: 'center', justifyContent: 'center' }}>
      {turnSeconds ? (
        <Svg width={ring} height={ring} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
          <Circle cx={ring / 2} cy={ring / 2} r={r} stroke="rgba(0,0,0,0.4)" strokeWidth={3} fill="none" />
          <AnimatedCircle
            cx={ring / 2}
            cy={ring / 2}
            r={r}
            stroke={colors.timer}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${C}`}
            animatedProps={ringProps}
          />
        </Svg>
      ) : null}
      <View
        accessible
        accessibilityLabel={player.name}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: player.color,
          borderWidth: 2,
          borderColor: turnSeconds ? '#FFF1C4' : colors.gold,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {player.photo ? (
          <Image source={{ uri: player.photo }} style={{ width: size, height: size }} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : player.avatar ? (
          <Text style={{ fontSize: size * 0.56, lineHeight: size * 0.72, textAlign: 'center' }}>{player.avatar}</Text>
        ) : (
          <Text style={{ fontFamily: fonts.uiHeavy, fontSize: size * 0.36, color: '#FFF4DA' }}>{player.initials}</Text>
        )}
      </View>
      {badge !== undefined ? (
        <View
          style={[
            styles.badge,
            { minWidth: size * 0.55, height: size * 0.48, borderRadius: size * 0.24, right: -size * 0.26, bottom: -size * 0.1 },
          ]}
        >
          <Text style={{ fontFamily: fonts.uiHeavy, fontSize: size * 0.29, color: colors.goldInk }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    backgroundColor: colors.gold,
    borderWidth: 1.5,
    borderColor: '#3a2a08',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
});
