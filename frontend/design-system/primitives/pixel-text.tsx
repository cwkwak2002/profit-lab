import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const pixelTextVariants = cva(
  "font-pixel leading-relaxed",
  {
    variants: {
      size: {
        "2xs": "text-[8px]",
        xs:    "text-[10px]",
        sm:    "text-[12px]",
        base:  "text-[14px]",
        lg:    "text-[16px]",
        xl:    "text-[20px]",
        "2xl": "text-[24px]",
      },
      color: {
        default: "text-[var(--px-white)]",
        cyan:    "text-[var(--px-cyan)]",
        pink:    "text-[var(--px-pink)]",
        yellow:  "text-[var(--px-yellow)]",
        green:   "text-[var(--px-green)]",
        purple:  "text-[var(--px-purple)]",
        muted:   "text-[var(--px-grey-mid)]",
        dim:     "text-[var(--px-grey-lo)]",
      },
      glow: {
        none:   "",
        cyan:   "px-text-glow-cyan",
        pink:   "px-text-glow-pink",
        yellow: "px-text-glow-yellow",
        green:  "px-text-glow-green",
      },
      blink: {
        true:  "px-blink",
        false: "",
      },
    },
    defaultVariants: {
      size: "sm",
      color: "default",
      glow: "none",
      blink: false,
    },
  }
)

type As = "p" | "span" | "h1" | "h2" | "h3" | "h4" | "div" | "label"

export interface PixelTextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "color">,
    VariantProps<typeof pixelTextVariants> {
  as?: As
}

const PixelText = React.forwardRef<HTMLElement, PixelTextProps>(
  ({ className, as: Tag = "span", size, color, glow, blink, ...props }, ref) => {
    const Comp = Tag as React.ElementType
    return (
      <Comp
        ref={ref}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        className={cn(pixelTextVariants({ size, color: color as any, glow, blink }), className)}
        {...props}
      />
    )
  }
)
PixelText.displayName = "PixelText"

export { PixelText, pixelTextVariants }
