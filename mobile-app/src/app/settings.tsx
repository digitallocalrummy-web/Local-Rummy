import { router } from 'expo-router';
import { ChevronLeft, CircleHelp, Info, LifeBuoy } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedModal } from '../components/AnimatedModal';
import { HowToPlayContent, Slider, Toggle } from '../components/Controls';
import { RadialFill } from '../components/Decor';
import { GameButton } from '../components/GameButton';
import { SupportModal } from '../components/SupportModal';
import { APP_VERSION, useSession } from '../net/session';
import { CardBack, PlayingCard } from '../components/PlayingCard';
import { makeCard } from '../data/sample';
import { useLayout } from '../hooks/useLayout';
import { useSettings } from '../state/settings';
import { cardBackThemes, colors, fonts, tableThemes } from '../theme';

const previewCard = makeCard('Q', '♥');

export default function SettingsScreen() {
  const { s, W, H, safeW } = useLayout();
  const st = useSettings();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { me } = useSession();

  const panelW = Math.min(safeW - 24 * s, 820 * s);
  const panelH = 372 * s;

  const label = { fontFamily: fonts.uiBold, fontSize: 13 * s, color: colors.text } as const;
  const section = { fontFamily: fonts.uiHeavy, fontSize: 10 * s, letterSpacing: 1.6, color: colors.textMutedBlue } as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLobbyDeep }}>
      <RadialFill inner="#26345A" mid="#18213C" outer="#0E1426" cy="40%" id="settings-bg" />
      <View style={[styles.panel, { position: 'absolute', left: (W - panelW) / 2, top: (H - panelH) / 2, width: panelW, height: panelH, borderRadius: 22 * s, padding: 18 * s, paddingHorizontal: 24 * s, gap: 14 * s }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 * s }}>
          <GameButton s={s} round height={40} variant="ghost" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/lobby'))} icon={<ChevronLeft size={20 * s} color={colors.gold} />} />
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
                        style={{ width: 56 * s, height: 44, borderRadius: 22, backgroundColor: t.mid, borderWidth: 2, borderColor: on ? colors.gold : 'transparent' }}
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
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 110 * s }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={{ width: 110 * s, height: 96 * s, borderRadius: 14 * s, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.goldDeep }}>
                  <RadialFill inner={st.table.light} mid={st.table.mid} outer={st.table.dark} id={`preview-${st.table.id}`} />
                  <View style={{ flexDirection: 'row' }}>
                    <CardBack width={40 * s} style={{ transform: [{ rotate: '-8deg' }] }} />
                    <PlayingCard card={previewCard} width={40 * s} style={{ marginLeft: -12 * s, transform: [{ rotate: '8deg' }] }} />
                  </View>
                </View>
                <Text style={[section, { marginTop: 6 * s }]}>PREVIEW</Text>
              </View>
            </View>
            <View style={{ marginTop: 'auto', flexDirection: 'row', gap: 10 * s }}>
              <GameButton s={s} variant="ghost" label="How to Play" height={40} style={{ flex: 1, borderRadius: 12 * s }} onPress={() => setRulesOpen(true)} icon={<CircleHelp size={16 * s} color={colors.gold} />} />
              <GameButton s={s} variant="ghost" label="Help" height={40} style={{ flex: 1, borderRadius: 12 * s }} onPress={() => setHelpOpen(true)} icon={<LifeBuoy size={16 * s} color={colors.gold} />} />
              <GameButton s={s} variant="dark" label="About" height={40} style={{ flex: 1, borderRadius: 12 * s }} onPress={() => setAboutOpen(true)} icon={<Info size={16 * s} color={colors.text} />} />
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
  panel: {
    backgroundColor: 'rgba(14,20,36,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.55,
    shadowRadius: 40,
    elevation: 16,
  },
  box: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
