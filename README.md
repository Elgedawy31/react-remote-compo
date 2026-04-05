# my-autocomplete-lib

Paginated, searchable autocomplete for React (18 and 19), built on [TanStack Query](https://tanstack.com/query/latest), [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover), and [cmdk](https://cmdk.paco.me/). Data loading is **fully decoupled**: you provide a `fetchPage` function and a React Query `queryKey`; the package does not ship HTTP clients or API configuration. **`fetchPage` must map your backend JSON into `PaginatedApiResponse` (see [Types](#types))—do not assume the wire format already matches.**

## Why this library?

- Fully decoupled from backend APIs
- Works with any data source
- Built on top of React Query for powerful caching and pagination
- Headless-friendly design with optional UI

Use **`UiAutocomplete`** for a complete control, or **`usePaginatedSearch`** alone if you want to drive your own markup and styling.

## Features

- Infinite scroll and optional **Load more** for paginated APIs
- Debounced search (`debounceMs` configurable)
- Optional **`triggerOnFocus`** to defer fetching until the popover opens
- **`additionalParams`** merged into your fetch logic (via `fetchPage` / hook)
- Display helpers for **`first_name` / `last_name`** and **`package`** on options (see `UiAutocomplete` source)
- ESM build with TypeScript declarations (`dist/index.js`, `dist/index.d.ts`)

## Installation

Consumers must install **`my-autocomplete-lib`** and **every peer dependency** below in the **host application** (they are not bundled with the library). Ranges must satisfy what is declared in this package’s `peerDependencies`.

### Peer dependencies

Declared in this library’s `package.json` under `peerDependencies` (install these in your app):

- **`react`** — `^18 || ^19`
- **`react-dom`** — `^18 || ^19`
- **`@tanstack/react-query`** — `^5`
- **`@radix-ui/react-popover`** — `^1`
- **`cmdk`** — `^1`
- **`lucide-react`** — `>=0.400.0`

### One command (npm)

```bash
npm install my-autocomplete-lib react react-dom @tanstack/react-query @radix-ui/react-popover cmdk lucide-react
```

Use the same package list with `pnpm add` / `yarn add` / `bun add` if you prefer.

If you publish under a different name than `my-autocomplete-lib`, substitute it in the command above.

### Working on this repo

For local development of the library itself, clone the repo and run **`npm install`** in the project root: `devDependencies` already include compatible versions of the peers above for the Vite demo.

## Requirements

1. **`QueryClientProvider`** from `@tanstack/react-query` must wrap any tree that uses `UiAutocomplete` or `usePaginatedSearch`.
2. Your **`fetchPage`** implementation must **map** whatever the backend returns into **`PaginatedApiResponse<T>`** (see [Types](#types)). Field names like `current_page` / `last_page` must match that type; rename or reshape in `fetchPage` if your API differs.

## Quick start

```tsx
import { useCallback, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  UiAutocomplete,
  type FetchPaginatedPageArgs,
  type OptionType,
  type PaginatedApiResponse,
} from 'my-autocomplete-lib'

const queryClient = new QueryClient()

export function App() {
  const [value, setValue] = useState<OptionType | null>(null)

  const fetchPage = useCallback(
    async (args: FetchPaginatedPageArgs): Promise<PaginatedApiResponse<Record<string, unknown>>> => {
      const { page, pageSize, searchTerm, searchParam, signal } = args
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(pageSize),
      })
      if (searchTerm) params.set(searchParam, searchTerm)

      const res = await fetch(`/api/items?${params}`, { signal })
      const json = await res.json()
      // Map your backend shape into PaginatedApiResponse (see Types).
      // Example if API uses { items, meta: { page, pages, total } }:
      // return {
      //   data: json.items,
      //   pagination: {
      //     total: json.meta.total,
      //     current_page: json.meta.page,
      //     last_page: json.meta.pages,
      //     per_page: pageSize,
      //   },
      // }
      return {
        data: json.data,
        pagination: json.pagination,
      }
    },
    [],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <UiAutocomplete
        queryKey={['items']}
        fetchPage={fetchPage}
        value={value}
        onChange={setValue}
        placeholder="Search…"
      />
    </QueryClientProvider>
  )
}
```

Use a **stable** `queryKey` (e.g. `['users']`, or `['tasks', projectId]` when the list scope changes).

**`fetchPage` contract:** Always return **`PaginatedApiResponse<T>`**. If your API nests lists under another key or uses different pagination property names, normalize them inside `fetchPage` before returning.

## Styling

The UI is **Tailwind-based by default**: `UiAutocomplete` and internal primitives apply **Tailwind utility classes** and **shadcn-style semantic tokens** (for example `bg-popover`, `text-muted-foreground`, `border-input`, `ring-ring`). There is **no separate CSS file** in the npm package—the “default look” comes from those classes once your app’s Tailwind build includes them.

To use them correctly:

- **Configure Tailwind** in your project and ensure this library’s files are **scanned** so those utilities are generated (see below).
- **Define theme tokens** (CSS variables or Tailwind theme) compatible with shadcn/ui where you use semantic classes.

**Overrides:** pass **`className`** on **`UiAutocomplete`** to adjust the **trigger** `<input>` (merged with the default classes). Other surfaces (popover, list, items) use built-in utilities; change them with **global CSS** targeting the rendered structure, or use **`usePaginatedSearch`** and your own components if you need full control.

### Tailwind: scanning this package

Published artifacts are **JavaScript in `dist/`**; Tailwind must still **see** the class strings. Typical approaches:

- **Tailwind v4:** add a [`@source`](https://tailwindcss.com/docs/detecting-classes-in-source-files) path that includes this package, for example:

  ```css
  @import "tailwindcss";
  @source "../node_modules/my-autocomplete-lib/dist";
  ```

  Adjust the relative path to match your project layout. Confirm generated CSS in your app after a production build.

- **Monorepo / linked package:** you may `@source` the library’s `src/lib` folder during development so all utilities are detected without relying only on minified `dist` output.

- **Tailwind v3:** add the package path to the `content` array (for example `./node_modules/my-autocomplete-lib/dist/**/*.{js,mjs}`) so the JIT picks up utilities used in the bundle.

If classes are missing at runtime, widen your content/`@source` globs or add a safelist for the tokens you use.

## API

### `UiAutocomplete`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `queryKey` | `readonly unknown[]` | (required) | Prefix for React Query cache identity. |
| `fetchPage` | `FetchPaginatedPage<Record<string, unknown>>` | (required) | Loads one page; receives `FetchPaginatedPageArgs`. Must resolve to **`PaginatedApiResponse`** (map the backend payload if needed). |
| `onChange` | `(value: OptionType \| null) => void` | (required) | Called when the user selects an option or clears. |
| `value` | `OptionType \| null` | (required) | Controlled selected option. |
| `placeholder` | `string` | `'Select an option'` | Placeholder for trigger and search field. |
| `pageSize` | `number` | `10` | Passed through to `fetchPage` (via hook). |
| `searchParam` | `string` | `'name'` | Query key used for debounced search term in `fetchPage`. |
| `nameKey` | `string` | `'name'` | Property on each row mapped to option `name`. |
| `idKey` | `string` | `'id'` | Property on each row mapped to option `id`. |
| `className` | `string` | — | Applied to the trigger `Input`. |
| `disabled` | `boolean` | — | Disables interaction and closes popover. |
| `emptyMessage` | `string` | `'No results found.'` | Shown when there are no options. |
| `triggerOnFocus` | `boolean` | `false` | If true, fetching is disabled until the popover opens. |
| `additionalParams` | `Record<string, string \| number \| undefined>` | `{}` | Passed to `fetchPage` for extra filters. |
| `debounceMs` | `number` | `500` | Debounce delay for search input. |

`ref` is forwarded to the underlying trigger `<input>` element.

### `usePaginatedSearch`

Lower-level hook used by `UiAutocomplete`. Same pagination contract; use it to build a custom UI.

**Options**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `queryKey` | `readonly unknown[]` | (required) | React Query key prefix. |
| `fetchPage` | `FetchPaginatedPage<T>` | (required) | Page loader; return value must match **`PaginatedApiResponse<T>`** after mapping from your API. |
| `pageSize` | `number` | `10` | Items per page. |
| `searchParam` | `string` | `'name'` | Search query parameter name for your API. |
| `nameKey` | `string` | `'name'` | Row field → option `name`. |
| `idKey` | `string` | `'id'` | Row field → option `id`. |
| `enabled` | `boolean` | `true` | Passed to `useInfiniteQuery`. |
| `additionalParams` | `Record<string, string \| number \| undefined>` | `{}` | Extra params for `fetchPage`. |
| `debounceMs` | `number` | `500` | Search debounce. |

**Returns**

| Name | Description |
|------|-------------|
| `options` | Flattened `OptionType[]` from all loaded pages. |
| `fetchNextPage` | Load the next page. |
| `hasNextPage` | Whether more pages exist. |
| `isFetchingNextPage` | True while the next page is loading. |
| `isLoading` | Initial loading state. |
| `isError` | True if the query is in error state. |
| `searchTerm` | Current (non-debounced) search string. |
| `handleSearchChange` | Update search term (e.g. bind to an input). |

### Types

- **`OptionType`** — `{ id: string | number; name: string; package?: string }` plus spread fields from your API rows. Rows in `data` should include the fields referenced by **`idKey`** and **`nameKey`** (defaults `id` and `name`); map keys in `fetchPage` if your API uses different names.
- **`PaginatedApiResponse<T>`** — `{ data: T[]; pagination: { total; current_page; last_page; per_page } }`. **`fetchPage` is responsible for producing this shape** from your backend response (do not rely on unsafe casts if names differ).
- **`FetchPaginatedPageArgs`** — `{ page, pageSize, searchTerm, searchParam, additionalParams, signal }`.
- **`FetchPaginatedPage<T>`** — `(args: FetchPaginatedPageArgs) => Promise<PaginatedApiResponse<T>>`.

`useDebounce` is also exported for convenience.

## Migrating from app-specific `resource` APIs

If you previously passed a `resource` key into a config object and used a shared `apiClient`, replace that with a single **`fetchPage`** that:

1. Builds the URL (or calls your client) using your own endpoint map.
2. Maps `args.page`, `args.pageSize`, `args.searchTerm`, `args.searchParam`, and `args.additionalParams` into query parameters.
3. Maps the JSON (or client result) into **`PaginatedApiResponse`** so `data` is the array for the current page and `pagination` uses **`current_page`**, **`last_page`**, **`total`**, and **`per_page`** as defined in [Types](#types).

Keep **`queryKey`** stable per logical list (and include extra segments when filters change) so React Query caches correctly.

## Repository layout

| Path | Purpose |
|------|---------|
| `src/lib/` | Library source (published via `npm run build:lib` → `dist/`). |
| `src/App.tsx` | Local demo / smoke test (not published). |
| `vite.lib.config.ts` | Vite library build (ESM + `vite-plugin-dts`). |
| `vite.config.ts` | Vite app config for the demo. |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build:lib` | Production library build to `dist/`. |
| `npm run build` | Typecheck project references, then `build:lib`. |
| `npm run dev` | Run the Vite demo app. |

## Publishing checklist

1. Set **`"private": false`** in `package.json` when you are ready for a public package (or publish to a private registry as needed).
2. Set a proper **`version`**, **`license`**, **`repository`**, and **`keywords`**.
3. Run **`npm run build:lib`** and verify `dist/` contains `index.js` and `index.d.ts`.
4. Run **`npm pack`** and inspect the tarball; only `dist/` and package metadata should matter for consumers (`files` is already `["dist"]`).
5. **`npm publish`** (with registry authentication configured).

## License

Add a `license` field and a `LICENSE` file when you publish; this README does not impose a license by itself.
