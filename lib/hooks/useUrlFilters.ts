'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'

type FilterValue = string | string[] | null | undefined

interface UseUrlFiltersOptions {
  defaults?: Record<string, FilterValue>
}

export function useUrlFilters(options: UseUrlFiltersOptions = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(() => {
    const result: Record<string, string | string[]> = {}
    searchParams.forEach((value, key) => {
      const existing = result[key]
      if (existing) {
        result[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value]
      } else {
        result[key] = value
      }
    })
    return result
  }, [searchParams])

  const setFilter = useCallback(
    (key: string, value: FilterValue) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === null || value === undefined || value === '') {
        params.delete(key)
      } else if (Array.isArray(value)) {
        params.delete(key)
        value.forEach((v) => params.append(key, v))
      } else {
        params.set(key, value)
      }

      // Сбрасываем пагинацию при изменении фильтра
      params.delete('page')
      params.delete('cursor')

      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const setFilters = useCallback(
    (updates: Record<string, FilterValue>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          params.delete(key)
        } else if (Array.isArray(value)) {
          params.delete(key)
          value.forEach((v) => params.append(key, v))
        } else {
          params.set(key, value)
        }
      })

      params.delete('page')
      params.delete('cursor')

      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const resetFilters = useCallback(() => {
    const limit = searchParams.get('limit')
    if (limit) {
      router.push(`${pathname}?limit=${encodeURIComponent(limit)}`, { scroll: false })
    } else {
      router.push(pathname, { scroll: false })
    }
  }, [router, pathname, searchParams])

  const activeCount = useMemo(() => {
    let count = 0
    searchParams.forEach((value, key) => {
      if (
        key !== 'page' &&
        key !== 'sort' &&
        key !== 'cursor' &&
        key !== 'limit' &&
        value !== '' &&
        value !== (options.defaults?.[key] ?? '')
      ) {
        count++
      }
    })
    return count
  }, [searchParams, options.defaults])

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    activeCount,
    getFilter: (key: string) => filters[key] ?? options.defaults?.[key] ?? '',
  }
}
