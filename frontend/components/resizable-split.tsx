"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";

interface Props {
  top: ReactNode;
  bottom: ReactNode;
  defaultRatio?: number; // 0-1, portion for top
  minTopPx?: number;
  minBottomPx?: number;
}

export function ResizableSplit({
  top,
  bottom,
  defaultRatio = 0.55,
  minTopPx = 200,
  minBottomPx = 150,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(defaultRatio);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      const y = e.clientY - rect.top;

      const minTop = minTopPx / totalHeight;
      const maxTop = 1 - minBottomPx / totalHeight;
      const newRatio = Math.max(minTop, Math.min(maxTop, y / totalHeight));
      setRatio(newRatio);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [minTopPx, minBottomPx]);

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden">
      <div style={{ flex: `0 0 ${ratio * 100}%` }} className="overflow-hidden">
        {top}
      </div>
      <div
        onMouseDown={onMouseDown}
        className="flex-shrink-0 h-2 cursor-row-resize bg-border hover:bg-primary/20 transition-colors flex items-center justify-center"
      >
        <div className="w-8 h-0.5 rounded bg-muted-foreground/40" />
      </div>
      <div style={{ flex: 1 }} className="overflow-auto">
        {bottom}
      </div>
    </div>
  );
}
