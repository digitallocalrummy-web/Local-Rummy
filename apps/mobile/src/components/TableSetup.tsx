import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSession, type ModeId } from '../net/session';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';
import { AnimatedModal } from './AnimatedModal';
import { formatChips } from './ChipBalance';
import { GameButton } from './GameButton';

export const MODE_LABEL: Record<ModeId, string> = { points: 'POINTS', pool: 'POOL 101', deals: 'DEALS' };

/** Choose players (1–max) and entry, then sit down at a server table. */
export function TableSetup({ s, mode, free, onClose }: { s: number; mode: ModeId | null; free?: boolean; onClose: () => void }) {
  const { config, me, seat } = useSession();
  const { tap } = useSettings();
  const m = mode ? config?.modes[mode] : null;
  // the lobby remounts this (key) for each mode, so these start fresh every time
  const [players, setPlayers] = useState(() => Math.min(4, m?.maxPlayers ?? 4));
  const [entry, setEntry] = useState(() => (free ? 0 : m?.entries[0] ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mode || !m) return null;
  const cost = players === 1 || free ? 0 : entry;
  const short = !!me && cost > me.chips;

  const start = async () => {
    setBusy(true); setError(null);
    const r = await seat(mode, players, cost);
    setBusy(false);
    if (!r.ok) { setError(r.error ?? 'Could not find a table.'); return; }
    tap('success');
    onClose();
    router.push('/game');
  };

  const chip = (label: string, on: boolean, onPress: () => void, a11y: string, w?: number) => (
    <Pressable key={label} onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={a11y}
      style={{ minWidth: w ?? 44, height: 44, paddingHorizontal: 10 * s, borderRadius: 10 * s, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: on ? colors.gold : 'rgba(255,255,255,0.18)', backgroundColor: on ? 'rgba(232,198,106,0.2)' : 'rgba(255,255,255,0.04)' }}>
      <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 14 * s, color: on ? colors.goldBright : '#C3CDE2' }}>{label}</Text>
    </Pressable>
  );

  return (
    <AnimatedModal visible title={`TABLE SETUP · ${MODE_LABEL[mode]}`} onClose={onClose} width={560}>
      <View style={{ gap: 12 * s }}>
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 11 * s, letterSpacing: 1.2, color: colors.textMutedBlue }}>PLAYERS AT THE TABLE (INCLUDING YOU)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 * s }}>
          {Array.from({ length: m.maxPlayers }, (_, i) => i + 1).map((n) => chip(String(n), n === players, () => setPlayers(n), `${n} players`))}
        </View>
        {players > 1 && !free && (
          <>
            <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 11 * s, letterSpacing: 1.2, color: colors.textMutedBlue }}>ENTRY (VIRTUAL CHIPS)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 * s }}>
              {chip('FREE', entry === 0, () => setEntry(0), 'Free practice table', 70)}
              {m.entries.map((e) => chip(formatChips(e), e === entry, () => setEntry(e), `Entry ${e} chips`, 70))}
            </View>
          </>
        )}
        <Text style={{ fontFamily: fonts.ui, fontSize: 12 * s, color: colors.text }}>
          {players === 1 ? 'Solo practice · just you and the deck · free'
            : `You + ${players - 1} opponent${players > 2 ? 's' : ''} · ${players > 6 ? 3 : 2} decks · ${cost ? `entry ${formatChips(cost)}, you can lose up to this` : 'free table'}`}
          {players > 1 ? ' · empty seats are filled with AI players' : ''}
        </Text>
        {short && <Text style={{ fontFamily: fonts.uiBold, fontSize: 12 * s, color: '#F2A9A9' }}>You need {formatChips(cost)} chips. Collect your daily bonus or pick a lower entry.</Text>}
        {error && <Text style={{ fontFamily: fonts.uiBold, fontSize: 12 * s, color: '#F2A9A9' }}>{error}</Text>}
        <View style={{ flexDirection: 'row', gap: 12 * s }}>
          <GameButton s={s} variant="outline" label="Cancel" style={{ flex: 1 }} onPress={onClose} />
          <GameButton s={s} label={busy ? 'FINDING A SEAT…' : 'START GAME'} style={{ flex: 1 }} disabled={busy || short} onPress={start} />
        </View>
      </View>
    </AnimatedModal>
  );
}
