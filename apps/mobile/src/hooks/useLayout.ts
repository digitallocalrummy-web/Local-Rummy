import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const REF_W = 960;
export const REF_H = 432;

/**
 * Landscape layout metrics.
 * `s` scales the 960×432 reference design so it fits both the width and height
 * of the safe area. Extra room on wide (20:9) or tall (tablet) screens is
 * absorbed by flexible areas such as the felt, never by stretching graphics.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The app is locked to landscape, but guard against a portrait frame
  // during the first render on some devices.
  const W = Math.max(width, height);
  const H = Math.min(width, height);
  const left = Math.max(insets.left, 8);
  const right = Math.max(insets.right, 8);
  const top = insets.top;
  const bottom = insets.bottom;
  const safeW = W - left - right;
  const safeH = H - top - bottom;
  const s = Math.min(safeW / REF_W, safeH / REF_H, 1.6);
  return { W, H, safeW, safeH, s, insets: { left, right, top, bottom }, isTablet: Math.min(W, H) >= 600 };
}

export type Layout = ReturnType<typeof useLayout>;
