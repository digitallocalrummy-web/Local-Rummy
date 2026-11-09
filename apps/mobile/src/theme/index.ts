/**
 * Local Rummy design system.
 * All sizes are authored against a 960×432 landscape reference frame and
 * multiplied by the screen scale from `useLayout()` at render time.
 */

export const colors = {
  // Backgrounds
  bgDeep: '#040705',
  bgTable: '#071A10',
  bgPattern: '#0D2A1A',
  bgLobby: '#18213C',
  bgLobbyDeep: '#0E1426',
  panel: 'rgba(14,20,36,0.95)',
  panelGreen: 'rgba(6,40,24,0.92)',
  panelLine: 'rgba(255,255,255,0.08)',

  // Felt
  feltLight: '#168049',
  feltMid: '#0F6038',
  feltDark: '#0A4428',

  // Gold accents
  gold: '#E8C66A',
  goldBright: '#F5DC94',
  goldDeep: '#C9A24A',
  goldShadow: '#A67F2A',
  goldInk: '#241A05',
  goldLine: 'rgba(232,198,106,0.3)',
  timer: '#F5C542',

  // Text
  text: '#F4EEDC',
  textWhite: '#FFFFFF',
  textMuted: '#CFE3D6',
  textMutedGreen: '#9FC2AD',
  textMutedBlue: '#AFC0DD',
  textWarm: '#CFC3A0',

  // Cards
  cardFace: '#FFFFFF',
  cardEdge: '#D9D0BA',
  cardCourt: '#FBF4E2',
  cardCourtLine: '#B8913A',
  suitRed: '#C8102E',
  suitBlack: '#16181D',
  joker: '#5C2A7A',
  cardBack: '#9E1B2D',
  cardBackDeep: '#7A1222',

  // Actions
  danger: '#C8343B',
  dangerDeep: '#8E1F25',
  success: '#2FA36B',
  loss: '#F2A9A9',
} as const;

export const fonts = {
  display: 'Cinzel_800ExtraBold',
  displayBold: 'Cinzel_700Bold',
  ui: 'Manrope_600SemiBold',
  uiMedium: 'Manrope_500Medium',
  uiBold: 'Manrope_700Bold',
  uiHeavy: 'Manrope_800ExtraBold',
  card: 'LibreBaskerville_700Bold',
} as const;

/** Font sizes on the 960×432 reference frame. */
export const fontSize = {
  micro: 9,
  caption: 10,
  small: 11,
  body: 13,
  button: 14,
  title: 18,
  heading: 22,
  hero: 40,
  logo: 54,
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 14, xl: 22, pill: 999 } as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  lifted: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 14,
  },
  panel: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

/** Shared animation timings so every motion feels like the same table. */
export const motion = {
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  card: { damping: 20, stiffness: 260, mass: 0.8 },
  soft: { damping: 22, stiffness: 160 },
  fast: 160,
  base: 260,
  slow: 520,
  dealStagger: 55,
} as const;

export type TableTheme = { id: string; name: string; light: string; mid: string; dark: string };

export const tableThemes: TableTheme[] = [
  { id: 'emerald', name: 'Emerald', light: '#168049', mid: '#0F6038', dark: '#0A4428' },
  { id: 'royal', name: 'Royal blue', light: '#2856B0', mid: '#1C3F8C', dark: '#122A60' },
  { id: 'maroon', name: 'Maroon', light: '#9A2A3C', mid: '#7A1C2C', dark: '#55121E' },
  { id: 'midnight', name: 'Midnight', light: '#2E3646', mid: '#1E2430', dark: '#12161E' },
];

export type CardBackTheme = { id: string; name: string; fill: string; deep: string };

export const cardBackThemes: CardBackTheme[] = [
  { id: 'ruby', name: 'Ruby', fill: '#9E1B2D', deep: '#7A1222' },
  { id: 'emerald', name: 'Emerald', fill: '#11683F', deep: '#0B4A2C' },
  { id: 'navy', name: 'Navy', fill: '#1C2E5C', deep: '#122042' },
];
