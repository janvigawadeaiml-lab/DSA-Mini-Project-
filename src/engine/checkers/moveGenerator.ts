import { CheckersBoard } from './board';
import { CheckersMove, CheckersPieceType, CheckersPlayer } from './types';

export class MoveGenerator {
  public static getLegalMoves(board: CheckersBoard, player: CheckersPlayer): CheckersMove[] {
    const jumps: CheckersMove[] = [];
    const simpleMoves: CheckersMove[] = [];

    for (let sq = 0; sq < 32; sq++) {
      const p = board.board[sq];
      if (
        (player === CheckersPlayer.RED_PLAYER && (p === CheckersPieceType.RED_PAWN || p === CheckersPieceType.RED_KING)) ||
        (player === CheckersPlayer.WHITE_PLAYER && (p === CheckersPieceType.WHITE_PAWN || p === CheckersPieceType.WHITE_KING))
      ) {
        // Collect jumps for this square
        this.getJumpsForSquare(board, sq, jumps);
        // Only collect simple moves if no jumps have been found yet
        if (jumps.length === 0) {
          this.getSimpleMovesForSquare(board, sq, simpleMoves);
        }
      }
    }

    // In checkers, captures are mandatory
    if (jumps.length > 0) {
      return jumps;
    }

    // If jumps were discovered later in the iteration, filter out simple moves
    return simpleMoves;
  }

  private static getSimpleMovesForSquare(
    board: CheckersBoard,
    sq: number,
    moves: CheckersMove[]
  ): void {
    const p = board.board[sq];
    const [r, c] = CheckersBoard.indexToCoords(sq);

    const directions: [number, number][] = [];
    if (p === CheckersPieceType.RED_PAWN || p === CheckersPieceType.RED_KING || p === CheckersPieceType.WHITE_KING) {
      directions.push([1, -1], [1, 1]); // Forward for Red (downwards)
    }
    if (p === CheckersPieceType.WHITE_PAWN || p === CheckersPieceType.RED_KING || p === CheckersPieceType.WHITE_KING) {
      directions.push([-1, -1], [-1, 1]); // Forward for White (upwards)
    }

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      const destSq = CheckersBoard.coordsToIndex(nr, nc);
      if (destSq !== -1 && board.board[destSq] === CheckersPieceType.EMPTY) {
        moves.push({
          fromSquare: sq,
          toSquare: destSq,
          capturedSquares: [],
          isJump: false,
          notation: `${sq} → ${destSq}`,
        });
      }
    }
  }

  private static getJumpsForSquare(
    board: CheckersBoard,
    sq: number,
    jumps: CheckersMove[]
  ): void {
    const currentMove: CheckersMove = {
      fromSquare: sq,
      toSquare: sq,
      capturedSquares: [],
      isJump: false,
      notation: '',
    };
    const tempBoard = board.clone();
    this.findMultiJumps(tempBoard, sq, currentMove, jumps);
  }

  private static findMultiJumps(
    board: CheckersBoard,
    currentSq: number,
    currentMove: CheckersMove,
    jumps: CheckersMove[]
  ): void {
    const p = board.board[currentSq];
    const [r, c] = CheckersBoard.indexToCoords(currentSq);

    const directions: [number, number][] = [];
    if (p === CheckersPieceType.RED_PAWN || p === CheckersPieceType.RED_KING || p === CheckersPieceType.WHITE_KING) {
      directions.push([1, -1], [1, 1]);
    }
    if (p === CheckersPieceType.WHITE_PAWN || p === CheckersPieceType.RED_KING || p === CheckersPieceType.WHITE_KING) {
      directions.push([-1, -1], [-1, 1]);
    }

    let foundJump = false;

    for (const [dr, dc] of directions) {
      const midR = r + dr;
      const midC = c + dc;
      const destR = r + 2 * dr;
      const destC = c + 2 * dc;

      const midSq = CheckersBoard.coordsToIndex(midR, midC);
      const destSq = CheckersBoard.coordsToIndex(destR, destC);

      if (midSq !== -1 && destSq !== -1 && board.board[destSq] === CheckersPieceType.EMPTY) {
        const midPiece = board.board[midSq];
        let isOpponent = false;

        if (
          (p === CheckersPieceType.RED_PAWN || p === CheckersPieceType.RED_KING) &&
          (midPiece === CheckersPieceType.WHITE_PAWN || midPiece === CheckersPieceType.WHITE_KING)
        ) {
          isOpponent = true;
        }

        if (
          (p === CheckersPieceType.WHITE_PAWN || p === CheckersPieceType.WHITE_KING) &&
          (midPiece === CheckersPieceType.RED_PAWN || midPiece === CheckersPieceType.RED_KING)
        ) {
          isOpponent = true;
        }

        if (isOpponent) {
          foundJump = true;

          // Clone board to explore jump branch
          const nextBoard = board.clone();
          nextBoard.board[currentSq] = CheckersPieceType.EMPTY;
          nextBoard.board[midSq] = CheckersPieceType.EMPTY;

          let nextPiece = p;
          if (p === CheckersPieceType.RED_PAWN && destR === 7) nextPiece = CheckersPieceType.RED_KING;
          if (p === CheckersPieceType.WHITE_PAWN && destR === 0) nextPiece = CheckersPieceType.WHITE_KING;
          nextBoard.board[destSq] = nextPiece;

          const nextMove: CheckersMove = {
            fromSquare: currentMove.fromSquare,
            toSquare: destSq,
            capturedSquares: [...currentMove.capturedSquares, midSq],
            isJump: true,
            notation: '',
          };

          // Recursively search for multi-jumps if not just promoted to King
          if (nextPiece === p) {
            this.findMultiJumps(nextBoard, destSq, nextMove, jumps);
          } else {
            nextMove.notation = `${nextMove.fromSquare} ⤏ ${nextMove.toSquare} [Crown & Cap ${nextMove.capturedSquares.join(',')}]`;
            jumps.push(nextMove);
          }
        }
      }
    }

    if (!foundJump && currentMove.isJump) {
      const caps = currentMove.capturedSquares.join(',');
      currentMove.notation = `${currentMove.fromSquare} ⤏ ${currentMove.toSquare} [Cap ${caps}]`;
      jumps.push(currentMove);
    }
  }
}
