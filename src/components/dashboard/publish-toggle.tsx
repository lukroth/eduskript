'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CircleCheckBig, CircleMinus } from 'lucide-react'

interface PublishToggleProps {
  type: 'skript' | 'page'
  itemId: string
  isPublished: boolean
  onToggle: (newIsPublished: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function PublishToggle({
  type,
  itemId,
  isPublished: initialIsPublished,
  onToggle,
  size = 'sm',
  showText = true
}: PublishToggleProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPublished, setIsPublished] = useState(initialIsPublished)

  const handleToggle = async () => {
    setIsLoading(true)
    const newIsPublished = !isPublished
    try {
      const endpoint = type === 'skript' ? `/api/skripts/${itemId}` : `/api/pages/${itemId}`
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublished: newIsPublished
        })
      })

      if (response.ok) {
        setIsPublished(newIsPublished)
        onToggle(newIsPublished)
      } else {
        console.error(`Failed to toggle ${type} publish status`)
      }
    } catch (error) {
      console.error(`Error toggling ${type} publish status:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const iconSize = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3 h-3'
  const buttonSize = size === 'lg' ? 'default' : 'sm'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={buttonSize}
            onClick={handleToggle}
            disabled={isLoading}
            className={`${isPublished ? 'text-success hover:text-success/80' : 'text-warning hover:text-warning/80'} px-2`}
          >
            {isPublished ? (
              <CircleCheckBig className={iconSize} />
            ) : (
              <CircleMinus className={iconSize} />
            )}
            {showText && (
              <span className="ml-1 text-xs">
                {isPublished ? 'Published' : 'Draft'}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isPublished ? 'Unpublish' : 'Publish'} {type}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
