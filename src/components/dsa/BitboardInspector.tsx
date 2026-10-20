import React, { useState } from 'react';
import { CheckersBoard } from '../../engine/checkers/board';
import { Binary, Cpu, Info, ShieldCheck } from 'lucide-react';

interface BitboardInspectorProps {
  board: CheckersBoard;
}

export const BitboardInspector: React.FC<BitboardInspectorProps> = ({ board }) => {
  const [activeBitboard, setActiveBitboard] = useState<'red' | 'white' | 'kings'>('red');
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

  const bitboardValue = activeBitboard === 'red'
    ? board.redBitboard
    : activeBitboard === 'white'
    ? board.whiteBitboard
    : board.kingsBitboard;

  // Format binary 64-bit string
  const binaryString = bitboardValue.toString(2).padStart(32, '0');
  const hexString = `0x${bitboardValue.toString(16).toUpperCase().padStart(8, '0')}`;

  // Count active bits (popcount)
  const popCount = binaryString.split('').filter(b => b === '1').length;

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Bitboard Architecture Visualizer
              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full border border-indigo-400/20">
                uint64_t
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              64-bit integer bitmasks indexing the 32 playable dark squares
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveBitboard('red')}
            className={`px-3 py-1 rounded-lg transition-colors font-medium ${
              activeBitboard === 'red'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Red Bitboard
          </button>
          <button
            onClick={() => setActiveBitboard('white')}
            className={`px-3 py-1 rounded-lg transition-colors font-medium ${
              activeBitboard === 'white'
                ? 'bg-slate-200/20 text-slate-200 border border-slate-400/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            White Bitboard
          </button>
          <button
            onClick={() => setActiveBitboard('kings')}
            className={`px-3 py-1 rounded-lg transition-colors font-medium ${
              activeBitboard === 'kings'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Kings Bitboard
          </button>
        </div>
      </div>

      {/* Bitboard Metadata Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Hexadecimal Register</span>
          <span className="font-mono font-bold text-sm text-indigo-300 tracking-wider">
            {hexString}
          </span>
        </div>

        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Popcount (Set Bits)</span>
          <span className="font-mono font-bold text-sm text-emerald-400">
            {popCount} bits active
          </span>
        </div>

        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Bitmask Formula</span>
          <span className="font-mono text-xs text-amber-300">
            1ULL &lt;&lt; square_index
          </span>
        </div>
      </div>

      {/* 32 Playable Squares Bit Matrix */}
      <div className="flex-1 flex flex-col justify-center my-2">
        <span className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
          <Binary className="w-3.5 h-3.5 text-indigo-400" />
          Interactive 32-Square Bitboard Matrix (Hover square to inspect bit position):
        </span>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
          {Array.from({ length: 32 }, (_, sq) => {
            const isBitSet = (bitboardValue & (1n << BigInt(sq))) !== 0n;
            const [r, c] = CheckersBoard.indexToCoords(sq);
            const isHovered = hoveredSquare === sq;

            return (
              <div
                key={`bit-${sq}`}
                onMouseEnter={() => setHoveredSquare(sq)}
                onMouseLeave={() => setHoveredSquare(null)}
                className={`relative flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  isBitSet
                    ? activeBitboard === 'red'
                      ? 'bg-red-950/60 border-red-500 text-red-200 shadow-md shadow-red-500/20'
                      : activeBitboard === 'white'
                      ? 'bg-slate-200/20 border-slate-300 text-white shadow-md'
                      : 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 border-slate-800/80 text-slate-600 hover:border-slate-700'
                } ${isHovered ? 'scale-105 ring-2 ring-indigo-400' : ''}`}
              >
                <div className="flex items-center justify-between w-full text-[9px] font-mono text-slate-400 mb-0.5">
                  <span>sq:{sq}</span>
                  <span>r{r}c{c}</span>
                </div>
                <span className={`text-base font-mono font-bold ${isBitSet ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {isBitSet ? '1' : '0'}
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  2^{sq}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Educational Explanation Box */}
      <div className="mt-auto p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-xs text-indigo-200/90 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block text-indigo-300">Why Bitboards in DSA?</span>
          <span>
            Instead of looping over a 2D array, Bitboards represent game states as 64-bit CPU registers. 
            Checking occupied squares, king counts, and attack vectors happens in a single CPU instruction ($O(1)$) 
            using hardware-accelerated bitwise operations (<code className="font-mono text-amber-300">&amp;</code>, <code className="font-mono text-amber-300">|</code>, <code className="font-mono text-amber-300">^</code>, and <code className="font-mono text-amber-300">__builtin_popcount</code>).
          </span>
        </div>
      </div>
    </div>
  );
};
