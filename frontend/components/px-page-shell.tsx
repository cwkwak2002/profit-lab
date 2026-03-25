"use client";

/**
 * @component PxPageShell
 * @description Shared page wrapper that applies the Profit Lab pixel-retro
 * visual theme: dark space gradient background + CRT scanline overlay.
 *
 * Use this as the outermost wrapper on any inner page that needs the full
 * theme treatment (gradient bg + scanline). The footer pattern (spacer +
 * PxFooter) should still live inside each page — PxPageShell only owns
 * the background layer.
 *
 * @design-credit Frontend design by angrybear
 */

import type { CSSProperties, ReactNode } from "react";

/* ── Scanline overlay ────────────────────────────────────────────────────── */
const SCANLINE: CSSProperties = {
  position: "fixed",
  top: 0, left: 0, width: "100%", height: "100%",
  background:
    "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.18) 50%), " +
    "linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03))",
  backgroundSize: "100% 4px, 3px 100%",
  zIndex: 9998,
  pointerEvents: "none",
};

/* ── Component ───────────────────────────────────────────────────────────── */
interface PxPageShellProps {
  children: ReactNode;
  /** Override `margin` on outer wrapper. Default: "0 -24px -24px" (bleeds past main padding). */
  margin?: string;
}

export function PxPageShell({ children, margin = "0 -24px -24px" }: PxPageShellProps) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #05051e 0%, #1a0b2e 50%, #0c0c1d 100%)",
      backgroundAttachment: "fixed",
      flex: 1,
      margin,
      position: "relative",
      color: "var(--px-white, #f0f0ff)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* CRT scanline */}
      <div style={SCANLINE} aria-hidden="true" />

      {/* Content layer — above scanline */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
