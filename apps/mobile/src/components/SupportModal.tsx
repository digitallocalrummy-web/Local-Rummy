import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSession } from '../net/session';
import { colors, fonts } from '../theme';
import { AnimatedModal } from './AnimatedModal';
import { GameButton } from './GameButton';

/** Players write to support or report unfair play; replies from the admin panel show here. */
export function SupportModal({ s, visible, onClose }: { s: number; visible: boolean; onClose: () => void }) {
  const { sendTicket, tickets, me } = useSession();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<'ticket' | 'report'>('ticket');
  const [msg, setMsg] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    tickets().then((l) => { if (live) setList(l); }).catch(() => {});
    return () => { live = false; };
  }, [visible, tickets]);

  const input = { minHeight: 44, borderRadius: 10 * s, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(0,0,0,0.25)', color: colors.textWhite, paddingHorizontal: 12 * s, fontFamily: fonts.ui, fontSize: 13 * s } as const;

  return (
    <AnimatedModal visible={visible} title="HELP & SUPPORT" onClose={onClose} width={620}>
      <View style={{ flexDirection: 'row', gap: 16 * s, maxHeight: 250 * s }}>
        <View style={{ flex: 1, gap: 8 * s }}>
          <View style={{ flexDirection: 'row', gap: 8 * s }}>
            <GameButton s={s} height={36} variant={kind === 'ticket' ? 'gold' : 'dark'} label="Ask for help" style={{ flex: 1 }} onPress={() => setKind('ticket')} />
            <GameButton s={s} height={36} variant={kind === 'report' ? 'gold' : 'dark'} label="Report a player" style={{ flex: 1 }} onPress={() => setKind('report')} />
          </View>
          <TextInput accessibilityLabel="Subject" placeholder={kind === 'report' ? 'Who and what happened?' : 'What do you need help with?'} placeholderTextColor="#8C9AB8" value={subject} onChangeText={setSubject} maxLength={120} style={input} />
          <TextInput accessibilityLabel="Message" placeholder="Tell us more. Include the table number if you have it." placeholderTextColor="#8C9AB8" value={body} onChangeText={setBody} maxLength={2000} multiline style={[input, { height: 80 * s, textAlignVertical: 'top', paddingTop: 10 * s }]} />
          {msg && <Text style={{ fontFamily: fonts.uiBold, fontSize: 12 * s, color: colors.goldBright }}>{msg}</Text>}
          <GameButton s={s} height={40} label="SEND" disabled={subject.trim().length < 3 || body.trim().length < 3} onPress={async () => {
            try {
              await sendTicket({ subject: subject.trim(), body: body.trim(), kind });
              setSubject(''); setBody(''); setMsg('Sent. Our team replies here, usually within a day.');
              setList(await tickets());
            } catch (e) { setMsg((e as Error).message); }
          }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8 * s }}>
          <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 11 * s, letterSpacing: 1.2, color: colors.textMutedBlue }}>YOUR MESSAGES · ID {me?.code}</Text>
          {list.length === 0 && <Text style={{ fontFamily: fonts.ui, fontSize: 12 * s, color: colors.textMutedBlue }}>No messages yet.</Text>}
          {list.map((t) => (
            <View key={t.id} style={{ padding: 10 * s, borderRadius: 10 * s, backgroundColor: 'rgba(255,255,255,0.05)', gap: 4 * s }}>
              <Text style={{ fontFamily: fonts.uiHeavy, fontSize: 12 * s, color: colors.textWhite }}>{t.subject} · {t.status === 'solved' ? 'Solved' : 'Open'}</Text>
              {t.messages.filter((m: any) => m.fromSupport).map((m: any, i: number) => (
                <Text key={i} style={{ fontFamily: fonts.ui, fontSize: 12 * s, color: colors.goldBright }}>Support: {m.body}</Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </AnimatedModal>
  );
}
