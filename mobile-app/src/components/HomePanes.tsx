import { router } from 'expo-router';
import { KeyRound, Mail, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { photoUri, useSession, type Invite } from '../net/session';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';
import { formatChips } from './ChipBalance';
import { boxStyle, Lbl, Pill } from './LobbyPanes';
import { PlayerAvatar } from './PlayerAvatar';
import { MODE_LABEL } from './TableSetup';

type Z = (n: number) => number;
const MUTEB = '#B5BFD3';
const GOLD3 = '#C9A24A';

// ---------------------------------------------------------------- play with code

export function CodePane({ z }: { z: Z }) {
  const { joinPrivate, joinInvite, invites } = useSession();
  const { tap } = useSettings();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = code.replace(/^LR-?/, '').length >= 4;

  const join = async () => {
    if (!ready) { setError('Enter the table code, like LR-7K4QX.'); return; }
    setBusy('code'); setError(null);
    const r = await joinPrivate(code);
    setBusy(null);
    if (!r.ok) { setError(r.error ?? 'Could not join that table.'); return; }
    tap('success');
    router.push('/game');
  };
  const accept = async (inv: Invite) => {
    setBusy(`inv-${inv.id}`); setError(null);
    const r = await joinInvite(inv);
    setBusy(null);
    if (!r.ok) { setError(r.error ?? 'Could not join this table.'); return; }
    tap('success');
    router.push('/game');
  };

  return (
    <>
      {/* enter a code */}
      <View style={{ flex: 1.1, borderRadius: z(14), borderWidth: 2, borderColor: GOLD3, backgroundColor: '#13643c', paddingVertical: z(16), paddingHorizontal: z(18), gap: z(10), overflow: 'hidden', justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: '-15%', top: '-50%', width: '130%', height: '120%', borderRadius: 999, backgroundColor: '#1b7a4a', opacity: 0.6 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(8) }}>
          <KeyRound size={z(18)} color={colors.gold} />
          <Lbl z={z} color="#CFE3D6">PLAY WITH CODE</Lbl>
        </View>
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(16), color: '#fff' }}>Enter your table code</Text>
        <TextInput
          accessibilityLabel="Table code"
          value={code}
          onChangeText={(t) => { setCode(t.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8)); setError(null); }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          placeholder="LR-7K4QX"
          placeholderTextColor="#5E7A6A"
          onSubmitEditing={join}
          returnKeyType="go"
          style={{ height: z(52), minHeight: 48, borderRadius: z(12), borderWidth: 1.5, borderColor: ready ? colors.gold : 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(0,0,0,0.35)', color: colors.goldBright, fontFamily: fonts.display, fontSize: z(22), letterSpacing: z(4), textAlign: 'center' }}
        />
        {error && <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.uiBold, fontSize: z(11), color: '#FFB4B4' }}>{error}</Text>}
        <Pill z={z} label="JOIN TABLE" busy={busy === 'code'} disabled={!ready} onPress={join} />
        <Text style={{ fontFamily: fonts.ui, fontSize: z(10), color: '#CFE3D6', textAlign: 'center' }}>Get the code from the organiser, or wait for an invitation.</Text>
      </View>

      {/* invitations */}
      <View style={[boxStyle(z), { flex: 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(8) }}>
          <Mail size={z(15)} color={colors.gold} />
          <Lbl z={z}>YOUR INVITATIONS</Lbl>
        </View>
        {invites.length ? (
          <ScrollView contentContainerStyle={{ gap: z(8) }} showsVerticalScrollIndicator={false}>
            {invites.map((inv, i) => (
              <Animated.View key={inv.id} entering={FadeInDown.delay(i * 60)}
                style={{ borderRadius: z(12), borderWidth: 1, borderColor: 'rgba(232,198,106,0.45)', backgroundColor: 'rgba(232,198,106,0.08)', padding: z(10), gap: z(6) }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: z(13), color: '#fff' }}>{inv.title || 'Table invitation'}</Text>
                <Text style={{ fontFamily: fonts.uiBold, fontSize: z(10.5), color: MUTEB }}>
                  {MODE_LABEL[inv.mode]} · {inv.players} players · {inv.entry ? `${formatChips(inv.entry)} chips` : 'free'} · {inv.code}
                </Text>
                <Pill z={z} h={34} label="JOIN" busy={busy === `inv-${inv.id}`} onPress={() => accept(inv)} />
              </Animated.View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: z(6), paddingHorizontal: z(8) }}>
            <Mail size={z(28)} color="#5E6676" />
            <Text style={{ fontFamily: fonts.uiBold, fontSize: z(12), color: colors.text, textAlign: 'center' }}>No invitations right now</Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: z(10.5), color: MUTEB, textAlign: 'center' }}>When the organiser invites you to a table, it pops up on your screen and appears here.</Text>
          </View>
        )}
      </View>
    </>
  );
}

