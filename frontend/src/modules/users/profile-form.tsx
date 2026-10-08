"use client";
import { useActionState, useState } from "react";
import { updateProfile } from "./actions";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import type { Option } from "@/lib/catalog";
export function ProfileForm({name, locality, localities, email}: {name: string; locality: string; localities: Option[]; email: string}) {
  const [state, action] = useActionState(updateProfile, {});
  const [values, setValues] = useState({display_name: name, locality_id: locality});
  return <form action={action} className="form-panel"><h2 className="panel-title">Tus datos</h2><FormMessage state={state} /><Field label="Nombre público" htmlFor="display_name"><input className="input" id="display_name" name="display_name" value={values.display_name} onChange={e => setValues({...values, display_name: e.target.value})} minLength={2} maxLength={80} required /></Field><Field label="Localidad" htmlFor="locality_id"><select className="input" id="locality_id" name="locality_id" value={values.locality_id} onChange={e => setValues({...values, locality_id: e.target.value})}>{localities.map(l => <option value={l.id} key={l.id}>{l.name}</option>)}</select></Field><Field label="Correo de acceso" htmlFor="email" hint="Solo vos podés ver este correo. No se publica en tus anuncios."><input className="input bg-muted" id="email" type="email" value={email} readOnly /></Field><SubmitButton disabled={localities.length === 0}>Guardar perfil</SubmitButton></form>;
}
