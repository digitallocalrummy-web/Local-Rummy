import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

const TABLE = require('../../assets/images/table.webp');

/**
 * Photo of the gaming table with a dark vignette, behind the lobby and settings
 * (same as the web version: table.webp under a radial dim, or a flat dim).
 */
export function TableBackdrop({ flat }: { flat?: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B0906' }]} pointerEvents="none">
      <Image source={TABLE} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
      {flat != null ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(5,6,5,${flat})` }]} />
      ) : (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="lobby-dim" cx="50%" cy="50%" rx="60%" ry="75%">
              <Stop offset="0" stopColor="#060806" stopOpacity={0.35} />
              <Stop offset="0.6" stopColor="#060806" stopOpacity={0.62} />
              <Stop offset="1" stopColor="#040504" stopOpacity={0.9} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#lobby-dim)" />
        </Svg>
      )}
    </View>
  );
}

/** The glassy dark panel used by the lobby and settings. */
export const panelStyle = {
  backgroundColor: 'rgba(12,14,12,0.86)',
  borderWidth: 1,
  borderColor: 'rgba(201,162,74,0.5)',
  overflow: 'hidden' as const,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 30 },
  shadowOpacity: 0.65,
  shadowRadius: 30,
  elevation: 16,
};
