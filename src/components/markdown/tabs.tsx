'use client'

import { useState, Children, ReactNode, ReactElement, isValidElement } from 'react'
import { cn } from '@/lib/utils'

interface TabsContainerProps {
  'data-items'?: string
  children: ReactNode
  className?: string
}

/**
 * TabsContainer - wrapper component for tabs
 * Receives items as JSON string in data-items attribute
 * Children are tab-item elements with already-processed markdown content
 */
export function TabsContainer({ 'data-items': dataItems, children, className }: TabsContainerProps) {
  const [activeTab, setActiveTab] = useState(0)

  // Parse items from data attribute
  let items: string[] = []
  if (dataItems) {
    try {
      items = JSON.parse(dataItems)
    } catch (e) {
      console.error('Failed to parse tabs items:', e)
    }
  }

  // Collect tab-item children
  const tabContents: ReactNode[] = []

  const collectTabItems = (node: ReactNode): void => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return

      const element = child as ReactElement<{ children?: ReactNode }>

      // Check if this is a tab-item (either string type or TabItem component)
      const isTabItem =
        (typeof element.type === 'string' && element.type === 'tab-item') ||
        element.type === TabItem

      if (isTabItem) {
        tabContents.push(element.props.children)
      } else if (element.props.children) {
        // Recursively search in children
        collectTabItems(element.props.children)
      }
    })
  }

  collectTabItems(children)

  if (items.length === 0 || tabContents.length === 0) {
    // Fallback: just render children
    return <>{children}</>
  }

  return (
    <div className={cn('my-6 border border-border rounded-lg overflow-hidden', className)}>
      {/* Tab headers */}
      <div className="flex flex-wrap gap-0 bg-muted/50 border-b border-border overflow-x-auto">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20',
              activeTab === index
                ? 'bg-card text-foreground border-b-2 border-primary -mb-px'
                : 'text-muted-foreground'
            )}
          >
            {item}
          </button>
        ))}
      </div>
      {/* Tab content - only show active tab */}
      <div className="p-4 bg-card">
        {tabContents[activeTab]}
      </div>
    </div>
  )
}

interface TabItemProps {
  children: ReactNode
}

/**
 * TabItem - individual tab content
 * Content is rendered by parent TabsContainer based on active tab
 */
export function TabItem({ children }: TabItemProps) {
  // This component doesn't render directly - TabsContainer extracts its children
  // But we still need to return something for the tree
  return <>{children}</>
}
