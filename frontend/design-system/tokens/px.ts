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

  // Fonts (Linear theme: Inter for display/body, JetBrains Mono for data)
  fp: "var(--ff-pixel,Inter,Pretendard,sans-serif)",  // Titles, labels (was Press Start 2P)
  fm: "var(--ff-mono,'JetBrains Mono',ui-monospace,monospace)",  // Mono (numbers, data)
  fb: "var(--ff-body,Inter,Pretendard,sans-serif)",   // Body (descriptions)
} as const;

export type PxTokens = typeof PX;

// ─────────────────────────────────────────────────────────────────────────────
// Typography scale
// Consistent named sizes — use these instead of raw numbers.
// Press Start 2P renders large visually; sizes below account for that.
// ─────────────────────────────────────────────────────────────────────────────

export const pxSz = {
  // Pixel font (PX.fp) — Press Start 2P
  pageTitle:    20,  // h1 main page title
  sectionTitle: 13,  // section / panel heading
  tableHeader:  10,  // table <th> / column label
  label:         9,  // form field label, sidebar header
  micro:         8,  // badge, status, tag text

  // Mono font (PX.fm) — JetBrains Mono
  dataXl:       22,  // hero metric (e.g. backtest return %)
  dataLg:       18,  // large data value
  dataMd:       14,  // standard data cell
  dataSm:       12,  // secondary / sub value

  // Body font (PX.fb) — Pretendard
  body:         14,  // paragraph, description
  bodySm:       12,  // secondary description
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Base style presets
// Spread and override as needed — these are starting points, not constraints.
// ─────────────────────────────────────────────────────────────────────────────

/** Section field label — Linear eyebrow: Inter, uppercase, subtle. */
export const pxLabel: CSSProperties = {
  display: "block",
  fontFamily: PX.fb,
  fontSize: 12,
  fontWeight: 500,
  color: PX.mid,
  letterSpacing: "0.04em",
  lineHeight: 1.4,
  textTransform: "uppercase",
};

/** Form input — Linear: surface bg, 1px hairline, 8px radius. */
export const pxInput: CSSProperties = {
  background: PX.panel,
  border: `1px solid ${PX.border}`,
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: PX.fb,
  fontSize: 14,
  color: PX.white,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

/** Panel block — Linear: surface-1, 1px hairline, 12px radius. */
export const pxPanel: CSSProperties = {
  background: PX.panel,
  border: `1px solid ${PX.border}`,
  borderRadius: 12,
  padding: "24px",
};

/** Section header — Linear: Inter, ink, slight negative tracking. */
export const pxSectionHeader: CSSProperties = {
  fontFamily: PX.fb,
  fontSize: 13,
  fontWeight: 600,
  color: PX.white,
  letterSpacing: "-0.2px",
  marginBottom: 12,
};

// ─────────────────────────────────────────────────────────────────────────────
// Linear component presets — reuse these instead of inlining styles per page.
// ─────────────────────────────────────────────────────────────────────────────

/** Card / panel — Linear surface-1, 1px hairline, 12px radius. */
export const pxCard: CSSProperties = {
  background: PX.panel,
  border: `1px solid ${PX.border}`,
  borderRadius: 12,
  padding: 24,
};

/** Primary button — Linear lavender CTA. */
export const pxButtonPrimary: CSSProperties = {
  background: PX.blue,
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  padding: "9px 16px",
  fontFamily: PX.fb,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 0.15s ease",
};

/** Secondary button — charcoal surface with hairline border. */
export const pxButtonSecondary: CSSProperties = {
  background: PX.panel,
  color: PX.white,
  border: `1px solid ${PX.border}`,
  borderRadius: 8,
  padding: "9px 16px",
  fontFamily: PX.fb,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

/** Page title — Inter display weight, negative tracking, ink. */
export const pxTitle: CSSProperties = {
  fontFamily: PX.fp,
  fontSize: 28,
  fontWeight: 600,
  color: PX.white,
  letterSpacing: "-0.6px",
  lineHeight: 1.2,
};
