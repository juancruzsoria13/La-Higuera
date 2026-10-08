"use client";
import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { renewProduct } from "./actions";
import { FormMessage, SubmitButton } from "@/components/forms";
export function RenewButton({id}: {id: string}) {
  const [state, action] = useActionState(renewProduct.bind(null, id), {});
  return <form action={action} className="space-y-3"><FormMessage state={state} /><SubmitButton><RefreshCw className="size-4" />Renovar por 60 días</SubmitButton></form>;
}
