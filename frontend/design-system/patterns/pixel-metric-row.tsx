import * as React from "react"
import { cn } from "@/lib/utils"

export interface PixelMetricItem {
  label: string
  value: React.ReactNode
  accent?: "cyan" | "pink" | "green" | "yellow" | "purple" | "default"
}

export interface PixelMetricRowProps extends React.HTMLAttributes<HTMLDivElement> {
  metrics: PixelMetricItem[]
  /** Divider style between items */
  divider?: boolean
}

const accentValueColor: Record<string, string> = {
  cyan:    "text-[var(--px-cyan)]",
  pink:    "text-[var(--px-pink)]",
  green:   "text-[var(--px-green)]",
  yellow:  "text-[var(--px-yellow)]",
  purple:  "text-[var(--px-purple)]",
  default: "text-[var(--px-white)]",
}

const PixelMetricRow = React.forwardRef<HTMLDivElement, PixelMetricRowProps>(
  ({ className, metrics, divider = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center flex-wrap gap-0",
        "border-2 border-[var(--px-border)] bg-[var(--px-panel)]",
        className
      )}
      {...props}
    >
      {metrics.map((m, i) => (
        <React.Fragment key={i}>
          {divider && i > 0 && (
            <div className="self-stretch w-px bg-[var(--px-border)]" />
          )}
          <div className="flex flex-col items-center gap-1 px-4 py-3 flex-1 min-w-[80px]">
            <span className="font-pixel text-[8px] uppercase tracking-widest text-[var(--px-grey-mid)] whitespace-nowrap">
              {m.label}
            </span>
            <span
              className={cn(
                "font-pixel text-[14px] leading-none",
                accentValueColor[m.accent ?? "default"]
              )}
            >
              {m.value}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
)
PixelMetricRow.displayName = "PixelMetricRow"

export { PixelMetricRow }
