import { useCallback, useState } from 'react'
import {
  UiAutocomplete,
  type FetchPaginatedPageArgs,
  type OptionType,
  type PaginatedApiResponse,
} from './lib'

type UserRow = {
  id: number
  name: string
  email: string
  username: string
}

export default function App() {
  const [value, setValue] = useState<OptionType | null>(null)

  const fetchPage = useCallback(
    async (
      args: FetchPaginatedPageArgs,
    ): Promise<PaginatedApiResponse<Record<string, unknown>>> => {
      const res = await fetch('https://jsonplaceholder.typicode.com/users', {
        signal: args.signal,
      })
      const users = (await res.json()) as UserRow[]

      const term = args.searchTerm.trim().toLowerCase()
      const filtered = term
        ? users.filter((user) => user.name.toLowerCase().includes(term))
        : users

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
    },
    [],
  )

  return (
    <main className="app max-w-4xl mx-auto mt-96">
      
        <UiAutocomplete
          queryKey={['demo-users']}
          fetchPage={fetchPage}
          value={value}
          onChange={setValue}
          placeholder="Search users..."
          className="demo-input"
          popoverContentClassName="demo-popover"
          commandListClassName="demo-list"
        />
    </main>
  )
}
