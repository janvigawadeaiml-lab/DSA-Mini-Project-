import { ChessColor, ChessGameState, ChessMove, ChessPiece, ChessPieceSymbol } from './types';

export class ChessBoard {
  public board: (ChessPiece | null)[];
  public turn: ChessColor;
  public castlingRights: {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
  };
  public enPassantSquare: number | null;
  public halfmoveClock: number;
  public fullmoveNumber: number;

  constructor(fen?: string) {
    this.board = new Array(64).fill(null);
    this.turn = 'w';
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassantSquare = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;

    if (fen) {
      this.loadFen(fen);
    } else {
      this.resetBoard();
    }
  }

  public resetBoard(): void {
    this.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }

  public clone(): ChessBoard {
    const copy = new ChessBoard();
    copy.board = this.board.map(p => (p ? { ...p } : null));
    copy.turn = this.turn;
    copy.castlingRights = { ...this.castlingRights };
    copy.enPassantSquare = this.enPassantSquare;
    copy.halfmoveClock = this.halfmoveClock;
    copy.fullmoveNumber = this.fullmoveNumber;
    return copy;
  }

  public loadFen(fen: string): void {
    const parts = fen.trim().split(/\s+/);
    const placement = parts[0];
    this.turn = (parts[1] === 'b' ? 'b' : 'w');

    const castling = parts[2] || '-';
    this.castlingRights = {
      wK: castling.includes('K'),
      wQ: castling.includes('Q'),
      bK: castling.includes('k'),
      bQ: castling.includes('q'),
    };

    const ep = parts[3];
    this.enPassantSquare = ep && ep !== '-' ? ChessBoard.algebraicToIndex(ep) : null;
    this.halfmoveClock = parseInt(parts[4] || '0', 10);
    this.fullmoveNumber = parseInt(parts[5] || '1', 10);

    this.board = new Array(64).fill(null);
    let row = 0;
    let col = 0;

    for (const char of placement) {
      if (char === '/') {
        row++;
        col = 0;
      } else if (char >= '1' && char <= '8') {
        col += parseInt(char, 10);
      } else {
        const isUpper = char === char.toUpperCase();
        const color: ChessColor = isUpper ? 'w' : 'b';
        const type = char.toLowerCase() as ChessPieceSymbol;
        this.board[row * 8 + col] = { type, color };
        col++;
      }
    }
  }

