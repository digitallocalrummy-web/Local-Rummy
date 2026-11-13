import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ago, api, fmt, MODE_NAMES, signed } from '../api';
import { useCanEdit } from '../auth';
import { PageHeader } from '../components/Shell';
import { Avatar, Button, Card, Chips, Empty, Field, Label, Pill, SuitCard, Table, Toast, cx, inputCls } from '../components/ui';

type Status = 'open' | 'playing' | 'finished' | 'cancelled' | 'expired';
const STATUS: Record<Status, { label: string; tone: 'info' | 'ok' | 'gold' | 'mute' | 'bad' | 'warn' }> = {
  open: { label: 'Waiting for players', tone: 'info' },
  playing: { label: 'Playing', tone: 'ok' },
  finished: { label: 'Finished', tone: 'gold' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
  expired: { label: 'Expired', tone: 'mute' },
};
const StatusPill = ({ s }: { s: Status }) => <Pill tone={STATUS[s].tone}>{STATUS[s].label}</Pill>;

const when = (d: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
function left(d: string) {
  const s = Math.round((new Date(d).getTime() - Date.now()) / 1000);
  if (s <= 0) return 'expired';
  if (s < 3600) return `${Math.ceil(s / 60)} min left`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min left`;
  return `${Math.floor(s / 86400)} days left`;
}
const duration = (sec: number) => (sec < 60 ? `${sec} s` : sec < 3600 ? `${Math.floor(sec / 60)} min ${sec % 60} s` : `${Math.floor(sec / 3600)} h ${Math.round((sec % 3600) / 60)} min`);

type F = 'active' | 'ended' | 'all';

export default function CodeTables() {
  const qc = useQueryClient();
  const canEdit = useCanEdit();
  const [f, setF] = useState<F>('active');
  const [sel, setSel] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const list = useQuery({ queryKey: ['code-tables', f], queryFn: () => api(`/api/admin/code-tables?status=${f}`), refetchInterval: 3_000 });
  const rows: any[] = list.data?.rows ?? [];
  const selId = sel ?? rows[0]?.id ?? null;
  const pick = (id: number) => {
    setSel(id);
    if (window.innerWidth < 768) setTimeout(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <>
      <PageHeader title="Code tables" sub="Create a table, share its code with players, and follow it from the first seat to the final result.">
        {canEdit && <Button variant="gold" onClick={() => setCreating(true)}>+ Create code table</Button>}
      </PageHeader>
      <Chips label="Show" value={f} onChange={(v) => { setF(v); setSel(null); }} options={[{ value: 'active', label: 'Active' }, { value: 'ended', label: 'Ended' }, { value: 'all', label: 'All' }]} />

      <section className="flex flex-wrap items-start gap-4">
        <Card className="flex-[999_1_520px] !p-2">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 md:hidden">
            {rows.map((x) => (
              <li key={x.id}>
                <button onClick={() => pick(x.id)} className={cx('flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left text-text', x.id === selId ? 'border-gold/45 bg-raised' : 'border-transparent bg-transparent')}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b className="font-mono text-sm tracking-wider text-gold2">{x.displayCode}</b>
                    <span className="truncate text-xs text-mute">{x.title ? `${x.title} · ` : ''}{MODE_NAMES[x.mode]} · {x.status === 'open' ? `${x.seated}/${x.players} joined` : `${x.players} players`}</span>
                  </span>
                  <StatusPill s={x.status} />
                </button>
              </li>
            ))}
            {!rows.length && <Empty>{list.isLoading ? 'Loading…' : f === 'active' ? 'No active code tables. Create one to get a code to share.' : 'Nothing here yet.'}</Empty>}
          </ul>
          <div className="hidden md:block">
            <Table head={['Code', 'Game', 'Players', 'Entry', 'Who can join', f === 'active' ? 'Expires' : 'Ended', 'Status']}
              empty={!rows.length && <Empty>{list.isLoading ? 'Loading…' : f === 'active' ? 'No active code tables. Create one to get a code to share.' : 'Nothing here yet.'}</Empty>}>
              {rows.map((x) => (
                <tr key={x.id} className={cx(x.id === selId && '[&_td]:bg-gold/7')}>
                  <td className="whitespace-nowrap">
                    <button onClick={() => pick(x.id)} aria-label={`Open code table ${x.displayCode}`} className="cursor-pointer border-0 bg-transparent p-0 text-left font-mono text-[13px] font-extrabold tracking-wider text-gold2 underline decoration-line2 underline-offset-[3px]">{x.displayCode}</button>
                    {x.title && <span className="block max-w-[180px] truncate text-[11px] text-mute">{x.title}</span>}
                  </td>
                  <td>{MODE_NAMES[x.mode]}</td>
                  <td>{x.status === 'open' ? `${x.seated} / ${x.players} joined` : x.players}</td>
                  <td className="font-bold text-gold2">{x.entry ? fmt(x.entry) : 'Free'}</td>
                  <td className="text-mute">{x.allow.length ? `${x.allow.length} invited` : 'Anyone with code'}</td>
                  <td className="text-mute">{x.status === 'open' || x.status === 'playing' ? (x.status === 'playing' ? 'Started' : left(x.expiresAt)) : when(x.endedAt)}</td>
                  <td><StatusPill s={x.status} /></td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
        {selId != null && <div ref={panel} className="flex min-w-0 flex-[1_1_380px] scroll-mt-16"><Detail id={selId} canEdit={canEdit} /></div>}
      </section>

      {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={(row) => { setCreating(false); setF('active'); setSel(row.id); qc.invalidateQueries({ queryKey: ['code-tables'] }); }} />}
    </>
  );
}

// ---------------------------------------------------------------- detail

function Detail({ id, canEdit }: { id: number; canEdit: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['code-table', id], queryFn: () => api(`/api/admin/code-tables/${id}`), refetchInterval: 2_000 });
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const status = q.data?.status;
  useEffect(() => { setMsg(null); }, [id, status]);
  const act = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: object }) => api(`/api/admin/code-tables/${id}/${path}`, { body: body ?? {} }),
    onSuccess: (_r, v) => {
      setMsg({ tone: 'ok', text: v.path === 'start' ? 'Game started.' : v.path === 'cancel' ? 'Table cancelled. Every entry was refunded.' : 'Player removed and refunded.' });
      qc.invalidateQueries({ queryKey: ['code-table', id] }); qc.invalidateQueries({ queryKey: ['code-tables'] });
    },
    onError: (e: Error) => setMsg({ tone: 'bad', text: e.message }),
  });
  const d = q.data;
  if (!d) return <aside className="flex-1 rounded-[14px] border border-line bg-panel p-5 text-sm text-mute">{q.isError ? 'Could not load this table.' : 'Loading…'}</aside>;

  const shareText = `Join my Local Rummy table${d.title ? ` "${d.title}"` : ''}: open the app → Play with Friends → Join with code → ${d.displayCode}`;
  const copy = async () => { try { await navigator.clipboard.writeText(d.displayCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };

  const report = d.report as any;
  const exportCsv = () => {
    if (!report?.seats) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Code', 'Title', 'Game', 'Entry', 'Started', 'Ended', 'Duration (s)', 'Player', 'Player ID', 'AI', 'Points', 'Chips', 'Result'];
    const body = report.seats.map((s: any) => [d.displayCode, d.title ?? '', MODE_NAMES[d.mode], d.entry, d.startedAt ?? '', d.endedAt ?? '', report.durationSec ?? '', s.name, s.playerCode ?? '', s.bot ? 'yes' : 'no', s.points, s.chips, s.won ? 'Winner' : s.status === 'dropped' ? 'Dropped' : 'Lost'].map(esc).join(','));
    const url = URL.createObjectURL(new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `local-rummy-${d.displayCode}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <aside aria-label={`Code table ${d.displayCode}`} className="flex min-w-0 flex-1 flex-col gap-3.5 rounded-[14px] border border-line bg-panel p-5">
      {/* code and status */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <Label>Table code</Label>
          <b className="block font-mono text-[30px] leading-tight tracking-[0.14em] text-gold2">{d.displayCode}</b>
          <span className="block text-xs text-mute">{d.title ? `${d.title} · ` : ''}{MODE_NAMES[d.mode]} · {d.players} players · {d.entry ? `entry ${fmt(d.entry)} chips` : 'free'}</span>
        </div>
        <StatusPill s={d.status} />
      </div>
      {(d.status === 'open') && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={copy} className="flex-1">{copied ? 'Copied ✓' : 'Copy code'}</Button>
          <a className="inline-flex h-10 flex-1 items-center justify-center rounded-[10px] border border-[#25D366]/60 px-3.5 text-[13px] font-extrabold text-[#25D366] no-underline hover:bg-[#25D366]/10"
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
        </div>
      )}

      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        <div><dt className="text-[11px] text-mute">Who can join</dt><dd className="m-0 font-bold">{d.allow.length ? d.allow.join(', ') : 'Anyone with the code'}</dd></div>
        <div><dt className="text-[11px] text-mute">Start</dt><dd className="m-0 font-bold">{d.autoStart ? 'Automatically when full' : 'When you press Start'}</dd></div>
        <div><dt className="text-[11px] text-mute">Code expires</dt><dd className="m-0 font-bold">{when(d.expiresAt)}{d.status === 'open' && <span className="block text-[11px] font-semibold text-mute">{left(d.expiresAt)}</span>}</dd></div>
        <div><dt className="text-[11px] text-mute">Created</dt><dd className="m-0 font-bold">{when(d.createdAt)}{d.createdByName && <span className="block text-[11px] font-semibold text-mute">by {d.createdByName}</span>}</dd></div>
      </dl>

      {msg && <Toast tone={msg.tone}>{msg.text}</Toast>}

      {/* waiting: who joined */}
      {d.status === 'open' && (
        <>
          <Label>Joined · {d.joined.length} / {d.players}</Label>
          {d.joined.length ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {d.joined.map((p: any) => (
                <li key={p.playerId} className="flex items-center gap-2.5 rounded-[10px] bg-raised px-2.5 py-2">
                  <Avatar name={p.name} color={p.color} emoji={p.avatar} photo={p.photoUrl} size={36} />
                  <span className="min-w-0 flex-1 text-[13px]">
                    <b>{p.name}</b> <span className="font-mono text-[11px] text-gold2">{p.code}</span>
                    <span className="block truncate text-[11px] text-mute">{fmt(p.chips)} chips · {p.phone ?? p.device ?? 'device unknown'}{p.appVersion ? ` · app ${p.appVersion}` : ''} · joined {p.joinedAt ? ago(p.joinedAt) : '—'}</span>
                  </span>
                  {!p.connected && <Pill tone="warn">Offline</Pill>}
                  {canEdit && <Button variant="danger" className="!h-8 !px-2.5 !text-xs" onClick={() => { if (confirm(`Remove ${p.name} and refund their entry?`)) act.mutate({ path: 'remove', body: { playerId: p.playerId } }); }}>Remove</Button>}
                </li>
              ))}
            </ul>
          ) : <p className="m-0 rounded-[10px] bg-raised px-3 py-4 text-center text-[13px] text-mute">Nobody has joined yet. Share the code: players open <b>Play with Friends → Join with code</b>.</p>}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="gold" className="flex-[1_1_160px]" disabled={d.joined.length < 2 || act.isPending} onClick={() => act.mutate({ path: 'start' })}>
                {d.joined.length < 2 ? 'Start now (needs 2 players)' : `Start now with ${d.joined.length} players`}
              </Button>
              <Button variant="danger" className="flex-[1_1_160px]" onClick={() => { if (confirm(`Cancel ${d.displayCode}? Everyone who joined gets their entry back.`)) act.mutate({ path: 'cancel' }); }}>Cancel and refund</Button>
            </div>
          )}
        </>
      )}

      {/* playing: live view */}
      {d.status === 'playing' && d.table && (
        <>
          <div className="flex gap-2.5">
            {[['Wild joker', <SuitCard key="w" c={d.table.wild} />], ['Open card', <SuitCard key="o" c={d.table.open} />], ['Turns', <b key="t" className="text-white">{d.table.turnCount}</b>]].map(([l, v], i) => (
              <div key={i} className="flex-1 rounded-[10px] border border-[#1E6B45] bg-felt px-3 py-2.5"><Label className="!text-[#CFE3D6]">{l}</Label><span className="mt-0.5 block text-lg">{v}</span></div>
            ))}
          </div>
          <Label>Seats · live</Label>
          <div className="flex flex-col gap-1.5">
            {d.table.seats.map((s: any) => (
              <div key={s.idx} className="flex items-center gap-2.5 rounded-[10px] bg-raised px-2.5 py-2">
                <Avatar name={s.name} color={s.color} emoji={s.avatar} photo={s.photo} />
                <span className="min-w-0 flex-1 text-[13px]"><b>{s.name}</b>{s.isBot && <span className="text-mute"> · AI</span>}<span className="block text-[11px] text-mute">{s.cards} cards{s.points != null ? ` · ${s.points} pts in hand` : ''}</span></span>
                {d.table.turn === s.idx && <Pill tone="gold">Turn</Pill>}
                {s.status === 'dropped' && <Pill>Dropped</Pill>}
                {s.status === 'invalid' && <Pill tone="bad">Wrong show</Pill>}
                {!s.connected && <Pill tone="warn">Disconnected</Pill>}
              </div>
            ))}
          </div>
          {canEdit && <Button variant="danger" onClick={() => { if (confirm('End this game now and refund every entry?')) act.mutate({ path: 'cancel' }); }}>End game and refund entries</Button>}
        </>
      )}
      {d.status === 'playing' && !d.table && <p className="m-0 text-[13px] text-mute">Dealing…</p>}

      {/* ended: report */}
      {(d.status === 'finished' || d.status === 'cancelled' || d.status === 'expired') && (
        report?.seats ? (
          <>
            <div className="flex gap-2.5">
              <div className="flex-1 rounded-[10px] border border-gold/40 bg-gold/10 px-3 py-2.5"><Label>Winner</Label><b className="mt-0.5 block text-lg text-gold2">{report.reason === 'cancelled' ? 'No winner (cancelled)' : report.winner ?? '—'}</b></div>
              <div className="flex-1 rounded-[10px] border border-line bg-raised px-3 py-2.5"><Label>Time played</Label><b className="mt-0.5 block text-lg">{duration(report.durationSec ?? 0)}</b></div>
            </div>
            <Table head={['Player', 'Pts', 'Chips', 'Result']}>
              {report.seats.map((s: any, i: number) => (
                <tr key={i}>
                  <td className="font-bold">{s.name}{s.bot && <span className="font-normal text-mute"> · AI</span>}<span className="block font-mono text-[11px] font-semibold text-gold2">{s.playerCode ?? ''}</span></td>
                  <td>{s.points}</td>
                  <td className={cx('font-bold', s.chips > 0 ? 'text-ok' : s.chips < 0 ? 'text-bad' : 'text-mute')}>{signed(s.chips)}</td>
                  <td>{s.won ? <Pill tone="gold">Winner</Pill> : s.status === 'dropped' ? <Pill>Dropped</Pill> : s.status === 'invalid' ? <Pill tone="bad">Wrong show</Pill> : <Pill>Lost</Pill>}</td>
                </tr>
              ))}
            </Table>
            <span className="text-xs text-mute">Started {when(d.startedAt)} · ended {when(d.endedAt)}</span>
            <Button onClick={exportCsv}>Export report (CSV)</Button>
          </>
        ) : (
          <p className="m-0 rounded-[10px] bg-raised px-3 py-4 text-[13px] text-mute">
            {d.status === 'expired' ? 'The code expired before the game started. Any entries were refunded.' : report?.note ?? 'Cancelled before the game started. Any entries were refunded.'}
          </p>
        )
      )}
    </aside>
  );
}

