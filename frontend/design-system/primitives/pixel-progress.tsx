import * as React from "react"
import { cn } from "@/lib/utils"

export interface PixelProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value: number
  /** Label shown above bar (optional) */
  label?: string
  /** Show value % text on the right */
  showValue?: boolean
}

/**
 * HP-bar style progress.  Fill colour shifts automatically:
 *   >50%  → green   (var(--px-green))
 *   >25%  → yellow  (var(--px-yellow))
 *   ≤25%  → pink    (var(--px-pink))  + glow pulse
 */
const PixelProgress = React.forwardRef<HTMLDivElement, PixelProgressProps>(
  ({ className, value, label, showValue = false, ...props }, ref) => {
    const clamped = Math.min(100, Math.max(0, value))
    const fillColor =
      clamped > 50 ? "var(--px-green)"
      : clamped > 25 ? "var(--px-yellow)"
      : "var(--px-pink)"
    const isLow = clamped <= 25

    return (
      <div ref={ref} className={cn("flex flex-col gap-1", className)} {...props}>
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <span className="font-pixel text-[8px] uppercase tracking-widest text-[var(--px-grey-mid)]">
                {label}
              </span>
            )}
            {showValue && (
              <span
                className="font-pixel text-[8px]"
                style={{ color: fillColor }}
              >
                {clamped}%
              </span>
            )}
          </div>
        )}
        {/* Track */}
        <div
          className="w-full border border-[var(--px-border)] bg-[var(--px-panel-alt)]"
          style={{ height: "var(--pixel-hp-height, 12px)" }}
        >
          {/* Fill */}
          <div
            className={cn(
              "h-full transition-[width] duration-300",
              isLow && "px-glow-pulse"
            )}
            style={{
              width: `${clamped}%`,
              background: fillColor,
              boxShadow: isLow ? `0 0 8px ${fillColor}` : undefined,
            }}
          />
        </div>
      </div>
    )
  }
)
PixelProgress.displayName = "PixelProgress"

export { PixelProgress }
