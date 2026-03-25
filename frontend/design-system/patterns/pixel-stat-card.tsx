import * as React from "react"
import { cn } from "@/lib/utils"
import {
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
} from "../primitives/pixel-card"
import { PixelBadge } from "../primitives/pixel-badge"
import type { PixelCardProps } from "../primitives/pixel-card"

export interface PixelStatCardProps extends Omit<PixelCardProps, "children"> {
  /** Card label / metric name */
  label: string
  /** Primary value to display */
  value: React.ReactNode
  /** Optional secondary value or unit */
  sub?: React.ReactNode
  /** Change indicator: positive / negative / neutral */
  trend?: "up" | "down" | "flat"
  /** Numeric change shown in badge */
  change?: string
}

const trendMap = {
  up:   { variant: "profit" as const, prefix: "▲" },
  down: { variant: "loss"   as const, prefix: "▼" },
  flat: { variant: "neutral"as const, prefix: "—" },
}

const PixelStatCard = React.forwardRef<HTMLDivElement, PixelStatCardProps>(
  ({ className, label, value, sub, trend, change, accentBar = true, ...props }, ref) => {
    const trendInfo = trend ? trendMap[trend] : null

    return (
      <PixelCard
        ref={ref}
        accentBar={accentBar}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        <PixelCardHeader>
          <PixelCardTitle>{label}</PixelCardTitle>
        </PixelCardHeader>

        <PixelCardContent>
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-pixel text-[20px] text-[var(--px-white)] leading-none">
                {value}
              </span>
              {sub && (
                <span className="font-pixel text-[8px] text-[var(--px-grey-mid)]">
                  {sub}
                </span>
              )}
            </div>

            {trendInfo && change && (
              <PixelBadge variant={trendInfo.variant}>
                {trendInfo.prefix} {change}
              </PixelBadge>
            )}
          </div>
        </PixelCardContent>
      </PixelCard>
    )
  }
)
PixelStatCard.displayName = "PixelStatCard"

export { PixelStatCard }
