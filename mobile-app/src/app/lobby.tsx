import { router } from 'expo-router';
import { GraduationCap, LogOut, Settings, Sparkles, User, Users, Zap } from 'lucide-react-native';
import { useState, type ComponentType } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft } from 'react-native-reanimated';
import { AnimatedModal } from '../components/AnimatedModal';
import { ChipBalance, formatChips } from '../components/ChipBalance';
import { Crown, RadialFill } from '../components/Decor';
import { GameButton } from '../components/GameButton';
import { GameModeCard } from '../components/GameModeCard';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { gameModes } from '../data/sample';
import { FriendsPanel } from '../components/FriendsPanel';
import { MODE_LABEL, TableSetup } from '../components/TableSetup';
import { initialsOf, needsUpdate, useSession, type ModeId } from '../net/session';
import { useLayout } from '../hooks/useLayout';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';

type IconType = ComponentType<{ size?: number; color?: string }>;

const tabs: { id: string; label: string; heading: string; Icon: IconType }[] = [
  { id: 'fun', label: 'PLAY FOR FUN', heading: 'Choose a table', Icon: Sparkles },
  { id: 'quick', label: 'QUICK PLAY', heading: 'Quick play · instant seat', Icon: Zap },
  { id: 'practice', label: 'PRACTICE', heading: 'Practice vs AI · free', Icon: GraduationCap },
  { id: 'friends', label: 'PLAY WITH FRIENDS', heading: 'Private tables', Icon: Users },
];

function FloatingCard({ suit, red, x, y, rot, s }: { suit: string; red?: boolean; x: number; y: number; rot: number; s: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, top: y, width: 110 * s, height: 154 * s, borderRadius: 10 * s, backgroundColor: '#fff',
        transform: [{ rotate: `${rot}deg` }], alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 16 }, elevation: 8,
      }}
    >
      <Text style={{ fontSize: 64 * s, color: red ? colors.suitRed : colors.suitBlack }}>{suit}</Text>
    </View>
  );
}

