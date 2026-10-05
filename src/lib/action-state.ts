export type ActionState = {error?: string; success?: string; warning?: string; values?: Record<string, string>};
export function fields(form: FormData, names: string[]) {
  return Object.fromEntries(names.map(name => [name, String(form.get(name) ?? "")]));
}
