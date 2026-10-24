// C++ Checkers (English draughts) with Minimax AI - DSA Mini Project
// Build:  g++ -std=c++17 -O2 -Wall -Wextra -o checkers checkers.cpp
//
// DSA features used:
//  1. Bitboards (64-bit ints)      - piece counts and evaluation
//  2. Minimax + Alpha-Beta pruning + iterative deepening + quiescence extension
//  3. Dynamic arrays (std::vector) - legal move generation
//  4. Hash tables                  - Zobrist hashing, fixed-size transposition table,
//                                    unordered_map for repetition (draw) detection
//  5. Precomputed lookup tables    - neighbour / jump squares

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <limits>
#include <random>
#include <string>
#include <unordered_map>
#include <vector>

// ---------- Terminal colours ----------
#define RESET   "\033[0m"
#define RED     "\033[31m"
#define WHITE   "\033[37m"
#define BOLD    "\033[1m"
#define YELLOW  "\033[33m"
#define CYAN    "\033[36m"

enum Player    { RED_PLAYER = 1, WHITE_PLAYER = 2 };
enum PieceType { EMPTY = 0, RED_PAWN = 1, RED_KING = 2, WHITE_PAWN = 3, WHITE_KING = 4 };
enum TTFlag    { EXACT, LOWERBOUND, UPPERBOUND };

static inline bool isRedPiece(int p)   { return p == RED_PAWN || p == RED_KING; }
static inline bool isWhitePiece(int p) { return p == WHITE_PAWN || p == WHITE_KING; }
static inline bool isKingPiece(int p)  { return p == RED_KING || p == WHITE_KING; }
static inline Player opponent(Player p) { return p == RED_PLAYER ? WHITE_PLAYER : RED_PLAYER; }
static inline bool belongsTo(int piece, Player p) {
    return p == RED_PLAYER ? isRedPiece(piece) : isWhitePiece(piece);
}

static inline int popcount64(uint64_t x) {
    int n = 0;
    while (x) { x &= x - 1; n++; }
    return n;
}
static inline int lsb64(uint64_t x) {
#if defined(__GNUC__) || defined(__clang__)
    return __builtin_ctzll(x);
#else
    int i = 0;
    while (!(x & 1ULL)) { x >>= 1; i++; }
    return i;
#endif
}

// ---------- Precomputed geometry tables ----------
// Squares 0..31, row = sq/4. Red starts on rows 0-2 and moves DOWN (row+1),
// White starts on rows 5-7 and moves UP (row-1).
// Direction index: 0 = down-left, 1 = down-right, 2 = up-left, 3 = up-right
struct Tables {
    int row[32], col[32];
    int neigh[32][4]; // adjacent square in direction d (-1 if off board)
    int jump[32][4];  // landing square two steps away in direction d (-1 if off board)

    static int idx(int r, int c) {
        if (r < 0 || r >= 8 || c < 0 || c >= 8) return -1;
        if ((r + c) % 2 == 0) return -1; // light square
        return r * 4 + c / 2;
    }

    Tables() {
        const int DR[4] = {1, 1, -1, -1};
        const int DC[4] = {-1, 1, -1, 1};
        for (int sq = 0; sq < 32; sq++) {
            int r = sq / 4;
            int c = (sq % 4) * 2 + (r % 2 == 0 ? 1 : 0);
            row[sq] = r;
            col[sq] = c;
            for (int d = 0; d < 4; d++) {
                neigh[sq][d] = idx(r + DR[d], c + DC[d]);
                jump[sq][d]  = idx(r + 2 * DR[d], c + 2 * DC[d]);
            }
        }
    }
};
static const Tables& T() { static const Tables t; return t; }

// Which direction indices a piece may use: [begin, end)
static inline void dirRange(int piece, int& b, int& e) {
    if (piece == RED_PAWN)        { b = 0; e = 2; }
    else if (piece == WHITE_PAWN) { b = 2; e = 4; }
    else                          { b = 0; e = 4; } // kings
}

// ---------- Move ----------
struct Move {
    int fromSquare;
    int toSquare;
    std::vector<int> capturedSquares; // supports multi-jumps
    bool isJump;

    Move() : fromSquare(-1), toSquare(-1), isJump(false) {}
    Move(int f, int t, bool jump = false) : fromSquare(f), toSquare(t), isJump(jump) {}

    bool operator==(const Move& o) const {
        return fromSquare == o.fromSquare && toSquare == o.toSquare &&
               capturedSquares == o.capturedSquares;
    }
};

