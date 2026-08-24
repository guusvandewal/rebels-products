import { useReducer } from 'react';

export interface FiltersState {
  query: string;
  category: string | null;
  brand: string[];
}

export type FiltersAction =
  | { type: 'query-changed'; query: string }
  | { type: 'category-changed'; category: string | null }
  | { type: 'brand-selection-changed'; brand: string[] }
  | { type: 'filters-cleared' };

export const initialFilters: FiltersState = {
  query: '',
  category: null,
  brand: [],
};

export function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'query-changed':
      return { ...state, query: action.query };
    case 'category-changed':
      return { ...state, category: action.category };
    case 'brand-selection-changed':
      return { ...state, brand: action.brand };
    case 'filters-cleared':
      return initialFilters;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function useProductFilters() {
  return useReducer(filtersReducer, initialFilters);
}

export function hasActiveFilters(state: FiltersState): boolean {
  return state.query.trim() !== '' || state.category !== null || state.brand.length > 0;
}
