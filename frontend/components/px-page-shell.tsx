"use client";

/**
 * @component PxPageShell
 * @description Shared page wrapper — Linear dark canvas background.
 * @design-credit Frontend design by angrybear
 */

import type { ReactNode } from "react";

interface PxPageShellProps {
  children: ReactNode;
  /** Override `margin` on outer wrapper. Default: "0 -24px -24px" (bleeds past main padding). */
  margin?: string;
}

export function PxPageShell({ children, margin = "0 -24px -24px" }: PxPageShellProps) {
  return (
    <div style={{
      background: "var(--px-black)",
      flex: 1,
      margin,
      position: "relative",
      color: "var(--px-white, #f7f8f8)",
      display: "flex",
      flexDirection: "column",
    }}>
      {children}
    </div>
  );
}
