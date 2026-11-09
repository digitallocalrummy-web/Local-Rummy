import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { api } from '../api';
import { useAuth } from '../auth';
import { Avatar, Crown, Icon, cx } from './ui';

export const ICONS = {
  overview: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  players: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  support: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  games: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  live: 'M22 12h-4l-3 9L9 3l-3 9H2',
  chips: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  reports: 'M3 3v18h18M8 17v-6M13 17V7M18 17v-4',
  content: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};

const NAV: { group: string; items: { to: string; label: string; icon: keyof typeof ICONS; badge?: 'support' }[] }[] = [
  { group: 'Dashboard', items: [{ to: '/', label: 'Overview', icon: 'overview' }] },
  { group: 'Players', items: [{ to: '/players', label: 'Players', icon: 'players' }, { to: '/support', label: 'Support & reports', icon: 'support', badge: 'support' }] },
  { group: 'Game', items: [{ to: '/games', label: 'Game setup', icon: 'games' }, { to: '/tables', label: 'Live tables', icon: 'live' }, { to: '/chips', label: 'Chips & rewards', icon: 'chips' }] },
  { group: 'Growth', items: [{ to: '/reports', label: 'Reports', icon: 'reports' }, { to: '/content', label: 'Banners & push', icon: 'content' }] },
];

const ROLE: Record<string, string> = { super: 'Super admin', moderator: 'Moderator', support: 'Support' };

export function Shell() {
  const { admin, logout } = useAuth();
  const counts = useQuery({ queryKey: ['ticket-counts'], queryFn: () => api('/api/admin/tickets?kind=ticket'), refetchInterval: 30_000 });
  const open = (counts.data?.counts?.tickets ?? 0) + (counts.data?.counts?.reports ?? 0);
  return (
    <div className="flex min-h-screen flex-wrap bg-ink">
      <nav aria-label="Admin sections" className="flex w-full flex-col gap-1 border-b border-line bg-[#0E120F] px-3.5 pt-5 pb-4 md:sticky md:top-0 md:h-screen md:w-60 md:border-r md:border-b-0">
        <NavLink to="/" className="flex items-center gap-2.5 px-2 pb-4 text-gold2 no-underline">
          <Crown />
          <span className="flex flex-col">
            <b className="font-display text-[15px] leading-tight tracking-[1.5px]">LOCAL RUMMY</b>
            <span className="text-[10px] font-extrabold tracking-[2.4px] text-mute">ADMIN CONSOLE</span>
          </span>
        </NavLink>
        <div className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap md:overflow-y-auto">
          {NAV.map((g) => (
            <div key={g.group} className="contents md:block">
              <span className="hidden px-2.5 pt-3.5 pb-1.5 text-[10px] font-extrabold tracking-[1.6px] text-faint uppercase md:block">{g.group}</span>
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.to === '/'}
                  className={({ isActive }) => cx('flex h-[42px] items-center gap-3 rounded-[10px] px-3 text-sm no-underline',
                    isActive ? 'bg-gold/14 font-extrabold text-gold2 shadow-[inset_0_0_0_1px_rgba(232,198,106,.35)]' : 'font-semibold text-soft hover:bg-raised hover:text-text')}>
                  <Icon d={ICONS[it.icon]} />
                  <span className="flex-1">{it.label}</span>
                  {it.badge && open > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C8343B] px-1.5 text-[11px] font-extrabold text-white">{open}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-auto hidden items-center gap-2.5 border-t border-line px-2.5 pt-3.5 md:flex">
          <Avatar name={admin?.name ?? 'Admin'} color="#1F6B4A" size={36} ring />
          <span className="flex min-w-0 flex-1 flex-col"><b className="truncate text-[13px]">{admin?.name}</b><span className="text-[11px] text-mute">{ROLE[admin?.role ?? 'support']}</span></span>
          <button onClick={logout} aria-label="Log out" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-mute hover:bg-raised"><Icon d={ICONS.logout} /></button>
        </div>
      </nav>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 px-4 pt-6 pb-10 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-[1_1_280px]">
        <h1 className="m-0 flex items-center gap-2.5 text-[26px] font-extrabold">{title}</h1>
        {sub && <p className="mt-1 mb-0 text-[13px] text-mute">{sub}</p>}
      </div>
      {children}
    </header>
  );
}
