/**
 * API request URLs. In dev, uses relative `/api/...` (Vite proxy). For hosted
 * frontends, set `VITE_API_BASE_URL` to the FastAPI origin (no trailing slash).
 */
export function apiUrl(pathAndQuery: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const path = pathAndQuery.startsWith("/")
    ? pathAndQuery
    : `/${pathAndQuery}`;
  return `${base}${path}`;
}