// ---------- Zobrist hashing ----------
class ZobristHash {
    uint64_t pieceKeys[32][5];
    uint64_t turnKey;
public:
    ZobristHash() {
        std::mt19937_64 rng(1337);
        for (int sq = 0; sq < 32; sq++)
            for (int pt = 0; pt < 5; pt++) pieceKeys[sq][pt] = rng();
        turnKey = rng();
    }
    uint64_t computeHash(const int board[32], Player turn) const {
        uint64_t h = 0;
        for (int sq = 0; sq < 32; sq++)
            if (board[sq] != EMPTY) h ^= pieceKeys[sq][board[sq]];
        if (turn == RED_PLAYER) h ^= turnKey;
        return h;
    }
};
static const ZobristHash& zobrist() { static const ZobristHash z; return z; }

// ---------- Board ----------
class CheckersBoard {
public:
    int board[32];
    uint64_t redBitboard, whiteBitboard, kingsBitboard;

    CheckersBoard() { resetBoard(); }

    void resetBoard() {
        redBitboard = whiteBitboard = kingsBitboard = 0;
        for (int i = 0; i < 32; i++) {
            board[i] = EMPTY;
            if (i < 12)       setSquare(i, RED_PAWN);
            else if (i >= 20) setSquare(i, WHITE_PAWN);
        }
    }

    // Keeps the array and the bitboards consistent (incremental, O(1))
    void setSquare(int sq, int piece) {
        uint64_t bit = 1ULL << sq;
        redBitboard &= ~bit;
        whiteBitboard &= ~bit;
        kingsBitboard &= ~bit;
        board[sq] = piece;
        if (isRedPiece(piece))   redBitboard |= bit;
        if (isWhitePiece(piece)) whiteBitboard |= bit;
        if (isKingPiece(piece))  kingsBitboard |= bit;
    }

    static std::pair<int, int> indexToCoords(int sq) { return {T().row[sq], T().col[sq]}; }
    static int coordsToIndex(int r, int c) { return Tables::idx(r, c); }

    void printBoard() const {
        std::cout << "\n    0   1   2   3   4   5   6   7\n";
        std::cout << "  +---+---+---+---+---+---+---+---+\n";
        for (int r = 0; r < 8; r++) {
            std::cout << r << " |";
            for (int c = 0; c < 8; c++) {
                int sq = coordsToIndex(r, c);
                if (sq == -1) {
                    std::cout << " . |";
                } else {
                    int p = board[sq];
                    if (p == RED_PAWN)         std::cout << RED << " r " << RESET << "|";
                    else if (p == RED_KING)    std::cout << RED BOLD << " R " << RESET << "|";
                    else if (p == WHITE_PAWN)  std::cout << WHITE << " w " << RESET << "|";
                    else if (p == WHITE_KING)  std::cout << WHITE BOLD << " W " << RESET << "|";
                    else                       std::cout << std::setw(2) << sq << " |";
                }
            }
            std::cout << " " << r << "\n  +---+---+---+---+---+---+---+---+\n";
        }
        std::cout << "    0   1   2   3   4   5   6   7\n\n";
    }

    void makeMove(const Move& move) {
        int piece = board[move.fromSquare];
        setSquare(move.fromSquare, EMPTY);
        for (int cap : move.capturedSquares) setSquare(cap, EMPTY);

        if (piece == RED_PAWN && move.toSquare >= 28)       piece = RED_KING;
        else if (piece == WHITE_PAWN && move.toSquare <= 3) piece = WHITE_KING;

        setSquare(move.toSquare, piece);
    }
};

// ---------- Move generation ----------
class MoveGenerator {
public:
    // Mandatory capture: if any jump exists, only jumps are returned.
    static std::vector<Move> getLegalMoves(const CheckersBoard& board, Player player) {
        std::vector<Move> jumps, simple;
        CheckersBoard work = board; // scratch copy used by the jump search

        for (int sq = 0; sq < 32; sq++) {
            int p = board.board[sq];
            if (!belongsTo(p, player)) continue;
            getJumpsForSquare(work, sq, jumps);
            if (jumps.empty()) getSimpleMovesForSquare(board, sq, simple);
        }
        return jumps.empty() ? simple : jumps;
    }

private:
    static void getSimpleMovesForSquare(const CheckersBoard& board, int sq, std::vector<Move>& moves) {
        int p = board.board[sq];
        int b, e;
        dirRange(p, b, e);
        for (int d = b; d < e; d++) {
            int dest = T().neigh[sq][d];
            if (dest != -1 && board.board[dest] == EMPTY) moves.push_back(Move(sq, dest, false));
        }
    }

