export type Suit = '♠' | '♥' | '♦' | '♣' | '★';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JK';

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export interface Player {
  id: string;
  name: string;
  initials: string;
  color: string;
  chips: number;
  level?: number;
}

export type OpponentStatus = 'waiting' | 'thinking' | 'last-played' | 'dropped';

export interface Opponent extends Player {
  cardCount: number;
  status: OpponentStatus;
  isAI?: boolean;
  lastCard?: Card;
}

export interface GameMode {
  id: string;
  name: string;
  tagline: string;
  players: string;
  entry: number;
  seated: Player[];
}

export interface ResultRow {
  player: Player;
  points: number;
  chips: number;
  isYou?: boolean;
}
