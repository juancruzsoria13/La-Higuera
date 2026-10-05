import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
export const buttonVariants = cva("inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50", {
  variants: {variant: {default: "bg-primary text-primary-foreground hover:bg-primary/90", outline: "border border-border bg-card hover:bg-muted", ghost: "hover:bg-muted", destructive: "bg-destructive text-white hover:bg-destructive/90"}},
  defaultVariants: {variant: "default"},
});
export function Button({className, variant, asChild = false, ...props}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {asChild?: boolean}) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({variant, className}))} {...props} />;
}
