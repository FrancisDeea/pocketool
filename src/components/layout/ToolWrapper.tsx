import { useEffect, useState, type ComponentType } from 'react';
import { loadTool } from '@/tools/registry';

type ToolWrapperProps = {
  toolId: string;
};

export default function ToolWrapper({ toolId }: ToolWrapperProps) {
  const [Component, setComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;
    // We clear it initially so that bridging tools doesn't flash the old one
    setComponent(null);
    
    loadTool(toolId).then((Comp) => {
      if (mounted && Comp) {
        // Use functional state update to prevent React from calling the component if it's a function
        setComponent(() => Comp);
      }
    });

    return () => {
      mounted = false;
    };
  }, [toolId]);

  if (!Component) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
        <div className="animate-pulse">Cargando herramienta...</div>
      </div>
    );
  }

  return <Component />;
}
