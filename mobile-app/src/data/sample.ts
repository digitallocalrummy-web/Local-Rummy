import type { Card, GameMode, Opponent, Player, Rank, ResultRow, Suit } from '../types';

let uid = 0;
export const makeCard = (rank: Rank, suit: Suit): Card => ({ id: `c${uid++}`, rank, suit });

export const me: Player = {
  id: 'me',
  name: 'Rohan',
  initials: 'RV',
  color: '#1F6B4A',
  chips: 12450,
  level: 18,
};

export const opponents: Opponent[] = [
  { id: 'arjun', name: 'Arjun', initials: 'AR', color: '#8C3B2E', chips: 9800, cardCount: 13, status: 'waiting', isAI: true },
  { id: 'meera', name: 'Meera', initials: 'ME', color: '#3B5E8C', chips: 15200, cardCount: 13, status: 'thinking' },
  { id: 'kabir', name: 'Kabir', initials: 'KB', color: '#5C3B7A', chips: 7400, cardCount: 13, status: 'last-played', lastCard: makeCard('5', '♣') },
];

export const startingHand = (): Card[] => [
  makeCard('A', '♠'), makeCard('K', '♦'), makeCard('7', '♥'), makeCard('J', '♣'),
  makeCard('9', '♠'), makeCard('Q', '♥'), makeCard('4', '♦'), makeCard('10', '♣'),
  makeCard('5', '♠'), makeCard('8', '♥'), makeCard('2', '♦'), makeCard('6', '♣'),
  makeCard('JK', '★'),
];

/** Cards handed out by the closed deck, in order. Static demo data only. */
export const drawPool: [Rank, Suit][] = [
  ['3', '♠'], ['Q', '♦'], ['8', '♣'], ['A', '♥'], ['6', '♦'], ['10', '♠'], ['2', '♥'], ['K', '♣'],
];

export const startingDiscards = (): Card[] => [
  makeCard('9', '♦'), makeCard('2', '♣'), makeCard('K', '♠'), makeCard('6', '♥'),
];

export const wildJoker: Card = makeCard('7', '♦');

export const gameModes: GameMode[] = [
  {
    id: 'points', name: 'POINTS', tagline: 'One deal, fastest finish wins', players: '2–6', entry: 200,
    seated: [opponents[0], opponents[1], opponents[2]],
  },
  {
    id: 'pool', name: 'POOL 101', tagline: 'Stay under 101 to survive', players: '2–6', entry: 500,
    seated: [
      { id: 'sn', name: 'Sana', initials: 'SN', color: '#2E6E8C', chips: 0 },
      { id: 'dv', name: 'Dev', initials: 'DV', color: '#8C6A2E', chips: 0 },
      { id: 'pr', name: 'Priya', initials: 'PR', color: '#7A3B5C', chips: 0 },
    ],
  },
  {
    id: 'deals', name: 'DEALS', tagline: 'Fixed deals, most chips wins', players: '2', entry: 100,
    seated: [
      { id: 'tj', name: 'Tejas', initials: 'TJ', color: '#4A7A3B', chips: 0 },
      { id: 'an', name: 'Ananya', initials: 'AN', color: '#8C2E4A', chips: 0 },
      { id: 'vk', name: 'Vikram', initials: 'VK', color: '#3B4A8C', chips: 0 },
    ],
  },
];

export const resultRows: ResultRow[] = [
  { player: me, points: 0, chips: 1240, isYou: true },
  { player: opponents[2], points: 22, chips: -440 },
  { player: opponents[1], points: 31, chips: -620 },
  { player: opponents[0], points: 9, chips: -180 },
];

export const resultStats = [
  { label: 'Duration', value: '06:42' },
  { label: 'Turns played', value: '14' },
  { label: 'Win streak', value: '3' },
];

export const howToPlay = [
  'Each player gets 13 cards. Arrange them into valid sets and sequences.',
  'On your turn, draw one card from the closed deck or the open pile.',
  'Then discard one card onto the open pile to end your turn.',
  'You need at least two sequences, and one must be a pure sequence (no joker).',
  'The card under the deck is the wild joker. Any card of that rank is wild too.',
  'When your hand is complete, discard your last card and tap Declare.',
];
