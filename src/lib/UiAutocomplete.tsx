import React, { useRef, useState, useCallback, useImperativeHandle, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk'
import { Loader, Check, ChevronRight, Info, ChevronDown, X } from 'lucide-react'
import { Input } from './primitives/input'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/popover'
import { cn } from './cn'
import { usePaginatedSearch, type FetchPaginatedPage } from './usePaginatedSearch'
import type { OptionType } from './types'
import { defaultGetOptionLabel, defaultGetOptionValue } from './optionDefaults'

function DefaultQueryError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  const message = error instanceof Error ? error.message : 'Something went wrong'
  return (
    <div className="flex flex-col gap-2 p-4 text-sm">
      <p className="font-medium text-destructive">Failed to load options</p>
      <p className="text-muted-foreground">{message}</p>
      <button
        type="button"
        className="self-start rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        onClick={() => onRetry()}
      >
        Retry
      </button>
    </div>
  )
}

export interface UiAutocompleteProps {
  queryKey: readonly unknown[]
  fetchPage: FetchPaginatedPage<Record<string, unknown>>
  onChange: (value: OptionType | null) => void
  value: OptionType | null
  placeholder?: string
  pageSize?: number
  searchParam?: string
  nameKey?: string
  idKey?: string
  /** Merged onto the trigger input (existing API) */
  className?: string
  disabled?: boolean
  emptyMessage?: string
  triggerOnFocus?: boolean
  additionalParams?: Record<string, string | number | undefined>
  debounceMs?: number
  /** Override displayed text for an option (list + trigger when selected) */
  getOptionLabel?: (item: OptionType) => string
  /** Override identity for keys and selection compare (default: `item.id`) */
  getOptionValue?: (item: OptionType) => string | number
  /** Custom row content; default uses `getOptionLabel` */
  renderOption?: (item: OptionType, selected: boolean) => ReactNode
  /** Shown when there are no options and not loading/error */
  renderEmpty?: () => ReactNode
  /** Shown while the first page is loading (no rows yet) */
  renderLoading?: () => ReactNode
  /** Shown when the infinite query is in error state */
  renderError?: (error: unknown) => ReactNode
  /** Show clear control when `value` is set (default: `true`) */
  clearable?: boolean
  /** Extra classes for the popover panel */
  popoverContentClassName?: string
  /** Extra classes for the scrollable list region */
  commandListClassName?: string
  /** Extra classes for the clear button */
  clearButtonClassName?: string
}

