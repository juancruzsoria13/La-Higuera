import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
// Botón de la marca (lh-btn): 44px de alto, radio 12px y texto `label`. El foco usa el anillo global.
export const buttonVariants = cva("inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent px-5 py-2.5 text-sm leading-5 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50", {
  variants: {variant: {default: "bg-primary text-primary-foreground hover:bg-primary/90", outline: "border-border bg-card text-foreground hover:bg-muted", ghost: "text-foreground hover:bg-muted", destructive: "bg-destructive text-white hover:bg-destructive/90", onDark: "bg-card text-primary hover:bg-carousel-ice"}},
  defaultVariants: {variant: "default"},
});
export function Button({className, variant, asChild = false, ...props}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {asChild?: boolean}) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({variant, className}))} {...props} />;
}
