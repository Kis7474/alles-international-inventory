import { useQuery } from '@tanstack/react-query'

export interface Vendor {
  id: number
  code: string
  name: string
  country: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
}

export function useVendors(initialData?: Vendor[]) {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await fetch('/api/vendors')
      if (!res.ok) throw new Error('Failed to fetch vendors')
      return res.json()
    },
    initialData,
  })
}
