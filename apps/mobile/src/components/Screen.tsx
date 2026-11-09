import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useLayout } from '../hooks/useLayout';
import { colors } from '../theme';

/** Full-bleed background with a safe-area content frame. */
export function Screen({ background, children, color = colors.bgDeep }: { background?: ReactNode; children: ReactNode; color?: string }) {
  const { insets } = useLayout();
  return (
    <View style={{ flex: 1, backgroundColor: color }}>
      {background}
      <View style={{ flex: 1, paddingLeft: insets.left, paddingRight: insets.right, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {children}
      </View>
    </View>
  );
}
