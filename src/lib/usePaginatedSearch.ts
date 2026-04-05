import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { PaginatedApiResponse, OptionType } from './types'
import { useDebounce } from './useDebounce'

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
  enabled?: boolean
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
  enabled = true,
  additionalParams = {},
  debounceMs = 500,
}: UsePaginatedSearchOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: [...queryKey, debouncedSearchTerm, additionalParams, pageSize, searchParam],
    queryFn: async ({ pageParam = 1, signal }) => {
      const response = await fetchPage({
        page: pageParam as number,
        pageSize,
        searchTerm: debouncedSearchTerm,
        searchParam,
        additionalParams,
        signal,
      })

      if (!response.data || !response.pagination) {
        throw new Error('Paginated response must include data and pagination')
      }

      return response
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination
      if (pagination && pagination.current_page < pagination.last_page) {
        return pagination.current_page + 1
      }
      return undefined
    },
    select: (infiniteData) => ({
      ...infiniteData,
      pages: infiniteData.pages.map((page) => {
        const pageData = Array.isArray(page.data) ? page.data : []
        return {
          ...page,
          data: pageData.map((item) => ({
            id: item[idKey as keyof T] as string | number,
            name: item[nameKey as keyof T] as string,
            ...item,
          })) as OptionType[],
        }
      }),
    }),
    enabled,
  })

  const options = data?.pages.flatMap((page) => page.data) ?? []

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  return {
    options,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    /** Present when `isError` is true; use for custom `renderError` or logging */
    error,
    searchTerm,
    handleSearchChange,
    refetch,
  }
}
