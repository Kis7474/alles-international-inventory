import Skeleton from './Skeleton'

export default function CardSkeleton({ 
  rows = 3 
}: { 
  rows?: number 
}) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow">
      <Skeleton height="1.5rem" width="60%" className="mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} height="1rem" />
        ))}
      </div>
    </div>
  )
}
