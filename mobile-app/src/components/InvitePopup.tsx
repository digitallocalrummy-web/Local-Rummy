import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useLayout } from '../hooks/useLayout';
import { photoUri, useSession } from '../net/session';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';
import { formatChips } from './ChipBalance';
import { Crown } from './Decor';
import { Pill } from './LobbyPanes';
import { PlayerAvatar } from './PlayerAvatar';
import { MODE_LABEL } from './TableSetup';

/**
 * Admin invitation to a code table. Pops up over any screen except the splash, profile setup
 * and a running game, with a chime. Join takes the player straight to the table's lobby.
 */
export function InvitePopup() {
  const { invites, table, joinInvite, declineInvite, me } = useSession();
  const { sfx, tap } = useSettings();
  const path = usePathname();
  const { s } = useLayout();
  const z = (n: number) => n * s;
  const [busy, setBusy] = useState(false);
  // error belongs to one invitation, so a new one starts clean
  const [err, setErr] = useState<{ id: number; text: string } | null>(null);
  const inv = invites[0];
  const seated = !!table && table.phase !== 'ended';
  const show = !!inv && !seated && !!me?.profileDone && path !== '/' && path !== '/profile';

  // chime once per new invitation
  const seen = useRef(new Set<number>());
  useEffect(() => {
    if (show && inv && !seen.current.has(inv.id)) { seen.current.add(inv.id); sfx('turn'); }
  }, [show, inv, sfx]);

  if (!show || !inv) return null;
  const error = err?.id === inv.id ? err.text : null;

  const join = async () => {
    setBusy(true); setErr(null);
    const r = await joinInvite(inv);
    setBusy(false);
    if (!r.ok) { setErr({ id: inv.id, text: r.error ?? 'Could not join this table.' }); return; }
    tap('success');
    router.push('/game');
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <Animated.View entering={ZoomIn.springify().damping(16)} accessibilityViewIsModal accessibilityLiveRegion="assertive"
        style={{ width: z(440), borderRadius: z(20), borderWidth: 1.5, borderColor: colors.gold, backgroundColor: '#0B1A12', paddingVertical: z(18), paddingHorizontal: z(22), gap: z(10), alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(8) }}>
          <Crown width={z(22)} />
          <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(11), letterSpacing: z(2), color: colors.goldBright }}>YOU’RE INVITED</Text>
        </View>
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(19), color: '#fff', textAlign: 'center' }}>{inv.title || 'A table is waiting for you'}</Text>
        <Text style={{ fontFamily: fonts.uiBold, fontSize: z(12), color: '#CFE3D6', textAlign: 'center' }}>
          {MODE_LABEL[inv.mode]} · {inv.players} players · {inv.entry ? `entry ${formatChips(inv.entry)} chips` : 'free'} · code {inv.code}
        </Text>
        {inv.joined.length > 0 && (
          <View style={{ alignItems: 'center', gap: z(4) }}>
            <View style={{ flexDirection: 'row', gap: z(6) }}>
              {inv.joined.slice(0, 8).map((p, i) => (
                <PlayerAvatar key={i} player={{ name: p.name, initials: p.name.slice(0, 2).toUpperCase(), color: '#1F6B4A', avatar: p.avatar, photo: photoUri(p.photo) }} size={z(30)} />
              ))}
            </View>
            <Text style={{ fontFamily: fonts.ui, fontSize: z(11), color: '#B5BFD3' }}>{inv.joined.length} already joined</Text>
          </View>
        )}
        {error && <Text style={{ fontFamily: fonts.uiBold, fontSize: z(12), color: colors.loss, textAlign: 'center' }}>{error}</Text>}
        <View style={{ flexDirection: 'row', gap: z(10), alignSelf: 'stretch', marginTop: z(4) }}>
          <Pill z={z} line h={42} label="Not now" onPress={() => { tap(); declineInvite(inv); }} style={{ flex: 1 }} fs={14} />
          <Pill z={z} h={42} label="JOIN TABLE" busy={busy} onPress={join} style={{ flex: 1.4 }} />
        </View>
        {invites.length > 1 && <Text style={{ fontFamily: fonts.ui, fontSize: z(10), color: '#B5BFD3' }}>+{invites.length - 1} more invitation{invites.length > 2 ? 's' : ''}</Text>}
        <Pressable accessibilityRole="button" onPress={() => declineInvite(inv)} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} accessibilityLabel="Dismiss invitation" />
      </Animated.View>
    </Animated.View>
  );
}
