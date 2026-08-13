import { Dialog, DialogContent } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ScrollArea from '@/components/ui/ScrollArea';
import { Trash2, Play } from 'lucide-react';
import type { ToolHistory } from '@/db';
import type { CanvasState } from '../types';

interface VersionData {
  name?: string;
  state: CanvasState;
}

interface VersionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ToolHistory[];
  onLoad: (data: CanvasState) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
}

export function VersionsDrawer({
  isOpen,
  onClose,
  versions,
  onLoad,
  onDelete,
}: VersionsDrawerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        title="Versions History"
        description="Manage and restore previous versions of your canvas."
        className="sm:max-w-[425px]"
      >
        <ScrollArea className="mt-4 h-[60vh]">
          <div className="flex flex-col gap-3 pr-4">
            {versions.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border text-text-tertiary">
                <p className="text-sm">No saved versions yet.</p>
              </div>
            ) : (
              versions.map((v) => {
                const data = v.data as VersionData;
                return (
                  <div
                    key={v.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-sm transition-all hover:border-accent/50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-text-primary">
                          {data.name || 'Untitled Version'}
                        </h4>
                        <p className="text-[10px] text-text-tertiary">
                          {new Date(v.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-danger hover:bg-danger/10"
                          onClick={() => v.id && onDelete(v.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 flex-1 gap-1.5 border border-border hover:bg-surface-hover text-text-primary"
                        onClick={() => {
                          onLoad(data.state);
                          onClose();
                        }}
                      >
                        <Play size={12} className="fill-current" />
                        Restore
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
