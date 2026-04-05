import type { OptionType } from './types'

/** Default label: `item.name`, or JSON fallback for edge cases */
export function defaultGetOptionLabel(item: OptionType): string {
  if (item?.name != null && String(item.name).trim() !== '') {
    return String(item.name)
  }
  try {
    return JSON.stringify(item)
  } catch {
    return ''
  }
}

/** Default value: `item.id` (stable key + selection match) */
export function defaultGetOptionValue(item: OptionType): string | number {
  return item.id
}
