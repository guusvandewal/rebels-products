import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useIsWishlisted, useWishlistCount, useWishlistStore } from '../../stores/wishlist';

beforeEach(() => {
  useWishlistStore.setState({ productIds: [] });
});

describe('useWishlistStore', () => {
  it('toggle adds an id, and toggling the same id again removes it', () => {
    useWishlistStore.getState().toggle(1);
    expect(useWishlistStore.getState().productIds).toEqual([1]);

    useWishlistStore.getState().toggle(1);
    expect(useWishlistStore.getState().productIds).toEqual([]);
  });

  it('remove drops only the given id, leaving the rest untouched', () => {
    useWishlistStore.setState({ productIds: [1, 2, 3] });

    useWishlistStore.getState().remove(2);

    expect(useWishlistStore.getState().productIds).toEqual([1, 3]);
  });

  it('clear empties the list regardless of how many items were saved', () => {
    useWishlistStore.setState({ productIds: [1, 2, 3] });

    useWishlistStore.getState().clear();

    expect(useWishlistStore.getState().productIds).toEqual([]);
  });
});

describe('useIsWishlisted / useWishlistCount', () => {
  // These are the selectors ProductCard, WishlistButton, and the header
  // badge all read from — confirms they re-render (not just that the
  // underlying store state changed) when membership changes elsewhere.
  it('re-render in response to a toggle from outside the hook', () => {
    const { result: isWishlisted } = renderHook(() => useIsWishlisted(5));
    const { result: count } = renderHook(() => useWishlistCount());

    expect(isWishlisted.current).toBe(false);
    expect(count.current).toBe(0);

    act(() => {
      useWishlistStore.getState().toggle(5);
    });

    expect(isWishlisted.current).toBe(true);
    expect(count.current).toBe(1);

    act(() => {
      useWishlistStore.getState().toggle(5);
    });

    expect(isWishlisted.current).toBe(false);
    expect(count.current).toBe(0);
  });
});
