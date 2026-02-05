import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Material {
  id: number
  code: string
  name: string
  specification: string | null
  unit: string
  category: string | null
  notes: string | null
}

interface MaterialsFilters {
  page?: number
  limit?: number
}

export function useMaterials(filters?: MaterialsFilters, initialData?: Material[]) {
  const queryClient = useQueryClient()

  const params = new URLSearchParams()
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())

  const query = useQuery({
    queryKey: ['materials', filters],
    queryFn: async () => {
      const res = await fetch(`/api/materials${params.toString() ? '?' + params.toString() : ''}`)
      if (!res.ok) throw new Error('Failed to fetch materials')
      return res.json()
    },
    initialData,
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create material')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update material')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/materials?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete material')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    },
  })

  return {
    ...query,
    createMaterial: createMutation.mutateAsync,
    updateMaterial: updateMutation.mutateAsync,
    deleteMaterial: deleteMutation.mutateAsync,
  }
}
