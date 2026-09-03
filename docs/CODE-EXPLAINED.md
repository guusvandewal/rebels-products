# How this app works (explained simply)

This document walks through the codebase in plain language, with a deep dive on the
part people usually find trickiest: the search box and filters, and how TypeScript
and Zod work together to keep everything safe.

No prior knowledge assumed. Where a term first shows up, it's explained right there.

---

## 1. The big picture, in one paragraph

There are two programs running at once (`npm run dev` starts both):

1. **`json-server`** on port `3000` — a tiny fake backend that reads `db.json` and
   serves it over HTTP, like a real API would. It's just a file pretending to be a
   database.
2. **Vite + React** on port `5173` — the actual website you see in the browser. It
   asks `json-server` for product data, then draws (renders) it as a page.

So when you load the site: **React app → asks json-server for products → gets back
JSON (plain text data) → turns it into the product grid, search box, and wishlist
you see on screen.**

Everything below is about that middle step — getting data from the network safely,
and letting the user narrow down what they see (search, category, brand).

---

## 2. TypeScript, explained like you've never heard of it

Plain JavaScript lets you write `product.nmae` (typo) or pass a number where you
meant a string, and it won't tell you until the app crashes _while someone is using
it_.

**TypeScript is JavaScript with a spellchecker for your data shapes.** You describe
what a "Product" looks like once:

```ts
interface Product {
  id: number;
  name: string;
  brand: string;
}
```

From then on, if you write `product.nmae` anywhere, your editor underlines it in red
_before you even run the code_ — the same way a word processor underlines a typo.
It never touches what ships to the browser (it's stripped away when the app is
built); it only exists to catch mistakes early, on your machine, while you type.

That's it. It's not a different language, it's a checker bolted onto JavaScript.

---

## 3. Zod, explained like you've never heard of it — and why there's no OpenAPI here

You asked about **OpenAPI** too — worth being upfront: **this project doesn't use
OpenAPI.** OpenAPI is a way of writing down "here's what my API's endpoints and data
look like" in a separate spec file (usually YAML or JSON), so other tools can read
it and generate code from it. Nothing in this repo does that — there's no
`openapi.yaml`, no generated client. What this project uses instead, for a similar
job, is **Zod**. Here's why that's the right comparison to draw:

TypeScript's spellchecking (section 2) has one big blind spot: **it only trusts you
at compile time, not at runtime.** When the app calls `fetch()` to get products from
`json-server`, the response is just raw text over the network. TypeScript has _no
way_ of knowing whether that text actually matches the `Product` shape you promised
— it just takes your word for it. If the backend changes, or `db.json` has a typo,
or the network returns something weird, TypeScript stays silent and your app breaks
in a confusing way somewhere else, far from the real cause.

**Zod is a bouncer at the door.** It checks the actual data as it arrives, at
runtime, and refuses to let bad data further into the app. Here's the real schema
from `src/api/products.ts`:

```ts
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  image: z.string().url(),
  specifications: z.record(z.string()),
});
```

Read it like a checklist the bouncer holds: _"id must be a number. name must be
text. image must be a real URL. Anyone missing an item on this list doesn't get
in."_ If `json-server` ever returned a product with `id: "5"` (text instead of a
number) or no `name` at all, Zod throws an error immediately, with a clear message
pointing at exactly what was wrong — instead of that bad data sneaking into a
product card and causing something to silently render blank three components later.

The elegant part: **you don't write the `Product` TypeScript type by hand at all.**
You derive it _from_ the schema:

```ts
export type Product = z.infer<typeof productSchema>;
```

Read `z.infer` as "figure out the TypeScript type that matches this checklist."
One definition (the schema) gives you both things — a runtime bouncer _and_ a
compile-time type — so they can never quietly drift apart, the way a hand-written
`interface Product` and a hand-written runtime check could.

Every network call funnels through one helper that always does this check
(`src/api/products.ts`):

