"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface PixelTagGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onToggle"> {
  options: string[]
  selected: string[]
  onToggle: (option: string) => void
  /** Max selections allowed (default: unlimited) */
  max?: number
  accent?: "cyan" | "pink" | "green" | "yellow"
}

const accentMap = {
  cyan:   {
    active: "border-[var(--px-cyan)] text-[var(--px-black)] bg-[var(--px-cyan)] shadow-[0_0_8px_var(--px-cyan)]",
    hover:  "hover:border-[var(--px-cyan)] hover:text-[var(--px-cyan)]",
  },
  pink:   {
    active: "border-[var(--px-pink)] text-white bg-[var(--px-pink)] shadow-[0_0_8px_var(--px-pink)]",
    hover:  "hover:border-[var(--px-pink)] hover:text-[var(--px-pink)]",
  },
  green:  {
    active: "border-[var(--px-green)] text-[var(--px-black)] bg-[var(--px-green)] shadow-[0_0_8px_var(--px-green)]",
    hover:  "hover:border-[var(--px-green)] hover:text-[var(--px-green)]",
  },
  yellow: {
    active: "border-[var(--px-yellow)] text-[var(--px-black)] bg-[var(--px-yellow)] shadow-[0_0_8px_var(--px-yellow)]",
    hover:  "hover:border-[var(--px-yellow)] hover:text-[var(--px-yellow)]",
  },
}

const PixelTagGroup = React.forwardRef<HTMLDivElement, PixelTagGroupProps>(
  ({ className, options, selected, onToggle, max, accent = "cyan", ...props }, ref) => {
    const colors = accentMap[accent]

    const handleClick = (opt: string) => {
      if (selected.includes(opt)) {
        onToggle(opt)
      } else if (!max || selected.length < max) {
        onToggle(opt)
      }
    }

    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap gap-2", className)}
        {...props}
      >
        {options.map((opt) => {
          const isActive = selected.includes(opt)
          const isDisabled = !isActive && !!max && selected.length >= max

          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleClick(opt)}
              disabled={isDisabled}
              className={cn(
                "font-pixel text-[8px] uppercase tracking-wider",
                "border-2 px-3 py-1.5",
                "transition-all duration-150 cursor-pointer",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                isActive
                  ? colors.active
                  : cn(
                      "border-[var(--px-border)] text-[var(--px-grey-mid)] bg-transparent",
                      colors.hover
                    )
              )}
            >
              {isActive && <span className="mr-1">✓</span>}
              {opt}
            </button>
          )
        })}
      </div>
    )
  }
)
PixelTagGroup.displayName = "PixelTagGroup"

export { PixelTagGroup }