// ---------------------------------------------------------------- profile

export function ProfilePane({ z }: { z: Z }) {
  const { me } = useSession();
  const { tap } = useSettings();
  if (!me) return null;
  const winRate = me.gamesPlayed ? Math.round((me.gamesWon / me.gamesPlayed) * 100) : 0;
  const stat = (v: string, l: string) => (
    <View key={l} style={{ flex: 1, borderRadius: z(12), backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: z(10), alignItems: 'center', gap: z(2) }}>
      <Text style={{ fontFamily: fonts.display, fontSize: z(20), color: colors.goldBright }}>{v}</Text>
      <Text style={{ fontFamily: fonts.uiBold, fontSize: z(10), color: MUTEB }}>{l}</Text>
    </View>
  );
  const AV = 104;
  return (
    <>
      <View style={[boxStyle(z), { flex: 1, alignItems: 'center', justifyContent: 'center', gap: z(8) }]}>
        <View style={{ width: z(AV), height: z(AV), borderRadius: z(AV / 2), backgroundColor: '#5A2E10', borderWidth: Math.max(3, z(4)), borderColor: '#C98A3E', alignItems: 'center', justifyContent: 'center' }}>
          <PlayerAvatar player={{ name: me.name, initials: me.name.slice(0, 2).toUpperCase(), color: me.color, avatar: me.avatar, photo: photoUri(me.photoUrl) }} size={z(AV - 14)} />
        </View>
        <Text numberOfLines={1} style={{ fontFamily: fonts.uiHeavy, fontSize: z(18), color: '#fff' }}>{me.name}</Text>
        <View style={{ flexDirection: 'row', gap: z(8), alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: z(13), letterSpacing: z(1.2), color: colors.goldBright }}>{me.code}</Text>
          <Text style={{ fontFamily: fonts.uiBold, fontSize: z(11), color: MUTEB }}>· Level {me.level}</Text>
        </View>
        <Pill z={z} line h={36} fs={13} label="EDIT PROFILE" onPress={() => { tap(); router.push('/profile'); }} style={{ paddingHorizontal: z(18), marginTop: z(4) }} />
      </View>
      <View style={{ flex: 1.2, gap: z(10) }}>
        <View style={{ flexDirection: 'row', gap: z(10) }}>
          {stat(formatChips(me.chips), 'Chips')}
          {stat(String(me.gamesPlayed), 'Games')}
          {stat(`${winRate}%`, 'Win rate')}
        </View>
        <View style={[boxStyle(z), { flex: 1, gap: z(8) }]}>
          <Lbl z={z}>YOUR PLAYER ID</Lbl>
          <Text style={{ fontFamily: fonts.ui, fontSize: z(11.5), color: colors.text }}>
            Share <Text style={{ fontFamily: fonts.uiHeavy, color: colors.goldBright }}>{me.code}</Text> with the organiser so they can invite you to tables. They see your name and {me.photoUrl ? 'photo' : 'emoji'} at the table.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(6), marginTop: 'auto' }}>
            <Pencil size={z(12)} color={MUTEB} />
            <Text style={{ fontFamily: fonts.ui, fontSize: z(10.5), color: MUTEB }}>Change your name, photo or emoji with Edit profile.</Text>
          </View>
        </View>
      </View>
    </>
  );
}
