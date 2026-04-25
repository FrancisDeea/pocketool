import { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Transformer, Rect as KonvaRect } from "react-konva";
import type Konva from "konva";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { useCanvas } from "../hooks/useCanvas";
import { useTools } from "../hooks/useTools";
import { useHistory } from "../hooks/useHistory";
import { useAutoSave } from "../hooks/useAutoSave";
import { useVersions } from "../hooks/useVersions";
import { useSelection } from "../hooks/useSelection";
import { Toolbar } from "./Toolbar";
import { GridLayer } from "./GridLayer";
import { ShapeRenderer } from "./ShapeRenderer";
import { ConnectorRenderer } from "./ConnectorRenderer";
import { VersionsDrawer } from "./VersionsDrawer";
import { PropertiesPanel } from "./PropertiesPanel";
import { TextEditor } from "./TextEditor";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import type { ShapeType, Shape, CanvasState, ViewportState, TextShape } from "../types";

export default function Editor() {
  const [activeTool, setActiveTool] = useState<ShapeType>("select");
  const [snap, setSnap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 0, 
    height: typeof window !== 'undefined' ? window.innerHeight : 0 
  });

  const { versions, saveVersion, deleteVersion, renameVersion } = useVersions();
  const { selectionRect, startSelection, updateSelection, endSelection } =
    useSelection();

  // Load initial data from Dexie
  const initialData = useLiveQuery(async () => {
    const autosave = await db.toolStates.get("tool:canvas:autosave");
    const viewport = await db.toolStates.get("tool:canvas:viewport");
    const snapState = await db.toolStates.get("tool:canvas:snap");
    const gridState = await db.toolStates.get("tool:canvas:show-grid");

    return {
      state: autosave
        ? (JSON.parse(autosave.content as string) as CanvasState)
        : { shapes: [], connectors: [] },
      viewport: viewport ? (viewport.content as ViewportState) : { x: 0, y: 0, scale: 1 },
      snap: snapState ? (snapState.content as boolean) : true,
      showGrid: gridState ? (gridState.content as boolean) : true,
    };
  });

  const { viewport, setViewport, handleZoom, handleTouch, handleTouchEnd } =
    useCanvas(initialData?.viewport);
  const { state, pushState, undo, redo, canUndo, canRedo } = useHistory(
    initialData?.state || { shapes: [], connectors: [] },
  );
  const { newShape, handleMouseDown, handleMouseMove, handleMouseUp } =
    useTools(activeTool, state, pushState, viewport, snap, (shape) => {
      if (shape.type === "text") {
        setEditingId(shape.id);
      }
    });

  const editingShape = state.shapes.find((s) => s.id === editingId);

  const getEditingRect = () => {
    if (!editingId || !stageRef.current) return null;
    const node = stageRef.current.findOne("#" + editingId);
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

  useAutoSave(state, viewport, snap, showGrid);

  useEffect(() => {
    if (initialData?.snap !== undefined) setSnap(initialData.snap);
    if (initialData?.showGrid !== undefined) setShowGrid(initialData.showGrid);
    if (initialData?.viewport) setViewport(initialData.viewport);
  }, [initialData, setViewport]);

  // Prevent browser scroll
  useEffect(() => {
    const preventDefault = (e: WheelEvent | TouchEvent) => {
      if (
        e.target instanceof HTMLCanvasElement ||
        (e.target as HTMLElement)?.closest(".konvajs-content")
      ) {
        if (e.cancelable) e.preventDefault();
      }
    };
    window.addEventListener("wheel", preventDefault, { passive: false });
    window.addEventListener("touchmove", preventDefault, { passive: false });
    return () => {
      window.removeEventListener("wheel", preventDefault);
      window.removeEventListener("touchmove", preventDefault);
    };
  }, []);

  const updateShape = useCallback(
    (updatedShape: Shape) => {
      const newShapes = state.shapes.map((s) =>
        s.id === updatedShape.id ? updatedShape : s,
      );
      pushState({ ...state, shapes: newShapes });
    },
    [state, pushState],
  );

  const updateSelectedShapes = useCallback(
    (updates: Partial<Shape>) => {
      const newShapes = state.shapes.map((s) =>
        selectedIds.includes(s.id) ? { ...s, ...updates } : s,
      ) as Shape[];
      pushState({ ...state, shapes: newShapes });
    },
    [state, selectedIds, pushState],
  );

  const onSelect = useCallback(
    (id: string, isShift: boolean) => {
      if (activeTool !== "select" || isSpacePressed) return;
      if (isShift) {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );
      } else {
        setSelectedIds([id]);
      }
    },
    [activeTool, isSpacePressed],
  );

  const getPointerPos = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    return {
      x: (pos.x - viewport.x) / viewport.scale,
      y: (pos.y - viewport.y) / viewport.scale,
    };
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (isSpacePressed) return;

    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedIds([]);
      if (activeTool === "select") {
        const pos = getPointerPos();
        startSelection(pos.x, pos.y);
      }
    }

    if (activeTool !== "select" && activeTool !== "pan") {
      handleMouseDown(e);
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (isSpacePressed) return;
    
    // Handle multi-touch zoom/pan
    if (e.evt instanceof TouchEvent && e.evt.touches.length > 1) {
      handleTouch(e as Konva.KonvaEventObject<TouchEvent>);
      return;
    }

    if (selectionRect) {
      const pos = getPointerPos();
      updateSelection(pos.x, pos.y);
    } else {
      handleMouseMove(e);
    }
  };

  const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (isSpacePressed) return;

    if (e.evt instanceof TouchEvent) {
      handleTouchEnd();
    }

    if (selectionRect) {
      const x1 = Math.min(selectionRect.x1, selectionRect.x2);
      const y1 = Math.min(selectionRect.y1, selectionRect.y2);
      const x2 = Math.max(selectionRect.x1, selectionRect.x2);
      const y2 = Math.max(selectionRect.y1, selectionRect.y2);

      const inside = state.shapes
        .filter((s) => {
          return s.x >= x1 && s.x <= x2 && s.y >= y1 && s.y <= y2;
        })
        .map((s) => s.id);

      setSelectedIds(inside);
      endSelection();
    } else {
      handleMouseUp();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl && e.key === "z") {
        if (shift) redo();
        else undo();
      } else if (ctrl && e.key === "s") {
        e.preventDefault();
        setIsSaveDialogOpen(true);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          const newShapes = state.shapes.filter(
            (s) => !selectedIds.includes(s.id),
          );
          pushState({ ...state, shapes: newShapes });
          setSelectedIds([]);
        }
      } else {
        switch (e.key.toLowerCase()) {
          case "s":
            setActiveTool("select");
            break;
          case "r":
            setActiveTool("rect");
            break;
          case "e":
            setActiveTool("ellipse");
            break;
          case "t":
            setActiveTool("triangle");
            break;
          case "l":
            setActiveTool("line");
            break;
          case "a":
            setActiveTool("arrow");
            break;
          case "c":
            setActiveTool("connector");
            break;
          case "p":
            setActiveTool("pen");
            break;
          case "x":
            setActiveTool("text");
            break;
          case "h":
            setActiveTool("pan");
            break;
          case "escape":
            setActiveTool("select");
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [state, selectedIds, pushState, undo, redo, activeTool]);

  const handleExportPng = useCallback(() => {
    if (!stageRef.current) return;

    const transformer = transformerRef.current;
    if (transformer) transformer.visible(false);

    const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `pocketool-canvas-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (transformer) transformer.visible(true);
  }, []);

  const handleExportJson = useCallback(() => {
    const data = JSON.stringify(state);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `pocketool-canvas-${Date.now()}.json`;
    link.href = url;
    link.click();
  }, [state]);

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

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const selectedShapes = state.shapes.filter((s) => selectedIds.includes(s.id));

  // Update transformer
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const nodes = selectedIds
          .map((id) => stageRef.current?.findOne("#" + id))
          .filter((node): node is Konva.Node => !!node);
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, state.shapes]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-background touch-none ${isSpacePressed ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        snap={snap}
        setSnap={setSnap}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        zoom={viewport.scale}
        onZoomIn={() =>
          setViewport((v) => ({ ...v, scale: Math.min(10, v.scale * 1.1) }))
        }
        onZoomOut={() =>
          setViewport((v) => ({ ...v, scale: Math.max(0.1, v.scale / 1.1) }))
        }
        onZoomReset={() => setViewport((v) => ({ ...v, scale: 1 }))}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSaveVersion={() => setIsSaveDialogOpen(true)}
        onOpenVersions={() => setIsVersionsOpen(true)}
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
        onImportJson={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json";
          input.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const data = JSON.parse(e.target?.result as string);
                pushState(data);
              } catch (err) {
                console.error("Invalid JSON file");
              }
            };
            reader.readAsText(file);
          };
          input.click();
        }}
        onClear={() => {
          if (confirm("Are you sure you want to clear the canvas?")) {
            pushState({ shapes: [], connectors: [] });
          }
        }}
      />

      <PropertiesPanel
        selectedShapes={selectedShapes}
        onUpdate={updateSelectedShapes}
      />

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
                if (e.key === "Enter") {
                  saveVersion(
                    versionName || `Version ${new Date().toLocaleString()}`,
                    state,
                  );
                  setIsSaveDialogOpen(false);
                  setVersionName("");
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
                saveVersion(
                  versionName || `Version ${new Date().toLocaleString()}`,
                  state,
                );
                setIsSaveDialogOpen(false);
                setVersionName("");
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
        draggable={activeTool === "pan" || isSpacePressed}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
        onWheel={(e) => {
          handleZoom(e.evt, stageRef.current);
        }}
        onDragMove={(e) => {
          if (activeTool === "pan" || isSpacePressed) {
            setViewport({
              ...viewport,
              x: e.target.x(),
              y: e.target.y(),
            });
          }
        }}
      >
        <GridLayer
          viewport={viewport}
          width={size.width}
          height={size.height}
          isVisible={showGrid}
        />
        <Layer>
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
              />
            );
          })}
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
                if (shape.type === "text") setEditingId(id);
              }}
              onChange={updateShape}
              isDraggable={activeTool === "select" && !isSpacePressed}
            />
          ))}

          {newShape && <ShapeRenderer shape={newShape} snap={snap} scale={viewport.scale} viewport={viewport} />}
          {selectionRect && (
            <KonvaRect
              x={Math.min(selectionRect.x1, selectionRect.x2)}
              y={Math.min(selectionRect.y1, selectionRect.y2)}
              width={Math.abs(selectionRect.x1 - selectionRect.x2)}
              height={Math.abs(selectionRect.y1 - selectionRect.y2)}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={1}
            />
          )}
          {activeTool === "select" && selectedIds.length > 0 && !editingId && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
              enabledAnchors={[
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
                "top-center",
                "bottom-center",
                "middle-left",
                "middle-right",
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>

      {editingId &&
        editingShape &&
        editingShape.type === "text" &&
        editingRect && (
          <TextEditor
            value={(editingShape as TextShape).text || ""}
            x={editingRect.x}
            y={editingRect.y}
            width={editingRect.width}
            height={editingRect.height}
            rotation={editingRect.rotation}
            fontSize={(editingShape as TextShape).fontSize || 20}
            fontStyle={(editingShape as TextShape).fontStyle || "normal"}
            align={(editingShape as TextShape).align || "left"}
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

