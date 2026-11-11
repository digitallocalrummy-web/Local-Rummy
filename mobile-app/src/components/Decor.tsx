import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

/** The Local Rummy crown mark. */
export function Crown({ width = 52, color = colors.gold, stroke = '#8a6a2a' }: { width?: number; color?: string; stroke?: string }) {
  const h = (width * 30) / 52;
  return (
    <Svg width={width} height={h} viewBox="0 0 52 30" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M3 27 L7 7 L18 17 L26 2 L34 17 L45 7 L49 27 Z" fill={color} stroke={stroke} strokeWidth={1.5} />
      <Circle cx={26} cy={2.5} r={2.5} fill={colors.goldBright} />
      <Circle cx={7} cy={7} r={2} fill={colors.goldBright} />
      <Circle cx={45} cy={7} r={2} fill={colors.goldBright} />
    </Svg>
  );
}

/** Small crown used inside court cards. */
export function MiniCrown({ width = 16, color = colors.goldDeep }: { width?: number; color?: string }) {
  return (
    <Svg width={width} height={(width * 9) / 16} viewBox="0 0 16 9">
      <Path d="M1 8 L2 2 L5.5 5 L8 0.5 L10.5 5 L14 2 L15 8 Z" fill={color} stroke="#8a6a2a" strokeWidth={0.4} />
    </Svg>
  );
}

export function Star({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill={colors.gold} stroke="#8a6a2a" strokeWidth={1} />
    </Svg>
  );
}

const SUIT_PATHS = {
  diamond: 'M8 0 L14 8 L8 16 L2 8 Z',
  heart: 'M8 15 C8 15 1 10 1 5.5 C1 3 3 1 5 1 C6.5 1 7.5 2 8 3 C8.5 2 9.5 1 11 1 C13 1 15 3 15 5.5 C15 10 8 15 8 15 Z',
  spade: 'M8 1 C8 1 1 6 1 10 C1 12.2 2.8 13.5 4.6 13.5 C6 13.5 7 12.8 7.4 12 L6.5 15.5 H9.5 L8.6 12 C9 12.8 10 13.5 11.4 13.5 C13.2 13.5 15 12.2 15 10 C15 6 8 1 8 1 Z',
  club: 'M8 1.2 A3.3 3.3 0 1 1 7.99 1.2 Z M4.2 6.4 A3.3 3.3 0 1 1 4.19 6.4 Z M11.8 6.4 A3.3 3.3 0 1 1 11.79 6.4 Z M7.2 9 L6.2 15.5 H9.8 L8.8 9 Z',
};

/**
 * Faint repeating suit pattern behind the table, dark green on dark green like the web version.
 * Drawn as shapes, not text: Android shows the ♦ ♥ characters as bright emoji.
 */
export function SuitPattern({ color = '#0d2a1a', color2 = '#0b2517', background = colors.bgTable }: { color?: string; color2?: string; background?: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="suits" width={56} height={56} patternUnits="userSpaceOnUse">
            <G transform="translate(6 8)"><Path d={SUIT_PATHS.diamond} fill={color} /></G>
            <G transform="translate(34 36)"><Path d={SUIT_PATHS.club} fill={color} /></G>
            <G transform="translate(35 9) scale(0.875)"><Path d={SUIT_PATHS.spade} fill={color2} /></G>
            <G transform="translate(7 37) scale(0.875)"><Path d={SUIT_PATHS.heart} fill={color2} /></G>
          </Pattern>
          <RadialGradient id="suits-vignette" cx="50%" cy="50%" rx="60%" ry="70%">
            <Stop offset="0" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.55} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={background} />
        <Rect width="100%" height="100%" fill="url(#suits)" />
        <Rect width="100%" height="100%" fill="url(#suits-vignette)" />
      </Svg>
    </View>
  );
}

/** Radial vignette fill, used for felt and backgrounds. */
export function RadialFill({
  inner, mid, outer, cx = '50%', cy = '42%', id = 'rf', radius,
}: { inner: string; mid: string; outer: string; cx?: string; cy?: string; id?: string; radius?: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, radius ? { borderRadius: radius, overflow: 'hidden' } : null]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx={cx} cy={cy} rx="65%" ry="70%" fx={cx} fy={cy}>
            <Stop offset="0" stopColor={inner} />
            <Stop offset="0.55" stopColor={mid} />
            <Stop offset="1" stopColor={outer} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Diagonal hatch used on card backs. */
export function Hatch({ fill, id }: { fill: string; id: string }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id={id} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Rect width={2} height={7} fill="rgba(255,215,140,0.28)" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={fill} />
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