    static void getJumpsForSquare(CheckersBoard& work, int sq, std::vector<Move>& jumps) {
        int piece = work.board[sq];
        Move cur;
        cur.fromSquare = sq;
        cur.toSquare = sq;
        work.board[sq] = EMPTY; // the moving piece has left its square
        findMultiJumps(work, piece, sq, cur, jumps);
        work.board[sq] = piece;
    }

    // Captured pieces stay on the board until the move ends (official rule):
    // they cannot be jumped twice and their squares cannot be landed on.
    static void findMultiJumps(CheckersBoard& b, int piece, int sq, Move& cur, std::vector<Move>& out) {
        int bd, ed;
        dirRange(piece, bd, ed);
        bool found = false;

        for (int d = bd; d < ed; d++) {
            int mid = T().neigh[sq][d];
            int dest = T().jump[sq][d];
            if (mid == -1 || dest == -1) continue;
            if (b.board[dest] != EMPTY) continue;

            int mp = b.board[mid];
            bool opp = isRedPiece(piece) ? isWhitePiece(mp) : isRedPiece(mp);
            if (!opp) continue;
            if (std::find(cur.capturedSquares.begin(), cur.capturedSquares.end(), mid) !=
                cur.capturedSquares.end()) continue;

            found = true;
            int prevTo = cur.toSquare;
            bool prevJump = cur.isJump;
            cur.capturedSquares.push_back(mid);
            cur.toSquare = dest;
            cur.isJump = true;

            bool promotes = (piece == RED_PAWN && T().row[dest] == 7) ||
                            (piece == WHITE_PAWN && T().row[dest] == 0);
            if (promotes) out.push_back(cur);              // promotion ends the jump
            else          findMultiJumps(b, piece, dest, cur, out);

            cur.capturedSquares.pop_back();
            cur.toSquare = prevTo;
            cur.isJump = prevJump;
        }

        if (!found && cur.isJump) out.push_back(cur);
    }
};

// ---------- AI ----------
struct TTEntry {
    uint64_t hashKey;
    int score;
    int depth;
    TTFlag flag;
    int8_t from, to; // best move (used for move ordering)
    TTEntry() : hashKey(0), score(0), depth(-1), flag(EXACT), from(-1), to(-1) {}
};

class CheckersAI {
    static const int WIN_SCORE = 90000;
    static const int INF = 100000;
    static const int MAX_PLY = 64;

    std::vector<TTEntry> tt;
    size_t ttMask;
    long long nodesEvaluated;

public:
    CheckersAI() : tt(1u << 20), ttMask((1u << 20) - 1), nodesEvaluated(0) {}

    // Score from RED's point of view (positive = good for Red)
    int evaluate(const CheckersBoard& b) const {
        uint64_t redMen    = b.redBitboard & ~b.kingsBitboard;
        uint64_t whiteMen  = b.whiteBitboard & ~b.kingsBitboard;
        uint64_t redKings  = b.redBitboard & b.kingsBitboard;
        uint64_t whiteKings = b.whiteBitboard & b.kingsBitboard;

        int score = 100 * (popcount64(redMen) - popcount64(whiteMen)) +
                    300 * (popcount64(redKings) - popcount64(whiteKings));

        for (uint64_t m = redMen; m; m &= m - 1) {
            int sq = lsb64(m), r = T().row[sq], c = T().col[sq];
            score += r * 5;
            if (c >= 2 && c <= 5) score += 10;
            if (r == 0) score += 8; // keep back-row guards
        }
        for (uint64_t m = whiteMen; m; m &= m - 1) {
            int sq = lsb64(m), r = T().row[sq], c = T().col[sq];
            score -= (7 - r) * 5;
            if (c >= 2 && c <= 5) score -= 10;
            if (r == 7) score -= 8;
        }
        for (uint64_t m = redKings; m; m &= m - 1) {
            int sq = lsb64(m), r = T().row[sq], c = T().col[sq];
            if (c >= 2 && c <= 5 && r >= 2 && r <= 5) score += 20;
        }
        for (uint64_t m = whiteKings; m; m &= m - 1) {
            int sq = lsb64(m), r = T().row[sq], c = T().col[sq];
            if (c >= 2 && c <= 5 && r >= 2 && r <= 5) score -= 20;
        }
        return score;
    }

