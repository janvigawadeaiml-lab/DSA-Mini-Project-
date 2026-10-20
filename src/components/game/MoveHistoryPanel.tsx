import React from 'react';
import { EngineMetrics } from '../../types/game';
import { Activity, RotateCcw, Play, Zap, Scissors, Award, Clock } from 'lucide-react';

interface MoveHistoryPanelProps {
  moves: string[];
  metrics: EngineMetrics | null;
  evalScore: number;
  onUndo: () => void;
  canUndo: boolean;
  gameStatus: string;
}

export const MoveHistoryPanel: React.FC<MoveHistoryPanelProps> = ({
  moves,
  metrics,
  evalScore,
  onUndo,
  canUndo,
  gameStatus,
}) => {
  // Normalize evalScore to percentage for the evaluation bar (-1000..+1000)
  // Positive favors Red (AI), Negative favors White (Human)
  const clampedScore = Math.max(-1500, Math.min(1500, evalScore));
  const redPercentage = Math.round(((clampedScore + 1500) / 3000) * 100);

  return (
    <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4">
      {/* Live Engine Eval Meter Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className="text-red-400 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Red AI {evalScore > 0 ? `+${evalScore}` : ''}
          </span>
          <span className="text-slate-400 font-medium">Evaluation Advantage</span>
          <span className="text-slate-200 font-semibold flex items-center gap-1">
            White {evalScore < 0 ? `${evalScore}` : ''} <span className="w-2 h-2 rounded-full bg-slate-200" />
          </span>
        </div>

        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/60 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
            style={{ width: `${redPercentage}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-slate-300 to-white transition-all duration-300"
            style={{ width: `${100 - redPercentage}%` }}
          />
        </div>
      </div>

      {/* Engine Metrics Strip */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" /> Evaluated
            </span>
            <span className="font-bold text-slate-200 text-sm">
              {metrics.nodesEvaluated.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Search Time
            </span>
            <span className="font-bold text-slate-200 text-sm">
              {metrics.timeMs} ms
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block flex items-center gap-1">
              <Scissors className="w-3 h-3 text-red-400" /> Pruned (α-β)
            </span>
            <span className="font-bold text-amber-300 text-sm">
              {metrics.prunedBranches}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" /> Speed (NPS)
            </span>
            <span className="font-bold text-emerald-400 text-sm">
              {metrics.nodesPerSecond.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Game Status Banner */}
      {gameStatus && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300 flex items-center justify-between">
          <span>{gameStatus}</span>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Undo Move
          </button>
        </div>
      )}

      {/* Move History List */}
      <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/40 p-2 font-mono text-xs">
        {moves.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Array.from({ length: Math.ceil(moves.length / 2) }, (_, turnIdx) => {
              const move1 = moves[turnIdx * 2];
              const move2 = moves[turnIdx * 2 + 1];

              return (
                <React.Fragment key={`turn-${turnIdx}`}>
                  <div className="flex items-center justify-between py-0.5 px-2 rounded hover:bg-slate-800/50">
                    <span className="text-slate-500 w-6">{turnIdx + 1}.</span>
                    <span className="text-red-300 truncate font-semibold">{move1}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 px-2 rounded hover:bg-slate-800/50">
                    <span className="text-slate-200 truncate font-semibold">{move2 || '...'}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            No moves played yet.
          </div>
        )}
      </div>
    </div>
  );
};
