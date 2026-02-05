import { useQuery } from '@tanstack/react-query'

export interface Salesperson {
  id: number
  code: string
  name: string
  commissionRate: number
}

export function useSalespersons(initialData?: Salesperson[]) {
  return useQuery({
    queryKey: ['salespersons'],
    queryFn: async () => {
      const res = await fetch('/api/salesperson')
      if (!res.ok) throw new Error('Failed to fetch salespersons')
      return res.json()
    },
    initialData,
  })
}
