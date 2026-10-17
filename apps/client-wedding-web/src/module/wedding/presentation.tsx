import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const polaroidFrameClass = "rounded-none border border-paper-edge bg-paper text-foreground shadow-polaroid";

type CardProps =
  | ({ as?: "article" } & ComponentProps<"article">)
  | ({ as: "div" } & ComponentProps<"div">)
  | ({ as: "form" } & ComponentProps<"form">)
  | ({ as: "button" } & ComponentProps<"button">);

/** Layout and semantics stay with the caller; this frame adds no interactive wrapper. */
export function PolaroidCard(props: CardProps) {
  switch (props.as) {
    case "button": { const { as, className, ...rest } = props; return <button type="button" {...rest} className={cn(polaroidFrameClass, className)} />; }
    case "form": { const { as, className, ...rest } = props; return <form {...rest} className={cn(polaroidFrameClass, className)} />; }
    case "div": { const { as, className, ...rest } = props; return <div {...rest} className={cn(polaroidFrameClass, className)} />; }
    default: { const { as, className, ...rest } = props; return <article {...rest} className={cn(polaroidFrameClass, className)} />; }
  }
}

type CardHeadingProps = ComponentProps<"h3"> & { icon?: ReactNode; as?: "h3" | "span" };
export function CardHeading({ as: Tag = "h3", icon, children, className, ...props }: CardHeadingProps) {
  return <Tag {...props} className={cn("flex flex-col items-center justify-center gap-4 font-serif text-[1.05rem] font-light tracking-[0.14em] text-foreground sm:text-[1.15rem]", className)}>{icon}{children}</Tag>;
}

export function SectionHeading({ className, ...props }: ComponentProps<"h2">) {
  return <h2 {...props} className={cn("font-serif text-[1.55rem] font-extralight uppercase tracking-[0.18em] text-foreground sm:text-[1.75rem]", className)} />;
}
