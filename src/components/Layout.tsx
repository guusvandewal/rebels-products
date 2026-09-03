import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { NavLink, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAllProducts, type Product } from '../api/products';
import { trackSearch } from '../lib/analytics';
import { useWishlistCount } from '../stores/wishlist';
import logoSrc from '../assets/logo.png';

const MAX_SUGGESTIONS = 6;
const MAX_TAXONOMY_SUGGESTIONS = 2;

interface SearchBoxState {
  value: string;
  committedValue: string;
  suggestionsOpen: boolean;
  activeIndex: number;
}

type SearchBoxAction =
  | { type: 'value-changed'; value: string }
  | { type: 'value-committed' }
  | { type: 'value-reset'; value: string }
  | { type: 'value-cleared' }
  | { type: 'suggestions-closed' }
  | { type: 'active-index-changed'; index: number };

function searchBoxReducer(state: SearchBoxState, action: SearchBoxAction): SearchBoxState {
  switch (action.type) {
    case 'value-changed':
      return { ...state, value: action.value, suggestionsOpen: true, activeIndex: -1 };
    case 'value-committed':
      return { ...state, committedValue: state.value };
    case 'value-reset':
      return {
        value: action.value,
        committedValue: action.value,
        suggestionsOpen: false,
        activeIndex: -1,
      };
    case 'value-cleared':
      return { ...state, value: '', suggestionsOpen: false, activeIndex: -1 };
    case 'suggestions-closed':
      return { ...state, suggestionsOpen: false, activeIndex: -1 };
    case 'active-index-changed':
      return { ...state, activeIndex: action.index };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

type Suggestion =
  | { kind: 'category'; name: string }
  | { kind: 'brand'; name: string }
  | { kind: 'product'; product: Product };

function Logo() {
  return (
    <Link to="/products" className="logo" aria-label="Rebels products home">
      <img src={logoSrc} alt="" className="logo__image" />
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="header-search__icon" aria-hidden="true" focusable="false">
      <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line
        x1="13.2"
        y1="13.2"
        x2="18"
        y2="18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Global search, always visible in the header. Typing by itself never
 * filters anything — the listing only updates on submit (Enter or the
 * search button) or picking a suggestion. A suggestions listbox (ARIA
 * combobox pattern, arrow-key navigable) updates live against the
 * already-cached product list, since matching it is a local filter, not a
 * network request, and mixes three kinds of matches: categories and brands
 * (navigate straight to that filtered listing) and products (never their
 * detail page — picking one searches for it in the listing, same as typing
 * its exact name and submitting).
 *
 * Text search runs through the reducer's `value` -> `value-committed` ->
 * `committedValue` transition, which an effect turns into a navigate to
 * `/products?q=<term>`. Category/brand picks navigate directly instead
 * (`value-cleared` resets the typed text without touching `committedValue`,
 * so that navigate-on-commit effect doesn't also fire and fight it).
 *
 * The URL only syncs back INTO the typed value when it disagrees with our
 * own last commit (`committedValue`) — e.g. "Clear filters" or browser
 * back/forward — not on every URL change, which would also catch the echo
 * from our own navigate.
 */
function HeaderSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: allProducts } = useAllProducts();
  const [state, dispatch] = useReducer(searchBoxReducer, null, () => {
    const initial = searchParams.get('q') ?? '';
    return { value: initial, committedValue: initial, suggestionsOpen: false, activeIndex: -1 };
  });

  // Deliberately omits state.committedValue: this should only react to the
  // URL changing, using whatever committedValue is current at that point,
  // not re-run every time committedValue itself changes.
  useEffect(() => {
    const urlQuery = searchParams.get('q') ?? '';
    if (urlQuery !== state.committedValue) {
      dispatch({ type: 'value-reset', value: urlQuery });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Deliberately omits searchParams: this should only fire when we commit
  // a new value ourselves, not on every URL change — including it would
  // also catch the echo from our own navigate call below, which is
  // exactly the typing-vs-navigate race described in the comment above
  // this component.
  useEffect(() => {
    const trimmed = state.committedValue.trim();
    if (trimmed === (searchParams.get('q') ?? '')) return;
    if (trimmed) {
      trackSearch(trimmed);
    }
    navigate(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : '/products', {
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.committedValue, navigate]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const term = state.value.trim().toLowerCase();
    if (!term) return [];
    const products = allProducts ?? [];

    const categorySuggestions: Suggestion[] = [...new Set(products.map((p) => p.category))]
      .filter((name) => name.toLowerCase().includes(term))
      .slice(0, MAX_TAXONOMY_SUGGESTIONS)
      .map((name) => ({ kind: 'category', name }));

    const brandSuggestions: Suggestion[] = [...new Set(products.map((p) => p.brand))]
      .filter((name) => name.toLowerCase().includes(term))
      .slice(0, MAX_TAXONOMY_SUGGESTIONS)
      .map((name) => ({ kind: 'brand', name }));

    const remainingSlots = MAX_SUGGESTIONS - categorySuggestions.length - brandSuggestions.length;
    const productSuggestions: Suggestion[] = products
      .filter((product) => product.name.toLowerCase().includes(term))
      .slice(0, Math.max(remainingSlots, 0))
      .map((product) => ({ kind: 'product', product }));

    return [...categorySuggestions, ...brandSuggestions, ...productSuggestions];
  }, [allProducts, state.value]);

  const showSuggestions = state.suggestionsOpen && suggestions.length > 0;

  function selectSuggestion(suggestion: Suggestion) {
    switch (suggestion.kind) {
      case 'category':
        dispatch({ type: 'value-cleared' });
        navigate(`/products?category=${encodeURIComponent(suggestion.name)}`);
        break;
      case 'brand':
        dispatch({ type: 'value-cleared' });
        navigate(`/products?brand=${encodeURIComponent(suggestion.name)}`);
        break;
      case 'product':
        // Searches for it in the listing, same as typing the exact name
        // and submitting — never jumps straight to its detail page.
        dispatch({ type: 'value-reset', value: suggestion.product.name });
        break;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (showSuggestions && state.activeIndex >= 0) {
      selectSuggestion(suggestions[state.activeIndex]);
      return;
    }
    dispatch({ type: 'value-committed' });
    dispatch({ type: 'suggestions-closed' });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        dispatch({
          type: 'active-index-changed',
          index: state.activeIndex + 1 >= suggestions.length ? 0 : state.activeIndex + 1,
        });
        break;
      case 'ArrowUp':
        event.preventDefault();
        dispatch({
          type: 'active-index-changed',
          index: state.activeIndex <= 0 ? suggestions.length - 1 : state.activeIndex - 1,
        });
        break;
      case 'Escape':
        dispatch({ type: 'suggestions-closed' });
        break;
      default:
        break;
    }
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dispatch({ type: 'suggestions-closed' });
    }
  }

  const activeOptionId =
    state.activeIndex >= 0 ? `header-search-option-${state.activeIndex}` : undefined;

  return (
    <form className="header-search" role="search" onSubmit={handleSubmit} onBlur={handleBlur}>
      <label htmlFor="header-search-input" className="visually-hidden">
        Search products
      </label>
      <div className="header-search__combobox">
        <input
          id="header-search-input"
          name="q"
          type="search"
          className="header-search__input"
          placeholder="What are you looking for?"
          value={state.value}
          onChange={(event) => dispatch({ type: 'value-changed', value: event.target.value })}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls="header-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
        />
        {showSuggestions && (
          <ul
            id="header-search-listbox"
            className="header-search__suggestions"
            role="listbox"
            aria-label="Search suggestions"
          >
            {suggestions.map((suggestion, index) => {
              const key =
                suggestion.kind === 'product'
                  ? `product-${suggestion.product.id}`
                  : `${suggestion.kind}-${suggestion.name}`;
              const label =
                suggestion.kind === 'product' ? suggestion.product.name : suggestion.name;
              return (
                <li
                  key={key}
                  id={`header-search-option-${index}`}
                  role="option"
                  aria-selected={index === state.activeIndex}
                  className={
                    index === state.activeIndex
                      ? 'header-search__option header-search__option--active'
                      : 'header-search__option'
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <span className="header-search__option-label">{label}</span>
                  {suggestion.kind !== 'product' && (
                    <span className="header-search__option-meta">
                      {suggestion.kind === 'category' ? 'Category' : 'Brand'}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <button type="submit" className="header-search__button" aria-label="Search">
        <SearchIcon />
      </button>
    </form>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const wishlistCount = useWishlistCount();
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);
  const [routeAnnouncement, setRouteAnnouncement] = useState('');

  // On a client-side page change, browsers don't move focus or tell
  // assistive tech anything — focus is left on a now-unmounted element and
  // Tab restarts from the top of the document. Move focus to <main> so
  // keyboard users carry on from the new content (WCAG 2.4.3), and mirror
  // the fresh document title into a live region so screen readers announce
  // the change. Skips the initial render, where nothing has changed yet.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
    try {
      window.scrollTo({ top: 0 });
    } catch {
      /* not implemented in some test environments */
    }
    setRouteAnnouncement(document.title);
  }, [pathname]);

  return (
    <div className="layout">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to main content
      </a>
      <header className="site-header">
        <Logo />
        <HeaderSearch />
        <nav className="site-nav" aria-label="Main">
          <NavLink to="/products" className="site-nav__link">
            Products
          </NavLink>
          <NavLink to="/wishlist" className="site-nav__link site-nav__link--accent">
            Wishlist
            {wishlistCount > 0 && (
              <span
                className="site-nav__badge"
                aria-label={`${wishlistCount} product${wishlistCount === 1 ? '' : 's'} in wishlist`}
              >
                {wishlistCount}
              </span>
            )}
          </NavLink>
        </nav>
      </header>

      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {children}
      </main>

      <div className="visually-hidden" aria-live="polite">
        {routeAnnouncement}
      </div>

      <footer className="site-footer">
        <span>Thinkers. Doers. Rebels.</span>
        <span className="site-footer__note">FE assignment, data via json-server on :3000</span>
      </footer>
    </div>
  );
}
