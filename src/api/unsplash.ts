import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined;

const unsplashPhotoSchema = z.object({
  urls: z.object({
    small: z.string().url(),
  }),
  alt_description: z.string().nullable(),
});

export type UnsplashPhoto = z.infer<typeof unsplashPhotoSchema>;

const CACHE_KEY_PREFIX = 'unsplash-photo:';

function readCache(query: string): UnsplashPhoto | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + query);
    return raw ? unsplashPhotoSchema.parse(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(query: string, photo: UnsplashPhoto) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + query, JSON.stringify(photo));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — not fatal, just skip caching.
  }
}

async function fetchRandomPhoto(query: string): Promise<UnsplashPhoto> {
  const cached = readCache(query);
  if (cached) return cached;

  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } },
  );
  if (!res.ok) {
    throw new Error(`GET /photos/random failed with ${res.status}`);
  }
  const photo = unsplashPhotoSchema.parse(await res.json());
  writeCache(query, photo);
  return photo;
}

/**
 * Unsplash's demo rate limit is 50 req/hour. Results are cached in
 * localStorage (not just React Query's in-memory cache) so a full page
 * reload reuses previously-fetched photos instead of re-spending the quota.
 */
export function useUnsplashPhoto(query: string) {
  return useQuery({
    queryKey: ['unsplash', query],
    queryFn: () => fetchRandomPhoto(query),
    enabled: Boolean(ACCESS_KEY),
    staleTime: Infinity,
    retry: false,
  });
}
