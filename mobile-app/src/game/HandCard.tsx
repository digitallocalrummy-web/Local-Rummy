import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { PlayingCard, cardLabel } from '../components/PlayingCard';
import { motion } from '../theme';
import type { Card } from '../types';

export type Point = { x: number; y: number };

interface Props {
  card: Card;
  index: number;
  x: number;
  y: number;
  width: number;
  lift: number;
  selected: boolean;
  /** Card has the wild joker's rank: shows the WILD tag. */
  wild?: boolean;
  /** Where the card enters from (deck or open pile) and after what delay. */
  from?: Point;
  delay?: number;
  /** Open pile position the card flies to when discarded. */
  discardTo: Point;
  /** When true, fly to the open pile now (Discard button). */
  discarding: boolean;
  /** Dragging upward past this distance discards, when allowed. */
  canDiscard: boolean;
  animate: boolean;
  onTap: (id: string) => void;
  onDrop: (id: string, finalX: number) => void;
  onDiscarded: (id: string) => void;
}

/**
 * One card in the player's hand.
 * Tap to lift/select, drag sideways to rearrange, drag up onto the table to discard.
 * Position is driven by shared values so movement stays on the UI thread.
 */
export const HandCard = memo(function HandCard(props: Props) {
  const { card, index, x, y, width, lift, selected, from, delay = 0, discardTo, discarding, canDiscard, animate } = props;
  const tx = useSharedValue(from ? from.x : x);
  const ty = useSharedValue(from ? from.y : y + (selected ? -lift : 0));
  const appear = useSharedValue(from ? 0 : 1);
  const dragging = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const gone = useSharedValue(0);

  // Deal / draw entrance.
  useEffect(() => {
    if (!from) return;
    const d = animate ? delay : 0;
    const spring = animate ? motion.card : { damping: 100, stiffness: 2000 };
    appear.value = withDelay(d, withTiming(1, { duration: animate ? motion.base : 0 }));
    tx.value = withDelay(d, withSpring(x, spring));
    ty.value = withDelay(d, withSpring(y, spring));
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow slot changes (sort, group, reorder, selection) when not dragging.
  useEffect(() => {
    if (dragging.value || gone.value) return;
    const targetY = y + (selected ? -lift : 0);
    if (animate) {
      tx.value = withSpring(x, motion.card);
      ty.value = withSpring(targetY, motion.card);
    } else {
      tx.value = x;
      ty.value = targetY;
    }
  }, [x, y, selected, lift, animate, tx, ty, dragging, gone]);

  const finishDiscard = (id: string) => props.onDiscarded(id);

  // Programmatic discard from the Discard button.
  useEffect(() => {
    if (!discarding) return;
    gone.value = 1;
    const dur = animate ? 320 : 0;
    tx.value = withTiming(discardTo.x, { duration: dur, easing: Easing.out(Easing.cubic) });
    ty.value = withTiming(discardTo.y, { duration: dur, easing: Easing.out(Easing.cubic) }, (done) => {
      'worklet';
      if (done) scheduleOnRN(finishDiscard, card.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discarding]);

  const tapCb = (id: string) => props.onTap(id);
  const dropCb = (id: string, fx: number) => props.onDrop(id, fx);

  const tap = useTapGesture({
    onActivate: () => {
      'worklet';
      scheduleOnRN(tapCb, card.id);
    },
  });

  const pan = usePanGesture({
    minDistance: 8,
    onActivate: () => {
      'worklet';
      dragging.value = 1;
      startX.value = tx.value;
      startY.value = ty.value;
    },
    onUpdate: (e) => {
      'worklet';
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
    },
    onDeactivate: (e) => {
      'worklet';
      dragging.value = 0;
      const pulledUp = -e.translationY > width * 1.2;
      if (pulledUp && canDiscard) {
        gone.value = 1;
        tx.value = withTiming(discardTo.x, { duration: 240, easing: Easing.out(Easing.cubic) });
        ty.value = withTiming(discardTo.y, { duration: 240, easing: Easing.out(Easing.cubic) }, (done) => {
          'worklet';
          if (done) scheduleOnRN(finishDiscard, card.id);
        });
      } else {
        scheduleOnRN(dropCb, card.id, tx.value);
        ty.value = withSpring(y + (selected ? -lift : 0), motion.card);
        tx.value = withSpring(x, motion.card);
      }
    },
  });

  const gesture = useCompetingGestures(pan, tap);

  const style = useAnimatedStyle(() => ({
    opacity: appear.value,
    zIndex: dragging.value ? 100 : gone.value ? 90 : index,
    elevation: dragging.value ? 20 : 4 + index * 0.1,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: interpolate(dragging.value, [0, 1], [1, 1.08]) },
      { rotate: `${interpolate(appear.value, [0, 1], [-8, 0])}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={cardLabel(card)}
        accessibilityState={{ selected }}
        style={[styles.slot, style]}
      >
        <PlayingCard
          card={card}
          width={width}
          highlighted={selected}
          wild={props.wild}
          style={selected ? styles.lifted : undefined}
        />
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, top: 0 },
  lifted: {
    shadowColor: '#F5C542',
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
});