    Move getBestMove(const CheckersBoard& board, Player player, int depth) {
        nodesEvaluated = 0;
        auto start = std::chrono::high_resolution_clock::now();

        std::vector<Move> moves = MoveGenerator::getLegalMoves(board, player);
        if (moves.empty()) return Move();
        if (moves.size() == 1) {
            std::cout << CYAN << "[AI Info] Only one legal move." << RESET << "\n";
            return moves[0];
        }

        const bool maxi = (player == RED_PLAYER);
        Move bestMove = moves[0];
        int bestValue = 0;

        for (int d = 1; d <= depth; d++) {
            // Put the previous iteration's best move first
            auto it = std::find(moves.begin(), moves.end(), bestMove);
            if (it != moves.end()) std::rotate(moves.begin(), it, it + 1);

            int alpha = -INF, beta = INF;
            int best = maxi ? -INF - 1 : INF + 1;
            Move iterBest = moves[0];

            for (const auto& m : moves) {
                CheckersBoard next = board;
                next.makeMove(m);
                int val = search(next, d - 1, 1, alpha, beta, opponent(player));
                if (maxi) {
                    if (val > best) { best = val; iterBest = m; }
                    alpha = std::max(alpha, best);
                } else {
                    if (val < best) { best = val; iterBest = m; }
                    beta = std::min(beta, best);
                }
            }
            bestMove = iterBest;
            bestValue = best;
        }

        auto end = std::chrono::high_resolution_clock::now();
        double ms = std::chrono::duration<double, std::milli>(end - start).count();
        std::cout << CYAN << "[AI Info] Evaluated " << nodesEvaluated << " nodes in "
                  << std::fixed << std::setprecision(2) << ms << " ms. Best Score: "
                  << bestValue << RESET << "\n";
        return bestMove;
    }

private:
    int search(const CheckersBoard& b, int depth, int ply, int alpha, int beta, Player player) {
        nodesEvaluated++;

        const uint64_t hash = zobrist().computeHash(b.board, player);
        const int probeDepth = std::max(depth, 0);
        TTEntry& slot = tt[hash & ttMask];
        int ttFrom = -1, ttTo = -1;

        if (slot.hashKey == hash && slot.depth >= 0) {
            ttFrom = slot.from;
            ttTo = slot.to;
            if (slot.depth >= probeDepth) {
                if (slot.flag == EXACT) return slot.score;
                if (slot.flag == LOWERBOUND && slot.score >= beta) return slot.score;
                if (slot.flag == UPPERBOUND && slot.score <= alpha) return slot.score;
            }
        }

        std::vector<Move> moves = MoveGenerator::getLegalMoves(b, player);

        // No legal moves = the side to move loses. Sooner losses are worse for the loser.
        if (moves.empty())
            return (player == RED_PLAYER) ? -(WIN_SCORE - ply) : (WIN_SCORE - ply);

        // Quiescence: past the depth limit keep searching only while captures are forced.
        if ((depth <= 0 && !moves[0].isJump) || ply >= MAX_PLY) return evaluate(b);

        // Move ordering: transposition-table move first, then longer captures
        std::stable_sort(moves.begin(), moves.end(), [&](const Move& x, const Move& y) {
            bool xt = (x.fromSquare == ttFrom && x.toSquare == ttTo);
            bool yt = (y.fromSquare == ttFrom && y.toSquare == ttTo);
            if (xt != yt) return xt;
            return x.capturedSquares.size() > y.capturedSquares.size();
        });

        const bool maxi = (player == RED_PLAYER);
        const int origAlpha = alpha, origBeta = beta;
        int bestVal = maxi ? -INF : INF;
        const Move* bestMove = &moves[0];

        for (const auto& m : moves) {
            CheckersBoard next = b;
            next.makeMove(m);
            int val = search(next, depth - 1, ply + 1, alpha, beta, opponent(player));
            if (maxi) {
                if (val > bestVal) { bestVal = val; bestMove = &m; }
                alpha = std::max(alpha, bestVal);
            } else {
                if (val < bestVal) { bestVal = val; bestMove = &m; }
                beta = std::min(beta, bestVal);
            }
            if (beta <= alpha) break; // alpha-beta cutoff
        }

        // Don't cache forced-win/loss scores: they depend on ply, not just on the position.
        if (std::abs(bestVal) < WIN_SCORE - 1000 && (slot.hashKey != hash || probeDepth >= slot.depth)) {
            slot.hashKey = hash;
            slot.depth = probeDepth;
            slot.score = bestVal;
            slot.from = (int8_t)bestMove->fromSquare;
            slot.to = (int8_t)bestMove->toSquare;
            if (bestVal <= origAlpha)      slot.flag = UPPERBOUND;
            else if (bestVal >= origBeta)  slot.flag = LOWERBOUND;
            else                           slot.flag = EXACT;
        }
        return bestVal;
    }
};

