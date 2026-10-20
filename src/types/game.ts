export type GameType = 'checkers' | 'chess';

export type GameMode = 'human-vs-ai' | 'ai-vs-ai' | 'human-vs-human' | 'analysis';

export type AIDifficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface EngineMetrics {
  nodesEvaluated: number;
  timeMs: number;
  nodesPerSecond: number;
  prunedBranches: number;
  transpositionHits: number;
  transpositionStores: number;
  maxDepthReached: number;
  bestScore: number;
  pvLine: string[];
}

export interface DecisionTreeNode {
  id: string;
  name: string;
  depth: number;
  player: 'MAX' | 'MIN';
  score?: number;
  alpha?: number;
  beta?: number;
  moveNotation: string;
  isPruned?: boolean;
  prunedReason?: string;
  isTranspositionHit?: boolean;
  isBestMove?: boolean;
  boardStatePreview?: string;
  children?: DecisionTreeNode[];
}