  public toFen(): string {
    let fen = '';
    for (let r = 0; r < 8; r++) {
      let emptyCount = 0;
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r * 8 + c];
        if (!piece) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          const char = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
          fen += char;
        }
      }
      if (emptyCount > 0) {
        fen += emptyCount;
      }
      if (r < 7) fen += '/';
    }

    fen += ` ${this.turn} `;

    let castling = '';
    if (this.castlingRights.wK) castling += 'K';
    if (this.castlingRights.wQ) castling += 'Q';
    if (this.castlingRights.bK) castling += 'k';
    if (this.castlingRights.bQ) castling += 'q';
    fen += castling || '-';

    fen += ` ${this.enPassantSquare !== null ? ChessBoard.indexToAlgebraic(this.enPassantSquare) : '-'} `;
    fen += `${this.halfmoveClock} ${this.fullmoveNumber}`;

    return fen;
  }

  public static indexToAlgebraic(sq: number): string {
    const file = String.fromCharCode('a'.charCodeAt(0) + (sq % 8));
    const rank = 8 - Math.floor(sq / 8);
    return `${file}${rank}`;
  }

  public static algebraicToIndex(coord: string): number {
    const file = coord.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(coord[1], 10);
    return rank * 8 + file;
  }

  public getKingSquare(color: ChessColor): number {
    for (let i = 0; i < 64; i++) {
      const p = this.board[i];
      if (p && p.type === 'k' && p.color === color) {
        return i;
      }
    }
    return -1;
  }

  public isSquareAttacked(sq: number, byColor: ChessColor): boolean {
    const [r, c] = [Math.floor(sq / 8), sq % 8];

    // Check pawn attacks
    const pawnRowOffset = byColor === 'w' ? 1 : -1;
    const attackerPawnRow = r + pawnRowOffset;
    if (attackerPawnRow >= 0 && attackerPawnRow < 8) {
      if (c - 1 >= 0) {
        const p = this.board[attackerPawnRow * 8 + (c - 1)];
        if (p && p.color === byColor && p.type === 'p') return true;
      }
      if (c + 1 < 8) {
        const p = this.board[attackerPawnRow * 8 + (c + 1)];
        if (p && p.color === byColor && p.type === 'p') return true;
      }
    }

    // Check Knight attacks
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of knightOffsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = this.board[nr * 8 + nc];
        if (p && p.color === byColor && p.type === 'n') return true;
      }
    }

    // Check Bishop / Queen (diagonals)
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
      let cr = r + dr;
      let cc = c + dc;
      while (cr >= 0 && cr < 8 && cc >= 0 && cc < 8) {
        const p = this.board[cr * 8 + cc];
        if (p) {
          if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
          break;
        }
        cr += dr;
        cc += dc;
      }
    }

    // Check Rook / Queen (orthogonals)
    const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of orthoDirs) {
      let cr = r + dr;
      let cc = c + dc;
      while (cr >= 0 && cr < 8 && cc >= 0 && cc < 8) {
        const p = this.board[cr * 8 + cc];
        if (p) {
          if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
          break;
        }
        cr += dr;
        cc += dc;
      }
    }

    // Check King attacks
    const kingDirs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ];
    for (const [dr, dc] of kingDirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = this.board[nr * 8 + nc];
        if (p && p.color === byColor && p.type === 'k') return true;
      }
    }

    return false;
  }

  public isInCheck(color: ChessColor): boolean {
    const kSq = this.getKingSquare(color);
    if (kSq === -1) return false;
    const opponentColor = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(kSq, opponentColor);
  }

  public getLegalMoves(color = this.turn): ChessMove[] {
    const pseudoMoves: ChessMove[] = [];
    const opponent = color === 'w' ? 'b' : 'w';

    for (let sq = 0; sq < 64; sq++) {
      const piece = this.board[sq];
      if (!piece || piece.color !== color) continue;

      const [r, c] = [Math.floor(sq / 8), sq % 8];

      if (piece.type === 'p') {
        const forward = color === 'w' ? -1 : 1;
        const startRank = color === 'w' ? 6 : 1;
        const promoRank = color === 'w' ? 0 : 7;

        // One step forward
        const nextR = r + forward;
        if (nextR >= 0 && nextR < 8 && !this.board[nextR * 8 + c]) {
          const destSq = nextR * 8 + c;
          if (nextR === promoRank) {
            for (const pr of ['q', 'r', 'b', 'n'] as ChessPieceSymbol[]) {
              pseudoMoves.push({
                from: sq,
                to: destSq,
                piece,
                promotion: pr,
                san: `${ChessBoard.indexToAlgebraic(destSq)}=${pr.toUpperCase()}`,
              });
            }
          } else {
            pseudoMoves.push({
              from: sq,
              to: destSq,
              piece,
              san: ChessBoard.indexToAlgebraic(destSq),
            });
            // Two steps forward
            if (r === startRank && !this.board[(r + 2 * forward) * 8 + c]) {
              pseudoMoves.push({
                from: sq,
                to: (r + 2 * forward) * 8 + c,
                piece,
                san: ChessBoard.indexToAlgebraic((r + 2 * forward) * 8 + c),
              });
            }
          }
        }

        // Pawn Captures (including en passant)
        for (const dc of [-1, 1]) {
          const capC = c + dc;
          if (capC >= 0 && capC < 8 && nextR >= 0 && nextR < 8) {
            const destSq = nextR * 8 + capC;
            const target = this.board[destSq];
            const isEnPassant = destSq === this.enPassantSquare;

            if ((target && target.color === opponent) || isEnPassant) {
              const fileChar = String.fromCharCode('a'.charCodeAt(0) + c);
              if (nextR === promoRank) {
                for (const pr of ['q', 'r', 'b', 'n'] as ChessPieceSymbol[]) {
                  pseudoMoves.push({
                    from: sq,
                    to: destSq,
                    piece,
                    captured: target || (isEnPassant ? { type: 'p', color: opponent } : undefined),
                    promotion: pr,
                    isEnPassant,
                    san: `${fileChar}x${ChessBoard.indexToAlgebraic(destSq)}=${pr.toUpperCase()}`,
                  });
                }
              } else {
                pseudoMoves.push({
                  from: sq,
                  to: destSq,
                  piece,
                  captured: target || (isEnPassant ? { type: 'p', color: opponent } : undefined),
                  isEnPassant,
                  san: `${fileChar}x${ChessBoard.indexToAlgebraic(destSq)}`,
                });
              }
            }
          }
        }
      } else if (piece.type === 'n') {
        const offsets = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1],
        ];
        for (const [dr, dc] of offsets) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const destSq = nr * 8 + nc;
            const target = this.board[destSq];
            if (!target || target.color === opponent) {
              pseudoMoves.push({
                from: sq,
                to: destSq,
                piece,
                captured: target || undefined,
                san: `N${target ? 'x' : ''}${ChessBoard.indexToAlgebraic(destSq)}`,
              });
            }
          }
        }
      } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
        const directions: [number, number][] = [];
        if (piece.type === 'b' || piece.type === 'q') {
          directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        }
        if (piece.type === 'r' || piece.type === 'q') {
          directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        }

        const prefix = piece.type.toUpperCase();

        for (const [dr, dc] of directions) {
          let cr = r + dr;
          let cc = c + dc;
          while (cr >= 0 && cr < 8 && cc >= 0 && cc < 8) {
            const destSq = cr * 8 + cc;
            const target = this.board[destSq];
            if (!target) {
              pseudoMoves.push({
                from: sq,
                to: destSq,
                piece,
                san: `${prefix}${ChessBoard.indexToAlgebraic(destSq)}`,
              });
            } else {
              if (target.color === opponent) {
                pseudoMoves.push({
                  from: sq,
                  to: destSq,
                  piece,
                  captured: target,
                  san: `${prefix}x${ChessBoard.indexToAlgebraic(destSq)}`,
                });
              }
              break;
            }
            cr += dr;
            cc += dc;
          }
        }
      } else if (piece.type === 'k') {
        const directions = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1],  [1, 0],  [1, 1],
        ];
        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const destSq = nr * 8 + nc;
            const target = this.board[destSq];
            if (!target || target.color === opponent) {
              pseudoMoves.push({
                from: sq,
                to: destSq,
                piece,
                captured: target || undefined,
                san: `K${target ? 'x' : ''}${ChessBoard.indexToAlgebraic(destSq)}`,
              });
            }
          }
        }

        // Castling
        if (color === 'w' && sq === 60) {
          if (this.castlingRights.wK && !this.board[61] && !this.board[62]) {
            if (!this.isSquareAttacked(60, 'b') && !this.isSquareAttacked(61, 'b') && !this.isSquareAttacked(62, 'b')) {
              pseudoMoves.push({
                from: 60,
                to: 62,
                piece,
                isCastling: true,
                san: 'O-O',
              });
            }
          }
          if (this.castlingRights.wQ && !this.board[59] && !this.board[58] && !this.board[57]) {
            if (!this.isSquareAttacked(60, 'b') && !this.isSquareAttacked(59, 'b') && !this.isSquareAttacked(58, 'b')) {
              pseudoMoves.push({
                from: 60,
                to: 58,
                piece,
                isCastling: true,
                san: 'O-O-O',
              });
            }
          }
        } else if (color === 'b' && sq === 4) {
          if (this.castlingRights.bK && !this.board[5] && !this.board[6]) {
            if (!this.isSquareAttacked(4, 'w') && !this.isSquareAttacked(5, 'w') && !this.isSquareAttacked(6, 'w')) {
              pseudoMoves.push({
                from: 4,
                to: 6,
                piece,
                isCastling: true,
                san: 'O-O',
              });
            }
          }
          if (this.castlingRights.bQ && !this.board[3] && !this.board[2] && !this.board[1]) {
            if (!this.isSquareAttacked(4, 'w') && !this.isSquareAttacked(3, 'w') && !this.isSquareAttacked(2, 'w')) {
              pseudoMoves.push({
                from: 4,
                to: 2,
                piece,
                isCastling: true,
                san: 'O-O-O',
              });
            }
          }
        }
      }
    }

    // Filter out moves that leave king in check
    const legalMoves: ChessMove[] = [];
    for (const move of pseudoMoves) {
      const nextBoard = this.clone();
      nextBoard.makeMove(move);
      if (!nextBoard.isInCheck(color)) {
        // Add '+' or '#' to SAN if opponent is in check
        if (nextBoard.isInCheck(opponent)) {
          move.san += '+';
        }
        legalMoves.push(move);
      }
    }

    return legalMoves;
  }

  public makeMove(move: ChessMove): void {
    const { from, to, piece, promotion, isCastling, isEnPassant } = move;

    this.board[from] = null;
    let placedPiece: ChessPiece = { ...piece };
    if (promotion) {
      placedPiece.type = promotion;
    }
    this.board[to] = placedPiece;

    // Handle en passant capture
    if (isEnPassant) {
      const capSq = piece.color === 'w' ? to + 8 : to - 8;
      this.board[capSq] = null;
    }

    // Handle castling rook movement
    if (isCastling) {
      if (to === 62) { // wK
        this.board[63] = null;
        this.board[61] = { type: 'r', color: 'w' };
      } else if (to === 58) { // wQ
        this.board[56] = null;
        this.board[59] = { type: 'r', color: 'w' };
      } else if (to === 6) { // bK
        this.board[7] = null;
        this.board[5] = { type: 'r', color: 'b' };
      } else if (to === 2) { // bQ
        this.board[0] = null;
        this.board[3] = { type: 'r', color: 'b' };
      }
    }

    // Update castling rights
    if (piece.type === 'k') {
      if (piece.color === 'w') {
        this.castlingRights.wK = false;
        this.castlingRights.wQ = false;
      } else {
        this.castlingRights.bK = false;
        this.castlingRights.bQ = false;
      }
    }
    if (piece.type === 'r') {
      if (from === 56) this.castlingRights.wQ = false;
      if (from === 63) this.castlingRights.wK = false;
      if (from === 0) this.castlingRights.bQ = false;
      if (from === 7) this.castlingRights.bK = false;
    }

    // Update en passant square
    if (piece.type === 'p' && Math.abs(to - from) === 16) {
      this.enPassantSquare = (from + to) / 2;
    } else {
      this.enPassantSquare = null;
    }

    // Update turn
    this.turn = this.turn === 'w' ? 'b' : 'w';
    if (this.turn === 'w') {
      this.fullmoveNumber++;
    }
  }
}
