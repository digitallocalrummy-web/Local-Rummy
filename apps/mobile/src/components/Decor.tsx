import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
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

/** Faint repeating suit pattern behind the table. */
export function SuitPattern({ color = colors.bgPattern, background = colors.bgTable }: { color?: string; background?: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="suits" width={56} height={56} patternUnits="userSpaceOnUse">
            <SvgText x={6} y={22} fontSize={16} fill={color}>♦</SvgText>
            <SvgText x={34} y={50} fontSize={16} fill={color}>♣</SvgText>
            <SvgText x={34} y={22} fontSize={14} fill={color}>♠</SvgText>
            <SvgText x={6} y={50} fontSize={14} fill={color}>♥</SvgText>
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={background} />
        <Rect width="100%" height="100%" fill="url(#suits)" />
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