// ---------------------------------------------------------------- create

const EXPIRY = [{ value: 15, label: '15 min' }, { value: 60, label: '1 hour' }, { value: 180, label: '3 hours' }, { value: 1440, label: '24 hours' }, { value: -1, label: 'Set time' }];

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (row: any) => void }) {
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api('/api/admin/config') });
  const modes = cfg.data?.config?.modes ?? cfg.data?.modes;
  const enabled = (['points', 'pool', 'deals'] as const).filter((m) => modes?.[m]?.enabled);
  const [mode, setMode] = useState<string>('points');
  const m = modes?.[mode];
  const [players, setPlayers] = useState(4);
  const [entry, setEntry] = useState(0);
  const [who, setWho] = useState<'anyone' | 'list'>('anyone');
  const [ids, setIds] = useState('');
  const [exp, setExp] = useState(60);
  const [at, setAt] = useState('');
  const [auto, setAuto] = useState(true);
  const [title, setTitle] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>('input, button')?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  useEffect(() => { if (enabled.length && !enabled.includes(mode as never)) setMode(enabled[0]); }, [enabled, mode]);

  const allow = ids.split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter(Boolean).map((x) => (x.startsWith('LR-') ? x : `LR-${x}`));
  const create = useMutation({
    mutationFn: () => api('/api/admin/code-tables', {
      body: {
        title: title.trim() || undefined, mode, players: Math.min(players, m?.maxPlayers ?? players), entry,
        allow: who === 'list' ? allow : [], autoStart: auto,
        ...(exp === -1 ? { expiresAt: at ? new Date(at).toISOString() : undefined } : { expiresInMinutes: exp }),
      },
    }),
    onSuccess: onCreated,
    onError: (e: Error) => setErr(e.message),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault(); setErr(null);
    if (who === 'list' && allow.length < 2) { setErr('Add at least 2 Player IDs, or choose “Anyone with the code”.'); return; }
    if (exp === -1 && !at) { setErr('Pick the date and time the code should expire.'); return; }
    create.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="ct-title" className="w-full max-w-[560px] rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="mb-3 flex items-center gap-3">
          <h2 id="ct-title" className="m-0 flex-1 text-lg font-extrabold">Create code table</h2>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent text-xl text-mute hover:bg-raised">×</button>
        </div>
        {!modes ? <p className="text-sm text-mute">Loading game settings…</p> : (
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <Field label="Name (optional)" id="ct-name" hint="Only you see this, e.g. “Friday night table”.">
              <input id="ct-name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} className={inputCls} placeholder="Friday night table" />
            </Field>
            <div className="flex flex-col gap-1.5"><Label>Game</Label>
              <Chips label="Game" value={mode} onChange={(v) => { setMode(v); setEntry(0); }} options={enabled.map((x) => ({ value: x, label: MODE_NAMES[x] }))} />
            </div>
            {mode !== 'points' && <p className="-mt-2 mb-0 text-xs text-warn">Pool 101 and Deals currently finish after one deal, like Points.</p>}
            <Field label={`Players at the table (2–${m?.maxPlayers ?? 10})`} id="ct-players">
              <select id="ct-players" value={Math.min(players, m?.maxPlayers ?? 10)} onChange={(e) => setPlayers(Number(e.target.value))} className={inputCls}>
                {Array.from({ length: Math.max(1, (m?.maxPlayers ?? 10) - 1) }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n} players</option>)}
              </select>
            </Field>
            <div className="flex flex-col gap-1.5"><Label>Entry</Label>
              <Chips label="Entry" value={entry} onChange={setEntry} options={[{ value: 0, label: 'Free' }, ...(m?.entries ?? []).map((e: number) => ({ value: e, label: `${fmt(e)} chips` }))]} />
            </div>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1.5 text-[11px] font-extrabold tracking-[1.4px] text-mute uppercase">Who can join</legend>
              <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="who" checked={who === 'anyone'} onChange={() => setWho('anyone')} /> Anyone with the code</label>
              <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="who" checked={who === 'list'} onChange={() => setWho('list')} /> Only these players</label>
              {who === 'list' && (
                <Field label="Player IDs" id="ct-ids" hint="Separate with commas or spaces, e.g. LR-48217, LR-11529. Players see their ID in Profile.">
                  <textarea id="ct-ids" value={ids} onChange={(e) => setIds(e.target.value)} rows={2} className={cx(inputCls, '!h-auto py-2 font-mono')} placeholder="LR-48217, LR-11529" />
                </Field>
              )}
            </fieldset>
            <div className="flex flex-col gap-1.5"><Label>Code expires after</Label>
              <Chips label="Code expires after" value={exp} onChange={setExp} options={EXPIRY} />
            </div>
            {exp === -1 && (
              <Field label="Expires at" id="ct-at"><input id="ct-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={inputCls} /></Field>
            )}
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1.5 text-[11px] font-extrabold tracking-[1.4px] text-mute uppercase">Start the game</legend>
              <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="start" checked={auto} onChange={() => setAuto(true)} /> Automatically when all seats are full</label>
              <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="start" checked={!auto} onChange={() => setAuto(false)} /> When I press Start (I can start early with 2 or more)</label>
            </fieldset>
            {err && <Toast tone="bad">{err}</Toast>}
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={onClose}>Cancel</Button>
              <Button variant="gold" disabled={create.isPending || !enabled.length}>{create.isPending ? 'Creating…' : 'Create and get code'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
