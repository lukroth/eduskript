'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { DijkstraCanvas } from './dijkstra-canvas'
import { ControlPanel } from './control-panel'
import { DistanceTable } from './distance-table'
import { GraphSettings } from './graph-settings'
import { generateRandomGraph } from './utils/graph-generator'
import { computeDijkstraSteps } from './utils/dijkstra-algorithm'
import type { DijkstraVisualizerProps, DijkstraConfig, AlgorithmStep } from './types'
import { AnimationState } from './types'

export function DijkstraVisualizer({
  initialNodeCount = 7,
  initialDirected = false
}: DijkstraVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mainAreaRef = useRef<HTMLDivElement>(null)
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDraggingDivider = useRef(false)

  const [dimensions, setDimensions] = useState({ width: 400, height: 300 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tablePanelWidth, setTablePanelWidth] = useState(180)

  // Measure container and set dimensions
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 32 // padding
        const canvasWidth = Math.max(250, containerWidth - tablePanelWidth - 8)
        const canvasHeight = Math.round(canvasWidth * 0.6)
        setDimensions({ width: canvasWidth, height: canvasHeight })
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [tablePanelWidth])

  const [config, setConfig] = useState<DijkstraConfig>(() => ({
    graph: generateRandomGraph(initialNodeCount, initialDirected, 400, 300),
    sourceNode: null,
    targetNode: null,
    steps: [],
    currentStepIndex: -1,
    animationState: AnimationState.IDLE,
    animationSpeed: 500,
    nodeCount: initialNodeCount,
    isDirected: initialDirected
  }))

  const currentStep: AlgorithmStep | null = useMemo(() => {
    if (config.currentStepIndex >= 0 && config.currentStepIndex < config.steps.length) {
      return config.steps[config.currentStepIndex] ?? null
    }
    return null
  }, [config.steps, config.currentStepIndex])

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Failed to enter fullscreen:', err)
      })
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Failed to exit fullscreen:', err)
      })
    }
  }, [])

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingDivider.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingDivider.current || !mainAreaRef.current) return

      const rect = mainAreaRef.current.getBoundingClientRect()
      const newTableWidth = rect.right - e.clientX
      const clampedWidth = Math.max(120, Math.min(300, newTableWidth))
      setTablePanelWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      if (isDraggingDivider.current) {
        isDraggingDivider.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    if (config.animationState !== AnimationState.PLAYING) return

    if (config.currentStepIndex >= config.steps.length - 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig(prev => ({ ...prev, animationState: AnimationState.FINISHED }))
      return
    }

    animationTimerRef.current = setTimeout(() => {
      setConfig(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1
      }))
    }, config.animationSpeed)

    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current)
      }
    }
  }, [config.animationState, config.currentStepIndex, config.steps.length, config.animationSpeed])

  const handleNodeClick = useCallback((nodeId: string, ctrlKey: boolean) => {
    setConfig(prev => {
      if (ctrlKey) {
        const newTarget = prev.targetNode === nodeId ? null : nodeId

        if (newTarget === prev.sourceNode) return prev

        if (prev.sourceNode) {
          const steps = computeDijkstraSteps(prev.graph, prev.sourceNode, newTarget)
          return {
            ...prev,
            targetNode: newTarget,
            steps,
            currentStepIndex: 0,
            animationState: AnimationState.PAUSED
          }
        }

        return { ...prev, targetNode: newTarget }
      }

      if (prev.sourceNode === nodeId) {
        return {
          ...prev,
          sourceNode: null,
          targetNode: null,
          steps: [],
          currentStepIndex: -1,
          animationState: AnimationState.IDLE
        }
      }

      const newTarget = prev.targetNode === nodeId ? null : prev.targetNode

      const steps = computeDijkstraSteps(prev.graph, nodeId, newTarget)

      return {
        ...prev,
        sourceNode: nodeId,
        targetNode: newTarget,
        steps,
        currentStepIndex: 0,
        animationState: AnimationState.PAUSED
      }
    })
  }, [])

  const handleNodeMove = useCallback((nodeId: string, x: number, y: number) => {
    setConfig(prev => {
      const newNodes = prev.graph.nodes.map(node =>
        node.id === nodeId ? { ...node, x, y } : node
      )
      return {
        ...prev,
        graph: { ...prev.graph, nodes: newNodes }
      }
    })
  }, [])

  const handleEdgeWeightChange = useCallback((edgeId: string, newWeight: number) => {
    setConfig(prev => {
      const newEdges = prev.graph.edges.map(edge =>
        edge.id === edgeId ? { ...edge, weight: newWeight } : edge
      )
      return {
        ...prev,
        graph: { ...prev.graph, edges: newEdges }
      }
    })
  }, [])

  const play = useCallback(() => {
    setConfig(prev => {
      if (prev.steps.length === 0) return prev

      if (prev.animationState === AnimationState.FINISHED) {
        return {
          ...prev,
          currentStepIndex: 0,
          animationState: AnimationState.PLAYING
        }
      }

      return { ...prev, animationState: AnimationState.PLAYING }
    })
  }, [])

  const pause = useCallback(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
    setConfig(prev => ({ ...prev, animationState: AnimationState.PAUSED }))
  }, [])

  const stepForward = useCallback(() => {
    pause()
    setConfig(prev => {
      const nextIndex = Math.min(prev.currentStepIndex + 1, prev.steps.length - 1)
      return {
        ...prev,
        currentStepIndex: nextIndex,
        animationState:
          nextIndex >= prev.steps.length - 1
            ? AnimationState.FINISHED
            : AnimationState.PAUSED
      }
    })
  }, [pause])

  const stepBackward = useCallback(() => {
    pause()
    setConfig(prev => ({
      ...prev,
      currentStepIndex: Math.max(prev.currentStepIndex - 1, 0),
      animationState: AnimationState.PAUSED
    }))
  }, [pause])

  const reset = useCallback(() => {
    pause()
    setConfig(prev => ({
      ...prev,
      currentStepIndex: 0,
      animationState: AnimationState.PAUSED
    }))
  }, [pause])

  const setSpeed = useCallback((speed: number) => {
    setConfig(prev => ({ ...prev, animationSpeed: speed }))
  }, [])

  const setNodeCount = useCallback(
    (count: number) => {
      setConfig(prev => ({
        ...prev,
        nodeCount: count,
        graph: generateRandomGraph(count, prev.isDirected, dimensions.width, dimensions.height),
        sourceNode: null,
        targetNode: null,
        steps: [],
        currentStepIndex: -1,
        animationState: AnimationState.IDLE
      }))
    },
    [dimensions]
  )

  const toggleDirected = useCallback(() => {
    setConfig(prev => {
      const newDirected = !prev.isDirected
      return {
        ...prev,
        isDirected: newDirected,
        graph: generateRandomGraph(prev.nodeCount, newDirected, dimensions.width, dimensions.height),
        sourceNode: null,
        targetNode: null,
        steps: [],
        currentStepIndex: -1,
        animationState: AnimationState.IDLE
      }
    })
  }, [dimensions])

  const regenerateGraph = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      graph: generateRandomGraph(prev.nodeCount, prev.isDirected, dimensions.width, dimensions.height),
      sourceNode: null,
      targetNode: null,
      steps: [],
      currentStepIndex: -1,
      animationState: AnimationState.IDLE
    }))
  }, [dimensions])

  const displayHeight = isFullscreen ? window.innerHeight - 200 : dimensions.height

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
    >
      <GraphSettings
        nodeCount={config.nodeCount}
        isDirected={config.isDirected}
        onNodeCountChange={setNodeCount}
        onDirectedToggle={toggleDirected}
        onRegenerate={regenerateGraph}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <div className="flex gap-0" ref={mainAreaRef}>
        <div className="flex-1 min-w-0">
          <DijkstraCanvas
            graph={config.graph}
            currentStep={currentStep}
            sourceNode={config.sourceNode}
            targetNode={config.targetNode}
            onNodeClick={handleNodeClick}
            onNodeMove={handleNodeMove}
            onEdgeWeightChange={handleEdgeWeightChange}
            width={dimensions.width}
            height={displayHeight}
          />
        </div>
        <div
          className="w-1 cursor-col-resize bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-600 transition-colors flex-shrink-0"
          onMouseDown={handleDividerMouseDown}
        />
        <div style={{ width: tablePanelWidth, flexShrink: 0, height: displayHeight }}>
          <DistanceTable
            nodes={config.graph.nodes}
            currentStep={currentStep}
            sourceNode={config.sourceNode}
            autoScroll={config.animationState === AnimationState.PLAYING}
          />
        </div>
      </div>

      <ControlPanel
        animationState={config.animationState}
        currentStepIndex={config.currentStepIndex}
        totalSteps={config.steps.length}
        speed={config.animationSpeed}
        onPlay={play}
        onPause={pause}
        onStepForward={stepForward}
        onStepBackward={stepBackward}
        onSpeedChange={setSpeed}
        onReset={reset}
        stepDescription={currentStep?.description}
        disabled={config.steps.length === 0}
      />
    </div>
  )
}

export type { DijkstraVisualizerProps } from './types'
