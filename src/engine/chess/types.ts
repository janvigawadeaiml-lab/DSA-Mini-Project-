export type ChessColor = 'w' | 'b';

export type ChessPieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessPiece {
  type: ChessPieceSymbol;
  color: ChessColor;
}

export interface ChessMove {
  from: number; // 0..63 (0=a8, 7=h8, 56=a1, 63=h1)
  to: number;
  piece: ChessPiece;
  captured?: ChessPiece;
  promotion?: ChessPieceSymbol;
  isCastling?: boolean;
  isEnPassant?: boolean;
  san: string;
}

export interface ChessGameState {
  board: (ChessPiece | null)[]; // 64 squares
  turn: ChessColor;
  castlingRights: {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
  };
  enPassantSquare: number | null; // 0..63 or null
  halfmoveClock: number;
  fullmoveNumber: number;
}
