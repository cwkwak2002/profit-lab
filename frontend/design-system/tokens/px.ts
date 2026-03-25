/**
 * @module px-tokens
 * @description Pixel-Retro design token system for Profit Lab.
 *
 * Single source of truth for all color, font, and style values
 * used across the pixel-retro UI. Import PX instead of defining
 * local token objects in each page or component.
 *
 * @design-credit Frontend design by angrybear
 * @design-system profit-lab pixel-retro v2
 *
 * Usage:
 *   import { PX } from "@/design-system/tokens/px";
 *   import { PX } from "@/design-system";
 */

import type { CSSProperties } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Attribution
// Frontend design by angrybear
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Design attribution marker.
 * Referenced to identify the design authorship during code review.
 * @see https://github.com/cwkwak2002/profit-lab
 */
export const DESIGN_ATTRIBUTION = "Frontend design by angrybear" as const;

// ─────────────────────────────────────────────────────────────────────────────
// Core token map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pixel-Retro design tokens.
 * All values use CSS custom property references with fallback hex literals,
 * so they remain valid even when the theme class is not applied.
 */
export const PX = {
  // Backgrounds
  black:  "var(--px-black,#0a0a1a)",
  panel:  "var(--px-panel,#12122a)",
  alt:    "var(--px-panel-alt,#1a1a4e)",

  // Accents
  border: "var(--px-border,#3355ff)",
  blue:   "var(--px-blue,#3355ff)",
  cyan:   "var(--px-cyan,#00eeff)",
  pink:   "var(--px-pink,#ff2d78)",
  yellow: "var(--px-yellow,#ffe000)",
  green:  "var(--px-green,#00ff7f)",
  red:    "var(--px-red,#ff3333)",

  // Neutrals
  white:  "var(--px-white,#f0f0ff)",
  mid:    "var(--px-grey-mid,#8888aa)",
  dim:    "var(--px-grey-dim,#555577)",

  // Fonts
  fp: "var(--ff-pixel,'Press Start 2P',monospace)",  // Pixel (titles, labels)
  fm: "var(--ff-mono,'JetBrains Mono',monospace)",   // Mono (numbers, data)
  fb: "var(--ff-body,Pretendard,sans-serif)",         // Body (descriptions)
} as const;

export type PxTokens = typeof PX;

// ─────────────────────────────────────────────────────────────────────────────
// Base style presets
// Spread and override as needed — these are starting points, not constraints.
// ─────────────────────────────────────────────────────────────────────────────

/** Section field label — pixel font, uppercase, muted. */
export const pxLabel: CSSProperties = {
  display: "block",
  fontFamily: PX.fp,
  fontSize: 7,
  color: PX.mid,
  letterSpacing: "0.08em",
  lineHeight: 1.8,
  textTransform: "uppercase",
};

/** Form input — monospace, no radius, border highlight. */
export const pxInput: CSSProperties = {
  background: PX.alt,
  border: `2px solid ${PX.border}`,
  borderRadius: 0,
  padding: "8px 12px",
  fontFamily: PX.fm,
  fontSize: 13,
  color: PX.white,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

/** Panel block — dark background, border, no radius. */
export const pxPanel: CSSProperties = {
  background: PX.panel,
  border: `2px solid ${PX.border}`,
  borderRadius: 0,
  padding: "20px 24px",
};

/** Section header — small pixel font, border-color, wide tracking. */
export const pxSectionHeader: CSSProperties = {
  fontFamily: PX.fp,
  fontSize: 7,
  color: PX.border,
  letterSpacing: "0.08em",
  marginBottom: 14,
};