```ts
async function http<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} failed with ${res.status}`);
  }
  return schema.parse(await res.json()); // <- the bouncer check happens here
}
```

`schema.parse(...)` is the moment the bouncer actually checks IDs. If it fails, it
throws, and TanStack Query (next section) turns that into the `isError` state the
page already knows how to show ("The API is unreachable").

**So: TypeScript protects you from yourself while writing code. Zod protects you
from the outside world while the app is running.** You need both — TypeScript alone
would happily compile code that trusts a malformed API response.

---

## 4. Where product data lives: TanStack Query

`src/api/products.ts` also defines hooks like `useProducts(filters)`. A "hook" here
is just a function starting with `use` that a React component calls to get some
data and automatically re-render when that data changes.

[TanStack Query](https://tanstack.com/query) is the library that:

- calls `fetch`, waits for the response, and hands it to Zod to check (above)
- **caches** the result, keyed by what was asked for (a "query key" like
  `['products', filters]`) — so asking for the same filters twice doesn't hit the
  network again
- tracks loading/error state for you (`isPending`, `isError`)
- with `keepPreviousData`: when filters change, it keeps showing the _old_ list
  (slightly greyed out via the `grid--stale` class) while the new one loads, instead
  of flashing an empty grid every time you tick a checkbox

Think of it as a smart, self-updating cache sitting between your components and the
network.

---

## 5. The filters: how "Category: Electronics, Brand: TechTron" becomes a URL

This is the part that looks complicated but is really one simple idea repeated:
**there is exactly one source of truth for "what is the user filtering by," and
everything else just mirrors it.**

That one source of truth is a **reducer** — `src/hooks/useProductFilters.ts`. If
you've never met a reducer: it's a single function that takes "the current state"
plus "an action describing what happened," and returns "the new state." Like a
ledger: every change is a described transaction, never a silent direct edit.

```ts
export interface FiltersState {
  query: string; // what you typed and submitted, e.g. "laptop"
  category: string | null;
  brand: string[]; // can have more than one, e.g. ["TechTron", "SoundWave"]
}

export type FiltersAction =
  | { type: 'query-changed'; query: string }
  | { type: 'category-changed'; category: string | null }
  | { type: 'brand-selection-changed'; brand: string[] }
  | { type: 'filters-cleared' };
```

That `FiltersAction` type is a **discriminated union** — a fancy name for "one of
these four exact shapes, no others allowed, and the `type` field tells you which."
TypeScript uses the `type` field to know exactly which other fields must exist, so
`{ type: 'category-changed', brand: [...] }` (wrong field for that action) is a
compile error, not a runtime surprise.

There's also this odd-looking bit at the bottom of the reducer:

```ts
default: {
  const exhaustive: never = action;
  return exhaustive;
}
```

This is a trick to make TypeScript yell at you if you ever add a fifth action type
to the union above but forget to handle it in the `switch`. `never` means "this
should be impossible to reach" — if it's _possible_ to reach (because a case is
missing), TypeScript refuses to compile. It's a tripwire for future-you.

### Filters ⇄ the URL, both directions

The filters don't just live in memory — `ProductsPage.tsx` keeps them mirrored into
the URL's query string (the `?q=...&category=...` part), using
`useSearchParams` from React Router. Why bother? Because a URL like

```
/products?category=Electronics&brand=TechTron
```

is a normal link. You can bookmark it, paste it into a chat, hit the browser's back
button after changing a filter, or click a "back to category" link from a product's
detail page — and it all just works, because the filter state _is_ the URL, not
something hidden inside React that a fresh page load would lose.

Concretely, that means two things have to stay in sync, in both directions:

- **User changes a filter** (picks a category from the dropdown) → dispatch an
  action to the reducer → **also** call `setSearchParams` to update the URL.
- **The URL changes from outside** (typed by hand, browser back button, a link from
  elsewhere) → an `useEffect` notices the URL doesn't match the reducer's current
  state → dispatches an action to catch the reducer up.

You'll see three near-identical `useEffect` blocks in `ProductsPage.tsx`, one each
for query/category/brand, all doing that second thing: "if the URL disagrees with
what the reducer currently thinks, update the reducer." Each one deliberately
_doesn't_ list its own filter value (e.g. `filters.query`) as a dependency — only
`searchParams`. If it did, the effect would re-run every time the reducer itself
changed, including changes the effect just made, which risks a feedback loop of the
effect re-triggering itself. Instead it should only react to the URL moving, and
check the current reducer value inline when it does.

### Turning filters into an actual API request

`FiltersState` (in React) isn't the same shape `json-server` expects (in the URL it
gets called with). `src/api/products.ts` translates one into the other:

```ts
function toSearchParams(filters: FiltersState): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.category) params.set('category_like', filters.category);
  filters.brand.forEach((brand) => params.append('brand', brand));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