export default function Lobby() {
  const { s, W, H, safeW } = useLayout();
  const { tap } = useSettings();
  const [tab, setTab] = useState(0);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { me: player, config, claimBonus, refill } = useSession();
  const [setup, setSetup] = useState<ModeId | null>(null);
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);
  const me = {
    id: player?.id ?? 'me', name: player?.name ?? 'Player', initials: initialsOf(player?.name ?? 'Player'),
    color: player?.color ?? '#1F6B4A', chips: player?.chips ?? 0, level: player?.level ?? 1,
  };
  const chips = me.chips;

  const panelW = Math.min(safeW - 24 * s, 820 * s);
  const panelH = 344 * s;
  const practice = tabs[tab].id === 'practice';
  const friends = tabs[tab].id === 'friends';
  const taglines: Record<ModeId, string> = { points: 'One deal, fastest finish wins', pool: 'Single deal for now · pool rules soon', deals: 'Single deal for now · deal rules soon' };
  const modes = (['points', 'pool', 'deals'] as ModeId[])
    .filter((id) => config?.modes[id]?.enabled)
    .map((id, i) => {
      const c = config!.modes[id];
      return {
        id, name: MODE_LABEL[id], seated: gameModes[i].seated,
        tagline: practice ? 'Free table vs AI · no chips used' : taglines[id],
        players: c.maxPlayers > 1 ? `1–${c.maxPlayers}` : '1',
        entry: practice ? 0 : c.entries[0] ?? 0,
      };
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLobbyDeep, overflow: 'hidden' }}>
      <RadialFill inner="#26345A" mid="#18213C" outer="#0E1426" cy="40%" id="lobby-bg" />
      <FloatingCard suit="♣" x={W * 0.16} y={-70 * s} rot={-18} s={s} />
      <FloatingCard suit="♦" red x={-40 * s} y={H - 150 * s} rot={28} s={s} />
      <FloatingCard suit="♥" red x={W * 0.66} y={H - 72 * s} rot={-10} s={s} />
      <FloatingCard suit="♠" x={W - 70 * s} y={30 * s} rot={20} s={s} />

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          entering={FadeIn.duration(320)}
          style={[styles.panel, { position: 'absolute', left: (W - panelW) / 2, top: (H - panelH) / 2, width: panelW, height: panelH, borderRadius: 22 * s }]}
        >
          {/* Left navigation */}
          <View style={[styles.nav, { width: 180 * s, padding: 12 * s, paddingTop: 18 * s, gap: 6 * s }]} accessibilityRole="tablist">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * s, paddingHorizontal: 6 * s, paddingBottom: 12 * s }}>
              <Crown width={26 * s} />
              <Text style={{ fontFamily: fonts.display, fontSize: 15 * s, letterSpacing: 2, color: '#F2D27E' }}>LOCAL RUMMY</Text>
            </View>
            {tabs.map((t, i) => {
              const on = i === tab;
              return (
                <Animated.View key={t.id} entering={FadeInLeft.delay(i * 50)}>
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      tap();
                      setTab(i);
                    }}
                    style={{
                      height: 44 * s, borderRadius: 10 * s, paddingHorizontal: 12 * s, flexDirection: 'row', alignItems: 'center', gap: 10 * s,
                      backgroundColor: on ? 'rgba(232,198,106,0.14)' : 'transparent',
                    }}
                  >
                    <t.Icon size={15 * s} color={on ? colors.gold : '#8C9AB8'} />
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.uiHeavy, fontSize: 11 * s, letterSpacing: 0.8, color: on ? colors.goldBright : '#C3CDE2' }}>
                      {t.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
            <Pressable
              onPress={() => setProfileOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 * s, padding: 6 * s }}
            >
              <PlayerAvatar player={me} size={34 * s} />
              <View>
                <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: 12 * s, color: colors.text, maxWidth: 110 * s }}>{me.name}</Text>
                <Text style={{ fontFamily: fonts.uiBold, fontSize: 10 * s, color: colors.textMutedBlue }}>Level {me.level}</Text>
              </View>
            </Pressable>
          </View>

          {/* Content */}
          <View style={{ flex: 1, padding: 16 * s, paddingHorizontal: 20 * s, gap: 14 * s }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * s }}>
              <View style={{ flex: 1 }}>
                <Animated.Text key={tab} entering={FadeIn.duration(220)} style={{ fontFamily: fonts.uiHeavy, fontSize: 18 * s, color: colors.textWhite }}>
                  {tabs[tab].heading}
                </Animated.Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 11 * s, color: colors.textMutedBlue }}>Virtual chips only · No real money</Text>
              </View>
              <ChipBalance amount={chips} s={s} onAdd={() => setBonusOpen(true)} />
              <View style={[styles.lang, { height: 34 * s, paddingHorizontal: 10 * s, borderRadius: 17 * s }]}>
                <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 11 * s, color: colors.text }}>ENG</Text>
              </View>
              <GameButton s={s} variant="dark" round height={34} accessibilityLabel="Profile" onPress={() => setProfileOpen(true)} icon={<User size={16 * s} color={colors.text} />} />
              <GameButton s={s} variant="dark" round height={34} accessibilityLabel="Settings" onPress={() => router.push('/settings')} icon={<Settings size={16 * s} color={colors.text} />} />
              <GameButton s={s} variant="dark" round height={34} accessibilityLabel="Exit to welcome screen" onPress={() => router.replace('/')} icon={<LogOut size={16 * s} color={colors.text} />} />
            </View>

            <View key={tab} style={{ flexDirection: 'row', gap: 12 * s, flex: 1 }}>
              {friends ? (
                <FriendsPanel s={s} onCreate={(id) => setSetup(id)} />
              ) : modes.length ? (
                modes.map((m, i) => (
                  <GameModeCard key={m.id} mode={m} index={i} s={s} onPlay={() => { tap(); setSetup(m.id); }} />
                ))
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.uiBold, fontSize: 13 * s, color: colors.textMutedBlue }}>No tables are open right now. Please check back soon.</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>

      <AnimatedModal visible={bonusOpen} title="DAILY BONUS" onClose={() => { setBonusOpen(false); setBonusMsg(null); }} width={420}>
        <View style={{ alignItems: 'center', gap: 12 * s }}>
          {player?.bonus.available ? (
            <>
              <Text style={{ fontFamily: fonts.ui, fontSize: 13 * s, color: colors.text, textAlign: 'center' }}>
                Day {player.bonus.day} of your streak. Collect your free virtual chips for today. Chips have no cash value.
              </Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 32 * s, color: colors.goldBright }}>+{formatChips(player.bonus.amount)}</Text>
              <GameButton
                s={s}
                label="COLLECT"
                width={180}
                onPress={async () => {
                  try { await claimBonus(); tap('success'); setBonusOpen(false); } catch (e) { setBonusMsg((e as Error).message); }
                }}
              />
            </>
          ) : (
            <Text style={{ fontFamily: fonts.ui, fontSize: 13 * s, color: colors.text, textAlign: 'center' }}>
              You collected today’s bonus. Come back tomorrow for day {((player?.bonus.day ?? 0) % 7) + 1} of your streak.
            </Text>
          )}
          {chips < 50 && (
            <GameButton s={s} variant="outline" label="GET A FREE REFILL" width={220} onPress={async () => {
              try { const r = await refill(); tap('success'); setBonusMsg(`+${formatChips(r.amount)} chips added.`); } catch (e) { setBonusMsg((e as Error).message); }
            }} />
          )}
          {bonusMsg && <Text style={{ fontFamily: fonts.uiBold, fontSize: 12 * s, color: colors.goldBright, textAlign: 'center' }}>{bonusMsg}</Text>}
        </View>
      </AnimatedModal>

      <AnimatedModal visible={profileOpen} title="PROFILE" onClose={() => setProfileOpen(false)} width={460}>
        <View style={{ flexDirection: 'row', gap: 16 * s, alignItems: 'center' }}>
          <PlayerAvatar player={me} size={64 * s} />
          <View style={{ flex: 1, gap: 4 * s }}>
            <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 18 * s, color: colors.textWhite }}>{me.name}</Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: 12 * s, color: colors.textMutedGreen }}>Level {me.level} · Player ID {player?.code}</Text>
            <View style={{ flexDirection: 'row', gap: 18 * s, marginTop: 6 * s }}>
              {[[String(player?.gamesPlayed ?? 0), 'Games'], [`${player?.gamesPlayed ? Math.round((player.gamesWon / player.gamesPlayed) * 100) : 0}%`, 'Win rate'], [formatChips(chips), 'Chips']].map(([v, l]) => (
                <View key={l}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 18 * s, color: colors.goldBright }}>{v}</Text>
                  <Text style={{ fontFamily: fonts.ui, fontSize: 10 * s, color: colors.textMutedGreen }}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </AnimatedModal>

      <TableSetup key={`${setup}-${practice}-${friends}`} s={s} mode={setup} free={practice} privateTable={friends} onClose={() => setSetup(null)} />
      <ConnectionGate s={s} />
    </View>
  );
}

