# Rebels Products

FE assignment: product overview, search, detail page, and a Coolblue-like wishlist, in the rebels.io house style.

## Stack

- React 18 + TypeScript + Vite 7
- TanStack Query v5 for server state (fetching, caching, `keepPreviousData` while filtering)
- Zustand with `persist` for the wishlist (client state, survives a refresh via localStorage)
- `useReducer` for the search/filter state, synced with the URL (`?q=`, `?category=`, `?brand=`) so it's shareable, bookmarkable, and survives the back button
- Zod for runtime validation of the API responses
- react-router-dom for `/products`, `/products/:id`, and `/wishlist`
- react-select for the brand multi-select
- Vitest + React Testing Library for unit/component tests, Playwright for end-to-end tests
- ESLint (flat config: typescript-eslint, react-hooks, react-refresh) + Prettier, enforced on commit via Husky
- json-server serves `db.json` on port 3000, with exactly the endpoints from the assignment:
  - `http://localhost:3000/products`
  - `http://localhost:3000/wishlists`
  - `http://localhost:3000/products?category_like=Electronics`
  - `http://localhost:3000/products?brand=TechTron`

## Getting started

```bash
cp .env.example .env   # fill in VITE_UNSPLASH_ACCESS_KEY if you have one (optional)
npm install
npm run dev
```

`npm run dev` starts both json-server (port 3000) and Vite (port 5173) via concurrently. You can also run them separately with `npm run api` and `npm run web`.

### Environment variables

See `.env.example`. `VITE_API_BASE_URL` is required (defaults to the local json-server). `VITE_UNSPLASH_ACCESS_KEY` is optional — without it, product images fall back to a branded placeholder tile instead of a real photo (see "Choices" below).

Other scripts:

```bash
npm run build           # type-check and build for production
npm run preview         # preview the production build
npm run lint             # ESLint
npm run format           # format the codebase with Prettier
npm run format:check     # check formatting without writing changes
npm run test             # run unit/component tests once (Vitest)
npm run test:watch       # run unit/component tests in watch mode
npm run test:ui          # Vitest's browser UI
npm run e2e              # run end-to-end tests (Playwright, starts the app automatically)
npm run e2e:ui            # Playwright's UI mode
```

A Husky pre-commit hook runs `format:check`, `lint`, and `test` before every commit. GitHub Actions (`.github/workflows/ci.yml`) runs the same checks plus a full build and the e2e suite on push/PR.

## Choices

- **Server state vs. client state.** Everything that comes from the API lives in TanStack Query; the wishlist is pure client state and lives in Zustand. No duplicate sources of truth.
- **Filters live in the URL.** Search query, category, and brand are a `useReducer` (discriminated union of actions, exhaustiveness-checked) that stays in sync with `useSearchParams` both ways — picking a filter updates the URL, and the URL (a shared link, browser back/forward, or the detail page's breadcrumb) can drive the filters too. Searching for a specific product also auto-selects its category/brand if the results resolve to exactly one of each.
- **Search: instant suggestions, deliberate commits.** The header search (global, works from any page) shows an ARIA combobox listbox of matching products/categories/brands the instant you type — a local filter over already-cached data, so no debounce is needed. The actual listing only updates on a deliberate action: pressing Enter, clicking the search button, or picking a suggestion. Typing alone never re-filters the grid, so results don't flicker mid-word.
- **Wishlist like Coolblue.** A heart on every card and on the detail page, a counter badge in the header (absolutely positioned so a digit appearing/growing never shifts the nav), a dedicated wishlist page with per-item removal and a "remove all" action. Toggling works from either page against the same store.
- **Live product photos, cached.** `db.json`'s image URLs point at `source.unsplash.com`, which no longer serves images. `ProductImage` instead fetches a real photo from the Unsplash API per product name and caches it in `localStorage` (Unsplash's free tier caps out at 50 requests/hour, so repeat visits shouldn't re-spend it) — falling back to a branded initial-letter tile if there's no API key or the fetch fails.
- **Analytics as a `dataLayer` push.** `src/lib/analytics.ts` pushes GA4-shaped events (`search`, `select_item`, `add_to_wishlist`, `remove_from_wishlist`) onto `window.dataLayer` — the standard hook Google Tag Manager listens to for Custom Event triggers. No GTM container is wired in yet, so it also mirrors every push to `console.info`; wiring up a real container later needs no code changes here.
- **An error boundary around the routes, not the whole app.** It wraps `<Routes>` inside the header/footer chrome, so a crash on one page still leaves the nav (and its "back to products" escape hatch) usable. That link is a plain `<a>`, not a router `<Link>` — the crash may be tied to state a client-side navigation wouldn't clear (e.g. it happened on `/products` and the same page is where you'd land), so only a full reload is guaranteed to recover.
- **Tests mirror the source tree, under `src/test/`.** Unit/component tests (`*.test.ts(x)`) live in `src/test/{components,pages,hooks,stores}/`, one directory per kind of thing under test, rather than next to the source files. End-to-end tests live in `e2e/` and drive the real app against json-server through actual user flows: browsing/filtering/searching, viewing a product, wishlisting.

## Structure

```
src/
  api/
    products.ts           Zod schemas + product query hooks
    unsplash.ts            Unsplash fetch + localStorage cache
  hooks/useProductFilters.ts   search/filter reducer
  stores/wishlist.ts       Zustand store with persist
  lib/analytics.ts         dataLayer/GTM event tracking
  components/              Layout (incl. header search), ProductCard, ProductImage,
                            WishlistButton, ErrorBoundary
  pages/                   ProductsPage, ProductDetailPage, WishlistPage, NotFoundPage
  test/                    Vitest unit/component tests, mirroring src/ (components, pages,
                            hooks, stores), plus setup.ts
e2e/                       Playwright end-to-end specs
.github/workflows/ci.yml   format/lint/test/build + e2e on push and PR
.husky/pre-commit          format:check + lint + test, run before every commit
```

## Notes for reviewers

**How to start the app.** `npm install` followed by `npm run dev` is all that's needed — it boots json-server and Vite together, so the product data is available immediately at `http://localhost:5173`. Copy `.env.example` to `.env` first if you want live product photos.

**Future adjustments.** With more time I'd add a closer accessibility pass on the remaining filter controls, and wire the analytics `dataLayer` pushes into an actual GTM container rather than just logging them.
