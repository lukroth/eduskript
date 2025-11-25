'use client'

import { useState, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const FONT_SIZE_KEY = 'eduskript-font-size'
const MIN_SIZE = 14
const MAX_SIZE = 28
const DEFAULT_SIZE = 19  // ~14pt
const STEP = 2

interface FontSizeControlsProps {
  orientation?: 'horizontal' | 'vertical'
}

export function FontSizeControls({ orientation = 'horizontal' }: FontSizeControlsProps) {
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE)
  const [mounted, setMounted] = useState(false)

  // Apply font size to the document
  const applyFontSize = (size: number) => {
    // Apply to prose content specifically
    document.documentElement.style.setProperty('--user-font-size', `${size}px`)

    // Also apply a scaling factor for other text elements
    const scaleFactor = size / DEFAULT_SIZE
    document.documentElement.style.setProperty('--user-font-scale', scaleFactor.toString())
  }

  // Set mounted state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Load saved font size from localStorage after mount
  useEffect(() => {
    if (!mounted) return

    const saved = localStorage.getItem(FONT_SIZE_KEY)
    if (saved) {
      const size = parseInt(saved, 10)
      if (size >= MIN_SIZE && size <= MAX_SIZE) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFontSize(size)
        applyFontSize(size)
      }
    }
  }, [mounted])

  const handleIncrease = () => {
    const newSize = Math.min(fontSize + STEP, MAX_SIZE)
    setFontSize(newSize)
    localStorage.setItem(FONT_SIZE_KEY, newSize.toString())
    applyFontSize(newSize)
  }

  const handleDecrease = () => {
    const newSize = Math.max(fontSize - STEP, MIN_SIZE)
    setFontSize(newSize)
    localStorage.setItem(FONT_SIZE_KEY, newSize.toString())
    applyFontSize(newSize)
  }

  // Don't render until mounted to avoid hydration issues
  if (!mounted) return null

  const canIncrease = fontSize < MAX_SIZE
  const canDecrease = fontSize > MIN_SIZE

  const isVertical = orientation === 'vertical'

  return (
    <TooltipProvider>
      <div className={`flex border border-border bg-card ${
        isVertical
          ? 'flex-col rounded-lg'
          : 'items-center rounded-full'
      }`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleDecrease}
              disabled={!canDecrease}
              aria-label="Decrease font size"
              className={`p-2 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isVertical ? 'rounded-t-lg' : 'rounded-l-full'
              }`}
            >
              <Minus className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Decrease text size</p>
          </TooltipContent>
        </Tooltip>

        <div className={isVertical ? 'h-[1px] w-4 bg-border mx-auto' : 'w-[1px] h-4 bg-border'} />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleIncrease}
              disabled={!canIncrease}
              aria-label="Increase font size"
              className={`p-2 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isVertical ? 'rounded-b-lg' : 'rounded-r-full'
              }`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Increase text size</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}