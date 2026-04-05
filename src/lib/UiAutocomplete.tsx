import React, { useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk'
import { Loader, Check, ChevronRight, Info, ChevronDown } from 'lucide-react'
import { Input } from './primitives/input'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/popover'
import { cn } from './cn'
import { usePaginatedSearch, type FetchPaginatedPage } from './usePaginatedSearch'
import type { OptionType } from './types'

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
  className?: string
  disabled?: boolean
  emptyMessage?: string
  triggerOnFocus?: boolean
  additionalParams?: Record<string, string | number | undefined>
  debounceMs?: number
}

function getDisplayText(option: OptionType | null): string {
  if (!option) return ''

  const optionAny = option as unknown as Record<string, unknown>

  if (optionAny.first_name != null || optionAny.last_name != null) {
    return `${String(optionAny.first_name ?? '')} ${String(optionAny.last_name ?? '')}`.trim()
  }

  if (optionAny.package != null) {
    return `${option.name} - ${String(optionAny.package)}`
  }

  return option.name || (typeof option === 'object' ? JSON.stringify(option) : String(option))
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
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)
    const [displayValue, setDisplayValue] = useState(() => {
      if (value) {
        return typeof value === 'object' ? (value.name || JSON.stringify(value)) : String(value)
      }
      return ''
    })

    const inputRef = useRef<HTMLInputElement>(null)

    const {
      options,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
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

    useEffect(() => {
      setDisplayValue(getDisplayText(value))
    }, [value])

    useImperativeHandle(ref, () => inputRef.current!)

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
          setDisplayValue(getDisplayText(value))
          handleSearchChange('')
        }
        setOpen(newOpen)
      },
      [value, handleSearchChange],
    )

    return (
      <div className="">
        <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : handleOpenChange}>
          <PopoverTrigger asChild disabled={disabled}>
            <div className="relative w-full">
              <Input
                ref={inputRef}
                value={displayValue}
                placeholder={placeholder}
                className={cn('w-full', className, disabled && 'cursor-not-allowed opacity-50')}
                disabled={disabled}
                readOnly
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls="autocomplete-list"
              />
              {!disabled &&
                (isLoading ? (
                  <Loader className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                ) : options.length > 0 ? (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                ) : (
                  <ChevronRight className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                ))}
            </div>
          </PopoverTrigger>
          {!disabled && (
            <PopoverContent
              className="w-full p-0 border border-input max-h-72 overflow-hidden"
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
                {!(isLoading && searchTerm === '') && (
                  <CommandList onScroll={handleScroll} className="p-0 max-h-64 overflow-y-auto">
                    {options.length === 0 && !isLoading ? (
                      <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                        <Info className="h-4 w-4" />
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                      </div>
                    ) : (
                      <CommandGroup>
                        {options.map((option) => (
                          <CommandItem
                            key={option.id}
                            value={String(option.id)}
                            onSelect={() => {
                              onChange(option)
                              setOpen(false)
                            }}
                            className="relative flex w-full cursor-default select-none items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                          >
                            {getDisplayText(option)}
                            {value?.id === option.id && (
                              <span className="absolute right-2 flex size-3.5 items-center justify-center">
                                <Check className="size-4" />
                              </span>
                            )}
                          </CommandItem>
                        ))}
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
                )}
              </Command>
            </PopoverContent>
          )}
        </Popover>
      </div>
    )
  },
)

UiAutocomplete.displayName = 'UiAutocomplete'
