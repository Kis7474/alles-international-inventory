import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface SalesRecord {
  id: number
  date: string
  type: string
  itemName: string
  customer: string | null
  quantity: number
  unitPrice: number
  amount: number
  cost: number
  margin: number
  marginRate: number
  salesperson: {
    id: number
    code: string
    name: string
  }
  category: {
    id: number
    code: string
    nameKo: string
  }
  vendor: { name: string } | null
  vatIncluded: boolean
  totalAmount: number | null
  notes: string | null
}

interface SalesFilters {
  type?: string
  salespersonId?: string
  categoryId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

interface PaginatedResponse {
  data: SalesRecord[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useSales(filters?: SalesFilters, initialData?: SalesRecord[] | PaginatedResponse) {
  const queryClient = useQueryClient()

  const params = new URLSearchParams()
  if (filters?.type) params.append('type', filters.type)
  if (filters?.salespersonId) params.append('salespersonId', filters.salespersonId)
  if (filters?.categoryId) params.append('categoryId', filters.categoryId)
  if (filters?.startDate) params.append('startDate', filters.startDate)
  if (filters?.endDate) params.append('endDate', filters.endDate)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())

  const query = useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const res = await fetch(`/api/sales${params.toString() ? '?' + params.toString() : ''}`)
      if (!res.ok) throw new Error('Failed to fetch sales')
      const data = await res.json()
      return data
    },
    initialData,
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create sales record')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update sales record')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sales?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete sales record')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch('/api/sales', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Failed to bulk delete sales records')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  return {
    ...query,
    createSales: createMutation.mutateAsync,
    updateSales: updateMutation.mutateAsync,
    deleteSales: deleteMutation.mutateAsync,
    bulkDeleteSales: bulkDeleteMutation.mutateAsync,
  }
}
