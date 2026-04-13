import { useState } from 'react'
import { ImageOff } from 'lucide-react'

/**
 * Image with broken-src fallback (matches common admin profile dialog pattern).
 */
export default function ImageWithFallback({ src, alt = '', className = '' }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted text-muted-foreground ${className}`}
        role="img"
        aria-label={alt || 'No image'}
      >
        <ImageOff className="mb-1 h-8 w-8 opacity-40" aria-hidden />
        <span className="text-xs">No preview</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}
