import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface InventoryLot {
  id: number
  receivedDate: string
  quantityReceived: number
  quantityRemaining: number
  unitCost: number
  storageLocation: string | null
  notes: string | null
  productId: number | null
  itemId: number | null
  product?: any
  item?: any
}

interface LotsFilters {
  productId?: string
  itemId?: string
  page?: number
  limit?: number
}

export function useLots(filters?: LotsFilters, initialData?: InventoryLot[]) {
  const queryClient = useQueryClient()

  const params = new URLSearchParams()
  if (filters?.productId) params.append('productId', filters.productId)
  if (filters?.itemId) params.append('itemId', filters.itemId)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())

  const query = useQuery({
    queryKey: ['lots', filters],
    queryFn: async () => {
      const res = await fetch(`/api/lots${params.toString() ? '?' + params.toString() : ''}`)
      if (!res.ok) throw new Error('Failed to fetch lots')
      return res.json()
    },
    initialData,
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create lot')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/lots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update lot')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/lots?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete lot')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  return {
    ...query,
    createLot: createMutation.mutateAsync,
    updateLot: updateMutation.mutateAsync,
    deleteLot: deleteMutation.mutateAsync,
  }
}
