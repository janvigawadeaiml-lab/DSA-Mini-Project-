import React, { useState, useRef, useMemo } from 'react';
import { DecisionTreeNode } from '../../types/game';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Scissors, 
  Zap, 
  Crown, 
  Layers, 
  HelpCircle,
  Eye,
  Info
} from 'lucide-react';

interface DecisionTreeViewerProps {
  rootNode: DecisionTreeNode | null;
  gameType: 'checkers' | 'chess';
  isThinking?: boolean;
}

interface LayoutNode {
  node: DecisionTreeNode;
  x: number;
  y: number;
  children: LayoutNode[];
  parent?: LayoutNode;
  isPV: boolean;
}

export const DecisionTreeViewer: React.FC<DecisionTreeViewerProps> = ({
  rootNode,
  gameType,
  isThinking = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<DecisionTreeNode | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'hidePruned' | 'pvOnly'>('all');
  const [showHelp, setShowHelp] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Compute Tree Layout Coordinates
  const layout = useMemo(() => {
    if (!rootNode) return null;

    const LEVEL_HEIGHT = 110;
    const NODE_WIDTH = 130;
    let nextX = 0;

    const buildLayout = (node: DecisionTreeNode, depth: number, parent?: LayoutNode, isParentPV = true): LayoutNode => {
      const isPV = isParentPV && (node.isBestMove || depth === 0);

      // Filter children according to filterMode
      let validChildren = node.children || [];
      if (filterMode === 'hidePruned') {
        validChildren = validChildren.filter(c => !c.isPruned);
      } else if (filterMode === 'pvOnly') {
        validChildren = validChildren.filter(c => c.isBestMove);
      }

      const layoutChildren: LayoutNode[] = [];
      const currentLayout: LayoutNode = {
        node,
        x: 0,
        y: depth * LEVEL_HEIGHT + 40,
        children: layoutChildren,
        parent,
        isPV,
      };

      if (validChildren.length === 0) {
        currentLayout.x = nextX;
        nextX += NODE_WIDTH + 30;
      } else {
        validChildren.forEach(child => {
          layoutChildren.push(buildLayout(child, depth + 1, currentLayout, isPV));
        });
        const firstX = layoutChildren[0].x;
        const lastX = layoutChildren[layoutChildren.length - 1].x;
        currentLayout.x = (firstX + lastX) / 2;
      }

      return currentLayout;
    };

    const tree = buildLayout(rootNode, 0, undefined, true);
    return { tree, totalWidth: Math.max(1000, nextX + 100) };
  }, [rootNode, filterMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof SVGElement || (e.target as HTMLElement).tagName === 'DIV') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.min(2.5, Math.max(0.3, prev * zoomFactor)));
  };

  const renderLinks = (node: LayoutNode, pathKey = 'root'): React.ReactNode[] => {
    const links: React.ReactNode[] = [];
    node.children.forEach((child, idx) => {
      const isPVEdge = node.isPV && child.isPV;
      const isPrunedEdge = child.node.isPruned;
      const currentPathKey = `${pathKey}_${idx}`;

      // Curved Bezier Connection
      const startX = node.x;
      const startY = node.y + 24;
      const endX = child.x;
      const endY = child.y - 24;
      const midY = (startY + endY) / 2;

      const pathData = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

      links.push(
        <path
          key={`edge_${currentPathKey}_${node.node.id}_${child.node.id}`}
          d={pathData}
          fill="none"
          stroke={
            isPVEdge
              ? '#10B981' // Emerald PV line
              : isPrunedEdge
              ? '#EF4444' // Red dashed pruned branch
              : '#475569' // Slate default branch
          }
          strokeWidth={isPVEdge ? 3 : isPrunedEdge ? 1.5 : 1.5}
          strokeDasharray={isPrunedEdge ? '4,4' : undefined}
          strokeOpacity={isPrunedEdge ? 0.6 : 0.8}
        />
      );

      links.push(...renderLinks(child, currentPathKey));
    });
    return links;
  };

  const renderNodes = (layoutNode: LayoutNode, pathKey = 'root'): React.ReactNode[] => {
    const { node, x, y, isPV } = layoutNode;
    const isSelected = selectedNode?.id === node.id;
    const isPruned = node.isPruned;
    const isTTHit = node.isTranspositionHit;
    const isMax = node.player === 'MAX';

    let borderColor = 'border-slate-700';
    let bgColor = 'bg-slate-900/90';
    let textColor = 'text-slate-200';

    if (isPV) {
      borderColor = 'border-emerald-500 shadow-emerald-500/30';
      bgColor = 'bg-emerald-950/80';
      textColor = 'text-emerald-200';
    } else if (isPruned) {
      borderColor = 'border-red-500/70 shadow-red-500/20';
      bgColor = 'bg-red-950/40 opacity-75';
      textColor = 'text-red-300';
    } else if (isTTHit) {
      borderColor = 'border-cyan-500/70 shadow-cyan-500/20';
      bgColor = 'bg-cyan-950/40';
      textColor = 'text-cyan-200';
    }

    if (isSelected) {
      borderColor = 'border-amber-400 ring-2 ring-amber-400/50';
    }

    const items: React.ReactNode[] = [
      <foreignObject
        key={`node_${pathKey}_${node.id}`}
        x={x - 65}
        y={y - 24}
        width={130}
        height={54}
        className="overflow-visible"
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNode(node);
          }}
          className={`group cursor-pointer select-none rounded-xl border p-2 backdrop-blur-md transition-all duration-150 shadow-lg hover:scale-105 ${borderColor} ${bgColor} ${textColor}`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono leading-none">
            <span className={`px-1 py-0.5 rounded font-bold ${isMax ? 'bg-indigo-500/30 text-indigo-300' : 'bg-amber-500/30 text-amber-300'}`}>
              {isMax ? 'MAX' : 'MIN'}
            </span>
            <span className="text-slate-400">d:{node.depth}</span>
            {isPV && (
              <Crown className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 animate-pulse" />
            )}
            {isPruned && (
              <span title="Pruned by Alpha-Beta">
                <Scissors className="w-3 h-3 text-red-400" />
              </span>
            )}
            {isTTHit && !isPruned && (
              <span title="Transposition Table Cache Hit (O(1))">
                <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between font-semibold text-xs truncate">
            <span className="truncate">{node.moveNotation || node.name}</span>
            {node.score !== undefined && (
              <span
                className={`font-mono text-[11px] ${
                  node.score > 0
                    ? 'text-emerald-400'
                    : node.score < 0
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {node.score > 0 ? `+${node.score}` : node.score}
              </span>
            )}
          </div>
        </div>
      </foreignObject>,
    ];

    layoutNode.children.forEach((child, idx) => {
      items.push(...renderNodes(child, `${pathKey}_${idx}`));
    });

    return items;
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Game State Tree Explorer
              {isThinking && (
                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Evaluating Tree...
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Minimax recursion, Alpha-Beta cutoffs (α ≥ β) & Zobrist TT hits
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filterMode === 'all'
                ? 'bg-slate-800 text-emerald-400 font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Nodes
          </button>
          <button
            onClick={() => setFilterMode('hidePruned')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              filterMode === 'hidePruned'
                ? 'bg-slate-800 text-emerald-400 font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" /> Active Only
          </button>
          <button
            onClick={() => setFilterMode('pvOnly')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              filterMode === 'pvOnly'
                ? 'bg-slate-800 text-emerald-400 font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-3 h-3" /> Best Path (PV)
          </button>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setZoom(z => Math.max(0.3, z - 0.15))}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-1 w-12 text-center text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 50, y: 40 });
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 hover:text-slate-200 transition-colors ml-1"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowHelp(h => !h)}
            className={`p-1.5 rounded-lg transition-colors ml-1 ${
              showHelp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/80 hover:bg-slate-700'
            }`}
            title="Algorithm Legend & Math"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend & Help Banner */}
      {showHelp && (
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="font-semibold text-emerald-400">Green:</span> Principal Variation (Optimal move path chosen by engine)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <span className="font-semibold text-red-400">Red Dashed:</span> Alpha-Beta Pruned branch (evaluated eliminated, β ≤ α)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
            <span className="font-semibold text-cyan-400">Cyan Zap:</span> Zobrist Transposition Table Cache Hit ($O(1)$ constant time)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">MAX</span>
            <span>Maximizer turn (wants max score)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">MIN</span>
            <span>Minimizer turn (wants min score)</span>
          </div>
        </div>
      )}

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)`,
            backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {layout ? (
          <svg
            className="w-full h-full"
            style={{ overflow: 'visible' }}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Links */}
              {renderLinks(layout.tree)}
              {/* Nodes */}
              {renderNodes(layout.tree)}
            </g>
          </svg>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <Layers className="w-8 h-8 opacity-40 animate-pulse" />
            <p className="text-sm font-medium">No decision tree generated yet.</p>
            <p className="text-xs text-slate-600">Make a move or click &quot;Run AI Move&quot; to build the game tree.</p>
          </div>
        )}
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md z-20 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                selectedNode.player === 'MAX' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {selectedNode.player} NODE
              </span>
              <span className="font-semibold text-slate-100 text-sm">{selectedNode.moveNotation || selectedNode.name}</span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Minimax Score</span>
              <span className={`font-mono font-bold text-sm ${
                (selectedNode.score || 0) > 0 ? 'text-emerald-400' : (selectedNode.score || 0) < 0 ? 'text-red-400' : 'text-slate-200'
              }`}>
                {selectedNode.score !== undefined ? selectedNode.score : 'Pending'}
              </span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Tree Depth Level</span>
              <span className="font-mono font-bold text-sm text-slate-200">
                Depth {selectedNode.depth}
              </span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Alpha Window (α)</span>
              <span className="font-mono font-medium text-slate-300">
                {selectedNode.alpha !== undefined ? selectedNode.alpha : '-∞'}
              </span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Beta Window (β)</span>
              <span className="font-mono font-medium text-slate-300">
                {selectedNode.beta !== undefined ? selectedNode.beta : '+∞'}
              </span>
            </div>
          </div>

          {selectedNode.isPruned && (
            <div className="mt-2.5 p-2 rounded-lg bg-red-950/50 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
              <Scissors className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Branch Pruned by Alpha-Beta:</span>
                <span className="text-[11px] text-red-200/90 leading-tight block">
                  {selectedNode.prunedReason || 'Cutoff occurred because evaluating deeper moves cannot change the root decision.'}
                </span>
              </div>
            </div>
          )}

          {selectedNode.isTranspositionHit && (
            <div className="mt-2 p-2 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-xs text-cyan-300 flex items-start gap-2">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Transposition Table Hit:</span>
                <span className="text-[11px] text-cyan-200/90 leading-tight block">
                  This exact board state was already computed and retrieved from Zobrist Hash in O(1) time.
                </span>
              </div>
            </div>
          )}

          {selectedNode.isBestMove && (
            <div className="mt-2 p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <Crown className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">Optimal Principal Variation Move</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
