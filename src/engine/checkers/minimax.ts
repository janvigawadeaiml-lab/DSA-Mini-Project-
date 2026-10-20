import { DecisionTreeNode, EngineMetrics } from '../../types/game';
import { CheckersBoard } from './board';
import { CheckersEvalWeights, CheckersEvaluator, DEFAULT_CHECKERS_WEIGHTS } from './evaluator';
import { MoveGenerator } from './moveGenerator';
import { TranspositionTable } from './transpositionTable';
import { CheckersMove, CheckersPlayer, TTFlag } from './types';
import { ZobristHash } from './zobrist';

export interface MinimaxOptions {
  depth: number;
  useAlphaBeta: boolean;
  useTranspositionTable: boolean;
  weights?: CheckersEvalWeights;
  maxTreeCaptureDepth?: number; // UI visualization limit to prevent DOM blowout
}

export interface MinimaxResult {
  bestMove: CheckersMove | null;
  score: number;
  metrics: EngineMetrics;
  decisionTree: DecisionTreeNode;
}

export class CheckersAI {
  public zobrist: ZobristHash;
  public tt: TranspositionTable;
  private nodesEvaluated: number = 0;
  private prunedBranches: number = 0;
  private maxDepthReached: number = 0;
  private nodeCounter: number = 0;

  constructor() {
    this.zobrist = new ZobristHash();
    this.tt = new TranspositionTable();
  }

  public getBestMove(board: CheckersBoard, player: CheckersPlayer, options: MinimaxOptions): MinimaxResult {
    const {
      depth,
      useAlphaBeta = true,
      useTranspositionTable = true,
      weights = DEFAULT_CHECKERS_WEIGHTS,
      maxTreeCaptureDepth = 3,
    } = options;

    this.nodesEvaluated = 0;
    this.prunedBranches = 0;
    this.maxDepthReached = 0;
    this.nodeCounter = 0;
    const initialTTHits = this.tt.hits;
    const initialTTStores = this.tt.stores;

    const startTime = performance.now();

    const legalMoves = MoveGenerator.getLegalMoves(board, player);
    if (legalMoves.length === 0) {
      return {
        bestMove: null,
        score: player === CheckersPlayer.RED_PLAYER ? -90000 : 90000,
        metrics: {
          nodesEvaluated: 0,
          timeMs: 0,
          nodesPerSecond: 0,
          prunedBranches: 0,
          transpositionHits: 0,
          transpositionStores: 0,
          maxDepthReached: 0,
          bestScore: 0,
          pvLine: [],
        },
        decisionTree: {
          id: 'root-empty',
          name: 'No Legal Moves',
          depth: 0,
          player: player === CheckersPlayer.RED_PLAYER ? 'MAX' : 'MIN',
          moveNotation: 'None',
        },
      };
    }

    // Move ordering: jumps/captures first
    legalMoves.sort((a, b) => (b.isJump ? 1 : 0) - (a.isJump ? 1 : 0));

    let alpha = -100000;
    let beta = 100000;
    let bestMove: CheckersMove = legalMoves[0];
    let bestValue = player === CheckersPlayer.RED_PLAYER ? -100000 : 100000;

    const rootNode: DecisionTreeNode = {
      id: 'root',
      name: `Root (${player === CheckersPlayer.RED_PLAYER ? 'Red AI' : 'White'})`,
      depth: 0,
      player: player === CheckersPlayer.RED_PLAYER ? 'MAX' : 'MIN',
      moveNotation: 'Current State',
      children: [],
    };

    for (let i = 0; i < legalMoves.length; i++) {
      const move = legalMoves[i];
      const nextBoard = board.clone();
      nextBoard.makeMove(move);

      const nextPlayer = player === CheckersPlayer.RED_PLAYER ? CheckersPlayer.WHITE_PLAYER : CheckersPlayer.RED_PLAYER;
      
      const childTreeNode: DecisionTreeNode = {
        id: `root_c${++this.nodeCounter}_d1_m${i}_${move.fromSquare}_${move.toSquare}`,
        name: move.notation,
        depth: 1,
        player: nextPlayer === CheckersPlayer.RED_PLAYER ? 'MAX' : 'MIN',
        moveNotation: move.notation,
        children: [],
      };

      const val = this.minimax(
        nextBoard,
        depth - 1,
        alpha,
        beta,
        nextPlayer,
        useAlphaBeta,
        useTranspositionTable,
        weights,
        1,
        childTreeNode,
        maxTreeCaptureDepth
      );

      childTreeNode.score = val;
      childTreeNode.alpha = alpha;
      childTreeNode.beta = beta;
      rootNode.children?.push(childTreeNode);

      if (player === CheckersPlayer.RED_PLAYER) {
        if (val > bestValue) {
          bestValue = val;
          bestMove = move;
        }
        if (useAlphaBeta) {
          alpha = Math.max(alpha, bestValue);
        }
      } else {
        if (val < bestValue) {
          bestValue = val;
          bestMove = move;
        }
        if (useAlphaBeta) {
          beta = Math.min(beta, bestValue);
        }
      }
    }

    // Mark best branch in tree
    rootNode.score = bestValue;
    rootNode.alpha = alpha;
    rootNode.beta = beta;
    if (rootNode.children) {
      for (const child of rootNode.children) {
        if (child.score === bestValue) {
          child.isBestMove = true;
          break;
        }
      }
    }

    const endTime = performance.now();
    const timeMs = Math.max(0.1, endTime - startTime);
    const nps = Math.round((this.nodesEvaluated / (timeMs / 1000)));

    const metrics: EngineMetrics = {
      nodesEvaluated: this.nodesEvaluated,
      timeMs: parseFloat(timeMs.toFixed(2)),
      nodesPerSecond: nps,
      prunedBranches: this.prunedBranches,
      transpositionHits: this.tt.hits - initialTTHits,
      transpositionStores: this.tt.stores - initialTTStores,
      maxDepthReached: this.maxDepthReached,
      bestScore: bestValue,
      pvLine: [bestMove.notation],
    };

    return {
      bestMove,
      score: bestValue,
      metrics,
      decisionTree: rootNode,
    };
  }

