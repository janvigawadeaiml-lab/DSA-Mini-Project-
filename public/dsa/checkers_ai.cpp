/*******************************************************************************
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

// Colors for Terminal UI
#define RESET   "\033[0m"
#define RED     "\033[31m"
#define WHITE   "\033[37m"
#define BOLD    "\033[1m"
#define YELLOW  "\033[33m"
#define CYAN    "\033[36m"

// Player definitions
enum Player { NONE = 0, RED_PLAYER = 1, WHITE_PLAYER = 2 };

// Piece definitions
enum PieceType { EMPTY = 0, RED_PAWN = 1, RED_KING = 2, WHITE_PAWN = 3, WHITE_KING = 4 };

// Node type in Transposition Table
enum TTFlag { EXACT, LOWERBOUND, UPPERBOUND };

// Move Structure
struct Move {
    int fromSquare;
    int toSquare;
    std::vector<int> capturedSquares; // Supports multi-jumps
    bool isJump;

    Move() : fromSquare(-1), toSquare(-1), isJump(false) {}
    Move(int f, int t, bool jump = false) : fromSquare(f), toSquare(t), isJump(jump) {}

    bool operator==(const Move& other) const {
        return fromSquare == other.fromSquare && toSquare == other.toSquare && capturedSquares == other.capturedSquares;
    }
};

// Transposition Table Entry
struct TTEntry {
    uint64_t hashKey;
    int depth;
    int score;
    TTFlag flag;
    Move bestMove;
};

// Zobrist Hashing Class for Fast Board Indexing in Hash Tables
class ZobristHash {
private:
    uint64_t pieceKeys[32][5]; // 32 playable squares, 5 piece types
    uint64_t turnKey;

public:
    ZobristHash() {
        std::mt19937_64 rng(1337); // Fixed seed for reproducible hashes
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
        if (turn == RED_PLAYER) {
            hash ^= turnKey;
        }
        return hash;
    }

    uint64_t togglePiece(uint64_t currentHash, int sq, int pieceType) const {
        return currentHash ^ pieceKeys[sq][pieceType];
    }

    uint64_t toggleTurn(uint64_t currentHash) const {
        return currentHash ^ turnKey;
    }
};

// Checkers Board & Bitboard Class
class CheckersBoard {
public:
    // 32 playable dark squares
    int board[32];

    // DSA Feature 1: Bitboards for 64-bit integer fast piece counts & state tracking
    uint64_t redBitboard;
    uint64_t whiteBitboard;
    uint64_t kingsBitboard;

    CheckersBoard() {
        resetBoard();
    }

    void resetBoard() {
        redBitboard = 0;
        whiteBitboard = 0;
        kingsBitboard = 0;

        for (int i = 0; i < 32; i++) {
            if (i < 12) {
                board[i] = RED_PAWN; // Red starts at top (0 to 11)
                redBitboard |= (1ULL << i);
            } else if (i >= 20) {
                board[i] = WHITE_PAWN; // White starts at bottom (20 to 31)
                whiteBitboard |= (1ULL << i);
            } else {
                board[i] = EMPTY;
            }
        }
    }

    void syncBitboards() {
        redBitboard = 0;
        whiteBitboard = 0;
        kingsBitboard = 0;
        for (int i = 0; i < 32; i++) {
            if (board[i] == RED_PAWN) {
                redBitboard |= (1ULL << i);
            } else if (board[i] == RED_KING) {
                redBitboard |= (1ULL << i);
                kingsBitboard |= (1ULL << i);
            } else if (board[i] == WHITE_PAWN) {
                whiteBitboard |= (1ULL << i);
            } else if (board[i] == WHITE_KING) {
                whiteBitboard |= (1ULL << i);
                kingsBitboard |= (1ULL << i);
            }
        }
    }

    // Convert 32-square index to 8x8 (row, col)
    static std::pair<int, int> indexToCoords(int sq) {
        int r = sq / 4;
        int c = (sq % 4) * 2 + (r % 2 == 0 ? 1 : 0);
        return {r, c};
    }

    // Convert (row, col) to 32-square index (-1 if invalid or light square)
    static int coordsToIndex(int r, int c) {
        if (r < 0 || r >= 8 || c < 0 || c >= 8) return -1;
        if ((r % 2 == 0 && c % 2 == 0) || (r % 2 != 0 && c % 2 != 0)) return -1; // Light square
        return r * 4 + (c / 2);
    }

    void printBoard() const {
        std::cout << "\n    0   1   2   3   4   5   6   7\n";
        std::cout << "  +---+---+---+---+---+---+---+---+\n";
        for (int r = 0; r < 8; r++) {
            std::cout << r << " |";
            for (int c = 0; c < 8; c++) {
                int sq = coordsToIndex(r, c);
                if (sq == -1) {
                    std::cout << " . |"; // Non-playable light square
                } else {
                    int p = board[sq];
                    if (p == RED_PAWN)        std::cout << RED << " r " << RESET << "|";
                    else if (p == RED_KING)   std::cout << RED BOLD << " R " << RESET << "|";
                    else if (p == WHITE_PAWN)  std::cout << WHITE << " w " << RESET << "|";
                    else if (p == WHITE_KING) std::cout << WHITE BOLD << " W " << RESET << "|";
                    else                      std::cout << std::setw(2) << sq << " |";
                }
            }
            std::cout << " " << r << "\n  +---+---+---+---+---+---+---+---+\n";
        }
        std::cout << "    0   1   2   3   4   5   6   7\n\n";
    }

    // Apply a move to the board
    void makeMove(const Move& move) {
        int piece = board[move.fromSquare];
        board[move.fromSquare] = EMPTY;

        // Check king promotion
        if (piece == RED_PAWN && move.toSquare >= 28) {
            piece = RED_KING;
        } else if (piece == WHITE_PAWN && move.toSquare <= 3) {
            piece = WHITE_KING;
        }

        board[move.toSquare] = piece;

        // Remove captured pieces
        for (int cap : move.capturedSquares) {
            board[cap] = EMPTY;
        }

        syncBitboards();
    }
};

// DSA Feature 3: Dynamic Arrays (std::vector) for Legal Move Generation
class MoveGenerator {
public:
    static std::vector<Move> getLegalMoves(const CheckersBoard& board, Player player) {
        std::vector<Move> jumps;
        std::vector<Move> simpleMoves;

        for (int sq = 0; sq < 32; sq++) {
            int p = board.board[sq];
            if ((player == RED_PLAYER && (p == RED_PAWN || p == RED_KING)) ||
                (player == WHITE_PLAYER && (p == WHITE_PAWN || p == WHITE_KING))) {

                getJumpsForSquare(board, sq, jumps);
                if (jumps.empty()) {
                    getSimpleMovesForSquare(board, sq, simpleMoves);
                }
            }
        }

        // In Checkers, capture/jump is mandatory if available
        if (!jumps.empty()) {
            return jumps;
        }
        return simpleMoves;
    }

private:
    static void getSimpleMovesForSquare(const CheckersBoard& board, int sq, std::vector<Move>& moves) {
        int p = board.board[sq];
        auto [r, c] = CheckersBoard::indexToCoords(sq);

        // Movement directions [dr, dc]
        std::vector<std::pair<int, int>> directions;
        if (p == RED_PAWN || p == RED_KING || p == WHITE_KING) {
            directions.push_back({1, -1}); directions.push_back({1, 1}); // Forward for Red (downwards)
        }
        if (p == WHITE_PAWN || p == RED_KING || p == WHITE_KING) {
            directions.push_back({-1, -1}); directions.push_back({-1, 1}); // Forward for White (upwards)
        }

        for (auto [dr, dc] : directions) {
            int nr = r + dr;
            int nc = c + dc;
            int destSq = CheckersBoard::coordsToIndex(nr, nc);
            if (destSq != -1 && board.board[destSq] == EMPTY) {
                moves.push_back(Move(sq, destSq, false));
            }
        }
    }

    static void getJumpsForSquare(const CheckersBoard& board, int sq, std::vector<Move>& jumps) {
        Move currentMove;
        currentMove.fromSquare = sq;
        CheckersBoard tempBoard = board;
        findMultiJumps(tempBoard, sq, currentMove, jumps);
    }

    static void findMultiJumps(CheckersBoard board, int currentSq, Move currentMove, std::vector<Move>& jumps) {
        int p = board.board[currentSq];
        auto [r, c] = CheckersBoard::indexToCoords(currentSq);

        std::vector<std::pair<int, int>> directions;
        if (p == RED_PAWN || p == RED_KING || p == WHITE_KING) {
            directions.push_back({1, -1}); directions.push_back({1, 1});
        }
        if (p == WHITE_PAWN || p == RED_KING || p == WHITE_KING) {
            directions.push_back({-1, -1}); directions.push_back({-1, 1});
        }

        bool foundJump = false;

        for (auto [dr, dc] : directions) {
            int midR = r + dr, midC = c + dc;
            int destR = r + 2 * dr, destC = c + 2 * dc;

            int midSq = CheckersBoard::coordsToIndex(midR, midC);
            int destSq = CheckersBoard::coordsToIndex(destR, destC);

            if (midSq != -1 && destSq != -1 && board.board[destSq] == EMPTY) {
                int midPiece = board.board[midSq];
                bool isOpponent = false;
                if ((p == RED_PAWN || p == RED_KING) && (midPiece == WHITE_PAWN || midPiece == WHITE_KING)) isOpponent = true;
                if ((p == WHITE_PAWN || p == WHITE_KING) && (midPiece == RED_PAWN || midPiece == RED_KING)) isOpponent = true;

                if (isOpponent) {
                    foundJump = true;

                    // Execute jump step
                    CheckersBoard nextBoard = board;
                    nextBoard.board[currentSq] = EMPTY;
                    nextBoard.board[midSq] = EMPTY;

                    int nextPiece = p;
                    if (p == RED_PAWN && destR == 7) nextPiece = RED_KING;
                    if (p == WHITE_PAWN && destR == 0) nextPiece = WHITE_KING;
                    nextBoard.board[destSq] = nextPiece;

                    Move nextMove = currentMove;
                    nextMove.toSquare = destSq;
                    nextMove.capturedSquares.push_back(midSq);
                    nextMove.isJump = true;

                    // Recursively look for multi-jumps (if not just promoted)
                    if (nextPiece == p) {
                        findMultiJumps(nextBoard, destSq, nextMove, jumps);
                    } else {
                        jumps.push_back(nextMove);
                    }
                }
            }
        }

        if (!foundJump && currentMove.isJump) {
            jumps.push_back(currentMove);
        }
    }
};

// DSA Feature 2 & 4: Game Tree Evaluation using Minimax + Alpha-Beta Pruning & Transposition Table
class CheckersAI {
private:
    ZobristHash zobrist;
    std::unordered_map<uint64_t, TTEntry> transpositionTable; // Hash Table
    long long nodesEvaluated;

public:
    CheckersAI() : nodesEvaluated(0) {}

    // Heuristic Board Evaluation Function
    int evaluate(const CheckersBoard& board) {
        int score = 0;
        for (int sq = 0; sq < 32; sq++) {
            int p = board.board[sq];
            auto [r, c] = CheckersBoard::indexToCoords(sq);

            // Piece Values: Pawn = 100, King = 275
            // Positional Bonuses: Control center squares, advancement
            if (p == RED_PAWN) {
                score += 100 + (r * 5); // Reward pushing forward
                if (c >= 2 && c <= 5) score += 10; // Center control
            } else if (p == RED_KING) {
                score += 275;
                if (c >= 2 && c <= 5 && r >= 2 && r <= 5) score += 20;
            } else if (p == WHITE_PAWN) {
                score -= 100 + ((7 - r) * 5);
                if (c >= 2 && c <= 5) score -= 10;
            } else if (p == WHITE_KING) {
                score -= 275;
                if (c >= 2 && c <= 5 && r >= 2 && r <= 5) score -= 20;
            }
        }
        return score;
    }

    Move getBestMove(CheckersBoard& board, Player player, int depth) {
        nodesEvaluated = 0;
        auto startTime = std::chrono::high_resolution_clock::now();

        Move bestMove;
        int alpha = -100000;
        int beta = 100000;

        std::vector<Move> legalMoves = MoveGenerator::getLegalMoves(board, player);
        if (legalMoves.empty()) return Move();

        bestMove = legalMoves[0];

        int bestValue = (player == RED_PLAYER) ? -100000 : 100000;

        for (const auto& move : legalMoves) {
            CheckersBoard nextBoard = board;
            nextBoard.makeMove(move);

            int val = minimax(nextBoard, depth - 1, alpha, beta, player == RED_PLAYER ? WHITE_PLAYER : RED_PLAYER);

            if (player == RED_PLAYER) {
                if (val > bestValue) {
                    bestValue = val;
                    bestMove = move;
                }
                alpha = std::max(alpha, bestValue);
            } else {
                if (val < bestValue) {
                    bestValue = val;
                    bestMove = move;
                }
                beta = std::min(beta, bestValue);
            }
        }

        auto endTime = std::chrono::high_resolution_clock::now();
        double elapsedMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();

        std::cout << CYAN << "[AI Info] Evaluated " << nodesEvaluated << " nodes in " 
                  << std::fixed << std::setprecision(2) << elapsedMs << " ms. Best Score: " 
                  << bestValue << RESET << "\n";

        return bestMove;
    }

private:
    int minimax(CheckersBoard& board, int depth, int alpha, int beta, Player player) {
        nodesEvaluated++;

        uint64_t hash = zobrist.computeHash(board.board, player);

        // Transposition Table Lookup
        if (transpositionTable.find(hash) != transpositionTable.end()) {
            TTEntry entry = transpositionTable[hash];
            if (entry.depth >= depth) {
                if (entry.flag == EXACT) return entry.score;
                if (entry.flag == LOWERBOUND && entry.score >= beta) return entry.score;
                if (entry.flag == UPPERBOUND && entry.score <= alpha) return entry.score;
            }
        }

        std::vector<Move> legalMoves = MoveGenerator::getLegalMoves(board, player);

        // Terminal state or depth limit reached
        if (depth == 0 || legalMoves.empty()) {
            int evalScore = evaluate(board);
            if (legalMoves.empty()) {
                evalScore = (player == RED_PLAYER) ? -90000 : 90000; // Loss if no moves
            }
            return evalScore;
        }

        int originalAlpha = alpha;
        int bestVal = (player == RED_PLAYER) ? -100000 : 100000;
        Move bestMoveInNode;

        if (player == RED_PLAYER) { // Maximizing Player
            for (const auto& move : legalMoves) {
                CheckersBoard nextBoard = board;
                nextBoard.makeMove(move);

                int val = minimax(nextBoard, depth - 1, alpha, beta, WHITE_PLAYER);
                if (val > bestVal) {
                    bestVal = val;
                    bestMoveInNode = move;
                }
                alpha = std::max(alpha, bestVal);
                if (beta <= alpha) break; // Alpha-Beta Pruning
            }
        } else { // Minimizing Player
            for (const auto& move : legalMoves) {
                CheckersBoard nextBoard = board;
                nextBoard.makeMove(move);

                int val = minimax(nextBoard, depth - 1, alpha, beta, RED_PLAYER);
                if (val < bestVal) {
                    bestVal = val;
                    bestMoveInNode = move;
                }
                beta = std::min(beta, bestVal);
                if (beta <= alpha) break; // Alpha-Beta Pruning
            }
        }

        // Store result in Transposition Table
        TTEntry entry;
        entry.hashKey = hash;
        entry.depth = depth;
        entry.score = bestVal;
        entry.bestMove = bestMoveInNode;

        if (bestVal <= originalAlpha) entry.flag = UPPERBOUND;
        else if (bestVal >= beta) entry.flag = LOWERBOUND;
        else entry.flag = EXACT;

        transpositionTable[hash] = entry;

        return bestVal;
    }
};

// Main Game Controller
int main() {
    CheckersBoard gameBoard;
    CheckersAI bot;

    std::cout << BOLD << YELLOW << "========================================================\n";
    std::cout << "     C++ CHECKERS GAME AI - DSA MINI PROJECT          \n";
    std::cout << "========================================================\n" << RESET;
    std::cout << "You are playing as WHITE (w / W). The AI is RED (r / R).\n";
    std::cout << "Square numbers are 0 to 31. Captures are mandatory!\n\n";

    int searchDepth = 6;
    std::cout << "Select AI Depth Level (e.g. 4 for Easy, 6 for Medium, 8 for Hard): ";
    std::cin >> searchDepth;

    Player currentTurn = RED_PLAYER; // Red (AI) goes first

    while (true) {
        gameBoard.printBoard();
        std::vector<Move> legalMoves = MoveGenerator::getLegalMoves(gameBoard, currentTurn);

        if (legalMoves.empty()) {
            std::cout << BOLD << (currentTurn == RED_PLAYER ? "WHITE WINS! RED has no legal moves." : "RED (AI) WINS! WHITE has no legal moves.") << RESET << "\n";
            break;
        }

        if (currentTurn == RED_PLAYER) {
            std::cout << RED BOLD << "\n[AI Turn - RED] Thinking...\n" << RESET;
            Move bestMove = bot.getBestMove(gameBoard, RED_PLAYER, searchDepth);
            std::cout << RED << "AI Moves from square " << bestMove.fromSquare << " to " << bestMove.toSquare << RESET << "\n";
            gameBoard.makeMove(bestMove);
            currentTurn = WHITE_PLAYER;
        } else {
            std::cout << WHITE BOLD << "\n[Your Turn - WHITE]\n" << RESET;
            std::cout << "Available Legal Moves:\n";
            for (size_t i = 0; i < legalMoves.size(); i++) {
                std::cout << "  [" << i << "] From " << legalMoves[i].fromSquare << " to " << legalMoves[i].toSquare;
                if (legalMoves[i].isJump) std::cout << " (Capture!)";
                std::cout << "\n";
            }

            int choice = -1;
            while (choice < 0 || choice >= (int)legalMoves.size()) {
                std::cout << "Enter move index (0 - " << legalMoves.size() - 1 << "): ";
                std::cin >> choice;
            }

            gameBoard.makeMove(legalMoves[choice]);
            currentTurn = RED_PLAYER;
        }
    }

    return 0;
}
