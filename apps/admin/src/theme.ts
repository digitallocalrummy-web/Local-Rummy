/** Admin colour theme: dark, light, or follow the computer's setting. Saved in this browser only. */
import { useEffect, useState } from 'react';

export type ThemeChoice = 'dark' | 'light' | 'system';
const KEY = 'lr-admin-theme';
const media = () => window.matchMedia('(prefers-color-scheme: light)');

export function readTheme(): ThemeChoice {
  try { const v = localStorage.getItem(KEY); if (v === 'dark' || v === 'light' || v === 'system') return v; } catch { /* private mode */ }
  return 'dark';
}

export function applyTheme(choice: ThemeChoice) {
  const light = choice === 'light' || (choice === 'system' && media().matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readTheme);
  useEffect(() => {
    applyTheme(choice);
    try { localStorage.setItem(KEY, choice); } catch { /* private mode */ }
    if (choice !== 'system') return;
    const m = media();
    const on = () => applyTheme('system');
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [choice]);
  return [choice, setChoice] as const;
}
