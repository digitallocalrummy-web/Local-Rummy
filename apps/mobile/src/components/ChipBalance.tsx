import { Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

export const formatChips = (n: number) => n.toLocaleString('en-IN');

export function Chip({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: colors.gold,
        borderWidth: Math.max(1.5, size * 0.14), borderColor: '#8a6a2a', borderStyle: 'dashed',
      }}
    />
  );
}

/** Virtual chip pill. With `onAdd`, shows the gold plus button. */
export function ChipBalance({ amount, s, onAdd, compact }: { amount: number; s: number; onAdd?: () => void; compact?: boolean }) {
  const h = (compact ? 20 : 34) * s;
  return (
    <View
      accessible
      accessibilityLabel={`${formatChips(amount)} virtual chips`}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6 * s, height: h, borderRadius: h / 2,
        paddingLeft: (compact ? 8 : 10) * s, paddingRight: onAdd ? 4 * s : (compact ? 8 : 12) * s,
        backgroundColor: 'rgba(0,0,0,0.38)', borderWidth: compact ? 0 : 1, borderColor: 'rgba(232,198,106,0.4)',
      }}
    >
      <Chip size={(compact ? 9 : 14) * s} />
      <Text style={{ fontFamily: fonts.uiHeavy, fontSize: (compact ? 10 : 13) * s, color: colors.goldBright }}>{formatChips(amount)}</Text>
      {onAdd ? (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Add chips"
          hitSlop={10}
          style={{ width: 26 * s, height: 26 * s, borderRadius: 13 * s, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={16 * s} color={colors.goldInk} strokeWidth={3} />
        </Pressable>
      ) : null}
    </View>
  );
}
