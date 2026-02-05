import Skeleton from './Skeleton'

export default function FormSkeleton({ 
  fields = 5 
}: { 
  fields?: number 
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <Skeleton height="1.5rem" width="50%" className="mb-6" />
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <Skeleton height="1rem" width="30%" className="mb-2" />
            <Skeleton height="2.5rem" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <Skeleton height="2.5rem" width="6rem" />
        <Skeleton height="2.5rem" width="6rem" />
      </div>
    </div>
  )
}
