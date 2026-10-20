import { CheckersBoard } from './board';
import { CheckersPieceType } from './types';

export interface CheckersEvalWeights {
  pawnValue: number;
  kingValue: number;
  advancementFactor: number;
  centerControlBonus: number;
  kingCenterBonus: number;
}

export const DEFAULT_CHECKERS_WEIGHTS: CheckersEvalWeights = {
  pawnValue: 100,
  kingValue: 275,
  advancementFactor: 5,
  centerControlBonus: 10,
  kingCenterBonus: 20,
};

export interface CheckersEvalBreakdown {
  totalScore: number;
  redMaterial: number;
  whiteMaterial: number;
  redAdvancement: number;
  whiteAdvancement: number;
  redCenterControl: number;
  whiteCenterControl: number;
  redKings: number;
  whiteKings: number;
  redPawns: number;
  whitePawns: number;
}

export class CheckersEvaluator {
  public static evaluate(
    board: CheckersBoard,
    weights: CheckersEvalWeights = DEFAULT_CHECKERS_WEIGHTS
  ): number {
    let score = 0;

    for (let sq = 0; sq < 32; sq++) {
      const p = board.board[sq];
      if (p === CheckersPieceType.EMPTY) continue;

      const [r, c] = CheckersBoard.indexToCoords(sq);

      if (p === CheckersPieceType.RED_PAWN) {
        score += weights.pawnValue + (r * weights.advancementFactor); // Reward advancing down
        if (c >= 2 && c <= 5) score += weights.centerControlBonus;     // Center column control
      } else if (p === CheckersPieceType.RED_KING) {
        score += weights.kingValue;
        if (c >= 2 && c <= 5 && r >= 2 && r <= 5) {
          score += weights.kingCenterBonus;
        }
      } else if (p === CheckersPieceType.WHITE_PAWN) {
        score -= weights.pawnValue + ((7 - r) * weights.advancementFactor); // Reward advancing up
        if (c >= 2 && c <= 5) score -= weights.centerControlBonus;
      } else if (p === CheckersPieceType.WHITE_KING) {
        score -= weights.kingValue;
        if (c >= 2 && c <= 5 && r >= 2 && r <= 5) {
          score -= weights.kingCenterBonus;
        }
      }
    }

    return score;
  }

  public static getBreakdown(
    board: CheckersBoard,
    weights: CheckersEvalWeights = DEFAULT_CHECKERS_WEIGHTS
  ): CheckersEvalBreakdown {
    let redMaterial = 0;
    let whiteMaterial = 0;
    let redAdvancement = 0;
    let whiteAdvancement = 0;
    let redCenterControl = 0;
    let whiteCenterControl = 0;
    let redKings = 0;
    let whiteKings = 0;
    let redPawns = 0;
    let whitePawns = 0;

    for (let sq = 0; sq < 32; sq++) {
      const p = board.board[sq];
      if (p === CheckersPieceType.EMPTY) continue;

      const [r, c] = CheckersBoard.indexToCoords(sq);

      if (p === CheckersPieceType.RED_PAWN) {
        redPawns++;
        redMaterial += weights.pawnValue;
        redAdvancement += r * weights.advancementFactor;
        if (c >= 2 && c <= 5) redCenterControl += weights.centerControlBonus;
      } else if (p === CheckersPieceType.RED_KING) {
        redKings++;
        redMaterial += weights.kingValue;
        if (c >= 2 && c <= 5 && r >= 2 && r <= 5) redCenterControl += weights.kingCenterBonus;
      } else if (p === CheckersPieceType.WHITE_PAWN) {
        whitePawns++;
        whiteMaterial += weights.pawnValue;
        whiteAdvancement += (7 - r) * weights.advancementFactor;
        if (c >= 2 && c <= 5) whiteCenterControl += weights.centerControlBonus;
      } else if (p === CheckersPieceType.WHITE_KING) {
        whiteKings++;
        whiteMaterial += weights.kingValue;
        if (c >= 2 && c <= 5 && r >= 2 && r <= 5) whiteCenterControl += weights.kingCenterBonus;
      }
    }

    const totalScore = (redMaterial + redAdvancement + redCenterControl) -
                       (whiteMaterial + whiteAdvancement + whiteCenterControl);

    return {
      totalScore,
      redMaterial,
      whiteMaterial,
      redAdvancement,
      whiteAdvancement,
      redCenterControl,
      whiteCenterControl,
      redKings,
      whiteKings,
      redPawns,
      whitePawns,
    };
  }
}
