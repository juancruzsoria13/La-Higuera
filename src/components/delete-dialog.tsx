"use client";
import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogTrigger, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "./ui/alert-dialog";
import { FormMessage, SubmitButton } from "./forms";
export function DeleteDialog({action, account = false}: {action: (state: ActionState, form: FormData) => Promise<ActionState>; account?: boolean}) {
  const [state, formAction] = useActionState(action, {});
  const [confirmation, setConfirmation] = useState("");
  return <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="text-destructive"><Trash2 className="size-4" />{account ? "Eliminar mi cuenta" : "Eliminar anuncio"}</Button></AlertDialogTrigger>
    <AlertDialogContent><AlertDialogTitle>{account ? "¿Eliminar tu cuenta?" : "¿Eliminar este anuncio?"}</AlertDialogTitle><AlertDialogDescription>{account ? "Se eliminarán tu cuenta, perfil, comercios, anuncios e imágenes. Esta acción es definitiva. Si falla, podés reintentar desde acá." : "El anuncio y su imagen se eliminarán. Esta acción no se puede deshacer."}</AlertDialogDescription>
      <form action={formAction} className="space-y-5"><FormMessage state={state} /><label className="field-label" htmlFor={account ? "confirm-account" : "confirm-product"}>Escribí ELIMINAR para confirmar</label><input className="input" id={account ? "confirm-account" : "confirm-product"} name="confirmation" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" required /><div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel>Cancelar</AlertDialogCancel><SubmitButton destructive disabled={confirmation !== "ELIMINAR"}>Eliminar definitivamente</SubmitButton></div></form>
    </AlertDialogContent></AlertDialog>;
}
