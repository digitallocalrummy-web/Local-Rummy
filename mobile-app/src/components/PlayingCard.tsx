import { memo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';
import type { Card } from '../types';
import { Hatch, MiniCrown, Star } from './Decor';

export const CARD_RATIO = 1.45;

export const isRed = (suit: string) => suit === '♥' || suit === '♦';
export const suitColor = (card: Pick<Card, 'rank' | 'suit'>) =>
  card.rank === 'JK' ? colors.joker : isRed(card.suit) ? colors.suitRed : colors.suitBlack;
export const cardLabel = (card: Card) => {
  if (card.rank === 'JK') return 'Joker';
  const names: Record<string, string> = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
  const ranks: Record<string, string> = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
  return `${ranks[card.rank] ?? card.rank} of ${names[card.suit]}`;
};

interface Props {
  card: Card;
  width: number;
  /** Gold outline when the card is selected. */
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A white playing card. Everything inside scales from `width`. */
export const PlayingCard = memo(function PlayingCard({ card, width, highlighted, style }: Props) {
  const h = width * CARD_RATIO;
  const color = suitColor(card);
  const joker = card.rank === 'JK';
  const face = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';
  const ace = card.rank === 'A';
  const large = width >= 100;
  const u = width / 66; // unit relative to the 66px reference card

  const corner = (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.card, fontSize: (large ? 17 : 16) * u, color, letterSpacing: -1, lineHeight: 18 * u }}>
        {joker ? 'J' : card.rank}
      </Text>
      <Text style={{ fontSize: 13 * u, color, lineHeight: 15 * u }}>{card.suit}</Text>
    </View>
  );

  return (
    <View
      style={[
        styles.card,
        {
          width,
          height: h,
          borderRadius: 7 * u,
          borderColor: highlighted ? colors.gold : colors.cardEdge,
          borderWidth: highlighted ? 1.5 : 1,
        },
        style,
      ]}
    >
      <View style={{ position: 'absolute', left: 5 * u, top: 4 * u }}>{corner}</View>
      {large ? (
        <View style={{ position: 'absolute', right: 5 * u, bottom: 4 * u, transform: [{ rotate: '180deg' }] }}>{corner}</View>
      ) : null}

      <View style={[StyleSheet.absoluteFill, styles.center, { paddingTop: large ? 0 : 22 * u }]}>
        {joker ? (
          <View style={{ alignItems: 'center', gap: 2 * u }}>
            <Star size={26 * u} />
            <Text style={{ fontFamily: fonts.display, fontSize: 8 * u, letterSpacing: 1, color: colors.joker }}>JOKER</Text>
          </View>
        ) : face ? (
          <View
            style={{
              width: (large ? 34 : 30) * u,
              height: (large ? 56 : 38) * u,
              borderRadius: 3 * u,
              borderWidth: 1,
              borderColor: colors.cardCourtLine,
              backgroundColor: colors.cardCourt,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1 * u,
            }}
          >
            <MiniCrown width={16 * u} />
            <Text style={{ fontFamily: fonts.display, fontSize: 16 * u, color, lineHeight: 18 * u }}>{card.rank}</Text>
            {large ? <Text style={{ fontSize: 9 * u, color }}>{card.suit}</Text> : null}
          </View>
        ) : (
          <Text style={{ fontSize: (ace && large ? 40 : 28) * u, color, lineHeight: (ace && large ? 44 : 32) * u }}>{card.suit}</Text>
        )}
      </View>
    </View>
  );
});

/** Face-down card in the player's chosen card-back theme. */
export const CardBack = memo(function CardBack({
  width, style, showMark = true,
}: { width: number; style?: StyleProp<ViewStyle>; showMark?: boolean }) {
  const { back } = useSettings();
  const h = width * CARD_RATIO;
  const u = width / 62;
  return (
    <View style={[styles.back, { width, height: h, borderRadius: 6 * u, padding: Math.max(2, 3 * u) }, style]}>
      <View style={{ flex: 1, borderRadius: 4 * u, borderWidth: 1, borderColor: '#E3C27A', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Hatch fill={back.fill} id={`hatch-${back.id}`} />
        {showMark && width > 30 ? (
          <View
            style={{
              width: 26 * u, height: 26 * u, borderRadius: 13 * u, borderWidth: 1.5, borderColor: colors.gold,
              backgroundColor: back.deep, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 13 * u, color: colors.goldBright }}>R</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardFace,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  back: {
    backgroundColor: colors.cardFace,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
});
