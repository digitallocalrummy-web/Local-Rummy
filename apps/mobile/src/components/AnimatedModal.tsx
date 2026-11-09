import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useLayout } from '../hooks/useLayout';
import { colors, fonts, motion } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

/** Gold-framed dialog that fades the table and springs the panel in. */
export function AnimatedModal({ visible, title, onClose, children, width = 560 }: Props) {
  const { s } = useLayout();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['landscape']}>
      {visible ? (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(motion.base)} exiting={FadeOut.duration(motion.fast)} style={[StyleSheet.absoluteFill, styles.scrim]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close dialog" />
          </Animated.View>
          <View style={styles.center} pointerEvents="box-none">
            <Animated.View
              entering={ZoomIn.springify().damping(18).stiffness(220)}
              exiting={ZoomOut.duration(motion.fast)}
              accessibilityViewIsModal
              style={[styles.panel, { width: width * s, borderRadius: 20 * s, padding: 20 * s }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 * s }}>
                <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 18 * s, letterSpacing: 2, color: colors.goldBright }}>{title}</Text>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={10}
                  style={{ width: 36 * s, height: 36 * s, borderRadius: 18 * s, borderWidth: 1, borderColor: colors.goldLine, alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18 * s} color={colors.gold} />
                </Pressable>
              </View>
              {children}
            </Animated.View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0,0,0,0.62)' },
  center: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  panel: {
    backgroundColor: '#0B1A12',
    borderWidth: 1.5,
    borderColor: colors.goldDeep,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
});
