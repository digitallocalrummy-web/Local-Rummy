import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '../auth';
import { Crown, Toast, inputCls } from '../components/ui';

export default function Login() {
  const { admin, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (admin) return <Navigate to="/" replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(email, password); nav('/'); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-screen flex-wrap bg-ink">
      <section className="flex min-w-0 flex-[1_1_480px] flex-col justify-center gap-7 border-r border-[#1E6B45] bg-felt px-8 py-14 sm:px-16">
        <Crown w={78} />
        <div>
          <h1 className="m-0 font-display text-5xl leading-none tracking-[3px] text-gold2">LOCAL RUMMY</h1>
          <p className="mt-2.5 mb-0 text-[13px] font-extrabold tracking-[3px] text-[#CFE3D6]">ADMIN CONSOLE</p>
        </div>
        <p className="m-0 max-w-[440px] text-lg leading-relaxed text-[#E3EEE7]">One place to run the game: players, tables, chips, banners and support.</p>
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0 text-[15px] text-[#E3EEE7]">
          {['Change table rules and the app picks them up', 'Watch live tables and step in when one gets stuck', 'Virtual chips only · no real money'].map((t) => (
            <li key={t} className="flex items-center gap-3"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8C66A" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>{t}</li>
          ))}
        </ul>
      </section>
      <section className="flex min-w-0 flex-[1_1_420px] items-center justify-center px-8 py-14">
        <form onSubmit={submit} aria-labelledby="h" className="flex w-full max-w-[420px] flex-col gap-5">
          <div>
            <h2 id="h" className="m-0 text-[28px] font-extrabold">Sign in</h2>
            <p className="mt-1.5 mb-0 text-sm text-mute">For Local Rummy staff only. Your access is set by your role.</p>
          </div>
          <div className="flex flex-col gap-2"><label htmlFor="em" className="text-xs font-extrabold tracking-[1px] text-soft">WORK EMAIL</label><input id="em" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls + ' h-12'} /></div>
          <div className="flex flex-col gap-2"><label htmlFor="pw" className="text-xs font-extrabold tracking-[1px] text-soft">PASSWORD</label><input id="pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls + ' h-12'} /></div>
          {error && <Toast tone="bad">{error}</Toast>}
          <button disabled={busy} className="h-[50px] cursor-pointer rounded-xl border-0 bg-gold text-[15px] font-extrabold text-[#1A1406] hover:bg-gold2 disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </div>
  );
}
