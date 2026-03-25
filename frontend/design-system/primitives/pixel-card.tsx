import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const pixelCardVariants = cva(
  [
    "relative bg-[var(--px-panel)] border-2",
    "overflow-hidden",
  ],
  {
    variants: {
      accent: {
        cyan:    "border-[var(--px-cyan)]",
        pink:    "border-[var(--px-pink)]",
        green:   "border-[var(--px-green)]",
        yellow:  "border-[var(--px-yellow)]",
        purple:  "border-[var(--px-purple)]",
        default: "border-[var(--px-border)]",
      },
      glow: {
        true:  "",
        false: "",
      },
      padding: {
        none: "p-0",
        sm:   "p-3",
        md:   "p-4",
        lg:   "p-6",
      },
    },
    compoundVariants: [
      { accent: "cyan",   glow: true, className: "shadow-[0_0_16px_var(--px-cyan)/40]" },
      { accent: "pink",   glow: true, className: "shadow-[0_0_16px_var(--px-pink)/40]" },
      { accent: "green",  glow: true, className: "shadow-[0_0_16px_var(--px-green)/40]" },
      { accent: "yellow", glow: true, className: "shadow-[0_0_16px_var(--px-yellow)/40]" },
      { accent: "purple", glow: true, className: "shadow-[0_0_16px_var(--px-purple)/40]" },
    ],
    defaultVariants: {
      accent: "default",
      glow: false,
      padding: "md",
    },
  }
)

/* Top accent bar colour lookup */
const accentBarColor: Record<string, string> = {
  cyan:   "var(--px-cyan)",
  pink:   "var(--px-pink)",
  green:  "var(--px-green)",
  yellow: "var(--px-yellow)",
  purple: "var(--px-purple)",
  default:"var(--px-border)",
}

export interface PixelCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pixelCardVariants> {
  /** Show a 3px top accent bar */
  accentBar?: boolean
}

const PixelCard = React.forwardRef<HTMLDivElement, PixelCardProps>(
  ({ className, accent = "default", glow, padding, accentBar = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(pixelCardVariants({ accent, glow, padding }), className)}
      {...props}
    >
      {accentBar && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: accentBarColor[accent ?? "default"] }}
        />
      )}
      {children}
    </div>
  )
)
PixelCard.displayName = "PixelCard"

const PixelCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mb-3", className)} {...props} />
  )
)
PixelCardHeader.displayName = "PixelCardHeader"

const PixelCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("font-pixel text-[10px] uppercase tracking-widest text-[var(--px-grey-mid)]", className)}
      {...props}
    />
  )
)
PixelCardTitle.displayName = "PixelCardTitle"

const PixelCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
)
PixelCardContent.displayName = "PixelCardContent"

export { PixelCard, PixelCardHeader, PixelCardTitle, PixelCardContent, pixelCardVariants }