```

- `query` → `q` (json-server's built-in full-text search param)
- `category` → `category_like` (json-server's "contains" filter)
- `brand` (an array!) → the **same param name repeated**, e.g.
  `?brand=TechTron&brand=SoundWave` — that's how json-server expresses "match
  _any_ of these," i.e. OR logic. A single `brand=X&brand=Y` param would instead be
  read as "must equal both," which is impossible for one field — repeating the key
  is what turns it into OR.

That's the whole filter pipeline: **dropdown → reducer action → URL param → API
query string → Zod-checked JSON → TanStack Query cache → product grid.**

---

## 6. The header search box: why typing doesn't instantly filter

The search input in the header (`Layout.tsx`, the `HeaderSearch` component) looks
like it filters live as you type — a dropdown of matching products/categories/brands
does appear instantly — but **the actual product grid only updates once you commit**
(press Enter, click the search button, or click a suggestion). This is a deliberate
choice, and it's worth understanding _why_ it's built with two separate values
instead of one.

### Two values, not one

The search box's own tiny reducer (yes, another reducer — same ledger idea as
above) tracks:

```ts
interface SearchBoxState {
  value: string; // exactly what's currently typed in the box
  committedValue: string; // the last value that was actually "submitted"
  suggestionsOpen: boolean;
  activeIndex: number; // which suggestion is highlighted via arrow keys
}
```

- **`value`** changes on every keystroke. It drives the suggestions dropdown only
  — nothing else.
- **`committedValue`** only changes when you submit. _That's_ the one an effect
  watches to actually navigate to `/products?q=...`, which is what makes the grid
  re-fetch.

If there were only one value, every keystroke would trigger a new page navigation
and a new network request — the URL would thrash, the back button would step
through every letter you typed, and the grid would flicker constantly. Splitting
"what's typed" from "what's been committed" avoids all of that for free.

### The suggestions dropdown is free — no network, no debounce

You might expect a search-as-you-type dropdown to need a
["debounce"](https://en.wikipedia.org/wiki/Switch#Contact_bounce) (waiting for a
pause in typing before firing a request, to avoid hammering the network on every
keystroke). **This one doesn't need that**, because it isn't hitting the network at
all — `useAllProducts()` already has the _entire_ product list sitting in the
TanStack Query cache (loaded once, reused everywhere). Matching suggestions is just
a plain JavaScript `.filter()` over an array already sitting in memory:

```ts
const categorySuggestions = [...new Set(products.map((p) => p.category))]
  .filter((name) => name.toLowerCase().includes(term))
  .slice(0, MAX_TAXONOMY_SUGGESTIONS)
  .map((name) => ({ kind: 'category', name }));
```

No network round-trip means no delay to hide, means no debounce needed. It's
instant because it's cheap.

### Three kinds of suggestions, one list

A `Suggestion` can be a category, a brand, or a product — again, a discriminated
union (same trick as `FiltersAction` above):

```ts
type Suggestion =
  | { kind: 'category'; name: string }
  | { kind: 'brand'; name: string }
  | { kind: 'product'; product: Product };
```

Picking each one does something different (`selectSuggestion`):

- **category / brand** → navigate straight to that filtered listing
  (`/products?category=...`), and clear the typed text.
- **product** → _don't_ jump to that product's detail page. Instead, treat it
  exactly like you'd typed the product's exact name and hit Enter — it searches for
  it in the listing. This keeps the search box's behavior consistent: it always
  searches, it never silently teleports you somewhere.

### Why the effects carefully avoid watching each other

Two `useEffect`s sit at the heart of `HeaderSearch`, and both have comments
explaining a deliberately _incomplete_ dependency list — worth understanding
because it's the kind of thing that looks like a bug at a glance:

```ts
// Reacts to the URL changing (e.g. Clear Filters, browser back/forward),
// and resets the typed text to match — but only if it actually disagrees.
useEffect(() => {
  const urlQuery = searchParams.get('q') ?? '';
  if (urlQuery !== state.committedValue) {
    dispatch({ type: 'value-reset', value: urlQuery });
  }
}, [searchParams]);

