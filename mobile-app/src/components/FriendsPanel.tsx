import { router } from 'expo-router';
import { KeyRound, Plus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSession, type ModeId } from '../net/session';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';
import { GameButton } from './GameButton';
import { MODE_LABEL } from './TableSetup';

/** Lobby tab "Play with friends": create a private table, or join one with a 4-digit code. */
export function FriendsPanel({ s, onCreate }: { s: number; onCreate: (mode: ModeId) => void }) {
  const { config, joinPrivate } = useSession();
  const { tap } = useSettings();
  const modes = (['points', 'pool', 'deals'] as ModeId[]).filter((m) => config?.modes[m]?.enabled && config.modes[m].maxPlayers >= 2);
  const [mode, setMode] = useState<ModeId>(modes[0] ?? 'points');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (config?.friendsTables === false) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 * s }}>
        <Users size={30 * s} color={colors.gold} />
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 15 * s, color: colors.textWhite }}>Private tables are closed right now</Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 12 * s, color: colors.textMutedBlue }}>Pick a table in Play for Fun or Quick Play.</Text>
      </View>
    );
  }

  const join = async () => {
    if (code.length !== 4) { setError('Table codes have 4 digits.'); return; }
    setBusy(true); setError(null);
    const r = await joinPrivate(code);
    setBusy(false);
    if (!r.ok) { setError(r.error ?? 'Could not join that table.'); return; }
    tap('success');
    router.push('/game');
  };

  const card = { flex: 1, borderRadius: 14 * s, borderWidth: 1.5, borderColor: colors.goldLine, backgroundColor: 'rgba(6,40,24,0.75)', padding: 14 * s, gap: 10 * s } as const;
  const label = { fontFamily: fonts.uiHeavy, fontSize: 11 * s, letterSpacing: 1.2, color: '#CFE3D6' } as const;

  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 12 * s }}>
      <View style={card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * s }}>
          <Plus size={18 * s} color={colors.gold} />
          <Text style={label}>CREATE A TABLE</Text>
        </View>
        <Text style={{ fontFamily: fonts.ui, fontSize: 12 * s, color: colors.text }}>
          Pick a game, choose players and entry, then share the code with your friends on WhatsApp.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 * s }}>
          {modes.map((m) => {
            const on = m === mode;
            return (
              <Pressable key={m} onPress={() => { tap(); setMode(m); }} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={{ height: 44, paddingHorizontal: 12 * s, borderRadius: 10 * s, justifyContent: 'center', borderWidth: 1.5, borderColor: on ? colors.gold : 'rgba(255,255,255,0.18)', backgroundColor: on ? 'rgba(232,198,106,0.2)' : 'rgba(255,255,255,0.04)' }}>
                <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 12 * s, color: on ? colors.goldBright : '#C3CDE2' }}>{MODE_LABEL[m]}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1 }} />
        <GameButton s={s} label="CREATE TABLE" height={42} disabled={!modes.length} onPress={() => { tap(); onCreate(mode); }} />
      </View>

      <View style={card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * s }}>
          <KeyRound size={18 * s} color={colors.gold} />
          <Text style={label}>JOIN WITH A CODE</Text>
        </View>
        <Text style={{ fontFamily: fonts.ui, fontSize: 12 * s, color: colors.text }}>
          Ask your friend for the 4-digit table code.
        </Text>
        <TextInput
          accessibilityLabel="Table code"
          value={code}
          onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 4)); setError(null); }}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="0000"
          placeholderTextColor="#5E7A6A"
          onSubmitEditing={join}
          style={{ height: 52 * s, minHeight: 44, borderRadius: 12 * s, borderWidth: 1.5, borderColor: colors.goldLine, backgroundColor: 'rgba(0,0,0,0.3)', color: colors.goldBright, fontFamily: fonts.display, fontSize: 26 * s, letterSpacing: 10 * s, textAlign: 'center' }}
        />
        {error && <Text style={{ fontFamily: fonts.uiBold, fontSize: 12 * s, color: '#F2A9A9' }}>{error}</Text>}
        <View style={{ flex: 1 }} />
        <GameButton s={s} label={busy ? 'JOINING…' : 'JOIN TABLE'} height={42} disabled={busy || code.length !== 4} onPress={join} />
      </View>
    </View>
  );
}
