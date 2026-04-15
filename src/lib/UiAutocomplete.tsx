import React, { useRef, useState, useCallback, useImperativeHandle, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk'
import { Input } from './primitives/input'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/popover'
import { cn } from './cn'
import { usePaginatedSearch, type FetchPaginatedPage } from './usePaginatedSearch'
import type { OptionType } from './types'
import { defaultGetOptionLabel, defaultGetOptionValue } from './optionDefaults'

const DefaultLoadingIcon = (
  <svg
    className="h-4 w-4 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      opacity="0.2"
    />
    <path
      d="M22 12a10 10 0 0 1-10 10"
      stroke="currentColor"
      strokeWidth="4"
    />
  </svg>
)

const DefaultClearIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

const DefaultCheckIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path
      d="M5 13l4 4L19 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const DefaultChevronDown = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
    <path
      d="M6 9l6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

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
  /** Optional icon slots for UI customization */
  icons?: {
    loading?: ReactNode
    clear?: ReactNode
    check?: ReactNode
    chevron?: ReactNode
  }
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
      triggerOnFocus = true,
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
      icons,
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
    const containerRef = useRef<HTMLDivElement>(null)
    const [isRtl, setIsRtl] = useState(false)

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
      additionalParams,
      debounceMs,
    })

    useImperativeHandle(ref, () => inputRef.current!)

    useEffect(() => {
      const readDirection = () => {
        const root = containerRef.current
        if (!root) return

        const elementDir = root.closest('[dir]')?.getAttribute('dir')
        const documentDir = document?.documentElement?.getAttribute('dir')
        const dir = (elementDir || documentDir || 'ltr').toLowerCase()
        setIsRtl(dir === 'rtl')
      }

      readDirection()
      window.addEventListener('resize', readDirection)
      return () => window.removeEventListener('resize', readDirection)
    }, [])

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
    const triggerPaddingStyle = {
      paddingInlineEnd: showClear ? '5rem' : '2.75rem',
    } as const

    const clearOffsetStyle = {
      insetInlineEnd: '2.25rem',
    } as const

    const iconOffsetStyle = {
      insetInlineEnd: '0.75rem',
    } as const

    // Pure CSS fallback spinner (independent from Tailwind animate utilities)
    const spinnerStyle = {
      animation: 'uiAutocompleteSpin 0.9s linear infinite',
    } as const

    const defaultLoading = (
      <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <span className="inline-flex items-center justify-center" style={spinnerStyle}>
          {icons?.loading ?? DefaultLoadingIcon}
        </span>
        <span>Loading…</span>
      </div>
    )

    const defaultEmpty = (
      <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
        <CommandEmpty>{emptyMessage}</CommandEmpty>
      </div>
    )

    return (
      <div ref={containerRef} className="">
        <style>{`@keyframes uiAutocompleteSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : handleOpenChange}>
          <PopoverTrigger asChild disabled={disabled}>
            <div className="relative w-full">
              <Input
                ref={inputRef}
                value={displayText}
                placeholder={placeholder}
                className={cn('w-full', className, disabled && 'cursor-not-allowed opacity-50')}
                style={triggerPaddingStyle}
                disabled={disabled}
                onFocus={() => {
                  if (triggerOnFocus) {
                    setOpen(true)
                  }
                }}
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
                    'absolute top-1/2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground',
                    clearButtonClassName,
                  )}
                  style={clearOffsetStyle}
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
                  {icons?.clear ?? DefaultClearIcon}
                </button>
              )}
              {!disabled &&
                (isLoading ? (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 text-muted-foreground"
                    style={{ ...iconOffsetStyle, ...spinnerStyle }}
                  >
                    {icons?.loading ?? DefaultLoadingIcon}
                  </span>
                ) : (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={open ? 'Collapse options' : 'Expand options'}
                    className="absolute top-1/2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    style={iconOffsetStyle}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setOpen((v) => !v)
                    }}
                  >
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 items-center justify-center transition-transform duration-200 ease-in-out',
                        open && 'rotate-180',
                      )}
                    >
                      {icons?.chevron ?? DefaultChevronDown}
                    </span>
                  </button>
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
                  className={cn(
                    'h-9 border-b border-input px-3 text-sm outline-none',
                    '[&_.cmdk-input-wrapper]:flex [&_.cmdk-input-wrapper]:w-full [&_.cmdk-input-wrapper]:items-center',
                    '[&_.cmdk-input-wrapper_svg]:order-2 [&_.cmdk-input-wrapper_svg]:shrink-0 [&_.cmdk-input]:w-full',
                    isRtl
                      ? '[&_.cmdk-input-wrapper_svg]:mr-auto [&_.cmdk-input-wrapper_svg]:ml-3 [&_.cmdk-input-wrapper_input]:pl-2'
                      : '[&_.cmdk-input-wrapper_svg]:ml-auto [&_.cmdk-input-wrapper_svg]:mr-3 [&_.cmdk-input-wrapper_input]:pr-2',
                  )}
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
                              className="relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none transition-colors duration-150 hover:bg-accent/70 hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                            >
                              {renderOption ? renderOption(option, selected) : labelOf(option)}
                              {selected && (
                                <span className="absolute right-2 flex size-3.5 items-center justify-center">
                                  {icons?.check ?? DefaultCheckIcon}
                                </span>
                              )}
                            </CommandItem>
                          )
                        })}
                        {hasNextPage &&
                          (isFetchingNextPage ? (
                            <CommandItem className="flex items-center justify-center p-2">
                              <span style={spinnerStyle}>{icons?.loading ?? DefaultLoadingIcon}</span>
                            </CommandItem>
                          ) : (
                            <CommandItem
                              onSelect={() => fetchNextPage()}
                              className="flex cursor-pointer items-center justify-center gap-2 rounded-sm py-1.5 text-sm text-primary transition-colors duration-150 hover:bg-accent/70 hover:text-accent-foreground"
                            >
                              Load More
                              <span aria-hidden="true">›</span>
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