// Reacts to a new commit, and pushes it into the URL — but only if it
// actually disagrees with what's already there.
useEffect(() => {
  const trimmed = state.committedValue.trim();
  if (trimmed === (searchParams.get('q') ?? '')) return;
  navigate(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : '/products', {
    replace: true,
  });
}, [state.committedValue, navigate]);
```

Picture what happens without the `if` guards: you commit a search → effect #2 fires
→ navigates → the URL changes → effect #1 notices the URL changed → resets the
typed value → which could re-trigger #2 → forever. Each effect checks "does the
thing I'm about to change already match?" before actually changing it, which breaks
that potential loop at the source, rather than relying on React to somehow not
re-run them.

---

## 7. Walking through one full example

Say you type "lap" into the header search:

1. Every keystroke dispatches `value-changed` → `state.value` becomes `"lap"`.
2. `suggestions` (a `useMemo`, i.e. "recompute this only when its inputs change")
   re-filters the already-cached product list for anything containing "lap" —
   maybe "Laptop Stand" and a couple of products whose brand or category matches.
   This is instant, no network call.
3. You press the down arrow twice, then Enter on "Laptop Stand". Since a suggestion
   is highlighted, `handleSubmit` calls `selectSuggestion` instead of committing the
   raw text.
4. That's a `kind: 'product'` suggestion, so it dispatches
   `value-reset` with the product's exact name — this sets **both** `value` and
   `committedValue` to `"Laptop Stand"` in one step.
5. The commit effect notices `committedValue` no longer matches the URL's `q`, so it
   calls `navigate('/products?q=Laptop%20Stand')`.
6. On `ProductsPage`, the effect watching `searchParams` for `q` notices the URL
   now has `q=Laptop Stand`, and dispatches `query-changed` to the _filters_
   reducer (a completely different reducer from the search box's own — this is the
   handoff point between "what's in the search box" and "what the grid is actually
   filtered by").
7. `useProducts(filters)` now has a new `filters.query`, so TanStack Query fires
   `GET /products?q=Laptop%20Stand`.
8. The response comes back as JSON text → `productSchema.parse(...)` (Zod) checks
   every item matches the `Product` shape → if it does, TanStack Query caches it and
   the grid re-renders with the result; if it doesn't, `isError` becomes true and
   the "API is unreachable" message shows instead.
9. Since only one category shows up in the result, the "auto-select matching
   category/brand" effect in `ProductsPage` also ticks the category filter to match
   — so the filters visually reflect what you searched for, not just the leftover
   text.

One typed word touches: a local reducer, a `useMemo`, a URL navigation, a second
reducer, a cached network request, a Zod validation, and a UI re-render — and the
reason it's split into that many small pieces is so each piece can be reasoned about
(and tested — see `src/test/`) on its own, instead of one giant function trying to
do all of it at once.

---

## 8. Quick glossary

| Term                           | Plain meaning                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hook**                       | A function starting with `use` that a React component calls to get data/behavior and re-render when it changes.                                                   |
| **Reducer**                    | A function that turns `(current state, description of what happened)` into `new state`. Keeps all changes explicit and traceable.                                 |
| **Discriminated union**        | A TypeScript type that's "one of several exact shapes," distinguished by a shared field (usually `type` or `kind`).                                               |
| **`useMemo`**                  | "Only recompute this value when its listed inputs change" — avoids redoing work every render.                                                                     |
| **`useEffect`**                | "Run this after rendering, and again whenever these listed inputs change." Used here to sync two things that can each change independently (URL ↔ reducer state). |
| **Schema (Zod)**               | A checklist describing the exact shape data must have. Used to check real data at runtime.                                                                        |
| **`z.infer`**                  | "Derive the TypeScript type that matches this Zod schema," so you never hand-write it separately.                                                                 |
| **Query key (TanStack Query)** | The cache's lookup key for a request, e.g. `['products', filters]` — same key in, same cached result out.                                                         |
| **`keepPreviousData`**         | While a new request is loading, keep showing the last successful result instead of blanking the screen.                                                           |

---

## 9. Where to look next

- `src/api/products.ts` — Zod schemas, the `http()` helper, all product-fetching hooks.
- `src/hooks/useProductFilters.ts` — the filters reducer.
- `src/components/Layout.tsx` — the header search box (`HeaderSearch`).
- `src/pages/ProductsPage.tsx` — where filters, the URL, and the API request meet.
- `src/test/hooks/useProductFilters.test.ts` and `src/test/components/HeaderSearch.test.tsx`
  — see the behavior above pinned down as tests, useful as more worked examples.
