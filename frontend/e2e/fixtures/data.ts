/**
 * Helpers for generating unique smoke-test entity names and resolving
 * seed-data IDs at runtime via the API.
 */

const API_URL = process.env.API_URL ?? 'http://localhost:3001/api';

let counter = 0;

/** Returns a unique name prefix safe to use in entity names. */
export function uid(prefix: string): string {
  counter += 1;
  return `smoke-${prefix}-${Date.now()}-${counter}`;
}

interface LookupItem {
  id: string;
  name: string;
  slug?: string;
}

/** Fetches a lookup list authenticated with the provided cookie. */
async function fetchLookup(path: string, cookie: string): Promise<LookupItem[]> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) return [];
  return res.json() as Promise<LookupItem[]>;
}

/**
 * Returns the id of the first available service, or undefined.
 * Used so ticket/asset creation does not hard-code a service id.
 */
export async function firstServiceId(cookie: string): Promise<string | undefined> {
  const items = await fetchLookup('/lookups/services', cookie);
  return items[0]?.id;
}

/** Returns the first seeded asset id, useful for relationship tests. */
export async function firstAssetId(cookie: string): Promise<string | undefined> {
  const res = await fetch(`${API_URL}/assets?limit=1`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) return undefined;
  const body = await res.json() as { data?: LookupItem[] } | LookupItem[];
  const list = Array.isArray(body) ? body : (body.data ?? []);
  return list[0]?.id;
}

/** Returns first two asset ids (for relationship tests). */
export async function twoAssetIds(cookie: string): Promise<[string, string] | null> {
  const res = await fetch(`${API_URL}/assets?limit=2`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) return null;
  const body = await res.json() as { data?: LookupItem[] } | LookupItem[];
  const list = Array.isArray(body) ? body : (body.data ?? []);
  if (list.length < 2) return null;
  return [list[0].id, list[1].id];
}

/** Returns first software license id. */
export async function firstSoftwareLicenseId(cookie: string): Promise<string | undefined> {
  const res = await fetch(`${API_URL}/software`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) return undefined;
  const body = await res.json() as LookupItem[];
  return body[0]?.id;
}
