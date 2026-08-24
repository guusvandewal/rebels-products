import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Select from 'react-select';
import { useAllProducts, useProducts } from '../api/products';
import { ProductCard } from '../components/ProductCard';
import { hasActiveFilters, useProductFilters } from '../hooks/useProductFilters';

interface BrandOption {
  value: string;
  label: string;
}

const brandSelectClassNames = {
  control: (state: { isFocused: boolean }) =>
    state.isFocused ? 'ms__control ms__control--focused' : 'ms__control',
  valueContainer: () => 'ms__value-container',
  placeholder: () => 'ms__placeholder',
  input: () => 'ms__input',
  indicatorsContainer: () => 'ms__indicators',
  dropdownIndicator: () => 'ms__dropdown-indicator',
  indicatorSeparator: () => 'ms__indicator-separator',
  menu: () => 'ms__menu',
  menuList: () => 'ms__menu-list',
  option: (state: { isFocused: boolean; isSelected: boolean }) =>
    [
      'ms__option',
      state.isFocused && 'ms__option--focused',
      state.isSelected && 'ms__option--selected',
    ]
      .filter(Boolean)
      .join(' '),
  multiValue: () => 'ms__multi-value',
  multiValueLabel: () => 'ms__multi-value-label',
  multiValueRemove: () => 'ms__multi-value-remove',
  noOptionsMessage: () => 'ms__no-options',
};

export function ProductsPage() {
  const [filters, dispatch] = useProductFilters();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: allProducts } = useAllProducts();
  const { data: products, isPending, isError, isPlaceholderData } = useProducts(filters);

  // The search query is driven by the header search bar via the `q` URL
  // param rather than a page-local input, so pick it up from there.
  useEffect(() => {
    const query = searchParams.get('q') ?? '';
    if (query !== filters.query) {
      dispatch({ type: 'query-changed', query });
    }
  }, [searchParams]);

  // Category can also arrive via the URL (e.g. a product page's breadcrumb
  // linking back to its category), so pick it up the same way.
  useEffect(() => {
    const category = searchParams.get('category');
    if (category !== filters.category) {
      dispatch({ type: 'category-changed', category });
    }
  }, [searchParams]);

  // Brand (possibly several, one per repeated `brand=` param) can also
  // arrive via the URL, e.g. from the header search's brand suggestions.
  useEffect(() => {
    const brand = searchParams.getAll('brand');
    const same =
      brand.length === filters.brand.length && brand.every((b) => filters.brand.includes(b));
    if (!same) {
      dispatch({ type: 'brand-selection-changed', brand });
    }
  }, [searchParams]);

  // A text search that resolves to results sharing one category and/or
  // brand (e.g. a specific product) also selects that category/brand, so
  // the filters reflect what you searched for, not just the query text.
  // Runs once per distinct query — a manual category/brand change after
  // that isn't fought on the next render, since the ref already matches.
  const autoFilteredQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (isPending || isPlaceholderData || !filters.query) return;
    if (autoFilteredQueryRef.current === filters.query) return;
    autoFilteredQueryRef.current = filters.query;
    if (!products || products.length === 0) return;

    const uniqueCategories = new Set(products.map((product) => product.category));
    const uniqueBrands = new Set(products.map((product) => product.brand));
    const derivedCategory = uniqueCategories.size === 1 ? [...uniqueCategories][0] : null;
    const derivedBrand = uniqueBrands.size === 1 ? [...uniqueBrands][0] : null;
    if (!derivedCategory && !derivedBrand) return;

    if (derivedCategory) dispatch({ type: 'category-changed', category: derivedCategory });
    if (derivedBrand) dispatch({ type: 'brand-selection-changed', brand: [derivedBrand] });
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (derivedCategory) next.set('category', derivedCategory);
      if (derivedBrand) {
        next.delete('brand');
        next.append('brand', derivedBrand);
      }
      return next;
    });
  }, [products, isPending, isPlaceholderData, filters.query]);

  const categories = useMemo(
    () => [...new Set(allProducts?.map((product) => product.category))].sort(),
    [allProducts],
  );
  const brands = useMemo(() => {
    const inCategory = filters.category
      ? allProducts?.filter((product) => product.category === filters.category)
      : allProducts;
    return [...new Set(inCategory?.map((product) => product.brand))].sort();
  }, [allProducts, filters.category]);
  const brandOptions = useMemo<BrandOption[]>(
    () => brands.map((brand) => ({ value: brand, label: brand })),
    [brands],
  );
  const selectedBrandOptions = useMemo(
    () => brandOptions.filter((option) => filters.brand.includes(option.value)),
    [brandOptions, filters.brand],
  );

  // Narrowing the category can drop brands from the option list above; drop
  // them from the actual filter too, so a hidden chip can't keep silently
  // filtering out every result.
  useEffect(() => {
    const stillValid = filters.brand.filter((brand) => brands.includes(brand));
    if (stillValid.length !== filters.brand.length) {
      dispatch({ type: 'brand-selection-changed', brand: stillValid });
    }
    // Intentionally re-checks only when the available brand list (i.e. the
    // category) changes, not on every brand selection.
  }, [brands]);

  const resultsCount = products?.length ?? 0;
  const resultsLabel = filters.query
    ? `${resultsCount} result${resultsCount === 1 ? '' : 's'} found for "${filters.query}"`
    : `${resultsCount} product${resultsCount === 1 ? '' : 's'}`;

  return (
    <>
      <section className="section">
        <div className="section__inner">
          <div className="filters">
            <div className="filters__group">
              <label className="filters__label" htmlFor="category-select">
                Category
              </label>
              <select
                id="category-select"
                className="select"
                value={filters.category ?? ''}
                onChange={(event) => {
                  const category = event.target.value || null;
                  dispatch({ type: 'category-changed', category });
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (category) {
                      next.set('category', category);
                    } else {
                      next.delete('category');
                    }
                    return next;
                  });
                }}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="filters__group">
              <label className="filters__label" htmlFor="brand-select">
                Brand
              </label>
              <Select<BrandOption, true>
                inputId="brand-select"
                className="multi-select"
                unstyled
                isMulti
                isClearable={false}
                placeholder="All brands"
                options={brandOptions}
                value={selectedBrandOptions}
                onChange={(selected) => {
                  const brand = selected.map((option) => option.value);
                  dispatch({ type: 'brand-selection-changed', brand });
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('brand');
                    brand.forEach((b) => next.append('brand', b));
                    return next;
                  });
                }}
                classNames={brandSelectClassNames}
              />
            </div>
          </div>

          <div className="results-bar">
            <span className="results-bar__count" role="status">
              {isPending ? 'Loading...' : resultsLabel}
            </span>
            {hasActiveFilters(filters) && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  dispatch({ type: 'filters-cleared' });
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('q');
                    next.delete('category');
                    next.delete('brand');
                    return next;
                  });
                }}
              >
                Clear filters X
              </button>
            )}
          </div>

          {isError && (
            <div className="empty-state">
              <h2>The API is unreachable</h2>
              <p>
                Start json-server on port 3000 with <code>npm run api</code> and try again.
              </p>
            </div>
          )}

          {!isError && !isPending && products?.length === 0 && (
            <div className="empty-state">
              <h2>Nothing found</h2>
              <p>No products for this combination. Clear a filter or search differently.</p>
            </div>
          )}

          <div className={isPlaceholderData ? 'grid grid--stale' : 'grid'}>
            {products?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
