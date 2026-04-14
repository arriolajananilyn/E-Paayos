import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'

/**
 * Image with broken-src fallback (matches common admin profile dialog pattern).
 */
export default function ImageWithFallback({ src, alt = '', className = '', onLoadError }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const handleError = () => {
    setFailed(true)
    onLoadError?.()
  }

  if (!src) {
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

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 px-2 text-center bg-muted text-muted-foreground ${className}`}
        role="img"
        aria-label={alt || 'No image'}
      >
        <ImageOff className="mb-1 h-8 w-8 opacity-40" aria-hidden />
        <span className="text-xs font-medium">No preview</span>
        <span className="max-w-56 text-[10px] leading-snug text-muted-foreground/90">
          Hindi ma-load ang URL (404 o lumang record). Bagong registration ay naka-save na sa database.
        </span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  )
}
