import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSession, type ModeId } from '../net/session';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';
import { boxStyle, Lbl, Pill } from './LobbyPanes';
import { MODE_LABEL } from './TableSetup';

const GOLD3 = '#C9A24A';

/** Lobby tab "Play with friends", laid out like the web version: create a private table, join with a code, how it works. */
export function FriendsPanel({ s, onCreate }: { s: number; onCreate: (mode: ModeId) => void }) {
  const z = (n: number) => n * s;
  const { config, joinPrivate } = useSession();
  const { tap } = useSettings();
  const modes = (['points', 'pool', 'deals'] as ModeId[]).filter((m) => config?.modes[m]?.enabled && config.modes[m].maxPlayers >= 2);
  const [mi, setMi] = useState(0);
  const mode = modes[mi % Math.max(1, modes.length)] ?? 'points';
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (config?.friendsTables === false || !modes.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: z(8) }}>
        <Users size={z(30)} color={colors.gold} />
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(15), color: '#fff' }}>Private tables are closed right now</Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: z(12), color: '#B5BFD3' }}>Pick a table in Play for Fun or Quick Play.</Text>
      </View>
    );
  }

  const join = async () => {
    if (code.replace(/^LR-?/, '').length < 4) { setError('Enter the table code, like 4821 or LR-7K4QX.'); return; }
    setBusy(true); setError(null);
    const r = await joinPrivate(code);
    setBusy(false);
    if (!r.ok) { setError(r.error ?? 'Could not join that table.'); return; }
    tap('success');
    router.push('/game');
  };

  const steps: [string, string, string][] = [
    ['1', 'Create a table', 'Pick the game, players and entry'],
    ['2', 'Share the code', 'Send the 4-digit code on WhatsApp'],
    ['3', 'Join with the code', 'Friends enter it here and sit down'],
    ['4', 'Start together', 'The host starts when everyone is in'],
  ];

  return (
    <>
      <View style={{ flex: 1, gap: z(12) }}>
        {/* create */}
        <View style={{ borderRadius: z(14), borderWidth: 2, borderColor: GOLD3, backgroundColor: '#13643c', paddingVertical: z(12), paddingHorizontal: z(14), gap: z(8), overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', left: '-15%', top: '-60%', width: '130%', height: '130%', borderRadius: 999, backgroundColor: '#1b7a4a', opacity: 0.6 }} />
          <Lbl z={z} color="#CFE3D6">CREATE PRIVATE TABLE</Lbl>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: z(19), letterSpacing: z(2), color: colors.goldBright }}>{MODE_LABEL[mode]}</Text>
            {modes.length > 1 && (
              <Pressable onPress={() => { tap(); setMi((i) => i + 1); }} accessibilityRole="button" accessibilityLabel="Change game"
                style={{ height: z(30), minHeight: 30, paddingHorizontal: z(10), borderRadius: z(15), borderWidth: 1.5, borderColor: colors.gold, justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(10), letterSpacing: z(0.6), color: colors.goldBright }}>CHANGE GAME</Text>
              </Pressable>
            )}
          </View>
          <Text style={{ fontFamily: fonts.uiBold, fontSize: z(11), color: '#CFE3D6' }}>
            Share a 4-digit code · 2 to {config!.modes[mode].maxPlayers} players
          </Text>
          <Pill z={z} h={36} label="CREATE TABLE" onPress={() => { tap(); onCreate(mode); }} />
        </View>

        {/* join */}
        <View style={boxStyle(z)}>
          <Lbl z={z}>JOIN WITH CODE</Lbl>
          <View style={{ flexDirection: 'row', gap: z(8) }}>
            <TextInput
              accessibilityLabel="Table code"
              value={code}
              onChangeText={(t) => { setCode(t.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8)); setError(null); }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              placeholder="LR-7K4QX"
              placeholderTextColor="#6B7380"
              onSubmitEditing={join}
              style={{ flex: 1, width: 0, minWidth: 0, height: z(38), minHeight: 40, borderRadius: z(10), borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(0,0,0,0.3)', color: colors.goldBright, fontFamily: fonts.uiHeavy, fontSize: z(14), letterSpacing: z(3), paddingHorizontal: z(12) }}
            />
            <Pill z={z} line h={38} label="JOIN" fs={14} busy={busy} disabled={code.replace(/^LR-?/, '').length < 4} onPress={join} style={{ width: z(70) }} />
          </View>
          {error && <Text style={{ fontFamily: fonts.uiBold, fontSize: z(11), color: colors.loss }}>{error}</Text>}
        </View>
      </View>

      {/* how it works */}
      <View style={[boxStyle(z), { flex: 1.1, gap: z(6) }]}>
        <Lbl z={z}>HOW IT WORKS</Lbl>
        {steps.map(([n, title, sub]) => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: z(10), padding: z(6), borderRadius: z(10), backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <View style={{ width: z(30), height: z(30), borderRadius: z(15), borderWidth: 2, borderColor: colors.gold, backgroundColor: '#1F6B4A', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(12), color: '#FFF4DA' }}>{n}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(12), color: colors.text }}>{title}</Text>
              <Text style={{ fontFamily: fonts.ui, fontSize: z(10), color: '#B5BFD3' }}>{sub}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}
