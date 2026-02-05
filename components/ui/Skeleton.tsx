export default function Skeleton({ 
  className = '', 
  width = '100%', 
  height = '1rem' 
}: { 
  className?: string
  width?: string
  height?: string 
}) {
  return (
    <div 
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={{ width, height }}
    />
  )
}
