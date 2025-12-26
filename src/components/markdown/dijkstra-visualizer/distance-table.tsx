'use client'

import { useState, useEffect, useRef } from 'react'
import type { GraphNode, AlgorithmStep } from './types'

interface DistanceTableProps {
  nodes: GraphNode[]
  currentStep: AlgorithmStep | null
  sourceNode: string | null
  autoScroll?: boolean
}

export function DistanceTable({
  nodes,
  currentStep,
  sourceNode,
  autoScroll = false
}: DistanceTableProps) {
  const [sortByPriority, setSortByPriority] = useState(true)
  const currentRowRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    if (autoScroll && currentRowRef.current) {
      currentRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [autoScroll, currentStep?.currentNode])

  if (!sourceNode || !currentStep) {
    return (
      <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-800 rounded-lg">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
          <span className="font-medium text-gray-700 dark:text-gray-300">Distanztabelle</span>
          <button
            className={`px-2 py-1 text-xs rounded ${sortByPriority ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300'}`}
            onClick={() => setSortByPriority(!sortByPriority)}
            title={sortByPriority ? 'Alphabetisch sortieren' : 'Nach Priority Queue sortieren'}
          >
            PQ
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
          Wähle einen Startknoten aus
        </div>
      </div>
    )
  }

  const sortedNodes = [...nodes].sort((a, b) => {
    if (!sortByPriority) {
      return a.label.localeCompare(b.label)
    }

    const aVisited = currentStep.visitedNodes.has(a.id)
    const bVisited = currentStep.visitedNodes.has(b.id)
    const aDistance = currentStep.distances.get(a.id) ?? Infinity
    const bDistance = currentStep.distances.get(b.id) ?? Infinity

    if (aVisited !== bVisited) {
      return aVisited ? -1 : 1
    }

    if (aDistance !== bDistance) {
      return aDistance - bDistance
    }

    return a.label.localeCompare(b.label)
  })

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
        <span className="font-medium text-gray-700 dark:text-gray-300">Distanztabelle</span>
        <button
          className={`px-2 py-1 text-xs rounded ${sortByPriority ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300'}`}
          onClick={() => setSortByPriority(!sortByPriority)}
          title={sortByPriority ? 'Alphabetisch sortieren' : 'Nach Priority Queue sortieren'}
        >
          PQ
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-200 dark:bg-slate-700 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Knoten</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                Distanz{sortByPriority && ' ↓'}
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Vorgänger</th>
            </tr>
          </thead>
          <tbody>
            {sortedNodes.map(node => {
              const distance = currentStep.distances.get(node.id)
              const previous = currentStep.previousNodes.get(node.id)
              const previousNode = previous
                ? nodes.find(n => n.id === previous)
                : null

              const isCurrent = currentStep.currentNode === node.id
              const isVisited = currentStep.visitedNodes.has(node.id)
              const isInQueue = currentStep.queueNodes.has(node.id)
              const isSource = node.id === sourceNode

              let rowClass = 'bg-white dark:bg-slate-800'
              if (isCurrent) {
                rowClass = 'bg-amber-100 dark:bg-amber-900/30'
              } else if (isVisited) {
                rowClass = 'bg-emerald-100 dark:bg-emerald-900/30'
              } else if (isInQueue) {
                rowClass = 'bg-blue-100 dark:bg-blue-900/30'
              }

              return (
                <tr
                  key={node.id}
                  className={rowClass}
                  ref={isCurrent ? currentRowRef : undefined}
                >
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                    <span className="flex items-center gap-1">
                      {node.label}
                      {isSource && <span className="text-red-500 font-bold">*</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                    {distance === undefined
                      ? '-'
                      : distance === Infinity
                        ? '∞'
                        : distance}
                  </td>
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                    {previousNode ? previousNode.label : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
