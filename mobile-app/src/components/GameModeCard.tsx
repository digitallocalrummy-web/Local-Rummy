import { Plus } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fonts } from '../theme';
import type { GameMode } from '../types';
import { Chip, formatChips } from './ChipBalance';
import { RadialFill } from './Decor';
import { GameButton } from './GameButton';
import { PlayerAvatar } from './PlayerAvatar';

/** Lobby table card: mini oval table with seated players, info rows, Play. */
export function GameModeCard({ mode, s, index, onPlay }: { mode: GameMode; s: number; index: number; onPlay: () => void }) {
  const av = 30 * s;
  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 70).springify().damping(18)}
      style={[styles.card, { borderRadius: 14 * s, padding: 10 * s, paddingBottom: 12 * s, gap: 7 * s }]}
    >
      <View style={{ height: 92 * s }}>
        <View
          style={[
            styles.oval,
            { left: 14 * s, right: 14 * s, top: 16 * s, height: 60 * s, borderRadius: 30 * s, borderWidth: 2.5 * s },
          ]}
        >
          <RadialFill inner="#1B7A4A" mid="#126039" outer="#0C4B2D" id={`mode-${mode.id}`} radius={30 * s} />
          <Text style={{ fontFamily: fonts.display, fontSize: 13 * s, letterSpacing: 1, color: colors.goldBright }}>{mode.name}</Text>
        </View>
        <View style={{ position: 'absolute', left: 8 * s, top: 0 }}><PlayerAvatar player={mode.seated[0]} size={av} /></View>
        <View style={{ position: 'absolute', right: 8 * s, top: 0 }}><PlayerAvatar player={mode.seated[1]} size={av} /></View>
        <View style={{ position: 'absolute', alignSelf: 'center', bottom: 0 }}><PlayerAvatar player={mode.seated[2]} size={av} /></View>
        <View style={[styles.seat, { left: 0, top: 62 * s, width: 26 * s, height: 26 * s, borderRadius: 13 * s, borderWidth: 3 * s, borderColor: 'rgba(232,198,106,0.25)' }]}>
          <Plus size={15 * s} color={colors.goldInk} strokeWidth={3} />
        </View>
      </View>
      {!!mode.tagline && <Text numberOfLines={1} style={{ fontFamily: fonts.uiMedium, fontSize: 10 * s, color: colors.textMutedBlue }}>{mode.tagline}</Text>}
      <View style={styles.row}>
        <Text style={[styles.label, { fontSize: 11 * s }]}>Players</Text>
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 11 * s, color: colors.text }}>{mode.players}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { fontSize: 11 * s }]}>Entry</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 * s }}>
          <Chip size={9 * s} />
          <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 11 * s, color: colors.goldBright }}>{formatChips(mode.entry)}</Text>
        </View>
      </View>
      <GameButton label="PLAY" s={s} height={36} onPress={onPlay} accessibilityLabel={`Play ${mode.name}`} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.panelLine },
  oval: {
    position: 'absolute',
    borderColor: colors.goldDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#0C4B2D',
  },
  seat: {
    position: 'absolute',
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: 'Manrope_600SemiBold', color: colors.textMutedBlue },
});
