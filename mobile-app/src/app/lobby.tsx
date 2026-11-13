import { router } from 'expo-router';
import { LogOut, Settings, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { panelStyle, TableBackdrop } from '../components/Backdrop';
import { CodePane, ProfilePane } from '../components/HomePanes';
import { useStage } from '../game/Stage';
import { AnimatedModal } from '../components/AnimatedModal';
import { ChipBalance, formatChips } from '../components/ChipBalance';
import { Crown } from '../components/Decor';
import { GameButton } from '../components/GameButton';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { initialsOf, needsUpdate, photoUri, useSession } from '../net/session';
import { useLayout } from '../hooks/useLayout';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';

const tabs: { id: 'code' | 'profile'; label: string; heading: string; sub: string }[] = [
  { id: 'code', label: 'PLAY WITH CODE', heading: 'Play with code', sub: 'Join a table with its code, or accept an invitation' },
  { id: 'profile', label: 'PROFILE', heading: 'Your profile', sub: 'Your name, photo, player ID and stats' },
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
  const { me: player, claimBonus, refill, invites } = useSession();
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);
  const me = {
    id: player?.id ?? 'me', name: player?.name ?? 'Player', initials: initialsOf(player?.name ?? 'Player'),
    color: player?.color ?? '#1F6B4A', chips: player?.chips ?? 0, level: player?.level ?? 1,
    avatar: player?.avatar ?? null, photo: photoUri(player?.photoUrl),
  };
  // safety net: a new player who skipped past the splash still sets up their profile first
  useEffect(() => {
    if (player && !player.profileDone) router.replace('/profile?first=1');
  }, [player]);
  const chips = me.chips;
  const t = tabs[tab];

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
                {x.id === 'code' && invites.length > 0 && (
                  <View accessibilityLabel={`${invites.length} invitations`} style={{ minWidth: z(18), height: z(18), borderRadius: z(9), paddingHorizontal: z(5), backgroundColor: '#C8343B', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(10), color: '#fff' }}>{invites.length}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
          <Pressable onPress={() => { tap(); setTab(1); }} accessibilityRole="button" accessibilityLabel="Open profile"
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
            <HeadBtn z={z} label="Profile" onPress={() => { tap(); setTab(1); }}><User size={z(16)} color="#EEF1F8" /></HeadBtn>
            <HeadBtn z={z} label="Settings" onPress={() => router.push('/settings')}><Settings size={z(16)} color="#EEF1F8" /></HeadBtn>
            <HeadBtn z={z} label="Exit to welcome screen" onPress={() => router.replace('/')}><LogOut size={z(16)} color="#EEF1F8" /></HeadBtn>
          </View>

          <Animated.View key={tab} entering={FadeInDown.duration(300)} style={{ flex: 1, flexDirection: 'row', gap: z(12) }}>
            {t.id === 'code' ? <CodePane z={z} /> : <ProfilePane z={z} />}
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
