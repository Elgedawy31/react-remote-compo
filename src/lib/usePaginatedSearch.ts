import type { PaginatedApiResponse, OptionType } from './types'
import { useRemoteCombo } from './useRemoteComboCore'

export interface FetchPaginatedPageArgs {
  page: number
  pageSize: number
  searchTerm: string
  searchParam: string
  additionalParams: Record<string, string | number | undefined>
  signal: AbortSignal | undefined
}

/**
 * Load a single page for infinite query. You must map the backend response into
 * {@link PaginatedApiResponse} (correct `data` array and `pagination` fields).
 */
export type FetchPaginatedPage<T extends Record<string, unknown>> = (
  args: FetchPaginatedPageArgs,
) => Promise<PaginatedApiResponse<T>>

export interface UsePaginatedSearchOptions<T extends Record<string, unknown>> {
  /** Stable key prefix for React Query (e.g. `['users']`) */
  queryKey: readonly unknown[]
  fetchPage: FetchPaginatedPage<T>
  pageSize?: number
  searchParam?: string
  nameKey?: string
  idKey?: string
  additionalParams?: Record<string, string | number | undefined>
  debounceMs?: number
}

export function usePaginatedSearch<T extends Record<string, unknown>>({
  queryKey,
  fetchPage,
  pageSize = 10,
  searchParam = 'name',
  nameKey = 'name',
  idKey = 'id',
  additionalParams = {},
  debounceMs = 500,
}: UsePaginatedSearchOptions<T>) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    search,
    setSearch,
    refetch,
  } = useRemoteCombo<T, PaginatedApiResponse<T>>({
    queryKey: [
      ...queryKey,
      {
        additionalParams,
        pageSize,
        searchParam,
      },
    ],
    fetchPage: async ({ page, search, signal }) => {
      const response = await fetchPage({
        page,
        pageSize,
        searchTerm: search,
        searchParam,
        additionalParams,
        signal,
      })

      if (!response.data || !response.pagination) {
        throw new Error('Paginated response must include data and pagination')
      }

      return response
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination
      if (pagination && pagination.current_page < pagination.last_page) {
        return pagination.current_page + 1
      }
      return undefined
    },
    debounceMs,
  })

  const options = data.map((item) => ({
    id: String(item[idKey as keyof T]),
    name: String(item[nameKey as keyof T]),
    ...item,
  })) as OptionType[]

  return {
    options,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    /** Present when `isError` is true; use for custom `renderError` or logging */
    error,
    searchTerm: search,
    handleSearchChange: setSearch,
    refetch,
  }
}
