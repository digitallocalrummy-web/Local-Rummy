import { ArrowDownUp, Layers, Smile } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { RadialFill } from '../components/Decor';
import { GameButton } from '../components/GameButton';
import { CardBack, PlayingCard, cardLabel, isRed } from '../components/PlayingCard';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';
import type { Card } from '../types';
import type { GameLayout, Rect } from './useGameLayout';

/** Emerald felt with gold rail, inner pinstripe and centre emblem. */
export function GameTable({ rect, s }: { rect: Rect; s: number }) {
  const { table } = useSettings();
  const r = 30 * s;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.felt,
        { left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: r, borderWidth: 3 * s },
      ]}
    >
      <RadialFill inner={table.light} mid={table.mid} outer={table.dark} id={`felt-${table.id}`} radius={r - 3 * s} />
      <View style={{ position: 'absolute', left: 10 * s, top: 10 * s, right: 10 * s, bottom: 10 * s, borderRadius: r - 8 * s, borderWidth: 1, borderColor: 'rgba(232,198,106,0.28)' }} />
      <View
        style={{
          position: 'absolute', alignSelf: 'center', top: rect.h * 0.46 - 75 * s, width: 300 * s, height: 150 * s,
          borderRadius: 150 * s, borderWidth: 1, borderColor: 'rgba(232,198,106,0.16)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 * s,
        }}
      >
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 12 * s, letterSpacing: 6 * s, color: 'rgba(232,198,106,0.32)' }}>LOCAL RUMMY</Text>
      </View>
    </View>
  );
}

/** Closed deck with the wild joker tucked sideways beneath it. */
export function CardDeck({ layout, joker, active, onDraw }: { layout: GameLayout; joker: Card; active: boolean; onDraw: () => void }) {
  const { deck, s } = layout;
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = active ? withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.25, { duration: 700 })), -1) : withTiming(0);
  }, [active, glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const color = isRed(joker.suit) ? colors.suitRed : colors.suitBlack;

  return (
    <View style={{ position: 'absolute', left: deck.x, top: deck.y, width: deck.w + 40 * s, height: deck.h + 22 * s }}>
      <View
        accessible
        accessibilityLabel={`Wild joker: ${cardLabel(joker)}`}
        style={[
          styles.jokerCard,
          { left: deck.w * 0.32, top: deck.h * 0.24, width: deck.h * 0.84, height: deck.w * 0.88, borderRadius: 6 * s, paddingRight: 8 * s, gap: 2 * s },
        ]}
      >
        <Text style={{ fontFamily: fonts.card, fontSize: 15 * s, color }}>{joker.rank}</Text>
        <Text style={{ fontSize: 15 * s, color }}>{joker.suit}</Text>
      </View>
      {[3, 2, 1].map((o) => (
        <View key={o} style={{ position: 'absolute', left: 0, top: o * 1.5 * s, width: deck.w, height: deck.h, borderRadius: 6 * s, backgroundColor: '#F4EBD5', borderWidth: 0.5, borderColor: '#cfc3a6' }} />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: -3 * s, top: -3 * s, width: deck.w + 6 * s, height: deck.h + 6 * s, borderRadius: 8 * s, borderWidth: 2, borderColor: colors.timer }, glowStyle]}
      />
      <Pressable
        onPress={onDraw}
        disabled={!active}
        accessibilityRole="button"
        accessibilityLabel="Draw from closed deck"
        style={({ pressed }) => ({ transform: [{ translateY: pressed ? -3 * s : 0 }] })}
      >
        <CardBack width={deck.w} />
      </Pressable>
      <Text style={[styles.pileLabel, { top: deck.h + 8 * s, fontSize: 9 * s }]}>DECK · JOKER {joker.rank}{joker.suit}</Text>
    </View>
  );
}

