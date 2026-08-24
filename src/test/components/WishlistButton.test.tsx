import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { WishlistButton } from '../../components/WishlistButton';
import { useWishlistStore } from '../../stores/wishlist';

// WishlistButton toggles membership in the global Zustand wishlist store
// rather than local component state, and that store is a singleton shared
// across every test in the process — without a reset, a product added in
// one test would still be "in the wishlist" when the next test renders.
beforeEach(() => {
  useWishlistStore.setState({ productIds: [] });
});

describe('WishlistButton', () => {
  // Covers the default icon-only variant's add/remove cycle, including the
  // aria-pressed state that assistive tech uses to announce toggle status —
  // and confirms the toggle actually writes through to the shared store
  // (the product grid and wishlist page both read from it).
  it('adds and removes a product from the wishlist', async () => {
    const user = userEvent.setup();
    render(<WishlistButton productId={1} productName="High-Performance Laptop" />);

    const addButton = screen.getByRole('button', {
      name: 'Add High-Performance Laptop to wishlist',
    });
    await user.click(addButton);

    expect(useWishlistStore.getState().productIds).toContain(1);

    const removeButton = screen.getByRole('button', {
      name: 'Remove High-Performance Laptop from wishlist',
    });
    expect(removeButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(removeButton);
    expect(useWishlistStore.getState().productIds).not.toContain(1);
  });

  // The "full" variant renders a visible text label instead of an
  // icon-only aria-label, a separate rendering branch from the default
  // variant above — this guards that its accessible name and store
  // toggling still work under that branch.
  it('renders a labeled button for the full variant', async () => {
    const user = userEvent.setup();
    render(<WishlistButton productId={2} productName="Espresso Machine" variant="full" />);

    const button = screen.getByRole('button', { name: /add to wishlist/i });
    await user.click(button);

    expect(screen.getByRole('button', { name: /remove from wishlist/i })).toBeInTheDocument();
    expect(useWishlistStore.getState().productIds).toContain(2);
  });
});
