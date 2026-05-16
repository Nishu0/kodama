// Null-safe Convex HTTP client for server-side use in Next.js routes.
// Mirrors the pattern in `src/v2/convex/client.ts` so the dashboard and the
// daemon point at the same deployment when CONVEX_URL is set.

import { ConvexHttpClient } from "convex/browser";

let cached: ConvexHttpClient | null | undefined;

export function getConvex(): ConvexHttpClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.CONVEX_URL?.trim();
  if (!url) {
    cached = null;
    return null;
  }
  try {
    cached = new ConvexHttpClient(url);
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export function hasConvex(): boolean {
  return getConvex() !== null;
}
