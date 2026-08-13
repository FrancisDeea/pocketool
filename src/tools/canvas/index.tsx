import { Suspense, lazy } from 'react';

const Editor = lazy(() => import('./components/Editor'));

export default function Canvas() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-background text-muted-foreground">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="animate-pulse font-medium">Loading Canvas Engine...</p>
          </div>
        </div>
      }
    >
      <Editor />
    </Suspense>
  );
}
