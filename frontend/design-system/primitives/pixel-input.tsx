import * as React from "react"
import { cn } from "@/lib/utils"

export interface PixelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Accent colour for the neon focus ring */
  accent?: "cyan" | "pink" | "green" | "yellow"
}

const accentFocusClass: Record<string, string> = {
  cyan:   "focus:border-[var(--px-cyan)]   focus:shadow-[0_0_8px_var(--px-cyan)]",
  pink:   "focus:border-[var(--px-pink)]   focus:shadow-[0_0_8px_var(--px-pink)]",
  green:  "focus:border-[var(--px-green)]  focus:shadow-[0_0_8px_var(--px-green)]",
  yellow: "focus:border-[var(--px-yellow)] focus:shadow-[0_0_8px_var(--px-yellow)]",
}

const PixelInput = React.forwardRef<HTMLInputElement, PixelInputProps>(
  ({ className, accent = "cyan", ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full h-9 px-3",
        "bg-[var(--px-panel-alt)] text-[var(--px-white)]",
        "border-2 border-[var(--px-border)]",
        "font-pixel text-[10px]",
        "outline-none transition-all duration-150",
        "placeholder:text-[var(--px-grey-lo)]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        accentFocusClass[accent],
        className
      )}
      {...props}
    />
  )
)
PixelInput.displayName = "PixelInput"

export { PixelInput }
