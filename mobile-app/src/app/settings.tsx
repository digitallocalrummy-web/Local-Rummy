import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { panelStyle, TableBackdrop } from '../components/Backdrop';
import { Pill } from '../components/LobbyPanes';
import { useStage } from '../game/Stage';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedModal } from '../components/AnimatedModal';
import { HowToPlayContent, Slider, Toggle } from '../components/Controls';
import { GameButton } from '../components/GameButton';
import { SupportModal } from '../components/SupportModal';
import { APP_VERSION, useSession } from '../net/session';
import { useLayout } from '../hooks/useLayout';
import { useSettings } from '../state/settings';
import { cardBackThemes, colors, fonts, tableThemes } from '../theme';

export default function SettingsScreen() {
  const L = useLayout();
  const { s } = L;
  const stage = useStage(L);
  const st = useSettings();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { me } = useSession();

  const label = { fontFamily: fonts.uiBold, fontSize: 13 * s, color: colors.text } as const;
  const section = { fontFamily: fonts.uiHeavy, fontSize: 9 * s, letterSpacing: 1.6, color: '#B5BFD3' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0906' }}>
      <TableBackdrop flat={0.7} />
      <View style={[panelStyle, { position: 'absolute', left: stage.x(70), top: stage.y(26), width: stage.z(820), height: stage.z(380), borderRadius: 22 * s, padding: 18 * s, paddingHorizontal: 24 * s, gap: 14 * s }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 * s }}>
          <GameButton s={s} round height={40} variant="outline" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/lobby'))} icon={<ChevronLeft size={20 * s} color={colors.gold} />} />
          <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 22 * s, letterSpacing: 3, color: '#F2D27E' }}>SETTINGS</Text>
        </View>

        <View style={{ flex: 1, flexDirection: 'row', gap: 16 * s }}>
          <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.box, { borderRadius: 14 * s, padding: 14 * s, paddingHorizontal: 16 * s, gap: 6 * s }]}>
            <Text style={section}>AUDIO & FEEL</Text>
            <View style={styles.row}>
              <Text style={[label, { width: 86 * s }]}>Sound</Text>
              <Slider value={st.sound} onChange={(v) => st.update({ sound: v })} label="Sound volume" s={s} />
              <Text style={[label, { width: 34 * s, textAlign: 'right', color: colors.goldBright }]}>{st.sound}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[label, { width: 86 * s }]}>Music</Text>
              <Slider value={st.music} onChange={(v) => st.update({ music: v })} label="Music volume" s={s} />
              <Text style={[label, { width: 34 * s, textAlign: 'right', color: colors.goldBright }]}>{st.music}</Text>
            </View>
            <View style={[styles.row, { justifyContent: 'space-between', minHeight: 44 }]}>
              <Text style={label}>Haptic feedback</Text>
              <Toggle value={st.haptics} onChange={(v) => st.update({ haptics: v })} label="Haptic feedback" s={s} />
            </View>
            <View style={[styles.row, { justifyContent: 'space-between', minHeight: 44 }]}>
              <Text style={label}>Card animations</Text>
              <Toggle value={st.animations} onChange={(v) => st.update({ animations: v })} label="Card animations" s={s} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} style={[styles.box, { borderRadius: 14 * s, padding: 14 * s, paddingHorizontal: 16 * s, gap: 10 * s }]}>
            <View style={{ flexDirection: 'row', gap: 14 * s }}>
              <View style={{ flex: 1, gap: 10 * s }}>
                <Text style={section}>TABLE THEME</Text>
                <View style={{ flexDirection: 'row', gap: 10 * s, flexWrap: 'wrap' }}>
                  {tableThemes.map((t) => {
                    const on = st.tableTheme === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => {
                          st.tap();
                          st.update({ tableTheme: t.id });
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={`${t.name} table`}
                        hitSlop={4}
                        style={{ width: 56 * s, height: Math.max(40 * s, 40), borderRadius: 20 * s, backgroundColor: t.mid, borderWidth: 2, borderColor: on ? colors.gold : 'transparent' }}
                      />
                    );
                  })}
                </View>
                <Text style={section}>CARD BACK</Text>
                <View style={{ flexDirection: 'row', gap: 12 * s }}>
                  {cardBackThemes.map((b) => {
                    const on = st.cardBack === b.id;
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => {
                          st.tap();
                          st.update({ cardBack: b.id });
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={`${b.name} card back`}
                        style={{ padding: 3, borderRadius: 7 * s, borderWidth: 2, borderColor: on ? colors.gold : 'transparent' }}
                      >
                        <View style={{ width: 30 * s, height: 44 * s, borderRadius: 4 * s, backgroundColor: '#fff', padding: 2.5 * s }}>
                          <View style={{ flex: 1, borderRadius: 3 * s, backgroundColor: b.fill, borderWidth: 1, borderColor: '#E3C27A' }} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
            <View style={{ marginTop: 'auto', flexDirection: 'row', gap: 10 * s }}>
              <Pill z={stage.z} line h={40} fs={14} label="How to Play" onPress={() => { st.tap(); setRulesOpen(true); }} style={{ flex: 1 }} />
              <Pill z={stage.z} line h={40} fs={14} label="Help" onPress={() => { st.tap(); setHelpOpen(true); }} style={{ flex: 1 }} />
              <Pill z={stage.z} line h={40} fs={14} label="About" onPress={() => { st.tap(); setAboutOpen(true); }} style={{ flex: 1, borderColor: 'rgba(255,255,255,0.25)', borderBottomColor: 'rgba(255,255,255,0.25)' }} />
            </View>
          </Animated.View>
        </View>
      </View>

      <AnimatedModal visible={rulesOpen} title="HOW TO PLAY" onClose={() => setRulesOpen(false)}>
        <HowToPlayContent s={s} />
      </AnimatedModal>
      <SupportModal s={s} visible={helpOpen} onClose={() => setHelpOpen(false)} />
      <AnimatedModal visible={aboutOpen} title="ABOUT" onClose={() => setAboutOpen(false)} width={440}>
        <Text style={{ fontFamily: fonts.ui, fontSize: 13 * s, lineHeight: 19 * s, color: colors.text }}>
          Local Rummy · version {APP_VERSION}{'\n'}Indian 13-card rummy with virtual chips only. Chips have no cash value and cannot be bought or withdrawn.{'\n'}Your player ID: {me?.code ?? '—'}
        </Text>
      </AnimatedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
