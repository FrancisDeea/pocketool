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
  Share2,
  Camera,
} from "lucide-react";
import type { ShapeType } from "../types";
import { t } from "@/utils/i18n";

interface ToolbarProps {
  activeTool: ShapeType;
  setActiveTool: (tool: ShapeType) => void;
  snap: boolean;
  setSnap: (snap: boolean) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  showOrigin: boolean;
  setShowOrigin: (show: boolean) => void;
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
  showOrigin,
  setShowOrigin,
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
  // Helper to handle translations with fallbacks while i18n initializes
  const translate = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

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
    <div className="absolute top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5 sm:gap-1 rounded-xl border bg-surface/80 p-1 sm:p-1.5 shadow-2xl backdrop-blur-md transition-all hover:bg-surface max-w-[calc(100vw-2.5rem)] sm:max-w-max overflow-x-auto no-scrollbar" style={{ touchAction: 'pan-x' }}>
      <div className="flex items-center gap-1 shrink-0">
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

      <div className="mx-0.5 h-6 w-px bg-border shrink-0" />

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <Tooltip content={`${translate("tools.canvas.undo", "Deshacer")} (Ctrl+Z)`} side="bottom">
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

        <Tooltip content={`${translate("tools.canvas.redo", "Rehacer")} (Ctrl+Shift+Z)`} side="bottom">
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

      <div className="mx-0.5 h-6 w-px bg-border shrink-0" />

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
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
            <DropdownMenuCheckboxItem
              checked={showOrigin}
              onCheckedChange={setShowOrigin}
            >
              <div className="flex items-center gap-2">
                <Plus size={16} />
                <span>Show Origin</span>
              </div>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={snap} onCheckedChange={setSnap}>
              <div className="flex items-center gap-2">
                <Magnet size={16} />
                <span>{translate("tools.canvas.snapToGrid", "Snap to Grid")}</span>
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

        <div className="hidden sm:flex items-center gap-1 px-1 shrink-0">
          <Button
            variant="ghost"
            className="h-7 px-1.5 text-[10px] font-bold min-w-[3rem] text-text-primary"
            onClick={onZoomReset}
          >
            {Math.round(zoom * 100)}%
          </Button>
        </div>
      </div>

      <div className="mx-0.5 h-6 w-px bg-border shrink-0" />

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <Tooltip content={`${translate("tools.canvas.saveVersion", "Guardar Versión")} (Ctrl+S)`} side="bottom">
          <Button
            variant="ghost"
            size="sm"
            className="text-text-secondary"
            onClick={onSaveVersion}
          >
            <Save size={18} />
          </Button>
        </Tooltip>

        <Tooltip content={translate("tools.canvas.versions", "Versiones")} side="bottom">
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

      <div className="mx-0.5 h-6 w-px bg-border shrink-0" />

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <DropdownMenu>
          <Tooltip content={translate("tools.canvas.importExport", "Importar/Exportar")} side="bottom">
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-text-secondary gap-1 px-1.5">
                <Share2 size={18} />
                <ChevronDown size={12} className="opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent side="bottom" align="end" className="min-w-[160px]">
            <DropdownMenuItem onClick={onExportPng} className="gap-3">
              <Camera size={16} className="text-text-tertiary" />
              <span>{translate("tools.canvas.exportPng", "Exportar PNG")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportJson} className="gap-3">
              <FileJson size={16} className="text-text-tertiary" />
              <span>{translate("tools.canvas.exportJson", "Exportar JSON")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImportJson} className="gap-3">
              <Upload size={16} className="text-text-tertiary" />
              <span>{translate("tools.canvas.importJson", "Importar JSON")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip content={translate("tools.canvas.clear", "Limpiar")} side="bottom">
          <Button
            variant="danger"
            size="sm"
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 ml-0.5"
            onClick={onClear}
          >
            <Trash2 size={18} />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
