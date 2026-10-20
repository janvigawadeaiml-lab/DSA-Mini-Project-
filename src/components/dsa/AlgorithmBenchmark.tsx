import React, { useState } from 'react';
import { CheckersBoard } from '../../engine/checkers/board';
import { CheckersAI } from '../../engine/checkers/minimax';
import { CheckersPlayer } from '../../engine/checkers/types';
import { Play, TrendingUp, Zap, Scissors, RefreshCw, BarChart2 } from 'lucide-react';

interface AlgorithmBenchmarkProps {
  board: CheckersBoard;
  currentTurn: CheckersPlayer;
}

interface BenchmarkResult {
  name: string;
  nodes: number;
  timeMs: number;
  nps: number;
  prunedBranches: number;
  ttHits: number;
  bestMove: string;
  score: number;
  speedup: number;
}

export const AlgorithmBenchmark: React.FC<AlgorithmBenchmarkProps> = ({
  board,
  currentTurn,
}) => {
  const [depth, setDepth] = useState<number>(5);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<BenchmarkResult[] | null>(null);

  const runBenchmark = () => {
    setIsRunning(true);
    // Allow UI to update
    setTimeout(() => {
      try {
        const testBoard = board.clone();

        // 1. Pure Minimax
        const aiPure = new CheckersAI();
        const resPure = aiPure.getBestMove(testBoard, currentTurn, {
          depth,
          useAlphaBeta: false,
          useTranspositionTable: false,
          maxTreeCaptureDepth: 1,
        });

        // 2. Minimax + Alpha-Beta Pruning
        const aiAlphaBeta = new CheckersAI();
        const resAB = aiAlphaBeta.getBestMove(testBoard, currentTurn, {
          depth,
          useAlphaBeta: true,
          useTranspositionTable: false,
          maxTreeCaptureDepth: 1,
        });

        // 3. Minimax + Alpha-Beta + Zobrist Transposition Table
        const aiFull = new CheckersAI();
        const resFull = aiFull.getBestMove(testBoard, currentTurn, {
          depth,
          useAlphaBeta: true,
          useTranspositionTable: true,
          maxTreeCaptureDepth: 1,
        });

        const baselineTime = Math.max(0.1, resPure.metrics.timeMs);
        const baselineNodes = Math.max(1, resPure.metrics.nodesEvaluated);

        const benchmarkData: BenchmarkResult[] = [
          {
            name: '1. Pure Minimax (Brute Force Tree)',
            nodes: resPure.metrics.nodesEvaluated,
            timeMs: resPure.metrics.timeMs,
            nps: resPure.metrics.nodesPerSecond,
            prunedBranches: 0,
            ttHits: 0,
            bestMove: resPure.bestMove?.notation || 'None',
            score: resPure.score,
            speedup: 1.0,
          },
          {
            name: '2. Minimax + Alpha-Beta Pruning',
            nodes: resAB.metrics.nodesEvaluated,
            timeMs: resAB.metrics.timeMs,
            nps: resAB.metrics.nodesPerSecond,
            prunedBranches: resAB.metrics.prunedBranches,
            ttHits: 0,
            bestMove: resAB.bestMove?.notation || 'None',
            score: resAB.score,
            speedup: parseFloat((baselineNodes / Math.max(1, resAB.metrics.nodesEvaluated)).toFixed(1)),
          },
          {
            name: '3. Full DSA Engine (Minimax + α-β + Zobrist TT)',
            nodes: resFull.metrics.nodesEvaluated,
            timeMs: resFull.metrics.timeMs,
            nps: resFull.metrics.nodesPerSecond,
            prunedBranches: resFull.metrics.prunedBranches,
            ttHits: resFull.metrics.transpositionHits,
            bestMove: resFull.bestMove?.notation || 'None',
            score: resFull.score,
            speedup: parseFloat((baselineNodes / Math.max(1, resFull.metrics.nodesEvaluated)).toFixed(1)),
          },
        ];

        setResults(benchmarkData);
      } catch (err) {
        console.error('Benchmark failed:', err);
      } finally {
        setIsRunning(false);
      }
    }, 50);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Empirical DSA Benchmark Suite
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                O(b^d) vs O(b^(d/2))
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Measure search space reduction and performance gains from Alpha-Beta & Zobrist TT
            </p>
          </div>
        </div>

        {/* Benchmark Run Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Benchmark Depth:</span>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              disabled={isRunning}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value={3}>Depth 3 (Instant)</option>
              <option value={4}>Depth 4 (Fast)</option>
              <option value={5}>Depth 5 (Standard)</option>
              <option value={6}>Depth 6 (Intensive)</option>
            </select>
          </div>

          <button
            onClick={runBenchmark}
            disabled={isRunning}
            className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shadow-lg ${
              isRunning
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 hover:scale-105 active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Running Benchmark...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Benchmark
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Comparison Table & Cards */}
      {results ? (
        <div className="flex-1 flex flex-col gap-4 mt-4 overflow-auto">
          {/* Summary Highlight */}
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-200">
                Full DSA Engine evaluated <strong className="text-white">{results[2].nodes.toLocaleString()}</strong> nodes vs{' '}
                <strong className="text-white">{results[0].nodes.toLocaleString()}</strong> in Pure Minimax.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-sm border border-emerald-500/40">
              {results[2].speedup}x Search Efficiency!
            </span>
          </div>

          {/* Cards for each algorithm */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {results.map((res, idx) => (
              <div
                key={`bench-${idx}`}
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  idx === 2
                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : idx === 1
                    ? 'bg-cyan-950/20 border-cyan-500/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div>
                  <h4 className="font-semibold text-xs text-slate-200 mb-3 flex items-center gap-1.5">
                    {idx === 2 && <Zap className="w-3.5 h-3.5 text-emerald-400" />}
                    {idx === 1 && <Scissors className="w-3.5 h-3.5 text-cyan-400" />}
                    {res.name}
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Nodes Evaluated:</span>
                      <span className="font-mono font-bold text-slate-100">
                        {res.nodes.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Search Time:</span>
                      <span className="font-mono font-bold text-slate-100">
                        {res.timeMs} ms
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Nodes / Sec (NPS):</span>
                      <span className="font-mono text-slate-300">
                        {res.nps.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Pruned Branches:</span>
                      <span className="font-mono text-amber-300">
                        {res.prunedBranches}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Transposition Hits:</span>
                      <span className="font-mono text-cyan-300">
                        {res.ttHits}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400">Chosen Move:</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {res.bestMove} (score: {res.score})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Relative Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Search Space Load</span>
                    <span className="font-mono">
                      {Math.max(1, Math.round((res.nodes / Math.max(1, results[0].nodes)) * 100))}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 2 ? 'bg-emerald-400' : idx === 1 ? 'bg-cyan-400' : 'bg-red-400'
                      }`}
                      style={{
                        width: `${Math.max(5, (res.nodes / Math.max(1, results[0].nodes)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Theoretical Comparison Notes */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400">
            <span className="font-semibold text-slate-200 block mb-1">Algorithmic Complexity Proof:</span>
            <span>
              Pure Minimax has a time complexity of <code className="font-mono text-red-300">O(b^d)</code> where <i>b</i> is branching factor (~4 in checkers) and <i>d</i> is depth. 
              With Alpha-Beta pruning, complexity drops to <code className="font-mono text-emerald-300">O(b^(d/2))</code> under optimal move ordering, allowing the engine to search twice as deep in the same amount of time!
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 py-12">
          <BarChart2 className="w-10 h-10 opacity-40 animate-pulse text-emerald-400" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-300">No Benchmark Data Yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Click &quot;Run Benchmark&quot; to test the current board state simultaneously across Pure Minimax, Alpha-Beta Pruning, and the Zobrist Transposition Table.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
