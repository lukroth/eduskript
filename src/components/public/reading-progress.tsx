'use client'

import { useState, useEffect } from 'react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let rafId: number | null = null
    let lastProgress = 0

    const updateProgress = () => {
      // Find the article element (contains the actual content)
      const article = document.querySelector('article.prose-theme')
      if (!article) return

      // Get the article's position in screen space (after transform)
      const rect = article.getBoundingClientRect()

      // Calculate progress:
      // - 0%: top of viewport at top of article (rect.top = 0)
      // - 100%: middle of viewport at bottom of article (rect.top = window.innerHeight/2 - rect.height)
      const viewportHalfHeight = window.innerHeight / 2
      const articleTop = rect.top
      const articleHeight = rect.height

      // Distance scrolled from 0% position
      const scrolled = -articleTop
      // Total scroll range (from 0% to 100%)
      const totalRange = articleHeight - viewportHalfHeight
      // Progress percentage
      const scrollPercent = (scrolled / totalRange) * 100

      // Clamp between 0 and 100
      const clampedProgress = Math.max(0, Math.min(100, scrollPercent))

      // Only update state if progress changed by at least 0.1%
      if (Math.abs(clampedProgress - lastProgress) > 0.1) {
        lastProgress = clampedProgress
        setProgress(clampedProgress)
      }
    }

    // Throttled update using RAF
    const scheduleUpdate = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          updateProgress()
          rafId = null
        })
      }
    }

    // Update on scroll/pan events instead of continuous RAF loop
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('wheel', scheduleUpdate, { passive: true })
    window.addEventListener('touchmove', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    // Initial update
    updateProgress()

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('wheel', scheduleUpdate)
      window.removeEventListener('touchmove', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [])

  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50">
      <div
        className="h-full bg-blue-500 transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
