import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Bot, 
  User, 
  Layers, 
  Cpu, 
  Database, 
  BarChart2, 
  Code, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Play, 
  Pause, 
  Sliders, 
  HelpCircle, 
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

// Checkers Engine
import { CheckersBoard } from './engine/checkers/board';
import { CheckersAI } from './engine/checkers/minimax';
import { MoveGenerator as CheckersMoveGen } from './engine/checkers/moveGenerator';
import { CheckersEvaluator, CheckersEvalWeights, DEFAULT_CHECKERS_WEIGHTS } from './engine/checkers/evaluator';
import { CheckersMove, CheckersPieceType, CheckersPlayer } from './engine/checkers/types';
import { ZobristHash } from './engine/checkers/zobrist';

// Chess Engine
import { ChessBoard } from './engine/chess/board';
import { ChessAI } from './engine/chess/minimax';
import { ChessMove } from './engine/chess/types';

// Types
import { DecisionTreeNode, EngineMetrics, GameMode, GameType } from './types/game';

// Components
import { CheckersBoardView } from './components/board/CheckersBoardView';
import { ChessBoardView } from './components/board/ChessBoardView';
import { DecisionTreeViewer } from './components/tree/DecisionTreeViewer';
import { BitboardInspector } from './components/dsa/BitboardInspector';
import { TranspositionTableInspector } from './components/dsa/TranspositionTableInspector';
import { AlgorithmBenchmark } from './components/dsa/AlgorithmBenchmark';
import { CppSourceViewerModal } from './components/dsa/CppSourceViewerModal';
import { HeuristicTunerModal } from './components/dsa/HeuristicTunerModal';
import { MoveHistoryPanel } from './components/game/MoveHistoryPanel';
import { soundManager } from './utils/audio';