/** Covers the lobby while signing in, when offline, blocked, in maintenance or when the app is too old. */
function ConnectionGate({ s }: { s: number }) {
  const { status, error, retry, config, connected } = useSession();
  const msg = status === 'starting' ? null
    : status === 'blocked' ? error ?? 'This account is blocked. Contact support.'
    : status === 'offline' ? `Can’t reach Local Rummy. ${error ?? ''}`
    : config?.maintenance ? 'Local Rummy is under maintenance. We’ll be back soon.'
    : needsUpdate(config?.minAppVersion) ? 'A new version of Local Rummy is available. Please install the latest app to keep playing.'
    : null;
  if (status === 'ready' && !msg) {
    return connected ? null : (
      <View pointerEvents="none" style={{ position: 'absolute', top: 8 * s, alignSelf: 'center', paddingHorizontal: 14 * s, paddingVertical: 6 * s, borderRadius: 14 * s, backgroundColor: 'rgba(200,52,59,0.9)' }}>
        <Text style={{ fontFamily: fonts.uiBold, fontSize: 11 * s, color: '#fff' }}>Reconnecting…</Text>
      </View>
    );
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,8,14,0.92)', alignItems: 'center', justifyContent: 'center', gap: 14 * s, padding: 24 * s }]}>
      <Crown width={60 * s} />
      {msg ? (
        <>
          <Text style={{ fontFamily: fonts.uiBold, fontSize: 14 * s, color: colors.textWhite, textAlign: 'center', maxWidth: 460 * s }}>{msg}</Text>
          {(status === 'offline' || config?.maintenance) && <GameButton s={s} label="TRY AGAIN" width={180} onPress={retry} />}
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.gold} />
          <Text style={{ fontFamily: fonts.uiBold, fontSize: 13 * s, color: colors.textMutedBlue }}>Signing you in…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(14,20,36,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.35)',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.55,
    shadowRadius: 40,
    elevation: 16,
  },
  nav: { backgroundColor: 'rgba(255,255,255,0.03)', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)' },
  lang: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center' },
});
