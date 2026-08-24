# Rebels Products

FE assignment: product overview, search, detail page, and a Coolblue-like wishlist, in the rebels.io house style.

## Stack

- React 18 + TypeScript + Vite
- TanStack Query v5 for server state (fetching, caching, `keepPreviousData` while filtering)
- Zustand with `persist` for the wishlist (client state, survives a refresh via localStorage)
- `useReducer` for the search and filter state (query, category, brand)
- Zod for runtime validation of the API responses
- react-router-dom for `/products`, `/products/:id`, and `/wishlist`
- i18next + react-i18next for translations, English by default, with Dutch as a fallback for any missing key
- Vitest + React Testing Library for unit/component tests, Playwright for end-to-end tests
- Prettier for consistent formatting
- json-server serves `db.json` on port 3000, with exactly the endpoints from the assignment:
  - `http://localhost:3000/products`
  - `http://localhost:3000/wishlists`
  - `http://localhost:3000/products?category_like=Electronics`
  - `http://localhost:3000/products?brand=TechTron`

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` starts both json-server (port 3000) and Vite (port 5173) via concurrently. You can also run them separately with `npm run api` and `npm run web`.

Other scripts:

```bash
npm run build          # type-check and build for production
npm run preview        # preview the production build
npm run format          # format the codebase with Prettier
npm run format:check    # check formatting without writing changes
npm run test            # run unit/component tests once (Vitest)
npm run test:watch      # run unit/component tests in watch mode
npm run e2e             # run end-to-end tests (Playwright, starts the app automatically)
```

## Choices

- **Server state vs. client state.** Everything that comes from the API lives in TanStack Query; the wishlist is pure client state and lives in Zustand. No duplicate sources of truth.
- **Reducer on the input.** The search and filter state is a `useReducer` with a discriminated union of actions (`query-changed`, `category-toggled`, `brand-toggled`, `filters-cleared`) and an exhaustiveness check. The query is debounced (250ms) before it's sent to json-server as `?q=`. Category maps to `?category_like=`, brand to `?brand=`, matching the URLs from the assignment.
- **Wishlist like Coolblue.** A heart on every card and on the detail page, a counter in the header, a dedicated wishlist page with per-item removal and a "remove all" action. Toggling works from either page against the same store.
- **Broken images.** The database points at source.unsplash.com, which no longer serves images. `ProductImage` tries the original URL and falls back to a branded tile, so the grid never shows broken images.
- **English by default, Dutch as fallback.** All UI copy lives in `src/i18n/locales/{en,nl}.json`. i18next is configured with `lng: 'en'` and `fallbackLng: 'nl'`, so any string missing from the English resource falls back to Dutch instead of showing a raw key. A language switch in the header lets you toggle between the two; `<html lang>` updates with it.
- **Tests close to the code they cover.** Unit/component tests (`*.test.ts(x)`) sit next to the source they test — reducer logic, the i18n fallback behavior, and the interactive components (wishlist toggle, language switcher). End-to-end tests live in `e2e/` and drive the real app against json-server through the actual user flows: browsing/filtering, wishlisting, switching language.

## Structure

```
src/
  api/products.ts        Zod schemas + query hooks
  hooks/useProductFilters.ts   reducer + debounce
  stores/wishlist.ts     Zustand store with persist
  i18n/                   i18next setup + en/nl translation files
  components/             Layout, Hero, ProductCard, ProductImage, WishlistButton
  pages/                  ProductsPage, ProductDetailPage, WishlistPage
  test/setup.ts           Vitest + Testing Library setup (jest-dom, i18n init, cleanup)
e2e/                      Playwright end-to-end specs
```

## Notes for reviewers

**How to start the app.** `npm install` followed by `npm run dev` is all that's needed — it boots json-server and Vite together, so the product data is available immediately at `http://localhost:5173`.

**Time spent.** About a day, spread across setting up the data layer, the filtering/search UX, the wishlist store, and styling to match the rebels.io look.

**Future adjustments.** With more time I'd add an error boundary around the route tree, a closer accessibility pass on the filter chips and wishlist interactions, and CI wiring so `test`, `e2e`, and `format:check` run on every push.