#ifndef CHECKERS_NO_MAIN

static int readInt(const std::string& prompt, int lo, int hi) {
    int v;
    while (true) {
        std::cout << prompt;
        if (std::cin >> v) {
            if (v >= lo && v <= hi) return v;
        } else {
            if (std::cin.eof()) { std::cout << "\nInput closed. Exiting.\n"; std::exit(0); }
            std::cin.clear();
        }
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        std::cout << "  Please enter a number from " << lo << " to " << hi << ".\n";
    }
}

static void printMove(const Move& m) {
    std::cout << m.fromSquare << " -> " << m.toSquare;
    if (m.isJump) {
        std::cout << "  (captures";
        for (int c : m.capturedSquares) std::cout << " " << c;
        std::cout << ")";
    }
}

int main() {
    CheckersBoard gameBoard;
    CheckersAI bot;

    std::cout << BOLD << YELLOW << "========================================================\n";
    std::cout << "     C++ CHECKERS GAME AI - DSA MINI PROJECT\n";
    std::cout << "========================================================\n" << RESET;
    std::cout << "Square numbers are 0 to 31. Captures are mandatory!\n";
    std::cout << "Red moves first and moves down the board; White moves up.\n";
    std::cout << "Draw: 40 moves without a capture/pawn move, or 3-fold repetition.\n\n";

    int side = readInt("Play as (1) WHITE or (2) RED? ", 1, 2);
    Player human = (side == 1) ? WHITE_PLAYER : RED_PLAYER;
    Player ai = opponent(human);
    int searchDepth = readInt("AI depth (4 = Easy, 6 = Medium, 8 = Hard, max 12): ", 1, 12);

    Player currentTurn = RED_PLAYER;
    int quietPlies = 0; // plies since last capture or pawn move
    std::unordered_map<uint64_t, int> seen;
    seen[zobrist().computeHash(gameBoard.board, currentTurn)] = 1;

    while (true) {
        gameBoard.printBoard();
        std::vector<Move> legalMoves = MoveGenerator::getLegalMoves(gameBoard, currentTurn);

        if (legalMoves.empty()) {
            if (currentTurn == human) std::cout << BOLD << "YOU LOSE! You have no legal moves." << RESET << "\n";
            else                      std::cout << BOLD << "YOU WIN! The AI has no legal moves." << RESET << "\n";
            break;
        }

        Move chosen;
        if (currentTurn == ai) {
            std::cout << (ai == RED_PLAYER ? RED : WHITE) << BOLD << "[AI Turn] Thinking...\n" << RESET;
            chosen = bot.getBestMove(gameBoard, ai, searchDepth);
            std::cout << "AI plays: ";
            printMove(chosen);
            std::cout << "\n";
        } else {
            std::cout << (human == RED_PLAYER ? RED : WHITE) << BOLD << "[Your Turn]\n" << RESET;
            std::cout << "Available Legal Moves:\n";
            for (size_t i = 0; i < legalMoves.size(); i++) {
                std::cout << "  [" << i << "] ";
                printMove(legalMoves[i]);
                std::cout << "\n";
            }
            int choice = readInt("Enter move index (-1 to resign): ", -1, (int)legalMoves.size() - 1);
            if (choice == -1) { std::cout << "You resigned. AI wins.\n"; break; }
            chosen = legalMoves[choice];
        }

        bool pawnMove = !isKingPiece(gameBoard.board[chosen.fromSquare]);
        gameBoard.makeMove(chosen);
        quietPlies = (chosen.isJump || pawnMove) ? 0 : quietPlies + 1;
        currentTurn = opponent(currentTurn);

        uint64_t h = zobrist().computeHash(gameBoard.board, currentTurn);
        if (chosen.isJump || pawnMove) seen.clear(); // irreversible move: old positions can't recur
        int count = ++seen[h];

        if (quietPlies >= 80) {
            gameBoard.printBoard();
            std::cout << BOLD << "DRAW by the 40-move rule." << RESET << "\n";
            break;
        }
        if (count >= 3) {
            gameBoard.printBoard();
            std::cout << BOLD << "DRAW by threefold repetition." << RESET << "\n";
            break;
        }
    }
    return 0;
}

#endif // CHECKERS_NO_MAIN
