import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isConfigured, publicEnv } from "@/lib/env";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({request});
  if (!isConfigured()) return response;
  const env = publicEnv();
  const client = createServerClient(env.url, env.key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(values) {
      values.forEach(({name, value}) => request.cookies.set(name, value));
      response = NextResponse.next({request});
      values.forEach(({name, value, options}) => response.cookies.set(name, value, options));
    },
  } });
  await client.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
