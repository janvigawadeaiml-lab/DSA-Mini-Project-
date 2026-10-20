import { CheckersBoardState, CheckersMove, CheckersPieceType } from './types';

/**
 * 32 playable dark squares indexing:
 * Row 0: .  0 .  1 .  2 .  3
 * Row 1: 4 .  5 .  6 .  7 .
 * Row 2: .  8 .  9 . 10 . 11
 * Row 3: 12 . 13 . 14 . 15 .
 * Row 4: . 16 . 17 . 18 . 19
 * Row 5: 20 . 21 . 22 . 23 .
 * Row 6: . 24 . 25 . 26 . 27
 * Row 7: 28 . 29 . 30 . 31 .
 */

export class CheckersBoard {
  public board: number[]; // 32 squares
  public redBitboard: bigint = 0n;
  public whiteBitboard: bigint = 0n;
  public kingsBitboard: bigint = 0n;

  constructor() {
    this.board = new Array(32).fill(CheckersPieceType.EMPTY);
    this.resetBoard();
  }

  public resetBoard(): void {
    this.board = new Array(32).fill(CheckersPieceType.EMPTY);
    this.redBitboard = 0n;
    this.whiteBitboard = 0n;
    this.kingsBitboard = 0n;

    for (let i = 0; i < 32; i++) {
      if (i < 12) {
        this.board[i] = CheckersPieceType.RED_PAWN; // Red starts at top (0..11)
        this.redBitboard |= (1n << BigInt(i));
      } else if (i >= 20) {
        this.board[i] = CheckersPieceType.WHITE_PAWN; // White starts at bottom (20..31)
        this.whiteBitboard |= (1n << BigInt(i));
      } else {
        this.board[i] = CheckersPieceType.EMPTY;
      }
    }
  }

  public clone(): CheckersBoard {
    const copy = new CheckersBoard();
    copy.board = [...this.board];
    copy.redBitboard = this.redBitboard;
    copy.whiteBitboard = this.whiteBitboard;
    copy.kingsBitboard = this.kingsBitboard;
    return copy;
  }

  public syncBitboards(): void {
    this.redBitboard = 0n;
    this.whiteBitboard = 0n;
    this.kingsBitboard = 0n;

    for (let i = 0; i < 32; i++) {
      const p = this.board[i];
      const bit = 1n << BigInt(i);
      if (p === CheckersPieceType.RED_PAWN) {
        this.redBitboard |= bit;
      } else if (p === CheckersPieceType.RED_KING) {
        this.redBitboard |= bit;
        this.kingsBitboard |= bit;
      } else if (p === CheckersPieceType.WHITE_PAWN) {
        this.whiteBitboard |= bit;
      } else if (p === CheckersPieceType.WHITE_KING) {
        this.whiteBitboard |= bit;
        this.kingsBitboard |= bit;
      }
    }
  }

  /**
   * Convert 32-square index to 8x8 (row, col)
   */
  public static indexToCoords(sq: number): [number, number] {
    const r = Math.floor(sq / 4);
    const c = (sq % 4) * 2 + (r % 2 === 0 ? 1 : 0);
    return [r, c];
  }

  /**
   * Convert (row, col) to 32-square index (-1 if invalid or light square)
   */
  public static coordsToIndex(r: number, c: number): number {
    if (r < 0 || r >= 8 || c < 0 || c >= 8) return -1;
    // Checkers dark squares: (r % 2 == 0 && c % 2 == 1) or (r % 2 == 1 && c % 2 == 0)
    if ((r % 2 === 0 && c % 2 === 0) || (r % 2 !== 0 && c % 2 !== 0)) {
      return -1; // light square
    }
    return r * 4 + Math.floor(c / 2);
  }

  /**
   * Apply move to board
   */
  public makeMove(move: CheckersMove): boolean {
    let piece = this.board[move.fromSquare];
    this.board[move.fromSquare] = CheckersPieceType.EMPTY;

    let promoted = false;
    // King promotion rules:
    // Red pawns promote at row 7 (squares 28 to 31)
    if (piece === CheckersPieceType.RED_PAWN && move.toSquare >= 28) {
      piece = CheckersPieceType.RED_KING;
      promoted = true;
    }
    // White pawns promote at row 0 (squares 0 to 3)
    else if (piece === CheckersPieceType.WHITE_PAWN && move.toSquare <= 3) {
      piece = CheckersPieceType.WHITE_KING;
      promoted = true;
    }

    this.board[move.toSquare] = piece;

    // Remove captured pieces
    for (const cap of move.capturedSquares) {
      this.board[cap] = CheckersPieceType.EMPTY;
    }

    this.syncBitboards();
    return promoted;
  }

  public getState(): CheckersBoardState {
    return {
      board: [...this.board],
      redBitboard: this.redBitboard,
      whiteBitboard: this.whiteBitboard,
      kingsBitboard: this.kingsBitboard,
    };
  }
}
