/**
 * Game sound effects (no background music).
 * The sounds are the same recipes as the web version, rendered to small files in assets/sounds.
 * Players are created once and reused; quick repeats (dealing) use a small pool so they overlap.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type Sfx = 'card' | 'deal' | 'shuffle' | 'click' | 'chip' | 'turn' | 'win' | 'lose' | 'tick';

const SOURCES: Record<Sfx, number> = {
  card: require('../../assets/sounds/card.wav'),
  deal: require('../../assets/sounds/deal.wav'),
  shuffle: require('../../assets/sounds/shuffle.wav'),
  click: require('../../assets/sounds/click.wav'),
  chip: require('../../assets/sounds/chip.wav'),
  turn: require('../../assets/sounds/turn.wav'),
  win: require('../../assets/sounds/win.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  tick: require('../../assets/sounds/tick.wav'),
};
/** How many copies may play at once. */
const POOL: Partial<Record<Sfx, number>> = { deal: 4, card: 3, click: 2, chip: 2 };

const pools = new Map<Sfx, { players: AudioPlayer[]; next: number }>();
let ready = false;

function init() {
  if (ready) return;
  ready = true;
  // follow the phone's silent switch and mix politely with other apps
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
}

function pool(kind: Sfx) {
  let p = pools.get(kind);
  if (!p) {
    init();
    const players: AudioPlayer[] = [];
    for (let i = 0; i < (POOL[kind] ?? 1); i++) {
      try { players.push(createAudioPlayer(SOURCES[kind])); } catch { /* audio unavailable */ }
    }
    p = { players, next: 0 };
    pools.set(kind, p);
  }
  return p;
}

/** Load every sound up front so the first card doesn't lag. */
export function preloadSounds() {
  (Object.keys(SOURCES) as Sfx[]).forEach(pool);
}

/** Play a sound at `volume` 0–100 (the Sound slider). */
export function playSfx(kind: Sfx, volume: number) {
  if (volume <= 0) return;
  const p = pool(kind);
  const player = p.players[p.next];
  if (!player) return;
  p.next = (p.next + 1) % p.players.length;
  try {
    player.volume = Math.min(1, volume / 100);
    player.seekTo(0).catch(() => {});
    player.play();
  } catch { /* ignore */ }
}
