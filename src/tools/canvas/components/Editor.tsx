import { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Transformer, Rect as KonvaRect } from 'react-konva';
import type Konva from 'konva';
import { db } from '@/db';
import { useCanvas } from '../hooks/useCanvas';
import { useTools } from '../hooks/useTools';
import { useHistory } from '../hooks/useHistory';
import { useAutoSave } from '../hooks/useAutoSave';
import { useVersions } from '../hooks/useVersions';
import { useSelection } from '../hooks/useSelection';
import { useConnectors } from '../hooks/useConnectors';
import { Toolbar } from './Toolbar';
import { GridLayer } from './GridLayer';
import { ShapeRenderer } from './ShapeRenderer';
import { ConnectorRenderer, AnchorDots, DraftConnector } from './ConnectorRenderer';
import { VersionsDrawer } from './VersionsDrawer';
import { PropertiesPanel } from './PropertiesPanel';
import { PenPropertiesPanel } from './PenPropertiesPanel';
import { TextEditor } from './TextEditor';
import { PointHandles } from './PointHandles';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import type { ShapeType, Shape, CanvasState, TextShape, LineShape, ArrowShape } from '../types';
import { getShapeBoundingBox } from '../types';
import type { PendingToolProperties } from '../hooks/useTools';

const DEFAULT_PENDING_PROPS: PendingToolProperties = {
  strokeWidth: 1,
  opacity: 1,
};

// Drawing tools that benefit from the pre-draw properties panel
const DRAW_TOOLS: ShapeType[] = ['pen', 'line', 'arrow', 'rect', 'ellipse', 'triangle'];

const GRID_SIZE = 10;

