"use client";
import * as Dialog from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
export const AlertDialog = Dialog.Root;
export const AlertDialogTrigger = Dialog.Trigger;
export function AlertDialogContent({className, ...props}: React.ComponentProps<typeof Dialog.Content>) {
  return <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-navy/55" /><Dialog.Content className={cn("fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex max-w-[480px] flex-col gap-5 rounded-2xl bg-card p-7 shadow-[0_20px_25px_-5px_rgba(23,37,84,.15),0_8px_10px_-6px_rgba(23,37,84,.15)]", className)} {...props} /></Dialog.Portal>;
}
export function AlertDialogTitle(props: React.ComponentProps<typeof Dialog.Title>) {return <Dialog.Title className="h3" {...props} />;}
export function AlertDialogDescription(props: React.ComponentProps<typeof Dialog.Description>) {return <Dialog.Description className="body-sm -mt-3 text-muted-foreground" {...props} />;}
export function AlertDialogCancel({className, ...props}: React.ComponentProps<typeof Dialog.Cancel>) {return <Dialog.Cancel className={cn(buttonVariants({variant: "ghost"}), className)} {...props} />;}
