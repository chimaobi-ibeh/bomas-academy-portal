import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-display text-sm font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-navy-deep hover:-translate-y-px",
        gold: "bg-accent text-accent-foreground hover:brightness-95 hover:-translate-y-px",
        destructive:
          "bg-danger-soft text-destructive hover:bg-destructive hover:text-destructive-foreground",
        outline:
          "border border-input bg-surface text-foreground hover:bg-muted hover:border-foreground/30",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        ghost: "hover:bg-muted",
        inverse: "bg-white text-navy-deep hover:bg-gold-soft hover:-translate-y-px",
        ghostInverse: "border border-white/35 text-white hover:bg-white/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 md:h-10",
        sm: "h-11 px-3 text-[13px] md:h-9",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-11 w-11 md:h-10 md:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