export default function App() {
  // Game Setup State
  const [gameType, setGameType] = useState<GameType>('checkers');
  const [gameMode, setGameMode] = useState<GameMode>('human-vs-ai');
  const [searchDepth, setSearchDepth] = useState<number>(6);
  const [useAlphaBeta, setUseAlphaBeta] = useState<boolean>(true);
  const [useTT, setUseTT] = useState<boolean>(true);
  const [boardTheme, setBoardTheme] = useState<'cyber' | 'tournament' | 'wood'>('cyber');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'tree' | 'bitboard' | 'tt' | 'benchmark'>('tree');

  // Modals
  const [showCppModal, setShowCppModal] = useState<boolean>(false);
  const [showTunerModal, setShowTunerModal] = useState<boolean>(false);

  // Heuristic weights for Checkers
  const [evalWeights, setEvalWeights] = useState<CheckersEvalWeights>({ ...DEFAULT_CHECKERS_WEIGHTS });

  // Engine Instances
  const checkersAIRef = useRef<CheckersAI>(new CheckersAI());
  const chessAIRef = useRef<ChessAI>(new ChessAI());

  // Checkers Game State
  const [checkersBoard, setCheckersBoard] = useState<CheckersBoard>(() => new CheckersBoard());
  const [checkersTurn, setCheckersTurn] = useState<CheckersPlayer>(CheckersPlayer.RED_PLAYER);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [lastCheckersMove, setLastCheckersMove] = useState<CheckersMove | null>(null);
  const [checkersHistory, setCheckersHistory] = useState<{ board: CheckersBoard; move: CheckersMove; turn: CheckersPlayer }[]>([]);

  // Chess Game State
  const [chessBoard, setChessBoard] = useState<ChessBoard>(() => new ChessBoard());
  const [selectedChessSq, setSelectedChessSq] = useState<number | null>(null);
  const [lastChessMove, setLastChessMove] = useState<ChessMove | null>(null);
  const [chessHistory, setChessHistory] = useState<{ board: ChessBoard; move: ChessMove }[]>([]);

  // Shared Engine & AI UI State
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [engineMetrics, setEngineMetrics] = useState<EngineMetrics | null>(null);
  const [decisionTree, setDecisionTree] = useState<DecisionTreeNode | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('Game in progress');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [moveNotations, setMoveNotations] = useState<string[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Sound sync
  useEffect(() => {
    soundManager.enabled = soundEnabled;
  }, [soundEnabled]);

  // Evaluate current board score
  const currentEvalScore = gameType === 'checkers'
    ? CheckersEvaluator.evaluate(checkersBoard, evalWeights)
    : 0;

  // Calculate current Zobrist Hash
  const currentHash = gameType === 'checkers'
    ? checkersAIRef.current.zobrist.computeHash(checkersBoard.board, checkersTurn)
    : chessAIRef.current.zobrist.computeHash(chessBoard);

  // Check legal moves
  const checkersLegalMoves = gameType === 'checkers' && !isGameOver
    ? CheckersMoveGen.getLegalMoves(checkersBoard, checkersTurn)
    : [];

  const chessLegalMoves = gameType === 'chess' && !isGameOver
    ? chessBoard.getLegalMoves()
    : [];

  // Reset Game
  const handleResetGame = useCallback(() => {
    setIsAutoPlaying(false);
    setIsGameOver(false);
    setSelectedSquare(null);
    setSelectedChessSq(null);
    setEngineMetrics(null);
    setDecisionTree(null);
    setMoveNotations([]);

    if (gameType === 'checkers') {
      const newBoard = new CheckersBoard();
      setCheckersBoard(newBoard);
      setCheckersTurn(CheckersPlayer.RED_PLAYER);
      setLastCheckersMove(null);
      setCheckersHistory([]);
      setGameStatus('New Checkers match started. Red moves first.');
    } else {
      const newBoard = new ChessBoard();
      setChessBoard(newBoard);
      setLastChessMove(null);
      setChessHistory([]);
      setGameStatus('New Chess match started. White moves first.');
    }
  }, [gameType]);

  // Execute Checkers Move
  const handleMakeCheckersMove = useCallback((move: CheckersMove) => {
    if (isGameOver) return;

    soundManager.playMove();
    if (move.isJump) {
      soundManager.playCapture();
    }

    setCheckersHistory(prev => [...prev, {
      board: checkersBoard.clone(),
      move,
      turn: checkersTurn,
    }]);

    const newBoard = checkersBoard.clone();
    const promoted = newBoard.makeMove(move);
    if (promoted) {
      soundManager.playPromotion();
    }

    setCheckersBoard(newBoard);
    setLastCheckersMove(move);
    setSelectedSquare(null);
    setMoveNotations(prev => [...prev, move.notation]);

    const nextTurn = checkersTurn === CheckersPlayer.RED_PLAYER
      ? CheckersPlayer.WHITE_PLAYER
      : CheckersPlayer.RED_PLAYER;

    setCheckersTurn(nextTurn);

    // Check if next player has any legal moves
    const nextMoves = CheckersMoveGen.getLegalMoves(newBoard, nextTurn);
    if (nextMoves.length === 0) {
      setIsGameOver(true);
      const winner = checkersTurn === CheckersPlayer.RED_PLAYER ? 'Red (AI)' : 'White (Human)';
      setGameStatus(`🏆 Game Over: ${winner} Wins! No legal moves for opponent.`);
      soundManager.playVictory();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setGameStatus(`${nextTurn === CheckersPlayer.RED_PLAYER ? 'Red (AI)' : 'White'} to move.`);
    }
  }, [checkersBoard, checkersTurn, isGameOver]);

  // Execute Chess Move
  const handleMakeChessMove = useCallback((move: ChessMove) => {
    if (isGameOver) return;

    soundManager.playMove();
    if (move.captured) {
      soundManager.playCapture();
    }
    if (move.promotion) {
      soundManager.playPromotion();
    }

    setChessHistory(prev => [...prev, {
      board: chessBoard.clone(),
      move,
    }]);

    const newBoard = chessBoard.clone();
    newBoard.makeMove(move);

    setChessBoard(newBoard);
    setLastChessMove(move);
    setSelectedChessSq(null);
    setMoveNotations(prev => [...prev, move.san]);

    const nextMoves = newBoard.getLegalMoves();
    if (nextMoves.length === 0) {
      setIsGameOver(true);
      if (newBoard.isInCheck(newBoard.turn)) {
        const winner = newBoard.turn === 'w' ? 'Black' : 'White';
        setGameStatus(`🏆 Checkmate! ${winner} Wins!`);
        soundManager.playVictory();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } else {
        setGameStatus('½ - ½ Stalemate! Draw.');
      }
    } else {
      setGameStatus(`${newBoard.turn === 'w' ? 'White' : 'Black'} to move ${newBoard.isInCheck(newBoard.turn) ? '(Check!)' : ''}`);
    }
  }, [chessBoard, isGameOver]);

  // Run AI Move
  const handleRunAIMove = useCallback(() => {
    if (isGameOver || isThinking) return;

    setIsThinking(true);

    setTimeout(() => {
      try {
        if (gameType === 'checkers') {
          const result = checkersAIRef.current.getBestMove(checkersBoard, checkersTurn, {
            depth: searchDepth,
            useAlphaBeta,
            useTranspositionTable: useTT,
            weights: evalWeights,
            maxTreeCaptureDepth: 3,
          });

          setEngineMetrics(result.metrics);
          setDecisionTree(result.decisionTree);

          if (result.bestMove) {
            handleMakeCheckersMove(result.bestMove);
          }
        } else {
          const result = chessAIRef.current.getBestMove(
            chessBoard,
            searchDepth,
            useAlphaBeta,
            useTT,
            2
          );

          setEngineMetrics(result.metrics);
          setDecisionTree(result.decisionTree);

          if (result.bestMove) {
            handleMakeChessMove(result.bestMove);
          }
        }
      } catch (err) {
        console.error('AI calculation failed:', err);
      } finally {
        setIsThinking(false);
      }
    }, 40);
  }, [
    isGameOver,
    isThinking,
    gameType,
    checkersBoard,
    checkersTurn,
    chessBoard,
    searchDepth,
    useAlphaBeta,
    useTT,
    evalWeights,
    handleMakeCheckersMove,
    handleMakeChessMove,
  ]);

  // Auto-play loop for AI vs AI mode or when Auto-Play is active
  useEffect(() => {
    if (!isAutoPlaying || isGameOver || isThinking) return;

    const timer = setTimeout(() => {
      handleRunAIMove();
    }, 600);

    return () => clearTimeout(timer);
  }, [isAutoPlaying, isGameOver, isThinking, handleRunAIMove]);

  // Human vs AI automated trigger: Red AI automatically moves when it is Red's turn in Human-vs-AI mode!
  useEffect(() => {
    if (gameMode !== 'human-vs-ai' || isGameOver || isThinking) return;

    if (gameType === 'checkers' && checkersTurn === CheckersPlayer.RED_PLAYER) {
      const timer = setTimeout(() => {
        handleRunAIMove();
      }, 350);
      return () => clearTimeout(timer);
    } else if (gameType === 'chess' && chessBoard.turn === 'b') {
      const timer = setTimeout(() => {
        handleRunAIMove();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [gameMode, gameType, checkersTurn, chessBoard.turn, isGameOver, isThinking, handleRunAIMove]);

  // Undo Move
  const handleUndo = () => {
    if (gameType === 'checkers' && checkersHistory.length > 0) {
      const last = checkersHistory[checkersHistory.length - 1];
      setCheckersBoard(last.board);
      setCheckersTurn(last.turn);
      setCheckersHistory(prev => prev.slice(0, -1));
      setMoveNotations(prev => prev.slice(0, -1));
      setLastCheckersMove(null);
      setIsGameOver(false);
      setGameStatus(`${last.turn === CheckersPlayer.RED_PLAYER ? 'Red (AI)' : 'White'} to move.`);
    } else if (gameType === 'chess' && chessHistory.length > 0) {
      const last = chessHistory[chessHistory.length - 1];
      setChessBoard(last.board);
      setChessHistory(prev => prev.slice(0, -1));
      setMoveNotations(prev => prev.slice(0, -1));
      setLastChessMove(null);
      setIsGameOver(false);
      setGameStatus(`${last.board.turn === 'w' ? 'White' : 'Black'} to move.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-slate-100 via-emerald-200 to-cyan-300 bg-clip-text text-transparent">
                  TactixAI Engine
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  DSA Decision Tree
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Minimax Algorithm • Alpha-Beta Pruning • 64-Bit Bitboards • Zobrist Transposition Table
              </p>
            </div>
          </div>

          {/* Controls: Game Switcher & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Game Type Picker */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => {
                  setGameType('checkers');
                  handleResetGame();
                }}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  gameType === 'checkers'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Checkers (C++ DSA)
              </button>
              <button
                onClick={() => {
                  setGameType('chess');
                  handleResetGame();
                }}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  gameType === 'chess'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Chess
              </button>
            </div>

            {/* View Source Code Modal */}
            <button
              onClick={() => setShowCppModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Inspect C++ Project Source Code & README"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden md:inline">C++ Source</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(s => !s)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Game Board & Move Controls (5 cols on lg) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* Game Mode & Engine Configuration Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                Game & Engine Configuration
              </span>

              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={handleResetGame}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                  title="Reset Game to initial state"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3 text-xs">
              <button
                onClick={() => setGameMode('human-vs-ai')}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  gameMode === 'human-vs-ai'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="text-[10px]">vs</span>
                  <Bot className="w-3 h-3" />
                </div>
                <span>Play vs AI</span>
              </button>

              <button
                onClick={() => setGameMode('ai-vs-ai')}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  gameMode === 'ai-vs-ai'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  <span className="text-[10px]">vs</span>
                  <Bot className="w-3 h-3" />
                </div>
                <span>AI vs AI</span>
              </button>

              <button
                onClick={() => setGameMode('human-vs-human')}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  gameMode === 'human-vs-human'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="text-[10px]">vs</span>
                  <User className="w-3 h-3" />
                </div>
                <span>2-Player</span>
              </button>

              <button
                onClick={() => setShowTunerModal(true)}
                className="p-2 rounded-xl border bg-slate-950 border-slate-800 text-amber-300 hover:border-amber-500/50 flex flex-col items-center justify-center gap-1 transition-all"
                title="Tune Minimax heuristic evaluation weights"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Heuristics</span>
              </button>
            </div>

            {/* Depth & Algorithm Toggles Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
              {/* Depth Selector */}
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px]">Search Depth:</span>
                <select
                  value={searchDepth}
                  onChange={(e) => setSearchDepth(Number(e.target.value))}
                  className="bg-transparent font-mono font-bold text-emerald-400 focus:outline-none cursor-pointer"
                >
                  <option value={2} className="bg-slate-900">d = 2 (Fast)</option>
                  <option value={4} className="bg-slate-900">d = 4 (Tactical)</option>
                  <option value={6} className="bg-slate-900">d = 6 (Medium)</option>
                  <option value={7} className="bg-slate-900">d = 7 (Expert)</option>
                  <option value={8} className="bg-slate-900">d = 8 (Master)</option>
                </select>
              </div>

              {/* Alpha-Beta Toggle */}
              <button
                onClick={() => setUseAlphaBeta(ab => !ab)}
                className={`p-2 rounded-xl border flex items-center justify-between transition-colors ${
                  useAlphaBeta
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
                title="Alpha-Beta Pruning: cuts unpromising minimax branches"
              >
                <span className="text-[11px]">α-β Pruning</span>
                <span className="font-mono font-bold">{useAlphaBeta ? 'ON' : 'OFF'}</span>
              </button>

              {/* Zobrist TT Toggle */}
              <button
                onClick={() => setUseTT(tt => !tt)}
                className={`p-2 rounded-xl border flex items-center justify-between transition-colors ${
                  useTT
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
                title="Transposition Table: O(1) Zobrist cache"
              >
                <span className="text-[11px]">Zobrist TT</span>
                <span className="font-mono font-bold">{useTT ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Game Board */}
          <div className="flex flex-col items-center">
            {gameType === 'checkers' ? (
              <CheckersBoardView
                board={checkersBoard}
                currentTurn={checkersTurn}
                legalMoves={checkersLegalMoves}
                selectedSquare={selectedSquare}
                lastMove={lastCheckersMove}
                onSelectSquare={(sq) => setSelectedSquare(sq === selectedSquare ? null : sq)}
                onMakeMove={handleMakeCheckersMove}
                isFlipped={isFlipped}
                disabled={isThinking || (gameMode === 'human-vs-ai' && checkersTurn === CheckersPlayer.RED_PLAYER)}
                theme={boardTheme}
              />
            ) : (
              <ChessBoardView
                board={chessBoard}
                legalMoves={chessLegalMoves}
                selectedSquare={selectedChessSq}
                lastMove={lastChessMove}
                onSelectSquare={(sq) => setSelectedChessSq(sq === selectedChessSq ? null : sq)}
                onMakeMove={handleMakeChessMove}
                isFlipped={isFlipped}
                disabled={isThinking || (gameMode === 'human-vs-ai' && chessBoard.turn === 'b')}
              />
            )}
          </div>

          {/* Move Action Bar */}
          <div className="flex items-center justify-between gap-2 p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFlipped(f => !f)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Flip board perspective"
              >
                Flip Board
              </button>

              <button
                onClick={() => setBoardTheme(t => t === 'cyber' ? 'tournament' : t === 'tournament' ? 'wood' : 'cyber')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors capitalize"
              >
                Theme: {boardTheme}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Trigger AI Step */}
              <button
                onClick={handleRunAIMove}
                disabled={isThinking || isGameOver}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {isThinking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Thinking...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> AI Move
                  </>
                )}
              </button>

              {/* Auto-Play Toggle */}
              <button
                onClick={() => setIsAutoPlaying(ap => !ap)}
                className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
                  isAutoPlaying
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isAutoPlaying ? 'Pause' : 'Auto'}
              </button>
            </div>
          </div>

          {/* Move History & Eval Strip */}
          <MoveHistoryPanel
            moves={moveNotations}
            metrics={engineMetrics}
            evalScore={currentEvalScore}
            onUndo={handleUndo}
            canUndo={gameType === 'checkers' ? checkersHistory.length > 0 : chessHistory.length > 0}
            gameStatus={gameStatus}
          />
        </section>

        {/* Right Column: DSA Visualizer Tabs (7 cols on lg) */}
        <section className="lg:col-span-7 flex flex-col gap-4 min-h-[640px]">
          {/* Visualizer Tab Navigation */}
          <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setActiveTab('tree')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'tree'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Decision Tree</span>
              </button>

              <button
                onClick={() => setActiveTab('bitboard')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'bitboard'
                    ? 'bg-indigo-500 text-slate-950 shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>Bitboards (64-Bit)</span>
              </button>

              <button
                onClick={() => setActiveTab('tt')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'tt'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Zobrist Hash / TT</span>
              </button>

              <button
                onClick={() => setActiveTab('benchmark')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'benchmark'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>DSA Benchmark</span>
              </button>
            </div>
          </div>

          {/* Active Tab Viewport */}
          <div className="flex-1 h-[680px]">
            {activeTab === 'tree' && (
              <DecisionTreeViewer
                rootNode={decisionTree}
                gameType={gameType}
                isThinking={isThinking}
              />
            )}

            {activeTab === 'bitboard' && (
              <BitboardInspector board={checkersBoard} />
            )}

            {activeTab === 'tt' && (
              <TranspositionTableInspector
                tt={checkersAIRef.current.tt}
                currentHash={currentHash}
                turn={checkersTurn === CheckersPlayer.RED_PLAYER ? 'Red (AI)' : 'White (Human)'}
              />
            )}

            {activeTab === 'benchmark' && (
              <AlgorithmBenchmark
                board={checkersBoard}
                currentTurn={checkersTurn}
              />
            )}
          </div>
        </section>
      </main>

      {/* C++ Source Code Modal */}
      <CppSourceViewerModal
        isOpen={showCppModal}
        onClose={() => setShowCppModal(false)}
      />

      {/* Heuristics Tuner Modal */}
      <HeuristicTunerModal
        isOpen={showTunerModal}
        onClose={() => setShowTunerModal(false)}
        weights={evalWeights}
        onChangeWeights={setEvalWeights}
      />
    </div>
  );
}
