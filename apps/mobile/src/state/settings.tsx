import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cardBackThemes, tableThemes, type CardBackTheme, type TableTheme } from '../theme';

export interface Settings {
  sound: number;
  music: number;
  haptics: boolean;
  animations: boolean;
  tableTheme: string;
  cardBack: string;
}

interface SettingsContextValue extends Settings {
  update: (patch: Partial<Settings>) => void;
  table: TableTheme;
  back: CardBackTheme;
  /** Light tap feedback, respects the haptics switch. */
  tap: (style?: 'light' | 'medium' | 'success') => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    sound: 80,
    music: 45,
    haptics: true,
    animations: true,
    tableTheme: 'emerald',
    cardBack: 'ruby',
  });

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  const tap = useCallback(
    (style: 'light' | 'medium' | 'success' = 'light') => {
      if (!settings.haptics) return;
      if (style === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.impactAsync(style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
    [settings.haptics],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      update,
      tap,
      table: tableThemes.find((t) => t.id === settings.tableTheme) ?? tableThemes[0],
      back: cardBackThemes.find((b) => b.id === settings.cardBack) ?? cardBackThemes[0],
    }),
    [settings, update, tap],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
