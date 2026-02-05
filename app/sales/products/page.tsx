'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SalesProductsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the master products page
    router.push('/master/products')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl text-gray-700">통합 품목 관리로 이동 중...</div>
    </div>
  )
}
