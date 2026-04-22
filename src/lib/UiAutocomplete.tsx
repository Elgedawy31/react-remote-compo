import React, { useRef, useState, useCallback, useImperativeHandle, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from 'cmdk'
import { Input } from './primitives/input'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/popover'
import { cn } from './cn'
import { usePaginatedSearch, type FetchPaginatedPage } from './usePaginatedSearch'
import type { MultiSelectValue, OptionType, SingleSelectValue } from './types'
import { defaultGetOptionLabel, defaultGetOptionValue } from './optionDefaults'

const DefaultLoadingIcon = (
  <svg
    className="h-4 w-4 animate-spin text-gray-500"
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
  <svg
    className="h-4 w-4 text-blue-600"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M5 13l4 4L19 7"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const DefaultChevronDown = (
  <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none">
    <path
      d="M6 9l6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const DefaultArrowRight = (
  <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24">
    <path
      d="M9 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

function DefaultLoadingState({
  icon,
  spinnerStyle,
}: {
  icon: ReactNode
  spinnerStyle: React.CSSProperties
}) {
  return (
    <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
      <span className="inline-flex items-center justify-center" style={spinnerStyle}>
        {icon}
      </span>
      <span>Loading…</span>
    </div>
  )
}

function DefaultEmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
      <CommandEmpty>{message}</CommandEmpty>
    </div>
  )
}

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

interface UiAutocompleteBaseProps {
  queryKey: readonly unknown[]
  fetchPage: FetchPaginatedPage<Record<string, unknown>>
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

interface UiAutocompleteSingleProps extends UiAutocompleteBaseProps {
  multiple?: false
  value: SingleSelectValue
  onChange: (value: SingleSelectValue) => void
}

interface UiAutocompleteMultiProps extends UiAutocompleteBaseProps {
  multiple: true
  value: MultiSelectValue
  onChange: (value: MultiSelectValue) => void
}

export type UiAutocompleteProps = UiAutocompleteSingleProps | UiAutocompleteMultiProps

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
      multiple = false,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const labelOf = useMemo(
      () => getOptionLabel ?? defaultGetOptionLabel,
      [getOptionLabel],
    )
    const valueOf = useMemo(() => getOptionValue ?? defaultGetOptionValue, [getOptionValue])

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
      additionalParams,
      debounceMs,
    })
    const selectedItems = useMemo<OptionType[]>(
      () => (Array.isArray(value) ? value : value != null ? [value] : []),
      [value],
    )
    const selectedSingleValue = Array.isArray(value) ? null : value
    const displayValue = multiple
      ? searchTerm
      : isTyping
        ? searchTerm
        : selectedSingleValue != null
          ? labelOf(selectedSingleValue)
          : ''

    useImperativeHandle(ref, () => inputRef.current!)

    const isOptionSelected = useCallback(
      (opt: OptionType) =>
        selectedItems.some((item) => String(valueOf(item)) === String(valueOf(opt))),
      [selectedItems, valueOf],
    )

    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget
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
          setIsTyping(false)
          handleSearchChange('')
        }
        setOpen(newOpen)
      },
      [handleSearchChange],
    )

    const showClear = clearable && selectedItems.length > 0 && !disabled
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
      <DefaultLoadingState icon={icons?.loading ?? DefaultLoadingIcon} spinnerStyle={spinnerStyle} />
    )

    const defaultEmpty = <DefaultEmptyState message={emptyMessage} />

    return (
      <div className="">
        <style>{`@keyframes uiAutocompleteSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : handleOpenChange}>
          <PopoverTrigger asChild disabled={disabled}>
            <div className="w-full">
              <div className="relative">
                <Input
                  ref={inputRef}
                  value={displayValue}
                  placeholder={placeholder}
                  className={cn('w-full', className, disabled && 'cursor-not-allowed opacity-50')}
                  style={multiple ? undefined : triggerPaddingStyle}
                  disabled={disabled}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    if (!disabled) {
                      setOpen(true)
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!disabled) {
                      setOpen(true)
                    }
                  }}
                  onChange={(e) => {
                    setIsTyping(true)
                    handleSearchChange(e.target.value)
                  }}
                  onFocus={() => {
                    if (triggerOnFocus) {
                      setOpen(true)
                    }
                  }}
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
                      if (multiple) {
                        ;(onChange as (value: MultiSelectValue) => void)([])
                      } else {
                        ;(onChange as (value: SingleSelectValue) => void)(null)
                      }
                    }}
                  >
                    {icons?.clear ?? DefaultClearIcon}
                  </button>
                )}
                {!disabled &&
                  (isLoading ? (
                    <span
                      className="absolute top-1/2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground"
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
              {multiple && selectedItems.length > 0 && (
                <div
                  className="mt-2 flex max-h-20 flex-wrap gap-1 overflow-y-auto rounded-md border border-input bg-background p-2"
                >
                  {selectedItems.map((item) => {
                    const itemValue = String(valueOf(item))
                    return (
                      <span
                        key={itemValue}
                        className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs"
                      >
                        <span>{labelOf(item)}</span>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                          onPointerDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const next = selectedItems.filter(
                              (selected) => String(valueOf(selected)) !== itemValue,
                            )
                            ;(onChange as (value: MultiSelectValue) => void)(next)
                          }}
                          aria-label={`Remove ${labelOf(item)}`}
                        >
                          ×
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </PopoverTrigger>
          {!disabled && (
            <PopoverContent
              className={cn(
                'w-full p-0 border border-input max-h-80',
                popoverContentClassName,
              )}
              align="start"
              id="autocomplete-list"
              style={{ width: 'var(--radix-popover-trigger-width)' }}
            >
              <Command shouldFilter={false} className="w-full">
                <CommandList
                    onScroll={handleScroll}
                    className={cn('p-0 pr-1 pb-1 max-h-64 overflow-y-auto', commandListClassName)}
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
                                if (multiple) {
                                  const exists = selectedItems.some(
                                    (item) => String(valueOf(item)) === v,
                                  )
                                  const next = exists
                                    ? selectedItems.filter(
                                        (item) => String(valueOf(item)) !== v,
                                      )
                                    : [...selectedItems, option]
                                  ;(onChange as (value: MultiSelectValue) => void)(next)
                                  setIsTyping(true)
                                } else {
                                  ;(onChange as (value: SingleSelectValue) => void)(option)
                                  setIsTyping(false)
                                  handleSearchChange('')
                                  setOpen(false)
                                }
                              }}
                              className="relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none transition-colors duration-150 hover:bg-accent/70 hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                            >
                              {renderOption ? renderOption(option, selected) : labelOf(option)}
                              {selected && (
                                <span className="absolute right-2 flex size-5 items-center justify-center rounded-full bg-blue-100">
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
                              <span aria-hidden="true">{DefaultArrowRight}</span>
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
