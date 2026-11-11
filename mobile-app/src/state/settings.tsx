import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { pauseMusic, playSfx, preloadSounds, setMusic, type Sfx } from './sound';
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
  /** Tap feedback: a click sound plus a light buzz (respects the Sound slider and haptics switch). */
  tap: (style?: 'light' | 'medium' | 'success') => void;
  /** Play a game sound at the Sound slider's volume. */
  sfx: (kind: Sfx) => void;
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

  const sfx = useCallback((kind: Sfx) => playSfx(kind, settings.sound), [settings.sound]);

  useEffect(() => { preloadSounds(); }, []);
  // background music follows the Music slider, and pauses while the app is in the background
  useEffect(() => {
    setMusic(settings.music);
    const sub = AppState.addEventListener('change', (st) => (st === 'active' ? setMusic(settings.music) : pauseMusic()));
    return () => sub.remove();
  }, [settings.music]);

  const tap = useCallback(
    (style: 'light' | 'medium' | 'success' = 'light') => {
      playSfx(style === 'success' ? 'chip' : 'click', settings.sound);
      if (!settings.haptics) return;
      if (style === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.impactAsync(style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
    [settings.haptics, settings.sound],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      update,
      tap,
      sfx,
      table: tableThemes.find((t) => t.id === settings.tableTheme) ?? tableThemes[0],
      back: cardBackThemes.find((b) => b.id === settings.cardBack) ?? cardBackThemes[0],
    }),
    [settings, update, tap, sfx],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
