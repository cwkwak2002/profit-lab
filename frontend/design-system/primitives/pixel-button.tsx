import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const pixelButtonVariants = cva(
  // base
  [
    "inline-flex items-center justify-center gap-2",
    "font-pixel text-[10px] uppercase tracking-widest",
    "border-2 cursor-pointer select-none",
    "transition-all duration-150",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        cyan: [
          "border-[var(--px-cyan)] text-[var(--px-cyan)] bg-transparent",
          "hover:bg-[var(--px-cyan)] hover:text-[var(--px-black)]",
          "hover:shadow-[0_0_12px_var(--px-cyan)]",
        ],
        pink: [
          "border-[var(--px-pink)] text-[var(--px-pink)] bg-transparent",
          "hover:bg-[var(--px-pink)] hover:text-white",
          "hover:shadow-[0_0_12px_var(--px-pink)]",
        ],
        green: [
          "border-[var(--px-green)] text-[var(--px-green)] bg-transparent",
          "hover:bg-[var(--px-green)] hover:text-[var(--px-black)]",
          "hover:shadow-[0_0_12px_var(--px-green)]",
        ],
        yellow: [
          "border-[var(--px-yellow)] text-[var(--px-yellow)] bg-transparent",
          "hover:bg-[var(--px-yellow)] hover:text-[var(--px-black)]",
          "hover:shadow-[0_0_12px_var(--px-yellow)]",
        ],
        solid: [
          "border-[var(--px-cyan)] bg-[var(--px-cyan)] text-[var(--px-black)]",
          "hover:shadow-[0_0_16px_var(--px-cyan)]",
        ],
        ghost: [
          "border-[var(--px-border)] text-[var(--px-grey-mid)] bg-transparent",
          "hover:border-[var(--px-grey-hi)] hover:text-[var(--px-grey-hi)]",
        ],
      },
      size: {
        sm:  "h-7  px-3 py-1",
        md:  "h-9  px-4 py-2",
        lg:  "h-11 px-6 py-3",
        icon:"h-9  w-9  p-0",
      },
    },
    defaultVariants: {
      variant: "cyan",
      size: "md",
    },
  }
)

export interface PixelButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pixelButtonVariants> {}

const PixelButton = React.forwardRef<HTMLButtonElement, PixelButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(pixelButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
)
PixelButton.displayName = "PixelButton"

export { PixelButton, pixelButtonVariants }
