import { apiFetch } from "@/lib/api";
export async function GET(_request: Request, {params}: {params: Promise<{path: string[]}>}) {
  const {path} = await params;
  const missing = () => new Response(null, {status: 404, headers: {"Cache-Control": "private, no-store"}});
  if (path.length !== 2 || !/^[0-9a-f-]{36}$/.test(path[0]) || !/^[0-9a-f-]{36}\.webp$/.test(path[1])) return missing();
  try {
    const response = await apiFetch(`/images/${path.join("/")}`);
    if (!response.ok || !response.body) return missing();
    return new Response(response.body, {headers: {"Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}});
  } catch { return missing(); }
}
