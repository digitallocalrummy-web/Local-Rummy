import { useAuth } from '../auth';
import { PageHeader } from '../components/Shell';
import { Avatar, Button, Card, Label, cx } from '../components/ui';
import { useTheme, type ThemeChoice } from '../theme';

const ROLE: Record<string, string> = { super: 'Super admin', moderator: 'Moderator', support: 'Support' };
const ROLE_NOTE: Record<string, string> = {
  super: 'Can do everything, including big chip changes and adding staff.',
  moderator: 'Can change game settings, chips, banners and block players.',
  support: 'Can view everything and answer support tickets.',
};

/** A small picture of the admin in each theme. */
function Preview({ light }: { light: boolean }) {
  const c = light
    ? { bg: '#F4F2EC', nav: '#FBFAF6', card: '#FFFFFF', line: '#E3DED1', text: '#1B201C', mute: '#B9B3A3' }
    : { bg: '#0A0D0B', nav: '#0E120F', card: '#121714', line: '#222A25', text: '#EEF1EC', mute: '#3A4440' };
  return (
    <div aria-hidden="true" className="flex h-[92px] overflow-hidden rounded-[10px] border" style={{ background: c.bg, borderColor: c.line }}>
      <div className="flex w-[30%] flex-col gap-1.5 p-2" style={{ background: c.nav, borderRight: `1px solid ${c.line}` }}>
        <span className="h-2 w-[70%] rounded-sm bg-[#E8C66A]" />
        <span className="h-1.5 w-[80%] rounded-sm" style={{ background: c.mute }} />
        <span className="h-1.5 w-[60%] rounded-sm" style={{ background: c.mute }} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <span className="h-2 w-[50%] rounded-sm" style={{ background: c.text }} />
        <div className="flex flex-1 gap-1.5">
          {[0, 1].map((i) => <span key={i} className="flex-1 rounded-md border" style={{ background: c.card, borderColor: c.line }} />)}
        </div>
      </div>
    </div>
  );
}

const OPTIONS: { value: ThemeChoice; label: string; note: string }[] = [
  { value: 'dark', label: 'Dark', note: 'Emerald and gold on black, like the game' },
  { value: 'light', label: 'Light', note: 'Easier to read in bright rooms' },
  { value: 'system', label: 'Match my computer', note: 'Follows your Windows or Mac setting' },
];

export default function Settings() {
  const { admin, logout } = useAuth();
  const [theme, setTheme] = useTheme();
  return (
    <>
      <PageHeader title="Settings" sub="Your preferences for this admin panel. These only change what you see, not the game." />
      <Card title={<>Appearance <span className="block text-xs font-normal text-mute">Saved in this browser. Each admin can pick their own.</span></>}>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {OPTIONS.map((o) => {
            const on = theme === o.value;
            return (
              <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => setTheme(o.value)}
                className={cx('flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3 text-left text-text', on ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_var(--color-gold)]' : 'border-line bg-raised hover:border-line2')}>
                {o.value === 'system' ? (
                  <div className="grid grid-cols-2 gap-1.5"><Preview light={false} /><Preview light /></div>
                ) : <Preview light={o.value === 'light'} />}
                <span className="flex items-center gap-2">
                  <span className={cx('flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-2', on ? 'border-gold' : 'border-line2')}>
                    {on && <span className="h-2 w-2 rounded-full bg-gold" />}
                  </span>
                  <b className="text-sm">{o.label}</b>
                </span>
                <span className="text-xs text-mute">{o.note}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <Card title="Your account">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={admin?.name ?? 'Admin'} color="#1F6B4A" size={52} ring />
          <div className="min-w-0 flex-[1_1_240px]">
            <b className="block text-base">{admin?.name}</b>
            <Label>{ROLE[admin?.role ?? 'support']}</Label>
            <p className="mt-1 mb-0 text-[13px] text-soft">{ROLE_NOTE[admin?.role ?? 'support']}</p>
          </div>
          <Button onClick={logout}>Sign out</Button>
        </div>
      </Card>
    </>
  );
}
