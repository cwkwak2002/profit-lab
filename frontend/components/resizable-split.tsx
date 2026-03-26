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
  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      if (totalHeight === 0) return;
      const y = e.clientY - rect.top;

      const minTop = minTopPx / totalHeight;
      const maxTop = 1 - minBottomPx / totalHeight;
      const newRatio = Math.max(minTop, Math.min(maxTop, y / totalHeight));
      setRatio(newRatio);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("mouseup", onMouseUp, true);
    };

    // capture:true so TradingView iframe/canvas can't swallow these events
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mouseup", onMouseUp, true);
  }, [minTopPx, minBottomPx]);

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
      {isDragging && <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, userSelect: "none" }} />}
      <div style={{ flex: `0 0 ${ratio * 100}%`, overflow: "hidden" }}>
        {top}
      </div>
      <div
        onMouseDown={onMouseDown}
        style={{ flexShrink: 0, height: 8, cursor: "row-resize", background: "rgba(51,85,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ width: 32, height: 2, borderRadius: 2, background: "rgba(136,136,170,0.4)" }} />
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {bottom}
      </div>
    </div>
  );
}
