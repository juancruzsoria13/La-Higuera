"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import type { ActionState } from "@/lib/action-state";
export function SubmitButton({children, disabled = false, destructive = false, outline = false}: {children: React.ReactNode; disabled?: boolean; destructive?: boolean; outline?: boolean}) {
  const {pending} = useFormStatus();
  return <Button type="submit" disabled={pending || disabled} variant={destructive ? "destructive" : outline ? "outline" : "default"}>{pending && <LoaderCircle className="size-4 animate-spin" />}{pending ? "Un momento…" : children}</Button>;
}
export function FormMessage({state}: {state: ActionState}) {
  if (!state.error && !state.success) return null;
  return <p role={state.error ? "alert" : "status"} className={`notice ${state.error ? "notice-error" : "notice-success"}`}>{state.error ?? state.success}</p>;
}
export function Field({label, hint, children, htmlFor}: {label: string; hint?: string; children: React.ReactNode; htmlFor: string}) {
  return <div className="space-y-2"><label className="field-label" htmlFor={htmlFor}>{label}</label>{children}{hint && <p className="caption text-muted-foreground">{hint}</p>}</div>;
}
