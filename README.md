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
- Optional **`getOptionLabel`** / **`getOptionValue`** for generic row labeling and identity (defaults: `name` / `id`)
- Optional **`renderOption`**, **`renderEmpty`**, **`renderLoading`**, **`renderError`** for full UI control
- Built-in **clear** control (optional) and default **error** UI with **Retry** (uses `refetch` from React Query)
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
} from 'react-remote-compo'

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

This library includes **default Tailwind-based styles**: components use Tailwind utility classes and shadcn-style tokens (for example `bg-popover`, `text-muted-foreground`, `border-input`). **The npm package does not ship a standalone CSS file**—the default look only applies once your app’s Tailwind pipeline generates those utilities.

To use them correctly:

- **Configure Tailwind** in your project and ensure this library is included in your **content / `@source` scan** (see [Tailwind: scanning this package](#tailwind-scanning-this-package) below).
- **Override the trigger** with the **`className`** prop on **`UiAutocomplete`** (merged onto the read-only input).

Optional **`popoverContentClassName`**, **`commandListClassName`**, and **`clearButtonClassName`** adjust other surfaces; see [Customization](#customization). For anything beyond that, use global CSS on the rendered markup or **`usePaginatedSearch`** with your own components.

Set up **theme tokens** (CSS variables or Tailwind theme extensions) in your app if you use semantic color classes.

Icon placement is **direction-aware**: in LTR and RTL, icons align to **inline-end** while placeholder/text remain on **inline-start**.

### Tailwind: scanning this package

Published code lives under **`dist/`** as JavaScript; Tailwind must still **see** the embedded class strings:

- **Tailwind v4:** add a [`@source`](https://tailwindcss.com/docs/detecting-classes-in-source-files) path that includes this package, for example:

  ```css
  @import "tailwindcss";
  @source "../node_modules/my-autocomplete-lib/dist";
  ```

  Adjust the path for your layout and verify CSS in a production build.

- **Monorepo / linked package:** you can `@source` the library’s `src/lib` during development.

- **Tailwind v3:** add something like `./node_modules/my-autocomplete-lib/dist/**/*.{js,mjs}` to **`content`**.

If utilities are missing, widen globs or add a safelist for the tokens you need.

## Customization

`UiAutocomplete` supports optional render props. All are **optional**; defaults keep previous behavior where applicable.

| Prop | Purpose |
|------|---------|
| `getOptionLabel` | `(item) => string` — text for the trigger and list row when `renderOption` is not used. Default: `item.name`, or JSON fallback. |
| `getOptionValue` | `(item) => string \| number` — stable identity for React keys, cmdk `value`, and selection compare. Default: `item.id`. |
| `renderOption` | `(item, selected) => ReactNode` — custom row content; checkmark still shown when selected unless you hide it with your own layout. |
| `renderEmpty` | `() => ReactNode` — when there are no rows, not loading, and no error. Default: icon + `emptyMessage`. |
| `renderLoading` | `() => ReactNode` — when the first page is loading. Default: spinner + “Loading…”. |
| `renderError` | `(error: unknown) => ReactNode` — when the infinite query fails. Default: message + **Retry** (calls `refetch`). |

Extra Tailwind hooks (no CSS files added):

- `popoverContentClassName` — popover panel
- `commandListClassName` — scrollable list
- `clearButtonClassName` — clear (×) control

Set **`clearable={false}`** to hide the clear button.

### `usePaginatedSearch` errors

The hook returns **`error`** (from TanStack Query) and **`refetch`** when you build a fully custom UI. `UiAutocomplete` wires these into the default error panel.

## Advanced usage

Custom row layout and composite labels:

```tsx
<UiAutocomplete
  queryKey={['users']}
  fetchPage={fetchPage}
  value={value}
  onChange={setValue}
  getOptionLabel={(u) =>
    [u.first_name, u.last_name].filter(Boolean).join(' ') || u.name
  }
  renderOption={(item, selected) => (
    <div className="flex flex-col gap-0.5 text-left">
      <span className="font-medium">{item.name}</span>
      {'email' in item && (
        <span className="text-xs text-muted-foreground">{String(item.email)}</span>
      )}
    </div>
  )}
/>
```


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
| `getOptionLabel` | `(item: OptionType) => string` | see defaults | Label for trigger + list when `renderOption` omitted. |
| `getOptionValue` | `(item: OptionType) => string \| number` | `item.id` | Identity for keys, cmdk value, selection. |
| `renderOption` | `(item, selected) => ReactNode` | — | Custom option row. |
| `renderEmpty` | `() => ReactNode` | — | Empty state. |
| `renderLoading` | `() => ReactNode` | — | Initial load state. |
| `renderError` | `(error: unknown) => ReactNode` | — | Error state. |
| `clearable` | `boolean` | `true` | Show clear control when `value` is set. |
| `popoverContentClassName` | `string` | — | Popover panel classes. |
| `commandListClassName` | `string` | — | List container classes. |
| `clearButtonClassName` | `string` | — | Clear button classes. |

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
| `error` | The error from the failed query (when `isError`). |
| `refetch` | Retry the query (used by the default error UI). |

### Types

- **`OptionType`** — `{ id: string | number; name: string; package?: string }` plus spread fields from your API rows. Rows in `data` should include the fields referenced by **`idKey`** and **`nameKey`** (defaults `id` and `name`); map keys in `fetchPage` if your API uses different names.
- **`PaginatedApiResponse<T>`** — `{ data: T[]; pagination: { total; current_page; last_page; per_page } }`. **`fetchPage` is responsible for producing this shape** from your backend response (do not rely on unsafe casts if names differ).
- **`FetchPaginatedPageArgs`** — `{ page, pageSize, searchTerm, searchParam, additionalParams, signal }`.
- **`FetchPaginatedPage<T>`** — `(args: FetchPaginatedPageArgs) => Promise<PaginatedApiResponse<T>>`.

`defaultGetOptionLabel` and `defaultGetOptionValue` are exported if you want to wrap or extend defaults.

`useDebounce` is also exported for convenience.

## Migrating from app-specific `resource` APIs

If you previously passed a `resource` key into a config object and used a shared `apiClient`, replace that with a single **`fetchPage`** that:

1. Builds the URL (or calls your client) using your own endpoint map.
2. Maps `args.page`, `args.pageSize`, `args.searchTerm`, `args.searchParam`, and `args.additionalParams` into query parameters.
3. Maps the JSON (or client result) into **`PaginatedApiResponse`** so `data` is the array for the current page and `pagination` uses **`current_page`**, **`last_page`**, **`total`**, and **`per_page`** as defined in [Types](#types).

Keep **`queryKey`** stable per logical list (and include extra segments when filters change) so React Query caches correctly.

If you previously relied on built-in **`first_name` / `last_name`** or **`package`** display logic, provide the same behavior with **`getOptionLabel`** (and optionally **`renderOption`**) instead.

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
