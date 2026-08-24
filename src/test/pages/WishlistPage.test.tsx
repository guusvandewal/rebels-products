import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductsByIds } from '../../api/products';
import type { Product } from '../../api/products';
import { WishlistPage } from '../../pages/WishlistPage';
import { useWishlistStore } from '../../stores/wishlist';

vi.mock('../../api/products', () => ({
  useProductsByIds: vi.fn(),
}));

// Each row renders ProductImage, which fetches an Unsplash photo via
// react-query — unrelated to wishlist behavior, and would need a real
// QueryClientProvider (and hit the network) just to avoid crashing.
vi.mock('../../components/ProductImage', () => ({
  ProductImage: () => null,
}));

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Gaming Mouse',
    brand: 'GamerGadgets',
    category: 'Accessories',
    image: 'https://example.com/1.jpg',
    specifications: {},
  },
  {
    id: 2,
    name: 'Bluetooth Headphones',
    brand: 'SoundWave',
    category: 'Audio',
    image: 'https://example.com/2.jpg',
    specifications: {},
  },
];

function renderWishlistPage() {
  return render(
    <MemoryRouter>
      <WishlistPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useWishlistStore.setState({ productIds: [] });
  // Reactive to the ids argument (like the real API), so removing an item
  // from the store provably drops it from what's rendered, not just from
  // state that nothing then re-reads.
  vi.mocked(useProductsByIds).mockImplementation(
    (ids) =>
      ({
        data: PRODUCTS.filter((product) => ids.includes(product.id)),
        isPending: false,
      }) as ReturnType<typeof useProductsByIds>,
  );
});

describe('WishlistPage', () => {
  it('shows the empty state when nothing is saved', () => {
    renderWishlistPage();

    expect(screen.getByRole('heading', { name: 'Nothing saved' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View products' })).toBeInTheDocument();
  });

  it('lists saved products, and removing one drops it from the list and the store', async () => {
    useWishlistStore.setState({ productIds: [1, 2] });
    const user = userEvent.setup();
    renderWishlistPage();

    expect(screen.getByText('2 products')).toBeInTheDocument();
    expect(screen.getByText('Gaming Mouse')).toBeInTheDocument();
    expect(screen.getByText('Bluetooth Headphones')).toBeInTheDocument();

    const rows = screen.getAllByRole('listitem');
    const mouseRow = rows.find((row) => row.textContent?.includes('Gaming Mouse'));
    await user.click(within(mouseRow!).getByRole('button', { name: 'Remove' }));

    expect(screen.queryByText('Gaming Mouse')).not.toBeInTheDocument();
    expect(screen.getByText('Bluetooth Headphones')).toBeInTheDocument();
    expect(useWishlistStore.getState().productIds).toEqual([2]);
  });

  it('"Remove all" clears the wishlist and shows the empty state again', async () => {
    useWishlistStore.setState({ productIds: [1, 2] });
    const user = userEvent.setup();
    renderWishlistPage();

    await user.click(screen.getByRole('button', { name: 'Remove all' }));

    expect(useWishlistStore.getState().productIds).toEqual([]);
    expect(screen.getByRole('heading', { name: 'Nothing saved' })).toBeInTheDocument();
  });
});
