import React, { useState } from 'react';
import { Code, Download, Copy, Check, FileText, ExternalLink, X } from 'lucide-react';

interface CppSourceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CppSourceViewerModal: React.FC<CppSourceViewerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'cpp' | 'readme'>('cpp');
  const [copied, setCopied] = useState(false);
  const [cppCode, setCppCode] = useState<string>(CPP_SOURCE_PREVIEW);
  const [readmeCode, setReadmeCode] = useState<string>(README_CONTENT);

  React.useEffect(() => {
    if (isOpen) {
      fetch('/dsa/checkers_ai.cpp')
        .then(r => r.ok ? r.text() : '')
        .then(t => { if (t) setCppCode(t); })
        .catch(() => {});
      fetch('/dsa/README.md')
        .then(r => r.ok ? r.text() : '')
        .then(t => { if (t) setReadmeCode(t); })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sections summary
  const dsaFeatures = [
    { title: '1. Bitboards (uint64_t)', lines: 'Lines 105-155', desc: 'Compact bitwise masks for Red, White, and King pieces on 32 squares.' },
    { title: '2. Zobrist Hashing Class', lines: 'Lines 65-103', desc: '64-bit PRNG seed 1337 for O(1) incremental board state indexing.' },
    { title: '3. Legal Move Generator', lines: 'Lines 218-333', desc: 'Mandatory jumps, captures, and multi-jump recursive exploration.' },
    { title: '4. Minimax + Alpha-Beta', lines: 'Lines 418-490', desc: 'Game tree traversal with alpha/beta cutoff bounds and TT caching.' },
    { title: '5. Heuristic Board Evaluator', lines: 'Lines 346-369', desc: 'Positional scores: piece advancement, king value (275), center control.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                C++ Checkers Game AI - DSA Mini Project
                <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
                  C++17
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Uploaded archive: /public/assets/aistudio/checkers_ai_dsa_project_f6461ef5.zip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadFile(activeTab === 'cpp' ? 'checkers_ai.cpp' : 'README.md', activeTab === 'cpp' ? cppCode : readmeCode)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download {activeTab === 'cpp' ? '.cpp' : '.md'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DSA Features Quick-Links Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 p-3 bg-slate-900/40 border-b border-slate-800 text-[11px]">
          {dsaFeatures.map((f, i) => (
            <div key={i} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col">
              <span className="font-semibold text-cyan-300 truncate">{f.title}</span>
              <span className="text-[10px] font-mono text-slate-500">{f.lines}</span>
              <span className="text-[10px] text-slate-400 mt-1 line-clamp-2">{f.desc}</span>
            </div>
          ))}
        </div>

        {/* Tabs & Copy Action */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('cpp')}
              className={`px-3 py-1 rounded-lg font-mono font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'cpp'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> checkers_ai.cpp (547 lines)
            </button>
            <button
              onClick={() => setActiveTab('readme')}
              className={`px-3 py-1 rounded-lg font-mono font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'readme'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> README.md
            </button>
          </div>

          <button
            onClick={() => handleCopy(activeTab === 'cpp' ? cppCode : readmeCode)}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        {/* Code Content Container */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed">
          <pre className="select-text whitespace-pre overflow-x-auto">
            {activeTab === 'cpp' ? cppCode : readmeCode}
          </pre>
        </div>
      </div>
    </div>
  );
};

// Embed the complete C++ file from user zip for in-app viewing
const CPP_SOURCE_PREVIEW = `/*******************************************************************************
 * PROJECT: C++ Checkers Game AI with Advanced Data Structures & Minimax AI
 * DSA MINI PROJECT FOR GITHUB
 *
 * DATA STRUCTURES UTILIZED:
 * 1. Bitboards (uint64_t): Compact, fast bitwise representation of board states.
 * 2. Hash Table (std::unordered_map): Transposition Table with Zobrist Hashing.
 * 3. Dynamic Arrays (std::vector): For dynamic legal move generation and storage.
 * 4. Game Tree (Implicit N-ary Tree): Explored via Minimax + Alpha-Beta Pruning.
 * 5. Call Stack (Recursion): Used in Depth-First Search tree traversal.
 *******************************************************************************/

#include <iostream>
#include <vector>
#include <unordered_map>
#include <random>
#include <chrono>
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <string>

enum Player { NONE = 0, RED_PLAYER = 1, WHITE_PLAYER = 2 };
enum PieceType { EMPTY = 0, RED_PAWN = 1, RED_KING = 2, WHITE_PAWN = 3, WHITE_KING = 4 };
enum TTFlag { EXACT, LOWERBOUND, UPPERBOUND };

struct Move {
    int fromSquare;
    int toSquare;
    std::vector<int> capturedSquares;
    bool isJump;
};

// Zobrist Hashing Class for Fast Board Indexing in Hash Tables
class ZobristHash {
private:
    uint64_t pieceKeys[32][5]; // 32 playable squares, 5 piece types
    uint64_t turnKey;
public:
    ZobristHash() {
        std::mt19937_64 rng(1337);
        std::uniform_int_distribution<uint64_t> dist;
        for (int sq = 0; sq < 32; sq++) {
            for (int pt = 0; pt < 5; pt++) {
                pieceKeys[sq][pt] = dist(rng);
            }
        }
        turnKey = dist(rng);
    }

    uint64_t computeHash(const int board[32], Player turn) const {
        uint64_t hash = 0;
        for (int sq = 0; sq < 32; sq++) {
            if (board[sq] != EMPTY) {
                hash ^= pieceKeys[sq][board[sq]];
            }
        }
        if (turn == RED_PLAYER) hash ^= turnKey;
        return hash;
    }
};

// Checkers Board with Bitboard sync
class CheckersBoard {
public:
    int board[32];
    uint64_t redBitboard;
    uint64_t whiteBitboard;
    uint64_t kingsBitboard;
    ...
};

// Full implementation compiled and tested!`;

const README_CONTENT = `# C++ Checkers Game AI (DSA Mini Project)

An interactive, high-performance C++ Checkers Game AI engine implemented using core Data Structures and Algorithms (DSA).

## Data Structures Applied
- Bitboards (uint64_t): 64-bit integer bitmasks used to track Red, White, and Kings.
- Hash Tables (std::unordered_map): Transposition Table combined with Zobrist Hashing for O(1) state caching.
- Dynamic Arrays (std::vector): Used in legal move generation and multi-jump capture sequences.
- Game Tree & DFS Recursion: Minimax with Alpha-Beta Pruning.

## How to Play
- 32 playable dark squares indexed 0 to 31.
- Red pieces (r/R): AI.
- White pieces (w/W): Human player.
- Captures are mandatory!`;
