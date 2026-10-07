"use client";
import { useActionState, useState } from "react";
import { updateProfile } from "./actions";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
export function ProfileForm({name, locality, email}: {name: string; locality: string; email: string}) {
  const [state, action] = useActionState(updateProfile, {});
  const [values, setValues] = useState({display_name: name, locality});
  return <form action={action} className="form-panel"><h2 className="panel-title">Tus datos</h2><FormMessage state={state} /><Field label="Nombre público" htmlFor="display_name"><input className="input" id="display_name" name="display_name" value={values.display_name} onChange={e => setValues({...values, display_name: e.target.value})} minLength={2} maxLength={80} required /></Field><Field label="Localidad" htmlFor="locality"><input className="input" id="locality" name="locality" value={values.locality} onChange={e => setValues({...values, locality: e.target.value})} minLength={2} maxLength={80} required /></Field><Field label="Correo de acceso" htmlFor="email" hint="Solo vos podés ver este correo. No se publica en tus anuncios."><input className="input bg-muted" id="email" type="email" value={email} readOnly /></Field><SubmitButton>Guardar perfil</SubmitButton></form>;
}
