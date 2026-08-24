import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { z } from 'zod';
import type { FiltersState } from '../hooks/useProductFilters';

const API_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  image: z.string().url(),
  specifications: z.record(z.string()),
});

export type Product = z.infer<typeof productSchema>;

async function http<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} failed with ${res.status}`);
  }
  return schema.parse(await res.json());
}

/**
 * Maps the filter reducer state onto json-server query params:
 *   /products?q=laptop&category_like=Electronics&brand=TechTron&brand=SoundWave
 * Repeating `brand` is json-server's OR filter, matching any of the values.
 */
function toSearchParams(filters: FiltersState): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.category) params.set('category_like', filters.category);
  filters.brand.forEach((brand) => params.append('brand', brand));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useProducts(filters: FiltersState) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => http(`/products${toSearchParams(filters)}`, z.array(productSchema)),
    placeholderData: keepPreviousData,
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => http('/products', z.array(productSchema)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => http(`/products/${id}`, productSchema),
    enabled: Number.isFinite(id),
  });
}

/** Used by the wishlist page: /products?id=1&id=4&id=9 */
export function useProductsByIds(ids: number[]) {
  const sorted = [...ids].sort((a, b) => a - b);
  return useQuery({
    queryKey: ['products', 'byIds', sorted],
    queryFn: () => {
      const params = new URLSearchParams();
      sorted.forEach((id) => params.append('id', String(id)));
      return http(`/products?${params.toString()}`, z.array(productSchema));
    },
    enabled: sorted.length > 0,
    placeholderData: keepPreviousData,
  });
}
