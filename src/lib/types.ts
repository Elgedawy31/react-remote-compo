export interface OptionType {
  id: string | number
  name: string
  package?: string
}

export type SingleSelectValue = OptionType | null
export type MultiSelectValue = OptionType[]

export interface PaginatedApiResponse<T> {
  data: T[]
  pagination: {
    total: number
    current_page: number
    last_page: number
    per_page: number
  }
}
