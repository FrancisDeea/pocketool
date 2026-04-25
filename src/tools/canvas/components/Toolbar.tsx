import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import {
  MousePointer2,
  Square,
  Circle,
  Triangle,
  Slash,
  ArrowRight,
  Link as LinkIcon,
  Pencil,
  Type,
  Hand,
  Undo2,
  Redo2,
  Grid,
  Magnet,
  Plus,
  Minus,
  Save,
  History,
  Download,
  Upload,
  FileJson,
  Trash2,
  Settings2,
  ChevronDown,
} from "lucide-react";
import type { ShapeType } from "../types";

interface ToolbarProps {
  activeTool: ShapeType;
  setActiveTool: (tool: ShapeType) => void;
  snap: boolean;
  setSnap: (snap: boolean) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSaveVersion: () => void;
  onOpenVersions: () => void;
  onExportPng: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onClear: () => void;
}

export function Toolbar({
  activeTool,
  setActiveTool,
  snap,
  setSnap,
  showGrid,
  setShowGrid,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveVersion,
  onOpenVersions,
  onExportPng,
  onExportJson,
  onImportJson,
  onClear,
}: ToolbarProps) {
  const selectionTools = [
    { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
    { id: "pan", icon: Hand, label: "Pan", shortcut: "H" },
  ];

  const shapeTools = [
    { id: "rect", icon: Square, label: "Rectangle", shortcut: "R" },
    { id: "ellipse", icon: Circle, label: "Ellipse", shortcut: "E" },
    { id: "triangle", icon: Triangle, label: "Triangle", shortcut: "T" },
  ];

  const lineTools = [
    { id: "line", icon: Slash, label: "Line", shortcut: "L" },
    { id: "arrow", icon: ArrowRight, label: "Arrow", shortcut: "A" },
  ];

  const otherTools = [
    { id: "connector", icon: LinkIcon, label: "Connector", shortcut: "C" },
    { id: "pen", icon: Pencil, label: "Pen", shortcut: "P" },
    { id: "text", icon: Type, label: "Text", shortcut: "X" },
  ];

  const renderToolButton = (tool: {
    id: string;
    icon: any;
    label: string;
    shortcut: string;
  }) => (
    <Tooltip
      key={tool.id}
      content={`${tool.label} (${tool.shortcut})`}
      side="bottom"
    >
      <Button
        variant={activeTool === tool.id ? "primary" : "ghost"}
        size="sm"
        className={activeTool === tool.id ? "" : "text-text-secondary"}
        onClick={() => setActiveTool(tool.id as ShapeType)}
      >
        <tool.icon size={18} />
      </Button>
    </Tooltip>
  );

  return (
    <div className="absolute top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-surface/80 p-1.5 shadow-2xl backdrop-blur-md transition-all hover:bg-surface">
      <div className="flex items-center gap-1">
        {/* Selection Tools */}
        {selectionTools.map(renderToolButton)}

        <div className="mx-0.5 h-4 w-px bg-border/50" />

        {/* Shapes Dropdown */}
        <DropdownMenu>
          <Tooltip content="Shapes" side="bottom">
            <DropdownMenuTrigger asChild>
              <Button
                variant={
                  shapeTools.some((t) => t.id === activeTool)
                    ? "primary"
                    : "ghost"
                }
                size="sm"
                className={
                  shapeTools.some((t) => t.id === activeTool)
                    ? "gap-1 px-2"
                    : "gap-1 px-2 text-text-secondary"
                }
              >
                {(() => {
                  const tool =
                    shapeTools.find((t) => t.id === activeTool) ||
                    shapeTools[0];
                  return <tool.icon size={18} />;
                })()}
                <ChevronDown size={12} className="opacity-50" />
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent side="bottom" align="center">
            {shapeTools.map((tool) => (
              <DropdownMenuItem
                key={tool.id}
                onClick={() => setActiveTool(tool.id as ShapeType)}
                className={activeTool === tool.id ? "bg-surface-hover" : ""}
              >
                <tool.icon size={16} />
                <span className="flex-1">{tool.label}</span>
                <span className="text-[10px] opacity-50 font-mono">
                  {tool.shortcut}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Line Tools Dropdown */}
        <DropdownMenu>
          <Tooltip content="Lines & Arrows" side="bottom">
            <DropdownMenuTrigger asChild>
              <Button
                variant={
                  lineTools.some((t) => t.id === activeTool)
                    ? "primary"
                    : "ghost"
                }
                size="sm"
                className={
                  lineTools.some((t) => t.id === activeTool)
                    ? "gap-1 px-2"
                    : "gap-1 px-2 text-text-secondary"
                }
              >
                {(() => {
                  const tool =
                    lineTools.find((t) => t.id === activeTool) || lineTools[0];
                  return <tool.icon size={18} />;
                })()}
                <ChevronDown size={12} className="opacity-50" />
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent side="bottom" align="center">
            {lineTools.map((tool) => (
              <DropdownMenuItem
                key={tool.id}
                onClick={() => setActiveTool(tool.id as ShapeType)}
                className={activeTool === tool.id ? "bg-surface-hover" : ""}
              >
                <tool.icon size={16} />
                <span className="flex-1">{tool.label}</span>
                <span className="text-[10px] opacity-50 font-mono">
                  {tool.shortcut}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-0.5 h-4 w-px bg-border/50" />

        {/* Other Tools */}
        {otherTools.map(renderToolButton)}
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <Tooltip content="Undo (Ctrl+Z)" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            disabled={!canUndo}
            onClick={onUndo}
            className="text-text-secondary"
          >
            <Undo2 size={18} />
          </Button>
        </Tooltip>

        <Tooltip content="Redo (Ctrl+Shift+Z)" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            disabled={!canRedo}
            onClick={onRedo}
            className="text-text-secondary"
          >
            <Redo2 size={18} />
          </Button>
        </Tooltip>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <Tooltip content="Canvas Settings" side="bottom">
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-text-secondary">
                <Settings2 size={18} />
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent side="bottom" align="center">
            <DropdownMenuLabel>Grid Options</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={showGrid}
              onCheckedChange={setShowGrid}
            >
              <div className="flex items-center gap-2">
                <Grid size={16} />
                <span>Show Grid</span>
              </div>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={snap} onCheckedChange={setSnap}>
              <div className="flex items-center gap-2">
                <Magnet size={16} />
                <span>Snap to Grid</span>
              </div>
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              Zoom: {Math.round(zoom * 100)}%
            </DropdownMenuLabel>
            <div className="flex items-center justify-between p-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onZoomOut}
              >
                <Minus size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-xs font-bold"
                onClick={onZoomReset}
              >
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onZoomIn}
              >
                <Plus size={14} />
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1 px-1">
          <Button
            variant="ghost"
            className="h-7 px-1.5 text-[10px] font-bold min-w-[3rem] text-text-primary"
            onClick={onZoomReset}
          >
            {Math.round(zoom * 100)}%
          </Button>
        </div>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <Tooltip content="Save Version (Ctrl+S)" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            className="text-text-secondary"
            onClick={onSaveVersion}
          >
            <Save size={18} />
          </Button>
        </Tooltip>

        <Tooltip content="Versions History" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            className="text-text-secondary"
            onClick={onOpenVersions}
          >
            <History size={18} />
          </Button>
        </Tooltip>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <Tooltip content="Export PNG" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            className="text-text-secondary"
            onClick={onExportPng}
          >
            <Download size={18} />
          </Button>
        </Tooltip>

        <Tooltip content="Export JSON" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            className="text-text-secondary"
            onClick={onExportJson}
          >
            <FileJson size={18} />
          </Button>
        </Tooltip>

        <Tooltip content="Import JSON" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            className="text-text-secondary"
            onClick={onImportJson}
          >
            <Upload size={18} />
          </Button>
        </Tooltip>

        <Tooltip content="Clear Canvas" side="bottom">
          <Button
            variant="danger"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={onClear}
          >
            <Trash2 size={18} />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
