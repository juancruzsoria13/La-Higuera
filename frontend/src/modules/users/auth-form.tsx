"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { login, register } from "./actions";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
export function AuthForm({signup = false}: {signup?: boolean}) {
  const [state, action] = useActionState(signup ? register : login, {});
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  return <form action={action} className="form-panel"><FormMessage state={state} />{signup && <Field label="Nombre público" htmlFor="display_name" hint="Es el nombre que se verá en tus anuncios."><input className="input" id="display_name" name="display_name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" minLength={2} maxLength={80} required /></Field>}<Field label="Correo electrónico" htmlFor="email"><input className="input" id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={254} required /></Field><Field label="Contraseña" htmlFor="password" hint={signup ? "Al menos 8 caracteres." : undefined}><input className="input" id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 8 : 1} maxLength={128} required /></Field><SubmitButton>{signup ? "Crear mi cuenta" : "Ingresar"}</SubmitButton><p className="text-sm text-muted-foreground">{signup ? "¿Ya tenés cuenta? " : "¿Primera vez por acá? "}<Link className="font-semibold text-primary underline-offset-4 hover:underline" href={signup ? "/ingresar" : "/registro"}>{signup ? "Ingresá" : "Creá tu cuenta"}</Link></p></form>;
}