  private minimax(
    board: CheckersBoard,
    depth: number,
    alpha: number,
    beta: number,
    player: CheckersPlayer,
    useAlphaBeta: boolean,
    useTranspositionTable: boolean,
    weights: CheckersEvalWeights,
    currentDepth: number,
    treeNode?: DecisionTreeNode,
    maxCaptureDepth: number = 3
  ): number {
    this.nodesEvaluated++;
    this.maxDepthReached = Math.max(this.maxDepthReached, currentDepth);

    const hash = this.zobrist.computeHash(board.board, player);

    // Transposition Table Lookup
    if (useTranspositionTable) {
      const entry = this.tt.get(hash);
      if (entry && entry.depth >= depth) {
        if (treeNode) {
          treeNode.isTranspositionHit = true;
        }
        if (entry.flag === TTFlag.EXACT) return entry.score;
        if (useAlphaBeta) {
          if (entry.flag === TTFlag.LOWERBOUND && entry.score >= beta) return entry.score;
          if (entry.flag === TTFlag.UPPERBOUND && entry.score <= alpha) return entry.score;
        }
      }
    }

    const legalMoves = MoveGenerator.getLegalMoves(board, player);

    // Terminal or depth limit reached
    if (depth === 0 || legalMoves.length === 0) {
      let evalScore = CheckersEvaluator.evaluate(board, weights);
      if (legalMoves.length === 0) {
        // Loss if no moves available
        evalScore = player === CheckersPlayer.RED_PLAYER ? -90000 + currentDepth : 90000 - currentDepth;
      }
      return evalScore;
    }

    // Move ordering: jumps/captures first
    legalMoves.sort((a, b) => (b.isJump ? 1 : 0) - (a.isJump ? 1 : 0));

    const originalAlpha = alpha;
    let bestVal = player === CheckersPlayer.RED_PLAYER ? -100000 : 100000;
    let bestMoveInNode: CheckersMove | undefined = undefined;

    const canCaptureTree = currentDepth < maxCaptureDepth && treeNode !== undefined;

    if (player === CheckersPlayer.RED_PLAYER) {
      // Maximizer (Red AI)
      for (let i = 0; i < legalMoves.length; i++) {
        const move = legalMoves[i];
        const nextBoard = board.clone();
        nextBoard.makeMove(move);

        let subNode: DecisionTreeNode | undefined = undefined;
        const parentId = treeNode?.id || 'root';
        if (canCaptureTree) {
          subNode = {
            id: `${parentId}_c${++this.nodeCounter}_d${currentDepth + 1}_m${i}_${move.fromSquare}_${move.toSquare}`,
            name: move.notation,
            depth: currentDepth + 1,
            player: 'MIN',
            moveNotation: move.notation,
            children: [],
          };
          treeNode?.children?.push(subNode);
        }

        const val = this.minimax(
          nextBoard,
          depth - 1,
          alpha,
          beta,
          CheckersPlayer.WHITE_PLAYER,
          useAlphaBeta,
          useTranspositionTable,
          weights,
          currentDepth + 1,
          subNode,
          maxCaptureDepth
        );

        if (subNode) {
          subNode.score = val;
          subNode.alpha = alpha;
          subNode.beta = beta;
        }

        if (val > bestVal) {
          bestVal = val;
          bestMoveInNode = move;
        }

        if (useAlphaBeta) {
          alpha = Math.max(alpha, bestVal);
          if (beta <= alpha) {
            // Beta cutoff: Minimizer already has a better or equal alternative earlier
            this.prunedBranches++;
            if (canCaptureTree && i + 1 < legalMoves.length) {
              // Note remaining branches as pruned
              for (let p = i + 1; p < legalMoves.length; p++) {
                const prunedMove = legalMoves[p];
                treeNode?.children?.push({
                  id: `${parentId}_pruned_${++this.nodeCounter}_p${p}`,
                  name: prunedMove.notation,
                  depth: currentDepth + 1,
                  player: 'MIN',
                  moveNotation: prunedMove.notation,
                  isPruned: true,
                  prunedReason: `Cutoff: β (${beta}) ≤ α (${alpha}). Maximizer already has guaranteed ${bestVal}`,
                  children: [],
                });
              }
            }
            break;
          }
        }
      }
    } else {
      // Minimizer (White Player)
      for (let i = 0; i < legalMoves.length; i++) {
        const move = legalMoves[i];
        const nextBoard = board.clone();
        nextBoard.makeMove(move);

        let subNode: DecisionTreeNode | undefined = undefined;
        const parentId = treeNode?.id || 'root';
        if (canCaptureTree) {
          subNode = {
            id: `${parentId}_c${++this.nodeCounter}_d${currentDepth + 1}_m${i}_${move.fromSquare}_${move.toSquare}`,
            name: move.notation,
            depth: currentDepth + 1,
            player: 'MAX',
            moveNotation: move.notation,
            children: [],
          };
          treeNode?.children?.push(subNode);
        }

        const val = this.minimax(
          nextBoard,
          depth - 1,
          alpha,
          beta,
          CheckersPlayer.RED_PLAYER,
          useAlphaBeta,
          useTranspositionTable,
          weights,
          currentDepth + 1,
          subNode,
          maxCaptureDepth
        );

        if (subNode) {
          subNode.score = val;
          subNode.alpha = alpha;
          subNode.beta = beta;
        }

        if (val < bestVal) {
          bestVal = val;
          bestMoveInNode = move;
        }

        if (useAlphaBeta) {
          beta = Math.min(beta, bestVal);
          if (beta <= alpha) {
            // Alpha cutoff: Maximizer already has a better alternative earlier
            this.prunedBranches++;
            if (canCaptureTree && i + 1 < legalMoves.length) {
              for (let p = i + 1; p < legalMoves.length; p++) {
                const prunedMove = legalMoves[p];
                treeNode?.children?.push({
                  id: `${parentId}_pruned_${++this.nodeCounter}_p${p}`,
                  name: prunedMove.notation,
                  depth: currentDepth + 1,
                  player: 'MAX',
                  moveNotation: prunedMove.notation,
                  isPruned: true,
                  prunedReason: `Cutoff: β (${beta}) ≤ α (${alpha}). Minimizer already has guaranteed ${bestVal}`,
                  children: [],
                });
              }
            }
            break;
          }
        }
      }
    }

    // Save in Transposition Table
    if (useTranspositionTable) {
      let flag = TTFlag.EXACT;
      if (useAlphaBeta) {
        if (bestVal <= originalAlpha) flag = TTFlag.UPPERBOUND;
        else if (bestVal >= beta) flag = TTFlag.LOWERBOUND;
      }
      this.tt.set(hash, depth, bestVal, flag, bestMoveInNode);
    }

    return bestVal;
  }
}
