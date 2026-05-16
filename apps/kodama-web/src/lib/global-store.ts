// Dev-singleton helper.
//
// Without Convex, our fallback stores keep state in module-level Maps/objects.
// In the Next.js App Router, route handlers and server components are compiled
// into separate bundles — each gets its OWN instance of a module, so a write
// from a POST/callback route isn't visible to the page that reads it. Fast
// Refresh also resets module state on edits.
//
// Pinning the state to globalThis gives exactly one instance per Node process,
// shared across every bundle and surviving Fast Refresh. (Multi-instance
// production deployments still need a real backend — set CONVEX_URL.)

export function globalSingleton<T>(key: string, create: () => T): T {
  const g = globalThis as unknown as Record<string, T | undefined>;
  const existing = g[key];
  if (existing !== undefined) return existing;
  const value = create();
  g[key] = value;
  return value;
}
