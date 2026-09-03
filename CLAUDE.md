# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React 18 + TypeScript + Vite frontend assignment: a product overview with search/filter, a detail page, and a wishlist, backed by `json-server` reading from `db.json`. English-only, no i18n (see project memory — do not reintroduce a language switcher).

## Commands

```bash
npm run dev              # runs api + web together (concurrently) — use this for normal dev
npm run api              # json-server on :3000, watching db.json
npm run web              # vite dev server on :5173

npm run build             # tsc then vite build
npm run lint               # eslint .
npm run format             # prettier --write .
npm run format:check       # prettier --check .

npm test                   # vitest run (unit/component, single pass)
npm run test:watch         # vitest watch mode
npx vitest run src/test/hooks/useProductFilters.test.ts   # single unit test file

npm run e2e                 # playwright, auto-starts api + web
npx playwright test e2e/products.spec.ts    # single e2e spec
```

A Husky pre-commit hook runs `format:check`, `lint`, and `test`. CI (`.github/workflows/ci.yml`) runs the same plus `build`, then a separate job runs the e2e suite against a real `npm run api` + `npm run web`.

Playwright's `webServer` runs Vite on port **5183** (`--port 5183 --strictPort`), not the normal dev port 5173 — this avoids colliding with a `npm run dev` you may already have running. It expects `.env` to exist (CI copies `.env.example` to `.env` before running e2e).

`VITE_API_BASE_URL` (defaults to `http://localhost:3000`) and `VITE_UNSPLASH_ACCESS_KEY` (optional) are read via `import.meta.env` — see `.env.example`.

## Architecture

**State is split three ways by kind, with no duplication:**

- Server state (products) → TanStack Query, in `src/api/products.ts`. All fetches go through a shared `http<T>()` helper that runs the JSON response through a Zod schema (`productSchema`) — an API response that doesn't match the schema throws rather than silently propagating bad data.
- Filter state (search query, category, brand) → a `useReducer` in `src/hooks/useProductFilters.ts` (discriminated-union actions, exhaustiveness-checked via a `never` default case), kept in sync both ways with `useSearchParams` by the page component — so a picked filter updates the URL and an incoming URL (shared link, back/forward, or the detail page's breadcrumb) drives the filters.
- Wishlist state (client-only, survives refresh) → Zustand + `persist` in `src/stores/wishlist.ts`, keyed to `localStorage` under `rebels-wishlist`. `useIsWishlisted(id)` and `useWishlistCount()` are selector hooks — prefer them over pulling `productIds` and deriving locally, to avoid extra re-renders.

**`useProductFilters` state maps directly onto json-server query params** via `toSearchParams()` in `src/api/products.ts`: `query` → `q`, `category` → `category_like`, and `brand` (an array) is appended as repeated `brand=` params, which json-server treats as OR. `useProducts` uses `keepPreviousData` so the grid doesn't flash empty while a new filter combination loads.

**Routing** (`src/App.tsx`): `/` redirects to `/products`; `/products`, `/products/:id`, `/wishlist`, and a catch-all `NotFoundPage`. `<ErrorBoundary>` wraps only `<Routes>`, inside the `<Layout>` chrome — a render crash on one page still leaves the header nav/search/wishlist-badge usable as an escape hatch. Its "back to products" link is a plain `<a>`, not a router `<Link>`, deliberately: a full reload is the only way to guarantee recovery if the crash came from state a client-side navigation wouldn't clear.

**Header search** (`Layout.tsx`) is a client-side, no-debounce instant-suggestions combobox over already-cached product data. Typing alone never touches the filter reducer/URL/query — the listing only updates on a deliberate commit (Enter, search button, or picking a suggestion), so results don't flicker mid-word.

**Product images** (`src/components/ProductImage.tsx` + `src/api/unsplash.ts`): `db.json` points at `source.unsplash.com`, which is dead, so images are instead fetched live from the Unsplash API per product name and cached in `localStorage` (Unsplash's free tier is 50 req/hr). No API key, or a failed fetch, falls back to a branded initial-letter placeholder tile rather than a broken image.

**Analytics** (`src/lib/analytics.ts`): pushes GA4-shaped events (`search`, `select_item`, `add_to_wishlist`, `remove_from_wishlist`) onto `window.dataLayer` (the standard GTM Custom Event hook) and mirrors each push to `console.info` since no GTM container is wired in yet. Wiring a real container later shouldn't need code changes here.

## Tests

Unit/component tests live under `src/test/{components,pages,hooks,stores}/`, mirroring `src/` by kind rather than sitting next to source files, plus `src/test/setup.ts`. End-to-end specs live in `e2e/` and drive the real app + json-server through full user flows (browse/filter/search, view a product, wishlist).
