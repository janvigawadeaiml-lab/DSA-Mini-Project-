export enum CheckersPlayer {
  NONE = 0,
  RED_PLAYER = 1,   // AI / Red (moves top-to-bottom, row 0 -> 7)
  WHITE_PLAYER = 2, // Human / White (moves bottom-to-top, row 7 -> 0)
}

export enum CheckersPieceType {
  EMPTY = 0,
  RED_PAWN = 1,
  RED_KING = 2,
  WHITE_PAWN = 3,
  WHITE_KING = 4,
}

export enum TTFlag {
  EXACT = 0,
  LOWERBOUND = 1,
  UPPERBOUND = 2,
}

export interface CheckersMove {
  fromSquare: number;
  toSquare: number;
  capturedSquares: number[];
  isJump: boolean;
  notation: string;
}

export interface CheckersTTEntry {
  hashKey: bigint;
  depth: number;
  score: number;
  flag: TTFlag;
  bestMove?: CheckersMove;
}

export interface CheckersBoardState {
  board: number[]; // 32 playable squares (0 to 31)
  redBitboard: bigint;
  whiteBitboard: bigint;
  kingsBitboard: bigint;
}
