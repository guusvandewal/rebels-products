import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  productIds: number[];
  toggle: (id: number) => void;
  remove: (id: number) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      productIds: [],
      toggle: (id) =>
        set((state) => ({
          productIds: state.productIds.includes(id)
            ? state.productIds.filter((current) => current !== id)
            : [...state.productIds, id],
        })),
      remove: (id) =>
        set((state) => ({
          productIds: state.productIds.filter((current) => current !== id),
        })),
      clear: () => set({ productIds: [] }),
    }),
    { name: 'rebels-wishlist' },
  ),
);

export const useIsWishlisted = (id: number) =>
  useWishlistStore((state) => state.productIds.includes(id));

export const useWishlistCount = () => useWishlistStore((state) => state.productIds.length);
