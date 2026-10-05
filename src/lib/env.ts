export function isConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR_PROJECT") && !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.includes("YOUR_"));
}
export function publicEnv() {
  if (!isConfigured()) throw new Error("Falta configurar Supabase. Consultá el README y .env.example.");
  return { url: process.env.NEXT_PUBLIC_SUPABASE_URL!, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! };
}
