import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const pixelBadgeVariants = cva(
  [
    "inline-flex items-center",
    "font-pixel text-[8px] uppercase tracking-wider",
    "border px-2 py-0.5",
  ],
  {
    variants: {
      variant: {
        profit:  "border-[var(--px-green)]  text-[var(--px-green)]  bg-[var(--px-green)]/10",
        loss:    "border-[var(--px-pink)]   text-[var(--px-pink)]   bg-[var(--px-pink)]/10",
        neutral: "border-[var(--px-grey-mid)] text-[var(--px-grey-mid)] bg-transparent",
        info:    "border-[var(--px-cyan)]   text-[var(--px-cyan)]   bg-[var(--px-cyan)]/10",
        warn:    "border-[var(--px-yellow)] text-[var(--px-yellow)] bg-[var(--px-yellow)]/10",
        dim:     "border-[var(--px-border)] text-[var(--px-grey-lo)] bg-transparent",
      },
      glow: {
        true:  "",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "profit",  glow: true, className: "shadow-[0_0_6px_var(--px-green)]" },
      { variant: "loss",    glow: true, className: "shadow-[0_0_6px_var(--px-pink)]" },
      { variant: "info",    glow: true, className: "shadow-[0_0_6px_var(--px-cyan)]" },
      { variant: "warn",    glow: true, className: "shadow-[0_0_6px_var(--px-yellow)]" },
    ],
    defaultVariants: {
      variant: "neutral",
      glow: false,
    },
  }
)

export interface PixelBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pixelBadgeVariants> {}

const PixelBadge = React.forwardRef<HTMLSpanElement, PixelBadgeProps>(
  ({ className, variant, glow, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(pixelBadgeVariants({ variant, glow }), className)}
      {...props}
    />
  )
)
PixelBadge.displayName = "PixelBadge"

export { PixelBadge, pixelBadgeVariants }
