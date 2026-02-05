import { useQuery } from '@tanstack/react-query'

export interface InventoryItem {
  productId: number | null
  productName?: string
  productCode?: string
  unit?: string
  purchaseVendor?: string
  category?: string
  totalQuantity: number
  avgUnitCost: number
  avgUnitCostWithoutStorage?: number
  allocatedStorageExpense?: number
  totalValue: number
  totalValueWithStorage?: number
  lotCount: number
  lots?: any[]
  storageExpensePerUnit?: number
  totalStorageExpense?: number
}

interface InventoryFilters {
  productId?: string
  itemId?: string
  storageLocation?: string
  page?: number
  limit?: number
}

export function useInventory(filters?: InventoryFilters, initialData?: InventoryItem[]) {
  const params = new URLSearchParams()
  if (filters?.productId) params.append('productId', filters.productId)
  if (filters?.itemId) params.append('itemId', filters.itemId)
  if (filters?.storageLocation) params.append('storageLocation', filters.storageLocation)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())

  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: async () => {
      const res = await fetch(`/api/inventory${params.toString() ? '?' + params.toString() : ''}`)
      if (!res.ok) throw new Error('Failed to fetch inventory')
      return res.json()
    },
    initialData,
  })
}
