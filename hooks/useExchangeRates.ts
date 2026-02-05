import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface ExchangeRate {
  id: number
  currency: string
  rate: number
  date: string
  source: string | null
}

export function useExchangeRates(initialData?: ExchangeRate[]) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const res = await fetch('/api/exchange-rates')
      if (!res.ok) throw new Error('Failed to fetch exchange rates')
      return res.json()
    },
    initialData,
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create exchange rate')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/exchange-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update exchange rate')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/exchange-rates?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete exchange rate')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] })
    },
  })

  return {
    ...query,
    createExchangeRate: createMutation.mutateAsync,
    updateExchangeRate: updateMutation.mutateAsync,
    deleteExchangeRate: deleteMutation.mutateAsync,
  }
}
