import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, fmt } from '../api';
import { useCanEdit } from '../auth';
import { PageHeader } from '../components/Shell';
import { Button, Card, Crown, Empty, Field, Pill, Table, Toast, inputCls } from '../components/ui';

const AUD = [['all', 'All players'], ['inactive7', 'Inactive for 7+ days'], ['new7', 'New this week'], ['zero', 'Players under 50 chips']] as const;
const COLORS = ['#0F4A2E', '#1C2E5C', '#7A1C2C', '#2E3646', '#5C3B7A'];

export default function Content() {
  const qc = useQueryClient();
  const canEdit = useCanEdit();
  const banners = useQuery({ queryKey: ['banners'], queryFn: () => api<any[]>('/api/admin/banners') });
  const push = useQuery({ queryKey: ['push'], queryFn: () => api('/api/admin/push') });
  const [nb, setNb] = useState({ title: '', subtitle: '', color: COLORS[0] });
  const [p, setP] = useState({ title: 'Your daily bonus is waiting', body: 'Collect free chips and jump into a table. Tap to open the lobby.', audience: 'all' as (typeof AUD)[number][0] });
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ['banners'] });
  const create = useMutation({ mutationFn: () => api('/api/admin/banners', { body: nb }), onSuccess: () => { setNb({ title: '', subtitle: '', color: COLORS[0] }); inv(); } });
  const patch = useMutation({ mutationFn: ({ id, ...b }: any) => api(`/api/admin/banners/${id}`, { method: 'PATCH', body: b }), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: number) => api(`/api/admin/banners/${id}`, { method: 'DELETE' }), onSuccess: inv });
  const reorder = useMutation({ mutationFn: (ids: number[]) => api('/api/admin/banners/reorder', { body: { ids } }), onSuccess: inv });
  const send = useMutation({
    mutationFn: () => api('/api/admin/push', { body: p }),
    onSuccess: (r) => { setMsg({ tone: 'ok', text: `Sent. Delivered to ${fmt(r.delivered)} phone${r.delivered === 1 ? '' : 's'}.` }); qc.invalidateQueries({ queryKey: ['push'] }); },
    onError: (e) => setMsg({ tone: 'bad', text: (e as Error).message }),
  });
  const list = banners.data ?? [];
  const move = (i: number, dir: -1 | 1) => { const ids = list.map((b) => b.id); const j = i + dir; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; reorder.mutate(ids); };
  return (
    <>
      <PageHeader title="Banners & push" sub="Lobby banners and phone notifications for players" />
      <Card title={<>Lobby banners <span className="block text-xs font-normal text-mute">Live banners show at the top of the app lobby in this order</span></>}>
        <div className="flex flex-col gap-3">
          {list.map((b, i) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3.5 rounded-xl border border-line bg-raised p-2.5">
              <div className="flex flex-col"><button aria-label={`Move ${b.title} up`} disabled={!canEdit || i === 0} onClick={() => move(i, -1)} className="cursor-pointer border-0 bg-transparent text-faint disabled:opacity-30">▲</button><button aria-label={`Move ${b.title} down`} disabled={!canEdit || i === list.length - 1} onClick={() => move(i, 1)} className="cursor-pointer border-0 bg-transparent text-faint disabled:opacity-30">▼</button></div>
              <div className="flex h-[72px] w-[200px] flex-none flex-col justify-center rounded-[10px] border border-gold/50 px-3.5" style={{ background: b.color }}><b className="font-display text-[15px] tracking-[1px] text-gold2">{b.title}</b><span className="text-[11px] text-[#E3EEE7]">{b.subtitle}</span></div>
              <div className="min-w-0 flex-[1_1_160px] text-xs text-mute">Opens: {b.target}</div>
              {b.status === 'live' ? <Pill tone="ok">Live</Pill> : b.status === 'scheduled' ? <Pill tone="info">Scheduled</Pill> : <Pill>Ended</Pill>}
              {canEdit && <Button className="!h-9" onClick={() => patch.mutate({ id: b.id, status: b.status === 'live' ? 'ended' : 'live' })}>{b.status === 'live' ? 'Take down' : 'Go live'}</Button>}
              {canEdit && <Button variant="danger" className="!h-9" onClick={() => { if (confirm(`Delete banner “${b.title}”?`)) del.mutate(b.id); }}>Delete</Button>}
            </div>
          ))}
          {!list.length && <Empty>No banners yet.</Empty>}
          {canEdit && (
            <form className="flex flex-wrap items-end gap-3 border-t border-line pt-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
              <div className="flex-[1_1_200px]"><Field id="bt" label="Banner title"><input id="bt" maxLength={40} value={nb.title} onChange={(e) => setNb({ ...nb, title: e.target.value })} className={inputCls} placeholder="WEEKEND BONUS" /></Field></div>
              <div className="flex-[1_1_200px]"><Field id="bs" label="Small line"><input id="bs" maxLength={60} value={nb.subtitle} onChange={(e) => setNb({ ...nb, subtitle: e.target.value })} className={inputCls} placeholder="Double chips Sat–Sun" /></Field></div>
              <div role="group" aria-label="Banner colour" className="flex gap-1.5 pb-1">{COLORS.map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={nb.color === c} onClick={() => setNb({ ...nb, color: c })} className="h-8 w-8 cursor-pointer rounded-lg border-2" style={{ background: c, borderColor: nb.color === c ? '#E8C66A' : 'transparent' }} />)}</div>
              <Button variant="gold" disabled={nb.title.trim().length < 2 || create.isPending}>+ Add banner</Button>
            </form>
          )}
        </div>
      </Card>
      <section className="flex flex-wrap items-start gap-4">
        <Card className="flex flex-[2_1_460px] flex-col gap-3.5" title="Send a push notification">
          <form className="flex flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
            <Field id="pt" label={`Title · ${p.title.length}/40`}><input id="pt" maxLength={40} value={p.title} onChange={(e) => { setP({ ...p, title: e.target.value }); setMsg(null); }} className={inputCls} /></Field>
            <Field id="pm" label={`Message · ${p.body.length}/120`}><textarea id="pm" maxLength={120} value={p.body} onChange={(e) => { setP({ ...p, body: e.target.value }); setMsg(null); }} className={inputCls + ' !h-20 resize-y py-2.5'} /></Field>
            <Field id="pa" label="Send to"><select id="pa" value={p.audience} onChange={(e) => setP({ ...p, audience: e.target.value as any })} className={inputCls}>{AUD.map(([k, l]) => <option key={k} value={k}>{l} · {fmt(push.data?.counts?.[k])}</option>)}</select></Field>
            {msg && <Toast tone={msg.tone}>{msg.text}</Toast>}
            <div><Button variant="gold" disabled={!canEdit || send.isPending || p.title.length < 2 || p.body.length < 2}>Send notification</Button></div>
            <span className="text-xs text-mute">Only players who allowed notifications in the app receive it.</span>
          </form>
        </Card>
        <Card className="flex flex-[1_1_300px] flex-col items-center gap-3" title="Preview on phone">
          <div className="box-border w-full max-w-[320px] rounded-[28px] border border-line2 bg-[#1A1F1C] px-3.5 pt-4.5 pb-6.5">
            <div className="mb-4 text-center text-[34px] font-light">{new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false })}</div>
            <div className="flex gap-2.5 rounded-2xl bg-white/10 p-3">
              <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-felt"><Crown w={22} /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="flex justify-between text-[11px] text-soft"><span>Local Rummy</span><span>now</span></span><b className="text-[13px] break-words">{p.title}</b><span className="text-xs leading-snug break-words text-[#DDE3DF]">{p.body}</span></span>
            </div>
          </div>
        </Card>
      </section>
      <Card className="!p-2" title={<span className="px-3">Sent notifications</span>}>
        <Table head={['Sent', 'Title', 'Audience', 'Delivered']} empty={!push.data?.history?.length && <Empty>Nothing sent yet.</Empty>}>
          {(push.data?.history ?? []).map((h: any) => <tr key={h.id}><td className="text-mute">{new Date(h.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td><td><b>{h.title}</b></td><td>{AUD.find((a) => a[0] === h.audience)?.[1]}</td><td>{fmt(h.delivered)}</td></tr>)}
        </Table>
      </Card>
    </>
  );
}
