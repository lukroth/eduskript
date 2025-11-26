'use client'

import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

export function PublicThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button className="p-2 rounded-md border border-border bg-card hover:bg-muted transition-colors">
        <div className="w-4 h-4" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md border border-border bg-card hover:bg-muted transition-colors"
      title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {resolvedTheme === 'light' ? (
        <Moon className="w-4 h-4 text-foreground" />
      ) : (
        <Sun className="w-4 h-4 text-foreground" />
      )}
    </button>
  )
}
