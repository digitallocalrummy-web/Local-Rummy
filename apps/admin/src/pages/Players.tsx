import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ago, api, fmt, MODE_NAMES, signed } from '../api';
import { useCanEdit } from '../auth';
import { PageHeader } from '../components/Shell';
import { Avatar, Button, Card, Chips, Empty, Field, Label, Pill, Table, Toast, cx, inputCls } from '../components/ui';

type Filter = 'all' | 'active' | 'new' | 'blocked';

export default function Players() {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const open = (id: string) => {
    setSel(id);
    // on phones the details sit below the list, so bring them into view
    if (window.innerWidth < 768) setTimeout(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  useEffect(() => { const t = setTimeout(() => { setSearch(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const list = useQuery({ queryKey: ['players', filter, search, page], queryFn: () => api(`/api/admin/players?filter=${filter}&page=${page}&q=${encodeURIComponent(search)}`) });
  const rows: any[] = list.data?.rows ?? [];
  const selected = sel ?? rows[0]?.id ?? null;
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 25));
  const exportCsv = () => {
    const head = 'Player ID,Name,Level,Chips,Games,Win rate,Status,Last active';
    const body = rows.map((r) => [r.code, `"${r.name}"`, r.level, r.chips, r.gamesPlayed, r.winRate + '%', r.status, new Date(r.lastActiveAt).toISOString()].join(','));
    const url = URL.createObjectURL(new Blob([[head, ...body].join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'local-rummy-players.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHeader title="Players" sub={`${fmt(list.data?.registered)} registered · ${fmt(list.data?.online)} online now`}>
        <Button onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
      </PageHeader>
      <section className="flex flex-wrap items-center gap-2.5">
        <label htmlFor="ps" className="flex h-[42px] max-w-[420px] min-w-0 flex-[1_1_280px] items-center gap-2 rounded-[10px] border border-line bg-panel px-3.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E988F" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input id="ps" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, player ID or phone" className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-text outline-0" />
        </label>
        <Chips label="Filter players" value={filter} onChange={(v) => { setFilter(v); setPage(1); }} options={[{ value: 'all', label: 'All players' }, { value: 'active', label: 'Active' }, { value: 'new', label: 'New this week' }, { value: 'blocked', label: 'Blocked' }]} />
      </section>
      <section className="flex flex-wrap items-start gap-4">
        <Card className="flex-[999_1_560px] !p-2">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 md:hidden">
            {rows.map((u) => (
              <li key={u.id}>
                <button onClick={() => open(u.id)} className={cx('flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left text-text', u.id === selected ? 'border-gold/45 bg-raised' : 'border-transparent bg-transparent')}>
                  <Avatar name={u.name} color={u.color} size={38} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b className="truncate text-sm">{u.name}</b>
                    <span className="text-xs text-mute">{u.code} · Lv {u.level} · {u.gamesPlayed} games · {ago(u.lastActiveAt)}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <b className="text-sm text-gold2">{fmt(u.chips)}</b>
                    {u.status === 'blocked' ? <Pill tone="bad">Blocked</Pill> : u.isNew ? <Pill tone="info">New</Pill> : <Pill tone="ok">Active</Pill>}
                  </span>
                </button>
              </li>
            ))}
            {!rows.length && <Empty>{list.isLoading ? 'Loading…' : 'No players match.'}</Empty>}
          </ul>
          <div className="hidden md:block">
          <Table head={['Player', 'Player ID', 'Level', 'Chips', 'Games', 'Win rate', 'Last active', 'Status']} empty={!rows.length && <Empty>{list.isLoading ? 'Loading…' : 'No players match.'}</Empty>}>
            {rows.map((u) => (
              <tr key={u.id} className={cx(u.id === selected && '[&_td]:bg-gold/7')}>
                <td><button onClick={() => open(u.id)} aria-label={`Open ${u.name}`} className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left text-[13px] font-bold text-text hover:text-gold2"><Avatar name={u.name} color={u.color} />{u.name}</button></td>
                <td className="text-mute">{u.code}</td><td>{u.level}</td><td className="font-bold text-gold2">{fmt(u.chips)}</td><td>{u.gamesPlayed}</td><td>{u.winRate}%</td><td className="text-mute">{ago(u.lastActiveAt)}</td>
                <td>{u.status === 'blocked' ? <Pill tone="bad">Blocked</Pill> : u.isNew ? <Pill tone="info">New</Pill> : <Pill tone="ok">Active</Pill>}</td>
              </tr>
            ))}
          </Table>
          </div>
          <div className="flex items-center justify-between p-3 text-xs text-mute">
            <span>Showing {rows.length} of {fmt(list.data?.total)}</span>
            <span className="flex items-center gap-2"><Button className="!h-8" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">‹</Button>Page {page} of {pages}<Button className="!h-8" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page">›</Button></span>
          </div>
        </Card>
        {selected && <div ref={panel} className="flex min-w-0 flex-[1_1_320px] scroll-mt-16"><PlayerPanel id={selected} /></div>}
      </section>
    </>
  );
}

function PlayerPanel({ id }: { id: string }) {
  const qc = useQueryClient();
  const canEdit = useCanEdit();
  const p = useQuery({ queryKey: ['player', id], queryFn: () => api(`/api/admin/players/${id}`) });
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['player', id] }); qc.invalidateQueries({ queryKey: ['players'] }); };
  const block = useMutation({ mutationFn: (blocked: boolean) => api(`/api/admin/players/${id}/block`, { body: { blocked } }), onSuccess: refresh });
  const chips = useMutation({
    mutationFn: () => api(`/api/admin/players/${id}/chips`, { body: { amount: Number(amount), reason } }),
    onSuccess: (r) => { setMsg({ tone: 'ok', text: `Done. Balance is now ${fmt(r.chips)}.` }); setAmount(''); setReason(''); refresh(); },
    onError: (e) => setMsg({ tone: 'bad', text: (e as Error).message }),
  });
  useEffect(() => setMsg(null), [id]);
  const d = p.data;
  if (!d) return <Card className="flex-[1_1_320px]"><span className="text-mute">Loading…</span></Card>;
  return (
    <aside aria-label="Player details" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 rounded-[14px] border border-line bg-panel p-5">
      <div className="flex items-center gap-3.5"><Avatar name={d.name} color={d.color} size={56} ring /><div className="min-w-0 flex-1"><b className="block text-lg">{d.name}</b><span className="text-xs text-mute">{d.code} · joined {new Date(d.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span></div></div>
      <div className="grid grid-cols-2 gap-2.5">
        {[['Chips', fmt(d.chips), true], ['Level', d.level], ['Games', d.gamesPlayed], ['Win rate', d.winRate + '%']].map(([l, v, g]) => (
          <div key={String(l)} className="rounded-[10px] bg-raised p-3"><Label>{l}</Label><b className={cx('mt-1 block text-xl', g && 'text-gold2')}>{v}</b></div>
        ))}
      </div>
      <div className="flex flex-col gap-2 text-[13px]">
        {[['Phone', d.phone ?? '—'], ['Device', d.device ?? '—'], ['App version', d.appVersion ?? '—'], ['Favourite mode', d.favouriteMode ? MODE_NAMES[d.favouriteMode] : '—'], ['Last active', ago(d.lastActiveAt)], ['Daily bonus', d.bonus.available ? `Day ${d.bonus.day} ready` : 'Collected today']].map(([l, v]) => (
          <div key={l} className="flex justify-between gap-3"><span className="text-mute">{l}</span><b className="truncate">{v}</b></div>
        ))}
      </div>
      <Label>Recent games</Label>
      <div className="flex flex-col gap-2 text-[13px]">
        {d.recentGames.map((g: any, i: number) => <div key={i} className="flex justify-between rounded-[10px] bg-raised px-3 py-2.5"><span>{MODE_NAMES[g.mode]} · {g.players} players</span><b className={g.chips >= 0 ? 'text-ok' : 'text-bad'}>{signed(g.chips)}</b></div>)}
        {!d.recentGames.length && <span className="text-mute">No games yet.</span>}
      </div>
      {canEdit && (
        <form className="flex flex-col gap-2.5 border-t border-line pt-4" onSubmit={(e) => { e.preventDefault(); chips.mutate(); }}>
          <Label>Give or remove chips</Label>
          <div className="flex gap-2"><Field label="Amount (use − to remove)" id="amt"><input id="amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ''))} className={inputCls} placeholder="500" /></Field></div>
          <Field label="Reason (saved in the log)" id="rsn"><input id="rsn" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="Compensation for a stuck table" /></Field>
          {msg && <Toast tone={msg.tone}>{msg.text}</Toast>}
          <Button variant="gold" disabled={!Number(amount) || reason.trim().length < 3 || chips.isPending}>Apply {amount && Number(amount) ? signed(Number(amount)) : ''} chips</Button>
        </form>
      )}
      {canEdit && <Button variant="danger" onClick={() => block.mutate(d.status !== 'blocked')} disabled={block.isPending}>{d.status === 'blocked' ? 'Unblock player' : 'Block player'}</Button>}
    </aside>
  );
}
