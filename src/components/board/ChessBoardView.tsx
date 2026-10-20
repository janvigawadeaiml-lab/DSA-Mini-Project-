import React from 'react';
import { ChessBoard } from '../../engine/chess/board';
import { ChessMove, ChessPiece, ChessPieceSymbol } from '../../engine/chess/types';

interface ChessBoardViewProps {
  board: ChessBoard;
  legalMoves: ChessMove[];
  selectedSquare: number | null;
  lastMove: ChessMove | null;
  onSelectSquare: (sq: number) => void;
  onMakeMove: (move: ChessMove) => void;
  isFlipped?: boolean;
  disabled?: boolean;
}

// Clean piece SVG symbols
const PieceIcon: React.FC<{ piece: ChessPiece }> = ({ piece }) => {
  const isWhite = piece.color === 'w';
  const fill = isWhite ? '#FFFFFF' : '#1E293B';
  const stroke = isWhite ? '#1E293B' : '#F8FAFC';

  const symbolMap: Record<ChessPieceSymbol, string> = {
    k: isWhite ? '♔' : '♚',
    q: isWhite ? '♕' : '♛',
    r: isWhite ? '♖' : '♜',
    b: isWhite ? '♗' : '♝',
    n: isWhite ? '♘' : '♞',
    p: isWhite ? '♙' : '♟',
  };

  return (
    <span
      className={`text-3xl sm:text-4xl select-none filter drop-shadow-md transition-transform duration-150 hover:scale-110 ${
        isWhite ? 'text-amber-100 font-bold' : 'text-slate-900 font-bold'
      }`}
      style={{ textShadow: isWhite ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(255,255,255,0.2)' }}
    >
      {symbolMap[piece.type]}
    </span>
  );
};

export const ChessBoardView: React.FC<ChessBoardViewProps> = ({
  board,
  legalMoves,
  selectedSquare,
  lastMove,
  onSelectSquare,
  onMakeMove,
  isFlipped = false,
  disabled = false,
}) => {
  const availableMovesForSelected = selectedSquare !== null
    ? legalMoves.filter(m => m.from === selectedSquare)
    : [];

  const targetMovesMap = new Map<number, ChessMove>();
  availableMovesForSelected.forEach(m => {
    targetMovesMap.set(m.to, m);
  });

  const movableSquares = new Set(legalMoves.map(m => m.from));
  const inCheck = board.isInCheck(board.turn);
  const kingSq = board.getKingSquare(board.turn);

  const ranks = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl border border-slate-700 bg-slate-900/90 shadow-2xl">
      <div className="relative grid grid-cols-8 grid-rows-8 w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] rounded-2xl overflow-hidden border border-slate-700 select-none shadow-inner">
        {ranks.map((r) =>
          files.map((c) => {
            const sq = r * 8 + c;
            const isLight = (r + c) % 2 === 0;
            const piece = board.board[sq];

            const isSelected = selectedSquare === sq;
            const isTarget = targetMovesMap.has(sq);
            const targetMove = targetMovesMap.get(sq);
            const isMovable = movableSquares.has(sq);
            const isLastFrom = lastMove?.from === sq;
            const isLastTo = lastMove?.to === sq;
            const isKingInCheck = inCheck && kingSq === sq;

            return (
              <div
                key={`chess-sq-${r}-${c}`}
                onClick={() => {
                  if (disabled) return;
                  if (isTarget && targetMove) {
                    onMakeMove(targetMove);
                  } else if (piece && piece.color === board.turn) {
                    onSelectSquare(sq);
                  }
                }}
                className={`relative flex items-center justify-center transition-colors duration-150 ${
                  isLight ? 'bg-[#EBECD0]' : 'bg-[#779556]'
                } ${isTarget ? 'cursor-pointer' : isMovable ? 'cursor-pointer hover:brightness-110' : ''}`}
              >
                {/* Board Rank & File Labels on edges */}
                {c === (isFlipped ? 7 : 0) && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] font-mono font-bold ${
                      isLight ? 'text-[#779556]' : 'text-[#EBECD0]'
                    }`}
                  >
                    {8 - r}
                  </span>
                )}
                {r === (isFlipped ? 0 : 7) && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] font-mono font-bold ${
                      isLight ? 'text-[#779556]' : 'text-[#EBECD0]'
                    }`}
                  >
                    {String.fromCharCode('a'.charCodeAt(0) + c)}
                  </span>
                )}

                {/* Last move highlight */}
                {(isLastFrom || isLastTo) && (
                  <div className="absolute inset-0 bg-yellow-400/35 pointer-events-none" />
                )}

                {/* Selected square highlight */}
                {isSelected && (
                  <div className="absolute inset-0 bg-cyan-400/40 border-2 border-cyan-400 pointer-events-none" />
                )}

                {/* King in check red glow */}
                {isKingInCheck && (
                  <div className="absolute inset-0 bg-red-600/50 animate-pulse border-2 border-red-500 pointer-events-none" />
                )}

                {/* Legal Move Destination Target */}
                {isTarget && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    {piece ? (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-4 border-red-500/80 bg-red-500/20 animate-pulse" />
                    ) : (
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-900/40 shadow-sm" />
                    )}
                  </div>
                )}

                {/* Chess piece */}
                {piece && <PieceIcon piece={piece} />}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2 text-xs font-mono text-slate-400 flex items-center justify-between w-full px-2">
        <span>Files: a-h | Ranks: 1-8</span>
        <span>{board.turn === 'w' ? 'White to move' : 'Black to move'}</span>
      </div>
    </div>
  );
};
