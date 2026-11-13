import { Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Share, Text, View } from 'react-native';
import { Crown } from '../components/Decor';
import { GameButton } from '../components/GameButton';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { MODE_LABEL } from '../components/TableSetup';
import { photoUri, useSession, type TableView } from '../net/session';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';

type Rect = { x: number; y: number; w: number; h: number };

/** Shown on the felt before the deal. Private tables show the code, who has joined and the host's start buttons. */
export function WaitingRoom({ table, rect, s }: { table: TableView; rect: Rect; s: number }) {
  const { startPrivate } = useSession();
  const { tap } = useSettings();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const box = { position: 'absolute' as const, left: rect.x, top: rect.y, width: rect.w, height: rect.h, alignItems: 'center' as const, justifyContent: 'center' as const };

  if (!table.privateCode) {
    return (
      <View style={[box, { gap: 10 * s }]}>
        <ActivityIndicator color={colors.gold} />
        <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 15 * s, color: colors.textWhite }}>Waiting for players · {table.seats.length}/{table.size}</Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 12 * s, color: colors.textMuted }}>AI players fill the empty seats soon</Text>
      </View>
    );
  }

  const official = !!table.official;
  const shown = official ? `LR-${table.privateCode}` : table.privateCode;
  const isHost = !official && table.host === table.you;
  const hostName = table.seats[table.host]?.name ?? 'The host';
  const humans = table.seats.length;
  const share = () => {
    tap();
    Share.share({ message: `Join my Local Rummy table! Open the app → Play with Friends → enter code ${shown}` }).catch(() => {});
  };
  const start = async (fillAi: boolean) => {
    setBusy(true); setError(null);
    const r = await startPrivate(fillAi);
    setBusy(false);
    if (!r.ok) setError(r.error ?? 'Could not start the game.');
    else tap('success');
  };

  return (
    <View style={[box, { backgroundColor: 'rgba(6,30,18,0.92)', borderRadius: 24 * s, gap: 8 * s, paddingHorizontal: 20 * s }]}>
      {official && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * s, paddingHorizontal: 10 * s, paddingVertical: 3 * s, borderRadius: 12 * s, backgroundColor: 'rgba(232,198,106,0.16)', borderWidth: 1, borderColor: colors.gold }}>
          <Crown width={14 * s} />
          <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 10 * s, letterSpacing: 1.4, color: colors.goldBright }}>OFFICIAL TABLE</Text>
        </View>
      )}
      <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 11 * s, letterSpacing: 1.6, color: '#CFE3D6' }}>
        {official ? 'CODE TABLE' : 'TABLE WITH FRIENDS'} · {MODE_LABEL[table.mode]} · {table.entry ? `ENTRY ${table.entry}` : 'FREE'}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 * s }}>
        <Text accessibilityLabel={`Table code ${shown.split('').join(' ')}`}
          style={{ fontFamily: fonts.display, fontSize: (official ? 34 : 44) * s, letterSpacing: (official ? 5 : 10) * s, color: colors.goldBright }}>{shown}</Text>
        <GameButton s={s} variant="outline" height={40} label="Share" onPress={share} icon={<Share2 size={16 * s} color={colors.gold} />} />
      </View>
      <Text style={{ fontFamily: fonts.ui, fontSize: 12 * s, color: colors.text }}>
        {official ? 'Players join with this code in Play with Friends' : 'Friends open Play with Friends and enter this code'} · {humans} of {table.size} joined
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 * s, marginVertical: 4 * s }}>
        {table.seats.map((p) => (
          <View key={p.idx} style={{ alignItems: 'center', gap: 2 * s, width: 64 * s }}>
            <PlayerAvatar player={{ name: p.name, initials: p.code, color: p.color, avatar: p.avatar, photo: photoUri(p.photo) }} size={34 * s} />
            <Text numberOfLines={1} style={{ fontFamily: fonts.uiBold, fontSize: 10 * s, color: colors.textWhite }}>{p.idx === table.you ? 'You' : p.name}</Text>
            {p.idx === table.host && <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 8 * s, letterSpacing: 1, color: colors.gold }}>HOST</Text>}
          </View>
        ))}
        {/* invited players who haven't joined yet */}
        {(table.invitees ?? []).filter((i) => !i.joined).map((p, i) => (
          <View key={`inv${i}`} style={{ alignItems: 'center', gap: 2 * s, width: 64 * s, opacity: p.declined ? 0.45 : 0.75 }}>
            <PlayerAvatar player={{ name: p.name, initials: p.name.slice(0, 2).toUpperCase(), color: '#3A4440', avatar: p.avatar, photo: photoUri(p.photo) }} size={34 * s} />
            <Text numberOfLines={1} style={{ fontFamily: fonts.uiBold, fontSize: 10 * s, color: colors.textWhite }}>{p.name}</Text>
            <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 8 * s, letterSpacing: 1, color: p.declined ? '#E9A0A0' : colors.textMuted }}>{p.declined ? 'NOT COMING' : 'INVITED'}</Text>
          </View>
        ))}
        {Array.from({ length: Math.max(0, table.size - humans - (table.invitees ?? []).filter((i) => !i.joined && !i.declined).length) }, (_, i) => (
          <View key={`e${i}`} style={{ alignItems: 'center', gap: 2 * s, width: 64 * s }}>
            <View style={{ width: 34 * s, height: 34 * s, borderRadius: 17 * s, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(232,198,106,0.5)' }} />
            <Text style={{ fontFamily: fonts.ui, fontSize: 10 * s, color: colors.textMuted }}>Open seat</Text>
          </View>
        ))}
      </View>
      {error && <Text style={{ fontFamily: fonts.uiBold, fontSize: 12 * s, color: '#F2A9A9' }}>{error}</Text>}
      {isHost ? (
        <View style={{ flexDirection: 'row', gap: 10 * s }}>
          <GameButton s={s} height={40} variant="outline" label="Start, fill with AI" disabled={busy} onPress={() => start(true)} />
          <GameButton s={s} height={40} label={humans >= 2 ? `Start with ${humans} players` : 'Waiting for friends…'} disabled={busy || humans < 2} onPress={() => start(false)} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * s }}>
          <ActivityIndicator color={colors.gold} size="small" />
          <Text style={{ fontFamily: fonts.uiBold, fontSize: 12 * s, color: colors.textMuted }}>
            {official ? (table.autoStart ? `Starts automatically when all ${table.size} seats are filled` : 'Waiting for the organiser to start the game') : `Waiting for ${hostName} to start the game`}
          </Text>
        </View>
      )}
    </View>
  );
}
