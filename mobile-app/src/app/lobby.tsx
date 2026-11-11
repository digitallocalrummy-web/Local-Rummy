import { router } from 'expo-router';
import { LogOut, Settings, User } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { panelStyle, TableBackdrop } from '../components/Backdrop';
import { PracticePane, QuickPlayPane } from '../components/LobbyPanes';
import { useStage } from '../game/Stage';
import { AnimatedModal } from '../components/AnimatedModal';
import { ChipBalance, formatChips } from '../components/ChipBalance';
import { Crown } from '../components/Decor';
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

const tabs: { id: 'fun' | 'quick' | 'practice' | 'friends'; label: string; heading: string; sub: string }[] = [
  { id: 'fun', label: 'PLAY FOR FUN', heading: 'Choose a table', sub: 'Virtual chips only · No real money' },
  { id: 'quick', label: 'QUICK PLAY', heading: 'Quick play · instant seat', sub: 'Pick your game, we seat you at the next open table' },
  { id: 'practice', label: 'PRACTICE', heading: 'Practice vs AI', sub: 'Free tables to learn and warm up · no chips used' },
  { id: 'friends', label: 'PLAY WITH FRIENDS', heading: 'Play with friends', sub: 'Private tables with people you know' },
];

/** Round header button (profile, settings, exit). */
function HeadBtn({ z, label, onPress, children }: { z: (n: number) => number; label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => ({ width: z(34), height: z(34), borderRadius: z(17), borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] })}>
      {children}
    </Pressable>
  );
}

export default function Lobby() {
  const L = useLayout();
  const st = useStage(L);
  const { z } = st;
  const s = L.s;
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
  const t = tabs[tab];
  const practice = t.id === 'practice';
  const friends = t.id === 'friends';
  const modes = (['points', 'pool', 'deals'] as ModeId[])
    .filter((id) => config?.modes[id]?.enabled)
    .map((id, i) => {
      const c = config!.modes[id];
      return { id, name: MODE_LABEL[id], seated: gameModes[i].seated, tagline: '', players: c.maxPlayers > 1 ? `1–${c.maxPlayers}` : '1', entry: c.entries[0] ?? 0 };
    });

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0906', overflow: 'hidden' }}>
      <TableBackdrop />

      <Animated.View entering={FadeIn.duration(500)}
        style={[panelStyle, { position: 'absolute', left: st.x(70), top: st.y(36), width: z(820), height: z(360), borderRadius: z(22), flexDirection: 'row' }]}>
        {/* Left navigation */}
        <View style={{ width: z(180), backgroundColor: 'rgba(255,255,255,0.03)', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)', paddingHorizontal: z(12), paddingVertical: z(18), gap: z(6) }} accessibilityRole="tablist">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(8), paddingHorizontal: z(6), paddingBottom: z(14) }}>
            <Crown width={z(26)} />
            <Text style={{ fontFamily: fonts.display, fontSize: z(15), lineHeight: z(18), letterSpacing: z(2), color: '#F2D27E' }}>{'LOCAL\nRUMMY'}</Text>
          </View>
          {tabs.map((x, i) => {
            const on = i === tab;
            return (
              <Pressable key={x.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { tap(); setTab(i); }}
                style={{ minHeight: z(44), borderRadius: z(10), paddingHorizontal: z(12), flexDirection: 'row', alignItems: 'center', gap: z(10), backgroundColor: on ? 'rgba(232,198,106,0.14)' : 'transparent' }}>
                <View style={{ width: z(6), height: z(6), borderRadius: z(3), backgroundColor: on ? colors.gold : 'rgba(255,255,255,0.25)' }} />
                <Text style={{ flex: 1, fontFamily: fonts.uiHeavy, fontSize: z(11), letterSpacing: z(1), color: on ? colors.goldBright : '#C3CDE2' }}>{x.label}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setProfileOpen(true)} accessibilityRole="button" accessibilityLabel="Open profile"
            style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: z(8), paddingHorizontal: z(6), paddingTop: z(8) }}>
            <PlayerAvatar player={me} size={z(34)} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: z(12), color: colors.text }}>{me.name}</Text>
              <Text style={{ fontFamily: fonts.uiBold, fontSize: z(10), color: '#B5BFD3' }}>Level {me.level}</Text>
            </View>
          </Pressable>
        </View>

        {/* Content */}
        <View style={{ flex: 1, paddingVertical: z(16), paddingHorizontal: z(20), gap: z(14) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(10) }}>
            <Animated.View key={tab} entering={FadeIn.duration(220)} style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(18), color: '#fff' }}>{t.heading}</Text>
              <Text numberOfLines={1} style={{ fontFamily: fonts.ui, fontSize: z(11), color: '#B5BFD3' }}>{t.sub}</Text>
            </Animated.View>
            <ChipBalance amount={chips} s={s} onAdd={() => setBonusOpen(true)} />
            <View style={{ height: z(34), paddingHorizontal: z(10), borderRadius: z(17), borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(11), color: colors.text }}>ENG</Text>
            </View>
            <HeadBtn z={z} label="Profile" onPress={() => setProfileOpen(true)}><User size={z(16)} color="#EEF1F8" /></HeadBtn>
            <HeadBtn z={z} label="Settings" onPress={() => router.push('/settings')}><Settings size={z(16)} color="#EEF1F8" /></HeadBtn>
            <HeadBtn z={z} label="Exit to welcome screen" onPress={() => router.replace('/')}><LogOut size={z(16)} color="#EEF1F8" /></HeadBtn>
          </View>

          <Animated.View key={tab} entering={FadeInDown.duration(300)} style={{ flex: 1, flexDirection: 'row', gap: z(12) }}>
            {t.id === 'friends' ? (
              <FriendsPanel s={s} onCreate={(id) => setSetup(id)} />
            ) : t.id === 'quick' ? (
              <QuickPlayPane z={z} />
            ) : t.id === 'practice' ? (
              <PracticePane z={z} />
            ) : modes.length ? (
              modes.map((m, i) => <GameModeCard key={m.id} mode={m} index={i} s={s} onPlay={() => { tap(); setSetup(m.id); }} />)
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.uiBold, fontSize: z(13), color: '#B5BFD3' }}>No tables are open right now. Please check back soon.</Text>
              </View>
            )}
          </Animated.View>
        </View>
      </Animated.View>

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
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,7,5,0.94)', alignItems: 'center', justifyContent: 'center', gap: 14 * s, padding: 24 * s }]}>
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
