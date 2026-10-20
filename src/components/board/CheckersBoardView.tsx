import React from 'react';
import { CheckersBoard } from '../../engine/checkers/board';
import { CheckersMove, CheckersPieceType, CheckersPlayer } from '../../engine/checkers/types';
import { Crown, Sparkles } from 'lucide-react';

interface CheckersBoardViewProps {
  board: CheckersBoard;
  currentTurn: CheckersPlayer;
  legalMoves: CheckersMove[];
  selectedSquare: number | null;
  lastMove: CheckersMove | null;
  onSelectSquare: (sq: number) => void;
  onMakeMove: (move: CheckersMove) => void;
  isFlipped?: boolean;
  disabled?: boolean;
  theme?: 'tournament' | 'cyber' | 'wood';
}

export const CheckersBoardView: React.FC<CheckersBoardViewProps> = ({
  board,
  currentTurn,
  legalMoves,
  selectedSquare,
  lastMove,
  onSelectSquare,
  onMakeMove,
  isFlipped = false,
  disabled = false,
  theme = 'cyber',
}) => {
  // Find legal moves starting from the selected square
  const availableMovesForSelected = selectedSquare !== null
    ? legalMoves.filter(m => m.fromSquare === selectedSquare)
    : [];

  const targetSquaresMap = new Map<number, CheckersMove>();
  availableMovesForSelected.forEach(m => {
    targetSquaresMap.set(m.toSquare, m);
  });

  // Squares that have movable pieces for the current player
  const movableSquares = new Set(legalMoves.map(m => m.fromSquare));

  const rows = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  // Theme color maps
  const themeStyles = {
    cyber: {
      lightSquare: 'bg-slate-800/60',
      darkSquare: 'bg-slate-950/90',
      boardBorder: 'border-cyan-500/30 shadow-cyan-500/10 shadow-2xl',
      boardBg: 'bg-slate-900',
    },
    tournament: {
      lightSquare: 'bg-[#EEEED2]',
      darkSquare: 'bg-[#769656]',
      boardBorder: 'border-emerald-700/50 shadow-2xl',
      boardBg: 'bg-[#40562e]',
    },
    wood: {
      lightSquare: 'bg-[#E3C08D]',
      darkSquare: 'bg-[#8F5535]',
      boardBorder: 'border-[#58331d] shadow-2xl',
      boardBg: 'bg-[#3b2111]',
    },
  }[theme];

  return (
    <div className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl border ${themeStyles.boardBorder} ${themeStyles.boardBg}`}>
      {/* 8x8 Grid */}
      <div className="relative grid grid-cols-8 grid-rows-8 w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] rounded-2xl overflow-hidden border border-slate-700/60 select-none shadow-inner">
        {rows.map((r) =>
          cols.map((c) => {
            const sq = CheckersBoard.coordsToIndex(r, c);
            const isDark = (r % 2 === 0 && c % 2 === 1) || (r % 2 === 1 && c % 2 === 0);
            const piece = sq !== -1 ? board.board[sq] : CheckersPieceType.EMPTY;

            const isSelected = selectedSquare === sq;
            const isMovablePiece = sq !== -1 && movableSquares.has(sq);
            const isTarget = sq !== -1 && targetSquaresMap.has(sq);
            const targetMove = sq !== -1 ? targetSquaresMap.get(sq) : null;
            const isLastMoveFrom = lastMove?.fromSquare === sq;
            const isLastMoveTo = lastMove?.toSquare === sq;

            const isRed = piece === CheckersPieceType.RED_PAWN || piece === CheckersPieceType.RED_KING;
            const isWhite = piece === CheckersPieceType.WHITE_PAWN || piece === CheckersPieceType.WHITE_KING;
            const isKing = piece === CheckersPieceType.RED_KING || piece === CheckersPieceType.WHITE_KING;

            return (
              <div
                key={`sq-${r}-${c}`}
                onClick={() => {
                  if (disabled) return;
                  if (isTarget && targetMove) {
                    onMakeMove(targetMove);
                  } else if (sq !== -1 && piece !== CheckersPieceType.EMPTY) {
                    onSelectSquare(sq);
                  }
                }}
                className={`relative flex items-center justify-center transition-colors duration-150 ${
                  isDark ? themeStyles.darkSquare : themeStyles.lightSquare
                } ${
                  isTarget ? 'cursor-pointer' : isMovablePiece ? 'cursor-pointer hover:brightness-110' : ''
                }`}
              >
                {/* 32 Playable Square Index Label */}
                {sq !== -1 && (
                  <span className="absolute top-1 left-1.5 text-[10px] font-mono font-medium text-slate-500/80 pointer-events-none select-none">
                    {sq}
                  </span>
                )}

                {/* Last move highlight */}
                {(isLastMoveFrom || isLastMoveTo) && (
                  <div className="absolute inset-0 bg-amber-400/20 pointer-events-none" />
                )}

                {/* Selected square highlight */}
                {isSelected && (
                  <div className="absolute inset-0 bg-cyan-500/25 border-2 border-cyan-400 pointer-events-none" />
                )}

                {/* Movable piece gentle pulse indicator */}
                {isMovablePiece && !isSelected && !disabled && (
                  <div className="absolute inset-1 rounded-full border border-emerald-400/40 animate-pulse pointer-events-none" />
                )}

                {/* Legal Move Destination Target indicator */}
                {isTarget && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    {targetMove?.isJump ? (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-red-500 bg-red-500/30 flex items-center justify-center animate-pulse">
                        <Sparkles className="w-3.5 h-3.5 text-red-300" />
                      </div>
                    ) : (
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-400/80 shadow-md shadow-emerald-400/50" />
                    )}
                  </div>
                )}

                {/* Checkers Piece */}
                {piece !== CheckersPieceType.EMPTY && (
                  <div
                    className={`relative w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold shadow-lg transition-transform duration-200 transform ${
                      isSelected ? 'scale-110 ring-4 ring-cyan-400/70 ring-offset-2 ring-offset-slate-900' : 'hover:scale-105'
                    } ${
                      isRed
                        ? 'bg-gradient-to-br from-red-500 via-red-600 to-rose-900 text-white border-2 border-red-300/80 shadow-red-950/60'
                        : 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400 text-slate-900 border-2 border-white shadow-slate-950/60'
                    }`}
                  >
                    {/* Inner concentric ring for authentic checker piece appearance */}
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border ${
                        isRed ? 'border-red-400/50 bg-red-700/40' : 'border-slate-300/70 bg-slate-300/40'
                      }`}
                    >
                      {isKing && (
                        <Crown
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            isRed ? 'text-amber-300 fill-amber-300' : 'text-amber-600 fill-amber-500'
                          } drop-shadow-md`}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Board footer coordinates indicator */}
      <div className="mt-2 text-xs font-mono text-slate-400 flex items-center justify-between w-full px-2">
        <span>Dark squares: 0 - 31</span>
        <span>Red AI (Top) vs White (Bottom)</span>
      </div>
    </div>
  );
};
