/**
 * Shared DOM lookups used by every game module.
 */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} element`);
  return el as T;
}
