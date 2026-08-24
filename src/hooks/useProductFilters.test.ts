import { describe, expect, it } from 'vitest';
import { filtersReducer, hasActiveFilters, initialFilters } from './useProductFilters';

describe('filtersReducer', () => {
  it('sets the query on query-changed', () => {
    const state = filtersReducer(initialFilters, { type: 'query-changed', query: 'laptop' });
    expect(state.query).toBe('laptop');
  });

  it('sets the category on category-changed', () => {
    const withCategory = filtersReducer(initialFilters, {
      type: 'category-changed',
      category: 'Electronics',
    });
    expect(withCategory.category).toBe('Electronics');

    const cleared = filtersReducer(withCategory, {
      type: 'category-changed',
      category: null,
    });
    expect(cleared.category).toBeNull();
  });

  it('switches to a different category instead of stacking', () => {
    const first = filtersReducer(initialFilters, {
      type: 'category-changed',
      category: 'Electronics',
    });
    const second = filtersReducer(first, { type: 'category-changed', category: 'Audio' });
    expect(second.category).toBe('Audio');
  });

  it('replaces the brand selection on brand-selection-changed', () => {
    const withBrands = filtersReducer(initialFilters, {
      type: 'brand-selection-changed',
      brand: ['TechTron', 'SoundWave'],
    });
    expect(withBrands.brand).toEqual(['TechTron', 'SoundWave']);

    const narrowed = filtersReducer(withBrands, {
      type: 'brand-selection-changed',
      brand: ['SoundWave'],
    });
    expect(narrowed.brand).toEqual(['SoundWave']);
  });

  it('resets all filters on filters-cleared', () => {
    const dirty = filtersReducer(initialFilters, { type: 'query-changed', query: 'x' });
    expect(filtersReducer(dirty, { type: 'filters-cleared' })).toEqual(initialFilters);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the initial state', () => {
    expect(hasActiveFilters(initialFilters)).toBe(false);
  });

  it('is true when a query, category, or brand is set', () => {
    expect(hasActiveFilters({ ...initialFilters, query: 'x' })).toBe(true);
    expect(hasActiveFilters({ ...initialFilters, category: 'Audio' })).toBe(true);
    expect(hasActiveFilters({ ...initialFilters, brand: ['TechTron'] })).toBe(true);
  });
});
