import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '../theme';
import type { Opponent } from '../types';
import { CardBack, PlayingCard } from './PlayingCard';
import { PlayerAvatar } from './PlayerAvatar';

const statusText: Record<Opponent['status'], string> = {
  waiting: 'WAITING',
  thinking: 'THINKING',
  'last-played': 'LAST PLAYED',
  dropped: 'DROPPED',
};

/** Framed opponent seat: avatar with card count, mini fan or last card, name, status. */
export function OpponentPanel({ opponent, s }: { opponent: Opponent; s: number }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (opponent.status === 'thinking') {
      pulse.value = withRepeat(withSequence(withTiming(0.45, { duration: 600 }), withTiming(1, { duration: 600 })), -1);
    }
  }, [opponent.status, pulse]);
  const statusStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      accessible
      accessibilityLabel={`${opponent.name}, ${opponent.cardCount} cards, ${statusText[opponent.status].toLowerCase()}`}
      style={[styles.panel, { width: 96 * s, height: 124 * s, borderRadius: 12 * s, paddingTop: 8 * s, gap: 3 * s }]}
    >
      <PlayerAvatar player={opponent} size={38 * s} badge={opponent.cardCount} />
      <View style={{ height: 31 * s, width: 56 * s, alignItems: 'center', justifyContent: 'center', marginTop: 2 * s }}>
        {opponent.lastCard ? (
          <PlayingCard card={opponent.lastCard} width={22 * s} />
        ) : (
          <View style={{ width: 50 * s, height: 28 * s }}>
            {[-14, 0, 14].map((rot, i) => (
              <CardBack
                key={rot}
                width={18 * s}
                showMark={false}
                style={{ position: 'absolute', left: (6 + i * 10) * s, top: i === 1 ? 0 : 2 * s, transform: [{ rotate: `${rot}deg` }] }}
              />
            ))}
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: 13 * s, color: colors.textWhite }}>{opponent.name}</Text>
      <Animated.Text style={[{ fontFamily: fonts.uiBold, fontSize: 9 * s, letterSpacing: 1.4, color: colors.gold }, statusStyle]}>
        {opponent.isAI ? 'AI · ' : ''}
        {statusText[opponent.status]}
      </Animated.Text>
    </View>
  );
}

/** Compact pill seat used across the top of the table. */
export function OpponentPill({ opponent, s }: { opponent: Opponent; s: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`${opponent.name}, ${opponent.cardCount} cards, ${statusText[opponent.status].toLowerCase()}`}
      style={[styles.pill, { gap: 10 * s, paddingVertical: 6 * s, paddingLeft: 6 * s, paddingRight: 14 * s, borderRadius: 26 * s }]}
    >
      <PlayerAvatar player={opponent} size={36 * s} />
      <View>
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 13 * s, color: colors.textWhite }}>{opponent.name}</Text>
        <Text style={{ fontFamily: fonts.uiBold, fontSize: 10 * s, letterSpacing: 1.2, color: colors.textMuted }}>
          {opponent.cardCount} CARDS · {statusText[opponent.status]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.goldDeep,
    backgroundColor: colors.panelGreen,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panelGreen,
    borderWidth: 1.5,
    borderColor: 'rgba(201,162,74,0.7)',
  },
});
