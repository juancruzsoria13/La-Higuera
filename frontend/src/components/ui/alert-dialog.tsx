"use client";
import * as Dialog from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
export const AlertDialog = Dialog.Root;
export const AlertDialogTrigger = Dialog.Trigger;
export function AlertDialogContent({className, ...props}: React.ComponentProps<typeof Dialog.Content>) {
  return <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" /><Dialog.Content className={cn("fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-7 shadow-xl", className)} {...props} /></Dialog.Portal>;
}
export function AlertDialogTitle(props: React.ComponentProps<typeof Dialog.Title>) {return <Dialog.Title className="text-xl font-semibold" {...props} />;}
export function AlertDialogDescription(props: React.ComponentProps<typeof Dialog.Description>) {return <Dialog.Description className="mt-3 mb-6 text-sm leading-6 text-muted-foreground" {...props} />;}
export function AlertDialogCancel({className, ...props}: React.ComponentProps<typeof Dialog.Cancel>) {return <Dialog.Cancel className={cn(buttonVariants({variant: "outline"}), className)} {...props} />;}
