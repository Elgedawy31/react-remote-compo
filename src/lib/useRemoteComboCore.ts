import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useDebounce } from './useDebounce'

export interface RemoteComboCoreFetchArgs {
  page: number
  search: string
  signal: AbortSignal | undefined
}

export interface UseRemoteComboCoreOptions<TPage extends { data: unknown[] }> {
  queryKey: readonly unknown[]
  fetchPage: (args: RemoteComboCoreFetchArgs) => Promise<TPage>
  getNextPageParam: (lastPage: TPage) => number | undefined
  debounceMs?: number
}

export function useRemoteCombo<TItem, TPage extends { data: TItem[] }>({
  queryKey,
  fetchPage,
  getNextPageParam,
  debounceMs = 500,
}: UseRemoteComboCoreOptions<TPage>) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, debounceMs)

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: [...queryKey, { search: debouncedSearch }],
    queryFn: async ({ pageParam = 1, signal }) =>
      fetchPage({
        page: pageParam as number,
        search: debouncedSearch,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam,
  })

  const data = infiniteData?.pages.flatMap((page) => page.data) ?? []

  return {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    search,
    setSearch,
    refetch,
  }
}
