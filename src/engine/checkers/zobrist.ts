import { CheckersPieceType, CheckersPlayer } from './types';

/**
 * 64-bit Zobrist Hashing Engine for O(1) Transposition Table Indexing.
 * Uses deterministic pseudo-random 64-bit bitmasks generated with seed 1337.
 */
export class ZobristHash {
  // 32 playable dark squares x 5 piece types (EMPTY=0, RED_PAWN=1, RED_KING=2, WHITE_PAWN=3, WHITE_KING=4)
  public pieceKeys: bigint[][];
  public turnKey: bigint;

  constructor(seed = 1337) {
    this.pieceKeys = [];
    let state = BigInt(seed);

    // 64-bit Xorshift PRNG
    const nextRand64 = (): bigint => {
      state ^= (state << 13n) & 0xFFFFFFFFFFFFFFFFn;
      state ^= (state >> 7n);
      state ^= (state << 17n) & 0xFFFFFFFFFFFFFFFFn;
      return state & 0xFFFFFFFFFFFFFFFFn;
    };

    // Warm up PRNG
    for (let i = 0; i < 20; i++) nextRand64();

    for (let sq = 0; sq < 32; sq++) {
      this.pieceKeys[sq] = [];
      for (let pt = 0; pt < 5; pt++) {
        this.pieceKeys[sq][pt] = nextRand64();
      }
    }

    this.turnKey = nextRand64();
  }

  /**
   * Computes full 64-bit Zobrist hash for a board state
   */
  public computeHash(board: number[], turn: CheckersPlayer): bigint {
    let hash = 0n;
    for (let sq = 0; sq < 32; sq++) {
      const piece = board[sq];
      if (piece !== CheckersPieceType.EMPTY) {
        hash ^= this.pieceKeys[sq][piece];
      }
    }
    if (turn === CheckersPlayer.RED_PLAYER) {
      hash ^= this.turnKey;
    }
    return hash;
  }

  /**
   * Incremental piece toggle (XOR with previous hash)
   */
  public togglePiece(currentHash: bigint, sq: number, pieceType: number): bigint {
    return currentHash ^ this.pieceKeys[sq][pieceType];
  }

  /**
   * Incremental turn toggle (XOR with turnKey)
   */
  public toggleTurn(currentHash: bigint): bigint {
    return currentHash ^ this.turnKey;
  }

  /**
   * Format 64-bit bigint to standard 16-character hex string (e.g. 0xA3F4B198C201E78D)
   */
  public static formatHex(hash: bigint): string {
    const hex = hash.toString(16).toUpperCase().padStart(16, '0');
    return `0x${hex}`;
  }
}
