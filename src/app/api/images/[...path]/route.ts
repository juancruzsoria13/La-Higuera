import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/modules/products/storage";
export async function GET(_request: Request, {params}: {params: Promise<{path: string[]}>}) {
  const {path} = await params;
  if (path.length !== 2 || !/^[0-9a-f-]{36}$/.test(path[0]) || !/^[0-9a-f-]{36}\.webp$/.test(path[1])) return new Response(null, {status: 404});
  const client = await createClient();
  const {data, error} = await client.storage.from(BUCKET).download(path.join("/"));
  if (error || !data) return new Response(null, {status: 404, headers: {"Cache-Control": "private, no-store"}});
  return new Response(data, {headers: {"Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}});
}
