import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.ts";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-sm font-semibold uppercase tracking-[0.24em] transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 active:translate-y-px disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        outline: "border-border bg-background text-foreground hover:bg-muted",
      },
      size: {
        default: "h-11 gap-2 px-4",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
