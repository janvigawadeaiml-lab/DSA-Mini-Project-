import { ChessBoard } from './board';
import { ChessPieceSymbol } from './types';

export class ChessZobristHash {
  // 64 squares x 12 piece types (wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK)
  public pieceKeys: bigint[][];
  public turnKey: bigint;
  public castlingKeys: bigint[];
  public epKeys: bigint[];

  constructor(seed = 424242) {
    this.pieceKeys = [];
    this.castlingKeys = [];
    this.epKeys = [];
    let state = BigInt(seed);

    const nextRand64 = (): bigint => {
      state ^= (state << 13n) & 0xFFFFFFFFFFFFFFFFn;
      state ^= (state >> 7n);
      state ^= (state << 17n) & 0xFFFFFFFFFFFFFFFFn;
      return state & 0xFFFFFFFFFFFFFFFFn;
    };

    for (let i = 0; i < 20; i++) nextRand64();

    for (let sq = 0; sq < 64; sq++) {
      this.pieceKeys[sq] = [];
      for (let pt = 0; pt < 12; pt++) {
        this.pieceKeys[sq][pt] = nextRand64();
      }
    }

    this.turnKey = nextRand64();

    for (let i = 0; i < 16; i++) {
      this.castlingKeys[i] = nextRand64();
    }

    for (let i = 0; i < 8; i++) {
      this.epKeys[i] = nextRand64();
    }
  }

  private pieceToIndex(type: ChessPieceSymbol, color: 'w' | 'b'): number {
    const symbols: ChessPieceSymbol[] = ['p', 'n', 'b', 'r', 'q', 'k'];
    const idx = symbols.indexOf(type);
    return color === 'w' ? idx : idx + 6;
  }

  public computeHash(board: ChessBoard): bigint {
    let hash = 0n;

    for (let sq = 0; sq < 64; sq++) {
      const piece = board.board[sq];
      if (piece) {
        const ptIdx = this.pieceToIndex(piece.type, piece.color);
        hash ^= this.pieceKeys[sq][ptIdx];
      }
    }

    if (board.turn === 'w') {
      hash ^= this.turnKey;
    }

    let castleMask = 0;
    if (board.castlingRights.wK) castleMask |= 1;
    if (board.castlingRights.wQ) castleMask |= 2;
    if (board.castlingRights.bK) castleMask |= 4;
    if (board.castlingRights.bQ) castleMask |= 8;
    hash ^= this.castlingKeys[castleMask];

    if (board.enPassantSquare !== null) {
      const file = board.enPassantSquare % 8;
      hash ^= this.epKeys[file];
    }

    return hash;
  }

  public static formatHex(hash: bigint): string {
    return `0x${hash.toString(16).toUpperCase().padStart(16, '0')}`;
  }
}
