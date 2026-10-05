import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/env";
export const currentUser = cache(async () => {
  if (!isConfigured()) return null;
  const client = await createClient();
  const {data: {user}} = await client.auth.getUser();
  return user;
});
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/ingresar");
  return user;
}
