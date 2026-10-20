import { DecisionTreeNode, EngineMetrics } from '../../types/game';
import { ChessBoard } from './board';
import { ChessEvaluator } from './evaluator';
import { ChessMove } from './types';
import { ChessZobristHash } from './zobrist';

interface ChessTTEntry {
  depth: number;
  score: number;
  flag: 'EXACT' | 'LOWERBOUND' | 'UPPERBOUND';
  bestMove?: ChessMove;
}

export class ChessAI {
  public zobrist: ChessZobristHash;
  public tt: Map<bigint, ChessTTEntry>;
  public hits: number = 0;
  public stores: number = 0;
  private nodesEvaluated: number = 0;
  private prunedBranches: number = 0;
  private maxDepthReached: number = 0;
  private nodeCounter: number = 0;

  constructor() {
    this.zobrist = new ChessZobristHash();
    this.tt = new Map();
  }

  public getBestMove(
    board: ChessBoard,
    depth: number,
    useAlphaBeta: boolean = true,
    useTT: boolean = true,
    maxTreeCaptureDepth: number = 2
  ): {
    bestMove: ChessMove | null;
    score: number;
    metrics: EngineMetrics;
    decisionTree: DecisionTreeNode;
  } {
    this.nodesEvaluated = 0;
    this.prunedBranches = 0;
    this.maxDepthReached = 0;
    this.nodeCounter = 0;
    const initialHits = this.hits;
    const initialStores = this.stores;

    const startTime = performance.now();
    const isMaximizing = board.turn === 'w';

    const legalMoves = board.getLegalMoves();
    if (legalMoves.length === 0) {
      const inCheck = board.isInCheck(board.turn);
      const score = inCheck ? (isMaximizing ? -100000 : 100000) : 0; // Checkmate vs Stalemate
      return {
        bestMove: null,
        score,
        metrics: {
          nodesEvaluated: 0,
          timeMs: 0,
          nodesPerSecond: 0,
          prunedBranches: 0,
          transpositionHits: 0,
          transpositionStores: 0,
          maxDepthReached: 0,
          bestScore: score,
          pvLine: [],
        },
        decisionTree: {
          id: 'root-chess-empty',
          name: inCheck ? 'Checkmate' : 'Stalemate',
          depth: 0,
          player: isMaximizing ? 'MAX' : 'MIN',
          moveNotation: inCheck ? 'Checkmate' : 'Draw',
        },
      };
    }

    // Move ordering: Captures, then checks, then standard moves
    legalMoves.sort((a, b) => {
      const aScore = (a.captured ? 100 : 0) + (a.san.includes('+') ? 50 : 0);
      const bScore = (b.captured ? 100 : 0) + (b.san.includes('+') ? 50 : 0);
      return bScore - aScore;
    });

    let alpha = -1000000;
    let beta = 1000000;
    let bestMove = legalMoves[0];
    let bestValue = isMaximizing ? -1000000 : 1000000;

    const rootNode: DecisionTreeNode = {
      id: 'chess-root',
      name: `Root (${isMaximizing ? 'White AI' : 'Black AI'})`,
      depth: 0,
      player: isMaximizing ? 'MAX' : 'MIN',
      moveNotation: 'Current State',
      children: [],
    };

    for (let i = 0; i < legalMoves.length; i++) {
      const move = legalMoves[i];
      const nextBoard = board.clone();
      nextBoard.makeMove(move);

      const childNode: DecisionTreeNode = {
        id: `chess_root_c${++this.nodeCounter}_d1_m${i}_${move.from}_${move.to}`,
        name: move.san,
        depth: 1,
        player: isMaximizing ? 'MIN' : 'MAX',
        moveNotation: move.san,
        children: [],
      };

      const val = this.minimax(
        nextBoard,
        depth - 1,
        alpha,
        beta,
        !isMaximizing,
        useAlphaBeta,
        useTT,
        1,
        childNode,
        maxTreeCaptureDepth
      );

      childNode.score = val;
      childNode.alpha = alpha;
      childNode.beta = beta;
      rootNode.children?.push(childNode);

      if (isMaximizing) {
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

    rootNode.score = bestValue;
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
    const nps = Math.round(this.nodesEvaluated / (timeMs / 1000));

    return {
      bestMove,
      score: bestValue,
      metrics: {
        nodesEvaluated: this.nodesEvaluated,
        timeMs: parseFloat(timeMs.toFixed(2)),
        nodesPerSecond: nps,
        prunedBranches: this.prunedBranches,
        transpositionHits: this.hits - initialHits,
        transpositionStores: this.stores - initialStores,
        maxDepthReached: this.maxDepthReached,
        bestScore: bestValue,
        pvLine: [bestMove.san],
      },
      decisionTree: rootNode,
    };
  }

  private minimax(
    board: ChessBoard,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    useAlphaBeta: boolean,
    useTT: boolean,
    currentDepth: number,
    treeNode?: DecisionTreeNode,
    maxCaptureDepth: number = 2
  ): number {
    this.nodesEvaluated++;
    this.maxDepthReached = Math.max(this.maxDepthReached, currentDepth);

    const hash = this.zobrist.computeHash(board);

    if (useTT) {
      const entry = this.tt.get(hash);
      if (entry && entry.depth >= depth) {
        this.hits++;
        if (treeNode) treeNode.isTranspositionHit = true;
        if (entry.flag === 'EXACT') return entry.score;
        if (useAlphaBeta) {
          if (entry.flag === 'LOWERBOUND' && entry.score >= beta) return entry.score;
          if (entry.flag === 'UPPERBOUND' && entry.score <= alpha) return entry.score;
        }
      }
    }

    const legalMoves = board.getLegalMoves();

    if (depth === 0 || legalMoves.length === 0) {
      if (legalMoves.length === 0) {
        if (board.isInCheck(board.turn)) {
          return isMaximizing ? -1000000 + currentDepth : 1000000 - currentDepth;
        }
        return 0; // Stalemate
      }
      return ChessEvaluator.evaluate(board);
    }

    // Move ordering
    legalMoves.sort((a, b) => {
      const aScore = (a.captured ? 100 : 0) + (a.san.includes('+') ? 50 : 0);
      const bScore = (b.captured ? 100 : 0) + (b.san.includes('+') ? 50 : 0);
      return bScore - aScore;
    });

    const originalAlpha = alpha;
    let bestVal = isMaximizing ? -1000000 : 1000000;
    let bestMoveInNode: ChessMove | undefined = undefined;
    const canCaptureTree = currentDepth < maxCaptureDepth && treeNode !== undefined;

    if (isMaximizing) {
      for (let i = 0; i < legalMoves.length; i++) {
        const move = legalMoves[i];
        const nextBoard = board.clone();
        nextBoard.makeMove(move);

        let subNode: DecisionTreeNode | undefined = undefined;
        const parentId = treeNode?.id || 'chess-root';
        if (canCaptureTree) {
          subNode = {
            id: `${parentId}_c${++this.nodeCounter}_d${currentDepth + 1}_m${i}_${move.from}_${move.to}`,
            name: move.san,
            depth: currentDepth + 1,
            player: 'MIN',
            moveNotation: move.san,
            children: [],
          };
          treeNode?.children?.push(subNode);
        }

        const val = this.minimax(
          nextBoard,
          depth - 1,
          alpha,
          beta,
          false,
          useAlphaBeta,
          useTT,
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
            this.prunedBranches++;
            if (canCaptureTree && i + 1 < legalMoves.length) {
              for (let p = i + 1; p < legalMoves.length; p++) {
                treeNode?.children?.push({
                  id: `${parentId}_pruned_${++this.nodeCounter}_p${p}`,
                  name: legalMoves[p].san,
                  depth: currentDepth + 1,
                  player: 'MIN',
                  moveNotation: legalMoves[p].san,
                  isPruned: true,
                  prunedReason: `Alpha-Beta Cutoff: β (${beta}) ≤ α (${alpha})`,
                  children: [],
                });
              }
            }
            break;
          }
        }
      }
    } else {
      for (let i = 0; i < legalMoves.length; i++) {
        const move = legalMoves[i];
        const nextBoard = board.clone();
        nextBoard.makeMove(move);

        let subNode: DecisionTreeNode | undefined = undefined;
        const parentId = treeNode?.id || 'chess-root';
        if (canCaptureTree) {
          subNode = {
            id: `${parentId}_c${++this.nodeCounter}_d${currentDepth + 1}_m${i}_${move.from}_${move.to}`,
            name: move.san,
            depth: currentDepth + 1,
            player: 'MAX',
            moveNotation: move.san,
            children: [],
          };
          treeNode?.children?.push(subNode);
        }

        const val = this.minimax(
          nextBoard,
          depth - 1,
          alpha,
          beta,
          true,
          useAlphaBeta,
          useTT,
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
            this.prunedBranches++;
            if (canCaptureTree && i + 1 < legalMoves.length) {
              for (let p = i + 1; p < legalMoves.length; p++) {
                treeNode?.children?.push({
                  id: `${parentId}_pruned_${++this.nodeCounter}_p${p}`,
                  name: legalMoves[p].san,
                  depth: currentDepth + 1,
                  player: 'MAX',
                  moveNotation: legalMoves[p].san,
                  isPruned: true,
                  prunedReason: `Alpha-Beta Cutoff: β (${beta}) ≤ α (${alpha})`,
                  children: [],
                });
              }
            }
            break;
          }
        }
      }
    }

    if (useTT) {
      this.stores++;
      let flag: 'EXACT' | 'LOWERBOUND' | 'UPPERBOUND' = 'EXACT';
      if (useAlphaBeta) {
        if (bestVal <= originalAlpha) flag = 'UPPERBOUND';
        else if (bestVal >= beta) flag = 'LOWERBOUND';
      }
      this.tt.set(hash, { depth, score: bestVal, flag, bestMove: bestMoveInNode });
    }

    return bestVal;
  }
}
