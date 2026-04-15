# react-remote-combo

Headless-first remote autocomplete for React with async pagination and debounced search.  
Use the optional built-in UI (`UiAutocomplete`) or build a fully custom experience with `usePaginatedSearch`.

## Features

- Remote search with infinite pagination
- Debounced search input
- Controlled selection API (`value` / `onChange`)
- Custom rendering: `renderOption`, `renderEmpty`, `renderLoading`, `renderError`
- Optional icon slots: `loading`, `clear`, `check`, `chevron`
- Style overrides: `className`, `popoverContentClassName`, `commandListClassName`, `clearButtonClassName`
- TypeScript-first API and exported types

## Installation

```bash
npm install react-remote-combo
```

### Optional UI dependencies (for `UiAutocomplete`)

```bash
npm install @radix-ui/react-popover cmdk
```

## Quick Example

Wrap your app with `QueryClientProvider` before using the component.

```tsx
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  UiAutocomplete,
  type OptionType,
  type FetchPaginatedPageArgs,
  type PaginatedApiResponse,
} from 'react-remote-combo'

const queryClient = new QueryClient()

function App() {
  const [value, setValue] = useState<OptionType | null>(null)

  const fetchPage = async (
    args: FetchPaginatedPageArgs,
  ): Promise<PaginatedApiResponse<Record<string, unknown>>> => {
    const params = new URLSearchParams({
      page: String(args.page),
      per_page: String(args.pageSize),
    })
    if (args.searchTerm) params.set(args.searchParam, args.searchTerm)

    const res = await fetch(`/api/items?${params}`, { signal: args.signal })
    const json = await res.json()

    return {
      data: json.data,
      pagination: json.pagination,
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <UiAutocomplete
        queryKey={['items']}
        fetchPage={fetchPage}
        value={value}
        onChange={setValue}
        placeholder="Search items..."
      />
    </QueryClientProvider>
  )
}
```

## API

### `UiAutocomplete`

Required props:

- `queryKey: readonly unknown[]`
- `fetchPage: FetchPaginatedPage<Record<string, unknown>>`
- `value: OptionType | null`
- `onChange: (value: OptionType | null) => void`

Optional props:

- Data/search: `pageSize`, `searchParam`, `nameKey`, `idKey`, `additionalParams`, `debounceMs`
- Behavior: `triggerOnFocus` (default: `true`), `disabled`, `clearable`
- Render customization: `renderOption`, `renderEmpty`, `renderLoading`, `renderError`
- Label/value mapping: `getOptionLabel`, `getOptionValue`
- Styling: `className`, `popoverContentClassName`, `commandListClassName`, `clearButtonClassName`
- Icon slots: `icons?: { loading?: ReactNode; clear?: ReactNode; check?: ReactNode; chevron?: ReactNode }`

### `usePaginatedSearch`

Thin adapter hook for custom UIs.

Options:

- `queryKey`, `fetchPage`
- `pageSize`, `searchParam`, `nameKey`, `idKey`, `additionalParams`, `debounceMs`

Returns:

- `options`
- `isLoading`, `isError`, `error`
- `fetchNextPage`, `hasNextPage`, `isFetchingNextPage`
- `searchTerm`, `handleSearchChange`, `refetch`

### Types

- `OptionType`
- `PaginatedApiResponse<T>`
- `FetchPaginatedPageArgs`
- `FetchPaginatedPage<T>`

## Custom UI (Headless)

Use `usePaginatedSearch` when you want full UI control:

```tsx
const {
  options,
  searchTerm,
  handleSearchChange,
  fetchNextPage,
  hasNextPage,
  isLoading,
  isError,
  error,
} = usePaginatedSearch({
  queryKey: ['users'],
  fetchPage,
})
```
