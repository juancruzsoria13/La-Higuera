import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const client = await createClient();
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const code = request.nextUrl.searchParams.get("code");
  let ok = false;
  if (tokenHash && request.nextUrl.searchParams.get("type") === "email") {
    const {error} = await client.auth.verifyOtp({type: "email", token_hash: tokenHash}); ok = !error;
  } else if (code) {
    const {error} = await client.auth.exchangeCodeForSession(code); ok = !error;
  }
  return NextResponse.redirect(new URL(ok ? "/mi-perfil?bienvenida=1" : "/ingresar?confirmacion=error", request.url));
}
