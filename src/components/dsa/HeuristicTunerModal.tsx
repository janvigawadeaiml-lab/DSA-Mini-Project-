import React from 'react';
import { CheckersEvalWeights, DEFAULT_CHECKERS_WEIGHTS } from '../../engine/checkers/evaluator';
import { Sliders, RotateCcw, Shield, Award, Compass, Zap } from 'lucide-react';

interface HeuristicTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
  weights: CheckersEvalWeights;
  onChangeWeights: (newWeights: CheckersEvalWeights) => void;
}

export const HeuristicTunerModal: React.FC<HeuristicTunerModalProps> = ({
  isOpen,
  onClose,
  weights,
  onChangeWeights,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onChangeWeights({ ...DEFAULT_CHECKERS_WEIGHTS });
  };

  const updateWeight = (key: keyof CheckersEvalWeights, val: number) => {
    onChangeWeights({
      ...weights,
      [key]: val,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Evaluation Heuristics Tuner
              </h3>
              <p className="text-xs text-slate-400">
                Customize Minimax leaf node evaluation parameters
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Sliders List */}
        <div className="space-y-4 my-6">
          {/* Pawn Value */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                Pawn Base Value
              </span>
              <span className="font-mono font-bold text-amber-400">{weights.pawnValue} pts</span>
            </div>
            <input
              type="range"
              min={50}
              max={250}
              step={10}
              value={weights.pawnValue}
              onChange={(e) => updateWeight('pawnValue', Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* King Value */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                King Base Value
              </span>
              <span className="font-mono font-bold text-amber-400">{weights.kingValue} pts</span>
            </div>
            <input
              type="range"
              min={150}
              max={500}
              step={25}
              value={weights.kingValue}
              onChange={(e) => updateWeight('kingValue', Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Advancement Factor */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Advancement Bonus (per row)
              </span>
              <span className="font-mono font-bold text-amber-400">+{weights.advancementFactor} pts/row</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={weights.advancementFactor}
              onChange={(e) => updateWeight('advancementFactor', Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Center Control Bonus */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                Center Column Bonus (c ∈ [2,5])
              </span>
              <span className="font-mono font-bold text-amber-400">+{weights.centerControlBonus} pts</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={5}
              value={weights.centerControlBonus}
              onChange={(e) => updateWeight('centerControlBonus', Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* King Center Bonus */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-400" />
                King Central Domination Bonus
              </span>
              <span className="font-mono font-bold text-amber-400">+{weights.kingCenterBonus} pts</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={weights.kingCenterBonus}
              onChange={(e) => updateWeight('kingCenterBonus', Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 flex items-center gap-1.5 border border-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-amber-500/20"
          >
            Apply Heuristics
          </button>
        </div>
      </div>
    </div>
  );
};
