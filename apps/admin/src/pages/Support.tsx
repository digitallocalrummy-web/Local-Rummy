import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ago, api } from '../api';
import { PageHeader } from '../components/Shell';
import { Avatar, Button, Card, Chips, Empty, Label, Pill, Toast, cx, inputCls } from '../components/ui';

export default function Support() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<'ticket' | 'report'>('ticket');
  const [status, setStatus] = useState<'open' | 'solved' | 'all'>('open');
  const [sel, setSel] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [ok, setOk] = useState('');
  const list = useQuery({ queryKey: ['tickets', kind, status], queryFn: () => api(`/api/admin/tickets?kind=${kind}&status=${status}`), refetchInterval: 20_000 });
  const rows: any[] = list.data?.rows ?? [];
  const id = sel && rows.some((r) => r.id === sel) ? sel : rows[0]?.id;
  const t = useQuery({ queryKey: ['ticket', id], queryFn: () => api(`/api/admin/tickets/${id}`), enabled: !!id });
  useEffect(() => { setReply(''); setOk(''); }, [id]);
  const inv = () => { qc.invalidateQueries({ queryKey: ['ticket', id] }); qc.invalidateQueries({ queryKey: ['tickets'] }); qc.invalidateQueries({ queryKey: ['ticket-counts'] }); };
  const send = useMutation({ mutationFn: () => api(`/api/admin/tickets/${id}/reply`, { body: { body: reply } }), onSuccess: () => { setReply(''); setOk('Reply sent. The player sees it in the app’s Help screen.'); inv(); } });
  const setSt = useMutation({ mutationFn: (s: 'open' | 'solved') => api(`/api/admin/tickets/${id}/status`, { body: { status: s } }), onSuccess: inv });
  const block = useMutation({ mutationFn: (pid: string) => api(`/api/admin/players/${pid}/block`, { body: { blocked: true } }), onSuccess: () => { setOk('Player blocked and removed from their table.'); inv(); } });
  const d = t.data;
  return (
    <>
      <PageHeader title="Support & reports" sub="Player questions and reports of unfair play">
        <Chips label="Inbox" value={kind} onChange={(k) => { setKind(k); setSel(null); }} options={[{ value: 'ticket', label: `Tickets · ${list.data?.counts?.tickets ?? 0}` }, { value: 'report', label: `Cheating reports · ${list.data?.counts?.reports ?? 0}` }]} />
        <Chips label="Status" value={status} onChange={setStatus} options={[{ value: 'open', label: 'Open' }, { value: 'solved', label: 'Solved' }, { value: 'all', label: 'All' }]} />
      </PageHeader>
      <section className="flex flex-wrap items-stretch gap-4">
        <Card className="flex flex-[1_1_340px] flex-col gap-1 !p-2.5">
          {rows.map((r) => (
            <button key={r.id} onClick={() => setSel(r.id)} className={cx('flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left text-text', r.id === id ? 'border-gold/45 bg-raised' : 'border-transparent bg-transparent hover:bg-raised')}>
              <Avatar name={r.player.name} color={r.player.color} size={32} />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="flex items-center gap-2"><b className="flex-1 text-[13px]">{r.player.name}</b><span className="text-[11px] text-faint">{ago(r.createdAt)}</span></span>
                <span className="text-[13px] font-bold">{r.subject}</span>
                <span className="truncate text-xs text-mute">{r.preview}</span>
                <span className="mt-[3px] flex gap-1.5">{r.urgent && <Pill tone="bad">Urgent</Pill>}<Pill>{r.tag}</Pill>{r.status === 'solved' && <Pill tone="ok">Solved</Pill>}</span>
              </span>
            </button>
          ))}
          {!rows.length && <Empty>{list.isLoading ? 'Loading…' : 'Nothing here. Players send these from the Help screen in the app.'}</Empty>}
        </Card>
        <Card className="flex flex-[2_1_520px] flex-col gap-3.5">
          {!d ? <Empty>Pick a conversation.</Empty> : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-line pb-3.5">
                {d.player && <Avatar name={d.player.name} color={d.player.color} size={44} />}
                <div className="min-w-0 flex-[1_1_200px]"><b className="text-base">{d.subject}</b><span className="block text-xs text-mute">{d.player?.name} · {d.player?.code} · {d.player?.device ?? 'device unknown'} · app {d.player?.appVersion ?? '?'}</span></div>
                <Link to="/players" className="text-xs font-extrabold no-underline">Open players →</Link>
              </div>
              {d.kind === 'report' && (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
                  <div className="rounded-[10px] bg-raised p-3"><Label>Reported player</Label><b className="mt-1 block">{d.against ? `${d.against.name} · ${d.against.code}` : 'Not given'}</b></div>
                  <div className="rounded-[10px] bg-raised p-3"><Label>Table</Label><b className="mt-1 block">{d.tableCode ?? '—'}</b></div>
                  <div className="rounded-[10px] bg-raised p-3"><Label>Games together</Label><b className="mt-1 block text-warn">{d.together ?? '—'}</b></div>
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2.5">
                {d.messages.map((m: any) => (
                  <div key={m.id} className={cx('max-w-[78%] rounded-[14px] border px-3.5 py-3 text-[13px] leading-normal', m.admin ? 'self-end border-gold/30 bg-gold/12' : 'self-start border-line bg-raised')}>
                    {m.body}<span className="mt-1.5 block text-[11px] text-mute">{m.admin ? `${m.admin} · support` : d.player?.name} · {ago(m.at)}</span>
                  </div>
                ))}
              </div>
              {ok && <Toast>{ok}</Toast>}
              <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) send.mutate(); }}>
                <label htmlFor="reply" className="text-[11px] font-extrabold tracking-[1.4px] text-mute uppercase">Reply to {d.player?.name}</label>
                <textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply. The player sees it in the app’s Help screen." className={inputCls + ' !h-20 resize-y py-2.5'} />
                <div className="flex flex-wrap gap-2">
                  {d.status === 'open' ? <Button type="button" onClick={() => setSt.mutate('solved')}>Mark solved</Button> : <Button type="button" onClick={() => setSt.mutate('open')}>Reopen</Button>}
                  {d.kind === 'report' && d.against && d.against.status !== 'blocked' && <Button type="button" variant="danger" onClick={() => { if (confirm(`Block ${d.against.name}?`)) block.mutate(d.against.id); }}>Block reported player</Button>}
                  <Button variant="gold" className="ml-auto" disabled={!reply.trim() || send.isPending}>Send reply</Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </section>
    </>
  );
}
