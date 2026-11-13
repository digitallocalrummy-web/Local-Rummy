import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { api } from '../api';
import { useAuth } from '../auth';
import { Avatar, Crown, Icon, cx } from './ui';

export const ICONS = {
  overview: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  players: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  support: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  games: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  live: 'M22 12h-4l-3 9L9 3l-3 9H2',
  code: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5zM12 15v2',
  chips: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  reports: 'M3 3v18h18M8 17v-6M13 17V7M18 17v-4',
  content: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
};

const NAV: { group: string; items: { to: string; label: string; icon: keyof typeof ICONS; badge?: 'support' }[] }[] = [
  { group: 'Dashboard', items: [{ to: '/', label: 'Overview', icon: 'overview' }] },
  { group: 'Players', items: [{ to: '/players', label: 'Players', icon: 'players' }, { to: '/support', label: 'Support & reports', icon: 'support', badge: 'support' }] },
  { group: 'Game', items: [{ to: '/games', label: 'Game setup', icon: 'games' }, { to: '/tables', label: 'Live tables', icon: 'live' }, { to: '/code-tables', label: 'Code tables', icon: 'code' }, { to: '/chips', label: 'Chips & rewards', icon: 'chips' }] },
  { group: 'Growth', items: [{ to: '/reports', label: 'Reports', icon: 'reports' }, { to: '/content', label: 'Banners & push', icon: 'content' }] },
  { group: 'Account', items: [{ to: '/settings', label: 'Settings', icon: 'settings' }] },
];

const ROLE: Record<string, string> = { super: 'Super admin', moderator: 'Moderator', support: 'Support' };

function NavList({ open, onNavigate }: { open: number; onNavigate?: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      {NAV.map((g) => (
        <div key={g.group}>
          <span className="block px-2.5 pt-3.5 pb-1.5 text-[10px] font-extrabold tracking-[1.6px] text-faint uppercase">{g.group}</span>
          {g.items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.to === '/'} onClick={onNavigate}
              className={({ isActive }) => cx('flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm no-underline',
                isActive ? 'bg-gold/14 font-extrabold text-gold2 shadow-[inset_0_0_0_1px_rgba(232,198,106,.35)]' : 'font-semibold text-soft hover:bg-raised hover:text-text')}>
              <Icon d={ICONS[it.icon]} />
              <span className="flex-1">{it.label}</span>
              {it.badge && open > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C8343B] px-1.5 text-[11px] font-extrabold text-white">{open}</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </div>
  );
}

function AdminCard() {
  const { admin, logout } = useAuth();
  return (
    <div className="mt-auto flex items-center gap-2.5 border-t border-line px-2.5 pt-3.5">
      <Avatar name={admin?.name ?? 'Admin'} color="#1F6B4A" size={36} ring />
      <span className="flex min-w-0 flex-1 flex-col"><b className="truncate text-[13px]">{admin?.name}</b><span className="text-[11px] text-mute">{ROLE[admin?.role ?? 'support']}</span></span>
      <button onClick={logout} aria-label="Log out" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-mute hover:bg-raised"><Icon d={ICONS.logout} /></button>
    </div>
  );
}

const Brand = () => (
  <NavLink to="/" className="flex items-center gap-2.5 text-gold2 no-underline">
    <Crown />
    <span className="flex flex-col">
      <b className="font-display text-[15px] leading-tight tracking-[1.5px]">LOCAL RUMMY</b>
      <span className="text-[10px] font-extrabold tracking-[2.4px] text-mute">ADMIN CONSOLE</span>
    </span>
  </NavLink>
);

/** Bottom tabs on phones: the four pages used most, plus the full menu. */
const TABS: { to: string; label: string; icon: keyof typeof ICONS }[] = [
  { to: '/', label: 'Overview', icon: 'overview' },
  { to: '/players', label: 'Players', icon: 'players' },
  { to: '/tables', label: 'Tables', icon: 'live' },
  { to: '/games', label: 'Setup', icon: 'games' },
];

export function Shell() {
  const counts = useQuery({ queryKey: ['ticket-counts'], queryFn: () => api('/api/admin/tickets?kind=ticket'), refetchInterval: 30_000 });
  const open = (counts.data?.counts?.tickets ?? 0) + (counts.data?.counts?.reports ?? 0);
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [menu]);

  return (
    <div className="flex min-h-screen bg-ink">
      {/* Desktop and tablet: fixed side menu */}
      <nav aria-label="Admin sections" className="sticky top-0 hidden h-screen w-60 flex-none flex-col gap-1 border-r border-line bg-nav px-3.5 pt-5 pb-4 md:flex">
        <div className="px-2 pb-2"><Brand /></div>
        <NavList open={open} />
        <AdminCard />
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone: top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-nav/95 px-4 backdrop-blur md:hidden">
          <Brand />
        </header>

        <main className="flex min-w-0 flex-col gap-4 px-4 pt-5 pb-28 sm:gap-5 sm:px-8 md:pt-6 md:pb-10">
          <Outlet />
        </main>

        {/* Phone: bottom tabs */}
        <nav aria-label="Main pages" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-nav/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/'}
              className={({ isActive }) => cx('flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold no-underline', isActive ? 'text-gold2' : 'text-mute')}>
              <Icon d={ICONS[t.icon]} size={20} />{t.label}
            </NavLink>
          ))}
          <button onClick={() => setMenu(true)} className="relative flex h-16 flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-0 bg-transparent text-[11px] font-bold text-mute">
            <Icon d="M3 6h18M3 12h18M3 18h18" size={20} />More
            {open > 0 && <span className="absolute top-2.5 right-[calc(50%-16px)] h-2.5 w-2.5 rounded-full bg-[#C8343B]" />}
          </button>
        </nav>
      </div>

      {/* Phone: full menu drawer */}
      {menu && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button aria-label="Close menu" onClick={() => setMenu(false)} className="absolute inset-0 cursor-default border-0 bg-black/55" />
          <nav className="absolute inset-y-0 right-0 flex w-[min(86vw,320px)] flex-col gap-1 border-l border-line bg-nav px-3.5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="flex items-center gap-2 px-2 pb-1">
              <Brand />
              <span className="flex-1" />
              <button onClick={() => setMenu(false)} aria-label="Close menu" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-mute hover:bg-raised">
                <Icon d="M18 6L6 18M6 6l12 12" size={20} />
              </button>
            </div>
            <NavList open={open} onNavigate={() => setMenu(false)} />
            <AdminCard />
          </nav>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-[1_1_280px]">
        <h1 className="m-0 flex items-center gap-2.5 text-[22px] font-extrabold sm:text-[26px]">{title}</h1>
        {sub && <p className="mt-1 mb-0 text-[13px] text-mute">{sub}</p>}
      </div>
      {children}
    </header>
  );
}
