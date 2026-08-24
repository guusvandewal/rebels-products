import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAllProducts, useProducts } from '../../api/products';
import type { Product } from '../../api/products';
import type { FiltersState } from '../../hooks/useProductFilters';
import { ProductsPage } from '../../pages/ProductsPage';

vi.mock('../../api/products', () => ({
  useAllProducts: vi.fn(),
  useProducts: vi.fn(),
}));

// ProductCard renders ProductImage, which fetches an Unsplash photo via
// react-query — unrelated to filter behavior, and would need a real
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
    name: 'Gaming Keyboard',
    brand: 'GamerGadgets',
    category: 'Accessories',
    image: 'https://example.com/2.jpg',
    specifications: {},
  },
  {
    id: 3,
    name: 'Bluetooth Headphones',
    brand: 'SoundWave',
    category: 'Audio',
    image: 'https://example.com/3.jpg',
    specifications: {},
  },
  {
    id: 4,
    name: 'High-Performance Laptop',
    brand: 'TechTron',
    category: 'Electronics',
    image: 'https://example.com/4.jpg',
    specifications: {},
  },
];

// Stands in for json-server's filtering so selecting a filter in the UI
// provably changes what's rendered, not just that an action dispatched.
function filterFixture(filters: FiltersState): Product[] {
  return PRODUCTS.filter((product) => {
    if (filters.query && !product.name.toLowerCase().includes(filters.query.toLowerCase())) {
      return false;
    }
    if (filters.category && product.category !== filters.category) return false;
    if (filters.brand.length > 0 && !filters.brand.includes(product.brand)) return false;
    return true;
  });
}

function renderProductsPage() {
  return render(
    <MemoryRouter initialEntries={['/products']}>
      <ProductsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // react-select scrolls its menu into view on open; jsdom doesn't
  // implement scrollIntoView at all, so it needs a stub or it throws.
  window.HTMLElement.prototype.scrollIntoView = vi.fn();

  vi.mocked(useAllProducts).mockReturnValue({
    data: PRODUCTS,
    isPending: false,
  } as ReturnType<typeof useAllProducts>);
  vi.mocked(useProducts).mockImplementation(
    (filters) =>
      ({
        data: filterFixture(filters),
        isPending: false,
        isError: false,
        isPlaceholderData: false,
      }) as ReturnType<typeof useProducts>,
  );
});

describe('ProductsPage filters', () => {
  it('shows every product with no filters active', () => {
    renderProductsPage();

    expect(screen.getByText('4 products')).toBeInTheDocument();
  });

  it('selecting a category narrows the grid to that category', async () => {
    const user = userEvent.setup();
    renderProductsPage();

    await user.selectOptions(screen.getByLabelText('Category'), 'Accessories');

    expect(screen.getByText('2 products')).toBeInTheDocument();
    expect(screen.getByText('Gaming Mouse')).toBeInTheDocument();
    expect(screen.getByText('Gaming Keyboard')).toBeInTheDocument();
    expect(screen.queryByText('Bluetooth Headphones')).not.toBeInTheDocument();
  });

  it('selecting a brand narrows the grid to that brand', async () => {
    const user = userEvent.setup();
    renderProductsPage();

    const brandInput = screen.getByLabelText('Brand');
    await user.click(brandInput);
    await user.type(brandInput, 'SoundWave');
    const menu = document.querySelector('.ms__menu') as HTMLElement;
    await user.click(within(menu).getByText('SoundWave'));

    expect(screen.getByText('1 product')).toBeInTheDocument();
    expect(screen.getByText('Bluetooth Headphones')).toBeInTheDocument();
  });

  it('shows Clear filters once a filter is active, and it resets the grid', async () => {
    const user = userEvent.setup();
    renderProductsPage();

    expect(screen.queryByRole('button', { name: /Clear filters/ })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Category'), 'Audio');
    expect(screen.getByRole('button', { name: /Clear filters/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Clear filters/ }));

    expect(screen.queryByRole('button', { name: /Clear filters/ })).not.toBeInTheDocument();
    expect(screen.getByText('4 products')).toBeInTheDocument();
  });
});