/** Face-up open pile. Pops when a new card lands on it. */
export function DiscardPile({ layout, card, active, onDraw }: { layout: GameLayout; card: Card; active: boolean; onDraw: () => void }) {
  const { open, s } = layout;
  const pop = useSharedValue(1);
  useEffect(() => {
    pop.value = 1.12;
    pop.value = withSpring(1, { damping: 12, stiffness: 260 });
  }, [card.id, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <View style={{ position: 'absolute', left: open.x, top: open.y, width: open.w + 30 * s, height: open.h + 22 * s }}>
      <Animated.View style={style}>
        <Pressable
          onPress={onDraw}
          disabled={!active}
          accessibilityRole="button"
          accessibilityLabel={`Open pile: ${cardLabel(card)}. Tap to pick up`}
          style={[active ? { borderRadius: 8 * s, borderWidth: 2, borderColor: 'rgba(245,197,66,0.6)', margin: -2 } : null]}
        >
          <PlayingCard card={card} width={open.w} />
        </Pressable>
      </Animated.View>
      <Text style={[styles.pileLabel, { top: open.h + 8 * s, fontSize: 9 * s }]}>OPEN PILE</Text>
    </View>
  );
}

/** Fan of the most recent discards in a recessed tray. */
export function DiscardFan({ layout, cards }: { layout: GameLayout; cards: Card[] }) {
  const { discards: d, s } = layout;
  const recent = cards.slice(-4);
  const rots = [-18, -6, 6, 16];
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={`Recent discards: ${recent.map(cardLabel).join(', ')}`}
      style={{ position: 'absolute', left: d.x, top: d.y, width: d.w, height: d.h, borderRadius: 12 * s, backgroundColor: 'rgba(4,40,22,0.55)', borderWidth: 1, borderColor: 'rgba(232,198,106,0.2)' }}
    >
      <Text style={{ position: 'absolute', left: 12 * s, top: 8 * s, fontFamily: fonts.uiHeavy, fontSize: 9 * s, letterSpacing: 1.6, color: colors.textMutedGreen }}>DISCARDS</Text>
      {recent.map((c, i) => (
        <Animated.View
          key={c.id}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(160)}
          style={{ position: 'absolute', left: (18 + i * 30) * s, top: (26 + Math.abs(i - 1.5) * 4) * s, transform: [{ rotate: `${rots[i]}deg` }] }}
        >
          <PlayingCard card={c} width={46 * s} />
        </Animated.View>
      ))}
    </View>
  );
}

export function StatusBanner({ layout, text }: { layout: GameLayout; text: string }) {
  const { status, s } = layout;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: status.x, top: status.y, width: status.w, alignItems: 'center' }}>
      <Animated.View
        key={text}
        entering={FadeIn.duration(200)}
        accessibilityLiveRegion="polite"
        style={{ paddingHorizontal: 14 * s, paddingVertical: 5 * s, borderRadius: 14 * s, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(232,198,106,0.35)' }}
      >
        <Text style={{ fontFamily: fonts.uiBold, fontSize: 11 * s, letterSpacing: 0.6, color: '#F7E7B6' }}>{text}</Text>
      </Animated.View>
    </View>
  );
}

/** Points pill and emote button, top right of the felt. */
export function GameHeader({ layout, onEmote }: { layout: GameLayout; onEmote: () => void }) {
  const { points, emote, s } = layout;
  return (
    <>
      <View
        accessible
        accessibilityLabel="Points 0 of 80"
        style={{ position: 'absolute', left: points.x, top: points.y, alignItems: 'center', paddingHorizontal: 14 * s, paddingVertical: 5 * s, borderRadius: 16 * s, backgroundColor: colors.panelGreen, borderWidth: 1.5, borderColor: colors.goldDeep }}
      >
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 9 * s, letterSpacing: 1.6, color: colors.gold }}>POINTS · DEALS</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 16 * s, color: colors.textWhite }}>
          0<Text style={{ fontSize: 12 * s, color: colors.textMutedGreen }}>/80</Text>
        </Text>
      </View>
      <View style={{ position: 'absolute', left: emote.x, top: emote.y }}>
        <GameButton s={s} round height={40} variant="outline" onPress={onEmote} accessibilityLabel="Emotes" icon={<Smile size={20 * s} color={colors.gold} />} />
      </View>
    </>
  );
}

/** Sort, Group, Discard and Declare stacked in the right rail. */
export function BottomControls({
  layout, onSort, onGroup, onDiscard, onDeclare, canDiscard,
}: { layout: GameLayout; onSort: () => void; onGroup: () => void; onDiscard: () => void; onDeclare: () => void; canDiscard: boolean }) {
  const { rightCol, s } = layout;
  const gap = 8 * s;
  return (
    <View style={{ position: 'absolute', left: rightCol.x, width: rightCol.w, top: rightCol.bottom - (44 * 3 * s + gap * 2) - 2, gap }}>
      <View style={{ flexDirection: 'row', gap }}>
        <GameButton s={s} variant="outline" stacked label="SORT" style={{ flex: 1 }} onPress={onSort} icon={<ArrowDownUp size={16 * s} color={colors.gold} />} />
        <GameButton s={s} variant="outline" stacked label="GROUP" style={{ flex: 1 }} onPress={onGroup} icon={<Layers size={16 * s} color={colors.gold} />} />
      </View>
      <GameButton s={s} variant="danger" label="Discard" onPress={onDiscard} disabled={!canDiscard} />
      <GameButton s={s} variant="gold" label="Declare" onPress={onDeclare} />
    </View>
  );
}

const styles = StyleSheet.create({
  felt: {
    position: 'absolute',
    borderColor: colors.goldDeep,
    backgroundColor: colors.feltMid,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  jokerCard: {
    position: 'absolute',
    backgroundColor: colors.cardFace,
    borderWidth: 1,
    borderColor: colors.cardEdge,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    elevation: 3,
  },
  pileLabel: { position: 'absolute', left: 0, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 1.4, color: colors.textMuted },
});
