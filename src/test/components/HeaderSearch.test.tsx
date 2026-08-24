import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAllProducts } from '../../api/products';
import type { Product } from '../../api/products';
import { Layout } from '../../components/Layout';

vi.mock('../../api/products', () => ({
  useAllProducts: vi.fn(),
}));

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Gaming Mouse',
    brand: 'GamerGadgets',
    category: 'Accessories',
    image: 'https://example.com/mouse.jpg',
    specifications: {},
  },
  {
    id: 2,
    name: 'Bluetooth Headphones',
    brand: 'SoundWave',
    category: 'Audio',
    image: 'https://example.com/headphones.jpg',
    specifications: {},
  },
];

// Renders the actual current URL as text, so tests can assert on where the
// header search navigated without depending on route content elsewhere.
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderHeaderSearch() {
  return render(
    <MemoryRouter initialEntries={['/wishlist']}>
      <Layout>
        <LocationDisplay />
      </Layout>
    </MemoryRouter>,
  );
}

function searchInput() {
  return screen.getByRole('combobox', { name: 'Search products' });
}

beforeEach(() => {
  vi.mocked(useAllProducts).mockReturnValue({
    data: PRODUCTS,
    isPending: false,
  } as ReturnType<typeof useAllProducts>);
});

describe('HeaderSearch', () => {
  // The label is visually hidden but must still be the input's real
  // accessible name — a placeholder alone isn't a reliable label for
  // assistive tech, since it disappears the moment there's a value.
  it('has an accessible label distinct from the placeholder', () => {
    renderHeaderSearch();

    expect(searchInput()).toHaveAttribute('placeholder', 'What are you looking for?');
    expect(searchInput()).toHaveAccessibleName('Search products');
  });

  // Typing drives the suggestions listbox instantly (a local filter, no
  // debounce needed), but must never touch the URL on its own — the
  // listing only updates on an explicit submit or a picked suggestion.
  it('shows matching suggestions while typing, without navigating', async () => {
    const user = userEvent.setup();
    renderHeaderSearch();

    await user.type(searchInput(), 'mouse');

    expect(screen.getByRole('option', { name: /Gaming Mouse/ })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/wishlist');
  });

  it('submitting searches the listing for the typed text', async () => {
    const user = userEvent.setup();
    renderHeaderSearch();

    await user.type(searchInput(), 'mouse');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/products?q=mouse');
  });

  // Picking a product suggestion is a shortcut for "type this exact name
  // and submit" — it must land on the listing, never the detail page.
  it('picking a product suggestion searches for it instead of opening its detail page', async () => {
    const user = userEvent.setup();
    renderHeaderSearch();

    await user.type(searchInput(), 'mouse');
    await user.click(screen.getByRole('option', { name: /Gaming Mouse/ }));

    expect(screen.getByTestId('location')).toHaveTextContent('/products?q=Gaming%20Mouse');
    expect(searchInput()).toHaveValue('Gaming Mouse');
  });

  // Category/brand suggestions navigate straight to that filtered listing
  // and clear the typed text, since there's no longer an active text query.
  it('picking a category suggestion filters the listing by that category', async () => {
    const user = userEvent.setup();
    renderHeaderSearch();

    await user.type(searchInput(), 'access');
    await user.click(screen.getByRole('option', { name: /Accessories/ }));

    expect(screen.getByTestId('location')).toHaveTextContent('/products?category=Accessories');
    expect(searchInput()).toHaveValue('');
  });

  it('arrow keys move through suggestions and Enter selects the highlighted one', async () => {
    const user = userEvent.setup();
    renderHeaderSearch();

    await user.type(searchInput(), 'sound');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: /SoundWave/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/products?brand=SoundWave');
  });
});
