import { useQuery } from '@tanstack/react-query'

export interface Category {
  id: number
  code?: string
  name?: string
  nameKo: string
}

export function useCategories(initialData?: Category[]) {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
    initialData,
  })
}