export default function Editor() {
  const [activeTool, setActiveToolRaw] = useState<ShapeType>('select');
  const [snap, setSnap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingProps, setPendingProps] = useState<PendingToolProperties>(DEFAULT_PENDING_PROPS);
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([]);
  // Whether initial data has been loaded from DB (one-shot)
  const [initialLoaded, setInitialLoaded] = useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  const { versions, saveVersion, deleteVersion, renameVersion } = useVersions();
  const { selectionRect, startSelection, updateSelection, endSelection } = useSelection();

  // ── Initial load — one-shot read from Dexie (no reactive subscription) ──
  useEffect(() => {
    if (initialLoaded) return;
    let cancelled = false;

    async function load() {
      const [autosave, snapState, gridState, showOriginState] = await Promise.all([
        db.toolStates.get('tool:canvas:autosave'),
        db.toolStates.get('tool:canvas:snap'),
        db.toolStates.get('tool:canvas:show-grid'),
        db.toolStates.get('tool:canvas:show-origin'),
      ]);
      if (cancelled) return;

      if (autosave) {
        const parsed = JSON.parse(autosave.content as string) as CanvasState;
        // Replace the initial history state
        pushState(parsed);
      }
      if (snapState !== undefined && snapState !== null) setSnap(snapState.content as boolean);
      if (gridState !== undefined && gridState !== null) setShowGrid(gridState.content as boolean);
      if (showOriginState !== undefined && showOriginState !== null)
        setShowOrigin(showOriginState.content as boolean);

      setInitialLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { viewport, setViewport, handleZoom, handleTouch, handleTouchEnd } = useCanvas();

  const { state, pushState, undo, redo, canUndo, canRedo } = useHistory({
    shapes: [],
    connectors: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const { newShape, handleMouseDown, handleMouseMove, handleMouseUp } = useTools(
    activeTool,
    state,
    pushState,
    viewport,
    snap,
    (shape) => {
      if (shape.type === 'text') setEditingId(shape.id);
    },
    pendingProps
  );

  const {
    draft: connectorDraft,
    hoveredAnchor,
    handleConnectorDown,
    handleConnectorMove,
    handleConnectorUp,
    cancelConnector,
    getAnchorPosition,
  } = useConnectors(state, pushState, viewport);

  // ── Auto-save — only shapes+snap+grid+origin (no viewport) ────────
  useAutoSave(state, snap, showGrid, showOrigin);

  // ── Tool switch: clear selection, cancel connector, reset pending props ─
  const setActiveTool = useCallback(
    (tool: ShapeType) => {
      setActiveToolRaw(tool);
      setSelectedIds([]);
      setSelectedConnectorIds([]);
      setEditingId(null);
      cancelConnector();
      // Issue 6: Reset pending properties to defaults so new shapes always
      // start with tool-specific default colors and standard stroke
      setPendingProps(DEFAULT_PENDING_PROPS);
    },
    [cancelConnector]
  );

  // ── Container resize observer ──────────────────────────────────────
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // ── Initial viewport centering ────────────────────────────────────
  const hasCentered = useRef(false);
  useEffect(() => {
    if (initialLoaded && size.width > 0 && size.height > 0 && !hasCentered.current) {
      // Center the origin (0,0) in the middle of the viewport
      setViewport({
        x: size.width / 2,
        y: size.height / 2,
        scale: 1,
      });
      hasCentered.current = true;
    }
  }, [initialLoaded, size.width, size.height, setViewport]);

  // ── Prevent browser scroll on canvas ──────────────────────────────
  useEffect(() => {
    const preventDefault = (e: WheelEvent | TouchEvent) => {
      if (
        e.target instanceof HTMLCanvasElement ||
        (e.target as HTMLElement)?.closest('.konvajs-content')
      ) {
        if (e.cancelable) e.preventDefault();
      }
    };
    window.addEventListener('wheel', preventDefault, { passive: false });
    window.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      window.removeEventListener('wheel', preventDefault);
      window.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  // ── Shape helpers ──────────────────────────────────────────────────
  const updateShape = useCallback(
    (updatedShape: Shape) => {
      pushState({
        ...stateRef.current,
        shapes: stateRef.current.shapes.map((s) => (s.id === updatedShape.id ? updatedShape : s)),
      });
    },
    [pushState]
  );

  const updateSelectedShapes = useCallback(
    (updates: Partial<Shape>) => {
      pushState({
        ...stateRef.current,
        shapes: stateRef.current.shapes.map((s) =>
          selectedIds.includes(s.id) ? ({ ...s, ...updates } as Shape) : s
        ),
      });
    },
    [pushState, selectedIds]
  );

  const onSelect = useCallback(
    (id: string, isShift: boolean) => {
      if (activeTool !== 'select' || isSpacePressed) return;
      setSelectedConnectorIds([]);
      if (isShift) {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
      } else {
        setSelectedIds([id]);
      }
    },
    [activeTool, isSpacePressed]
  );

  const onSelectConnector = useCallback(
    (connectorId: string) => {
      if (activeTool !== 'select' || isSpacePressed) return;
      setSelectedIds([]);
      setSelectedConnectorIds([connectorId]);
    },
    [activeTool, isSpacePressed]
  );

  // Force re-render of connectors during shape drag (real-time movement)
  const [dragTick, setDragTick] = useState(0);
  const handleShapeDragMove = useCallback(() => {
    setDragTick((t) => t + 1);
  }, []);

  const getWorldPointerPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    return {
      x: (pos.x - viewport.x) / viewport.scale,
      y: (pos.y - viewport.y) / viewport.scale,
    };
  }, [viewport]);

  // ── Stage event handlers ───────────────────────────────────────────
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isSpacePressed) return;

      // Multi-touch: cancel drawing, let touch handler take over
      if (e.evt instanceof TouchEvent && e.evt.touches.length > 1) {
        handleMouseUp();
        cancelConnector();
        return;
      }

      const clickedOnEmpty = e.target === e.target.getStage();

      if (activeTool === 'connector') {
        const pos = getWorldPointerPos();
        handleConnectorDown(pos.x, pos.y);
        return;
      }

      if (clickedOnEmpty) {
        setSelectedIds([]);
        setSelectedConnectorIds([]);
        if (activeTool === 'select') {
          const pos = getWorldPointerPos();
          startSelection(pos.x, pos.y);
        }
      }

      if (activeTool !== 'select' && activeTool !== 'pan') {
        handleMouseDown(e);
      }
    },
    [
      isSpacePressed,
      activeTool,
      getWorldPointerPos,
      handleMouseUp,
      cancelConnector,
      handleConnectorDown,
      startSelection,
      handleMouseDown,
    ]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isSpacePressed) return;

      // Multi-touch: always handle pinch/pan
      if (e.evt instanceof TouchEvent && e.evt.touches.length > 1) {
        handleTouch(e as Konva.KonvaEventObject<TouchEvent>);
        return;
      }

      if (activeTool === 'connector') {
        const pos = getWorldPointerPos();
        handleConnectorMove(pos.x, pos.y);
        return;
      }

      if (selectionRect) {
        const pos = getWorldPointerPos();
        updateSelection(pos.x, pos.y);
      } else {
        handleMouseMove(e);
      }
    },
    [
      isSpacePressed,
      activeTool,
      getWorldPointerPos,
      handleTouch,
      handleConnectorMove,
      selectionRect,
      updateSelection,
      handleMouseMove,
    ]
  );

  const handleStageMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isSpacePressed) return;

      if (e.evt instanceof TouchEvent) {
        handleTouchEnd();
      }

      if (activeTool === 'connector') {
        const pos = getWorldPointerPos();
        handleConnectorUp(pos.x, pos.y);
        return;
      }

      if (selectionRect) {
        const x1 = Math.min(selectionRect.x1, selectionRect.x2);
        const y1 = Math.min(selectionRect.y1, selectionRect.y2);
        const x2 = Math.max(selectionRect.x1, selectionRect.x2);
        const y2 = Math.max(selectionRect.y1, selectionRect.y2);

        // Bounding-box intersection test — selects shapes that overlap selection rect
        const inside = stateRef.current.shapes
          .filter((s) => {
            const bb = getShapeBoundingBox(s);
            return bb.x < x2 && bb.x + bb.width > x1 && bb.y < y2 && bb.y + bb.height > y1;
          })
          .map((s) => s.id);

        setSelectedIds(inside);
        endSelection();
      } else {
        handleMouseUp();
      }
    },
    [
      isSpacePressed,
      activeTool,
      getWorldPointerPos,
      handleTouchEnd,
      handleConnectorUp,
      selectionRect,
      endSelection,
      handleMouseUp,
    ]
  );

  // ── Update transformer on selection change ─────────────────────────
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const nodes = selectedIds
      .map((id) => stageRef.current?.findOne('#' + id))
      .filter((n): n is Konva.Node => !!n);
    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds, state.shapes]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      // Track Shift for constrained resize
      if (e.key === 'Shift') {
        setShiftHeld(true);
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if (ctrl && e.key === 's') {
        e.preventDefault();
        setIsSaveDialogOpen(true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectorIds.length > 0) {
          // Delete selected connectors
          pushState({
            ...stateRef.current,
            connectors: stateRef.current.connectors.filter(
              (c) => !selectedConnectorIds.includes(c.id)
            ),
          });
          setSelectedConnectorIds([]);
        } else if (selectedIds.length > 0) {
          // Delete selected shapes + orphaned connectors
          const deletedIds = new Set(selectedIds);
          pushState({
            ...stateRef.current,
            shapes: stateRef.current.shapes.filter((s) => !deletedIds.has(s.id)),
            connectors: stateRef.current.connectors.filter(
              (c) => !deletedIds.has(c.fromShapeId) && !deletedIds.has(c.toShapeId)
            ),
          });
          setSelectedIds([]);
        }
      } else if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case 's':
            setActiveTool('select');
            break;
          case 'r':
            setActiveTool('rect');
            break;
          case 'e':
            setActiveTool('ellipse');
            break;
          case 't':
            setActiveTool('triangle');
            break;
          case 'l':
            setActiveTool('line');
            break;
          case 'a':
            setActiveTool('arrow');
            break;
          case 'c':
            setActiveTool('connector');
            break;
          case 'p':
            setActiveTool('pen');
            break;
          case 'x':
            setActiveTool('text');
            break;
          case 'h':
            setActiveTool('pan');
            break;
          case 'escape':
            if (activeTool !== 'select') setActiveTool('select');
            else {
              setSelectedIds([]);
              setSelectedConnectorIds([]);
              setEditingId(null);
            }
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
      if (e.key === 'Shift') setShiftHeld(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedIds, selectedConnectorIds, pushState, undo, redo, activeTool, setActiveTool]);

  // ── Export ─────────────────────────────────────────────────────────
  const handleExportPng = useCallback(() => {
    if (!stageRef.current) return;
    const transformer = transformerRef.current;
    if (transformer) transformer.visible(false);
    const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `pocketool-canvas-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (transformer) transformer.visible(true);
  }, []);

  const handleExportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `pocketool-canvas-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [state]);

  // ── Derived ────────────────────────────────────────────────────────
  const selectedShapes = state.shapes.filter((s) => selectedIds.includes(s.id));
  const isSingleLineOrArrow =
    selectedIds.length === 1 &&
    (selectedShapes[0]?.type === 'line' || selectedShapes[0]?.type === 'arrow');

  const editingShape = state.shapes.find((s) => s.id === editingId);

  const getEditingRect = () => {
    if (!editingId || !stageRef.current) return null;
    const node = stageRef.current.findOne('#' + editingId);
    if (!node) return null;
    const absPos = node.getAbsolutePosition();
    return {
      x: absPos.x,
      y: absPos.y,
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
      rotation: node.rotation(),
    };
  };
  const editingRect = getEditingRect();

  // Show pre-draw panel when a drawing tool is selected, nothing selected, and not drawing
  const showPenPanel = DRAW_TOOLS.includes(activeTool) && selectedIds.length === 0 && !newShape;

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-background touch-none ${
        isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        snap={snap}
        setSnap={setSnap}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showOrigin={showOrigin}
        setShowOrigin={setShowOrigin}
        zoom={viewport.scale}
        onZoomIn={() => setViewport((v) => ({ ...v, scale: Math.min(10, v.scale * 1.1) }))}
        onZoomOut={() => setViewport((v) => ({ ...v, scale: Math.max(0.1, v.scale / 1.1) }))}
        onZoomReset={() => setViewport({ x: size.width / 2, y: size.height / 2, scale: 1 })}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSaveVersion={() => setIsSaveDialogOpen(true)}
        onOpenVersions={() => setIsVersionsOpen(true)}
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
        onImportJson={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                const data = JSON.parse(ev.target?.result as string);
                pushState(data);
              } catch {
                console.error('Invalid JSON file');
              }
            };
            reader.readAsText(file);
          };
          input.click();
        }}
        onClear={() => {
          if (confirm('Are you sure you want to clear the canvas?')) {
            pushState({ shapes: [], connectors: [] });
            setSelectedIds([]);
          }
        }}
      />

      {/* Properties panel — shows when shapes are selected */}
      {selectedIds.length > 0 && !editingId && (
        <PropertiesPanel
          selectedShapes={selectedShapes}
          onUpdate={updateSelectedShapes}
          onClose={() => setSelectedIds([])}
        />
      )}

      {/* Pre-draw properties panel */}
      {showPenPanel && (
        <PenPropertiesPanel
          activeTool={activeTool}
          properties={pendingProps}
          onUpdate={(updates) => setPendingProps((prev) => ({ ...prev, ...updates }))}
        />
      )}

      <VersionsDrawer
        isOpen={isVersionsOpen}
        onClose={() => setIsVersionsOpen(false)}
        versions={versions}
        onLoad={pushState}
        onDelete={deleteVersion}
        onRename={renameVersion}
      />

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent title="Save Version">
          <div className="py-4">
            <input
              type="text"
              placeholder="Version name..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveVersion(versionName || `Version ${new Date().toLocaleString()}`, state);
                  setIsSaveDialogOpen(false);
                  setVersionName('');
                }
              }}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="ghost"
              className="border border-border"
              onClick={() => setIsSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveVersion(versionName || `Version ${new Date().toLocaleString()}`, state);
                setIsSaveDialogOpen(false);
                setVersionName('');
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable={activeTool === 'pan' || isSpacePressed}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
        onWheel={(e) => handleZoom(e.evt, stageRef.current)}
        onDragMove={(e) => {
          if (activeTool === 'pan' || isSpacePressed) {
            setViewport((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
          }
        }}
      >
        <GridLayer
          viewport={viewport}
          width={size.width}
          height={size.height}
          isVisible={showGrid}
          showOrigin={showOrigin}
        />

        <Layer>
          {/* Connectors — use stageRef to get live node positions during drag */}
          {state.connectors.map((c) => {
            const from = state.shapes.find((s) => s.id === c.fromShapeId);
            const to = state.shapes.find((s) => s.id === c.toShapeId);
            if (!from || !to) return null;
            return (
              <ConnectorRenderer
                key={c.id}
                connector={c}
                fromShape={from}
                toShape={to}
                stageRef={stageRef}
                dragTick={dragTick}
                isSelected={selectedConnectorIds.includes(c.id)}
                onSelect={() => onSelectConnector(c.id)}
              />
            );
          })}

          {/* Shapes */}
          {state.shapes.map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={{
                ...shape,
                opacity: editingId === shape.id ? 0 : (shape.opacity ?? 1),
              }}
              snap={snap}
              scale={viewport.scale}
              viewport={viewport}
              onSelect={() => onSelect(shape.id, false)}
              onDblClick={(id) => {
                if (shape.type === 'text') setEditingId(id);
              }}
              onChange={updateShape}
              onDragMove={handleShapeDragMove}
              isDraggable={activeTool === 'select' && !isSpacePressed}
            />
          ))}

          {/* Anchor dots — shown on all shapes when connector tool is active */}
          {activeTool === 'connector' &&
            state.shapes.map((shape) => (
              <AnchorDots
                key={`anchors-${shape.id}`}
                shape={shape}
                hoveredAnchorId={
                  hoveredAnchor ? `${hoveredAnchor.shapeId}:${hoveredAnchor.anchor}` : null
                }
                scale={viewport.scale}
              />
            ))}

          {/* Draft connector line */}
          {connectorDraft &&
            (() => {
              const fromShape = state.shapes.find((s) => s.id === connectorDraft.fromShapeId);
              if (!fromShape) return null;
              const fromPos = getAnchorPosition(fromShape, connectorDraft.fromAnchor);
              return (
                <DraftConnector
                  fromX={fromPos.x}
                  fromY={fromPos.y}
                  toX={connectorDraft.toX}
                  toY={connectorDraft.toY}
                />
              );
            })()}

          {/* In-progress shape while drawing */}
          {newShape && (
            <ShapeRenderer
              shape={newShape}
              snap={snap}
              scale={viewport.scale}
              viewport={viewport}
            />
          )}

          {/* Selection rectangle */}
          {selectionRect && (
            <KonvaRect
              x={Math.min(selectionRect.x1, selectionRect.x2)}
              y={Math.min(selectionRect.y1, selectionRect.y2)}
              width={Math.abs(selectionRect.x1 - selectionRect.x2)}
              height={Math.abs(selectionRect.y1 - selectionRect.y2)}
              fill="rgba(99, 102, 241, 0.08)"
              stroke="#6366f1"
              strokeWidth={1 / viewport.scale}
              listening={false}
            />
          )}

          {/* Transformer */}
          {activeTool === 'select' && selectedIds.length > 0 && !editingId && (
            <Transformer
              ref={transformerRef}
              ignoreStroke={true}
              rotateEnabled={true}
              flipEnabled={false}
              keepRatio={shiftHeld}
              enabledAnchors={
                isSingleLineOrArrow
                  ? []
                  : [
                      'top-left',
                      'top-center',
                      'top-right',
                      'middle-left',
                      'middle-right',
                      'bottom-left',
                      'bottom-center',
                      'bottom-right',
                    ]
              }
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox;
                return newBox;
              }}
              anchorDragBoundFunc={(oldPos, newPos) => {
                if (!snap) return newPos;
                // Convert screen position to world coordinates, snap, convert back
                const worldX = (newPos.x - viewport.x) / viewport.scale;
                const worldY = (newPos.y - viewport.y) / viewport.scale;
                const snappedX = Math.round(worldX / GRID_SIZE) * GRID_SIZE;
                const snappedY = Math.round(worldY / GRID_SIZE) * GRID_SIZE;
                return {
                  x: snappedX * viewport.scale + viewport.x,
                  y: snappedY * viewport.scale + viewport.y,
                };
              }}
            />
          )}

          {/* Point handles for line/arrow */}
          {isSingleLineOrArrow && !editingId && (
            <PointHandles
              shape={selectedShapes[0] as LineShape | ArrowShape}
              viewport={viewport}
              snap={snap}
              onChange={updateShape}
            />
          )}
        </Layer>
      </Stage>

      {/* Text editor overlay */}
      {editingId && editingShape?.type === 'text' && editingRect && (
        <TextEditor
          value={(editingShape as TextShape).text || ''}
          x={editingRect.x}
          y={editingRect.y}
          width={editingRect.width}
          height={editingRect.height}
          rotation={editingRect.rotation}
          fontSize={(editingShape as TextShape).fontSize || 20}
          fontStyle={(editingShape as TextShape).fontStyle || 'normal'}
          align={(editingShape as TextShape).align || 'left'}
          scale={viewport.scale}
          onSave={(text) => {
            updateShape({ ...editingShape, text } as TextShape);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
