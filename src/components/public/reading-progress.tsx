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

      // Get the scroll container (content scrolls inside this, not window)
      const scrollContainer = document.getElementById('scroll-container')
      const containerTop = scrollContainer?.getBoundingClientRect().top ?? 0

      // Get the article's position in screen space (after transform)
      const rect = article.getBoundingClientRect()

      // Calculate progress relative to scroll container:
      // - 0%: top of scroll container at top of article
      // - 100%: middle of scroll container at bottom of article
      const containerHeight = scrollContainer?.clientHeight ?? window.innerHeight
      const containerHalfHeight = containerHeight / 2
      const articleTop = rect.top - containerTop
      const articleHeight = rect.height

      // Distance scrolled from 0% position
      const scrolled = -articleTop
      // Total scroll range (from 0% to 100%)
      const totalRange = articleHeight - containerHalfHeight
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

    // Get the scroll container - content scrolls here, not on window
    const scrollContainer = document.getElementById('scroll-container')

    // Update on scroll/pan events
    // Listen on both window and scroll container for completeness
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('wheel', scheduleUpdate, { passive: true })
    window.addEventListener('touchmove', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    // Also listen on the actual scroll container
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', scheduleUpdate, { passive: true })
    }

    // Initial update
    updateProgress()

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('wheel', scheduleUpdate)
      window.removeEventListener('touchmove', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', scheduleUpdate)
      }
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
