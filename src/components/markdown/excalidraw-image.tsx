'use client'

import { useTheme } from 'next-themes'
import { useState } from 'react'

interface ExcalidrawImageProps {
  lightSrc: string
  darkSrc: string
  alt?: string
  filename: string
}

export function ExcalidrawImage({ lightSrc, darkSrc, alt, filename }: ExcalidrawImageProps) {
  const { resolvedTheme } = useTheme()
  const [imageLoaded, setImageLoaded] = useState(false)

  // Use dark src if theme is dark, otherwise use light
  const src = resolvedTheme === 'dark' ? darkSrc : lightSrc

  return (
    <span
      className="excalidraw-wrapper inline-block my-4"
      data-excalidraw={filename}
    >
      <img
        src={src}
        alt={alt || filename.replace('.excalidraw', '')}
        loading="lazy"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        className={`max-w-full h-auto rounded-md transition-opacity duration-200 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
  )
}