export const UiAutocomplete = React.forwardRef<HTMLInputElement | null, UiAutocompleteProps>(
  (
    {
      queryKey,
      fetchPage,
      onChange,
      value,
      placeholder = 'Select an option',
      pageSize,
      searchParam,
      nameKey,
      idKey,
      className,
      disabled,
      emptyMessage = 'No results found.',
      triggerOnFocus = false,
      additionalParams = {},
      debounceMs,
      getOptionLabel,
      getOptionValue,
      renderOption,
      renderEmpty,
      renderLoading,
      renderError,
      clearable = true,
      popoverContentClassName,
      commandListClassName,
      clearButtonClassName,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)
    const labelOf = useMemo(
      () => getOptionLabel ?? defaultGetOptionLabel,
      [getOptionLabel],
    )
    const valueOf = useMemo(() => getOptionValue ?? defaultGetOptionValue, [getOptionValue])

    const displayText = value != null ? labelOf(value) : ''

    const inputRef = useRef<HTMLInputElement>(null)

    const {
      options,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      isError,
      error,
      refetch,
      handleSearchChange,
      searchTerm,
    } = usePaginatedSearch({
      queryKey,
      fetchPage,
      pageSize,
      searchParam,
      nameKey,
      idKey,
      enabled: !triggerOnFocus || open,
      additionalParams,
      debounceMs,
    })

    useImperativeHandle(ref, () => inputRef.current!)

    const isOptionSelected = useCallback(
      (opt: OptionType) =>
        value != null && String(valueOf(value)) === String(valueOf(opt)),
      [value, valueOf],
    )

    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement
        if (
          target.scrollHeight - target.scrollTop <= target.clientHeight + 50 &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage()
        }
      },
      [fetchNextPage, hasNextPage, isFetchingNextPage],
    )

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        if (!newOpen) {
          handleSearchChange('')
        }
        setOpen(newOpen)
      },
      [handleSearchChange],
    )

    const showClear = clearable && value != null && !disabled
    const triggerRightPadding = showClear ? 'pr-20' : 'pr-10'

    const defaultLoading = (
      <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader className="size-5 animate-spin shrink-0" />
        <span>Loading…</span>
      </div>
    )

    const defaultEmpty = (
      <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <CommandEmpty>{emptyMessage}</CommandEmpty>
      </div>
    )

    return (
      <div className="">
        <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : handleOpenChange}>
          <PopoverTrigger asChild disabled={disabled}>
            <div className="relative w-full">
              <Input
                ref={inputRef}
                value={displayText}
                placeholder={placeholder}
                className={cn('w-full', triggerRightPadding, className, disabled && 'cursor-not-allowed opacity-50')}
                disabled={disabled}
                readOnly
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls="autocomplete-list"
              />
              {showClear && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Clear selection"
                  className={cn(
                    'absolute right-9 top-1/2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground',
                    clearButtonClassName,
                  )}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange(null)
                  }}
                >
                  <X className="size-4" />
                </button>
              )}
              {!disabled &&
                (isLoading ? (
                  <Loader className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                ) : options.length > 0 ? (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform pointer-events-none',
                      open && 'rotate-180',
                    )}
                  />
                ) : (
                  <ChevronRight className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                ))}
            </div>
          </PopoverTrigger>
          {!disabled && (
            <PopoverContent
              className={cn(
                'w-full p-0 border border-input max-h-72 overflow-hidden',
                popoverContentClassName,
              )}
              align="start"
              id="autocomplete-list"
              style={{ width: 'var(--radix-popover-trigger-width)' }}
            >
              <Command shouldFilter={false} className="w-full">
                <CommandInput
                  value={searchTerm}
                  onValueChange={handleSearchChange}
                  placeholder={placeholder}
                  className="h-9 border-b border-input px-3 text-sm outline-none"
                />
                <CommandList
                    onScroll={handleScroll}
                    className={cn('p-0 max-h-64 overflow-y-auto', commandListClassName)}
                  >
                    {isError ? (
                      renderError ? (
                        renderError(error)
                      ) : (
                        <DefaultQueryError error={error} onRetry={() => refetch()} />
                      )
                    ) : isLoading && options.length === 0 ? (
                      renderLoading ? (
                        renderLoading()
                      ) : (
                        defaultLoading
                      )
                    ) : options.length === 0 ? (
                      renderEmpty ? (
                        renderEmpty()
                      ) : (
                        defaultEmpty
                      )
                    ) : (
                      <CommandGroup>
                        {options.map((option) => {
                          const selected = isOptionSelected(option)
                          const v = String(valueOf(option))
                          return (
                            <CommandItem
                              key={v}
                              value={v}
                              onSelect={() => {
                                onChange(option)
                                setOpen(false)
                              }}
                              className="relative flex w-full cursor-default select-none items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                            >
                              {renderOption ? renderOption(option, selected) : labelOf(option)}
                              {selected && (
                                <span className="absolute right-2 flex size-3.5 items-center justify-center">
                                  <Check className="size-4" />
                                </span>
                              )}
                            </CommandItem>
                          )
                        })}
                        {hasNextPage &&
                          (isFetchingNextPage ? (
                            <CommandItem className="flex items-center justify-center p-2">
                              <Loader className="h-4 w-4 animate-spin" />
                            </CommandItem>
                          ) : (
                            <CommandItem
                              onSelect={() => fetchNextPage()}
                              className="flex cursor-pointer items-center justify-center gap-2 rounded-sm py-1.5 text-sm text-primary hover:bg-accent hover:text-accent-foreground"
                            >
                              Load More
                              <ChevronRight className="h-4 w-4" />
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    )}
                  </CommandList>
              </Command>
            </PopoverContent>
          )}
        </Popover>
      </div>
    )
  },
)

UiAutocomplete.displayName = 'UiAutocomplete'
