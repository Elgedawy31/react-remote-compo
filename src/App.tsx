import './App.css'
import { useCallback, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  UiAutocomplete,
  type FetchPaginatedPageArgs,
  type OptionType,
  type PaginatedApiResponse,
} from './lib/index.ts'

const queryClient = new QueryClient()

const DEMO_ITEMS = Array.from({ length: 47 }, (_, i) => ({
  id: i + 1,
  name: `Option ${i + 1}`,
}))

function App() {
  const [selected, setSelected] = useState<OptionType | null>(null)

  const fetchPage = useCallback(
    async ({
      page,
      pageSize,
      searchTerm,
      searchParam,
    }: FetchPaginatedPageArgs): Promise<PaginatedApiResponse<Record<string, unknown>>> => {
      await new Promise((r) => setTimeout(r, 200))
      let rows: Record<string, unknown>[] = DEMO_ITEMS
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        rows = rows.filter((row) =>
          String(row[searchParam] ?? row.name ?? '').toLowerCase().includes(q),
        )
      }
      const start = (page - 1) * pageSize
      const slice = rows.slice(start, start + pageSize)
      const lastPage = Math.max(1, Math.ceil(rows.length / pageSize))
      return {
        data: slice,
        pagination: {
          total: rows.length,
          current_page: page,
          last_page: lastPage,
          per_page: pageSize,
        },
      }
    },
    [],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <h1 className="text-3xl font-bold underline">Autocomplete demo</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Selected: {selected ? `${selected.name} (id: ${selected.id})` : 'none'}
      </p>
      <div className="mt-4 max-w-md">
        <UiAutocomplete queryKey={['demo-autocomplete']} fetchPage={fetchPage} value={selected} onChange={setSelected} />
      </div>
    </QueryClientProvider>
  )
}

export default App
