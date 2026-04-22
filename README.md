# react-remote-combo

[![npm version](https://img.shields.io/npm/v/react-remote-combo.svg)](https://www.npmjs.com/package/react-remote-combo)
[![npm downloads](https://img.shields.io/npm/dw/react-remote-combo.svg)](https://www.npmjs.com/package/react-remote-combo)
[![license](https://img.shields.io/npm/l/react-remote-combo.svg)](https://github.com/elgedawy31/react-remote-combo/blob/main/LICENSE)

Headless-first remote autocomplete for React with debounced search and paginated results.  
Use the optional UI component (`UiAutocomplete`) or stay fully headless with hooks.

## Features

- Remote search with infinite pagination
- Debounced search input
- Single and multi-select modes (`multiple`)
- Custom rendering: `renderOption`, `renderEmpty`, `renderLoading`, `renderError`
- Optional icon slots: `loading`, `clear`, `check`, `chevron`
- Style overrides: `className`, `popoverContentClassName`, `commandListClassName`, `clearButtonClassName`
- TypeScript-first API and exported types

## Installation

```bash
npm install react-remote-combo
```

> UI dependencies are optional. Use the headless hook for full control.

### Optional UI dependencies (for `UiAutocomplete`)

```bash
npm install @radix-ui/react-popover cmdk
```

## Demo

Try it live: https://codesandbox.io/p/sandbox/gw72f4

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
    type UserRow = { id: number; name: string; email: string; username: string }

    const res = await fetch('https://jsonplaceholder.typicode.com/users', {
      signal: args.signal,
    })
    const users = (await res.json()) as UserRow[]
    const expandedUsers = Array.from({ length: 10 }, (_, groupIndex) =>
      users.map((user, index) => ({
        ...user,
        id: groupIndex * users.length + index + 1,
        name: `${user.name} ${groupIndex + 1}`,
        email: user.email.replace('@', `+${groupIndex + 1}@`),
        username: `${user.username}${groupIndex + 1}`,
      })),
    ).flat()

    const term = args.searchTerm.trim().toLowerCase()
    const filtered = term
      ? expandedUsers.filter((user) => user.name.toLowerCase().includes(term))
      : expandedUsers
    const start = (args.page - 1) * args.pageSize
    const end = start + args.pageSize
    const pageData = filtered.slice(start, end)
    const lastPage = Math.max(1, Math.ceil(filtered.length / args.pageSize))

    return {
      data: pageData,
      pagination: {
        total: filtered.length,
        current_page: args.page,
        last_page: lastPage,
        per_page: args.pageSize,
      },
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
        pageSize={10}
      />
    </QueryClientProvider>
  )
}
```

Multi-select mode:

```tsx
const [users, setUsers] = useState<OptionType[]>([])

<UiAutocomplete
  multiple
  queryKey={['items']}
  fetchPage={fetchPage}
  value={users}
  onChange={setUsers}
  pageSize={10}
/>
```

## API

### `UiAutocomplete`

Required props:

- `queryKey: readonly unknown[]`
- `fetchPage: FetchPaginatedPage<Record<string, unknown>>`
- `value: OptionType | null` (single) or `OptionType[]` (multiple)
- `onChange: (value) => void` matching the selected mode

Optional props:

- Data/search: `pageSize`, `searchParam`, `nameKey`, `idKey`, `additionalParams`, `debounceMs`
- Behavior: `multiple`, `triggerOnFocus` (default: `true`), `disabled`, `clearable`
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

## Links

- GitHub: https://github.com/elgedawy31/react-remote-combo
- npm: https://www.npmjs.com/package/react-remote-combo
