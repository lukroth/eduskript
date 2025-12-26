'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Graph, GraphNode, GraphEdge, AlgorithmStep } from './types'
import { NodeState } from './types'
import { NODE_COLORS, NODE_STROKE_COLORS, EDGE_COLORS, SOURCE_BORDER_COLOR, NODE_RADIUS } from './utils/color-scheme'

interface DijkstraCanvasProps {
  graph: Graph
  currentStep: AlgorithmStep | null
  sourceNode: string | null
  targetNode: string | null
  onNodeClick: (nodeId: string, ctrlKey: boolean) => void
  onNodeMove: (nodeId: string, x: number, y: number) => void
  onEdgeWeightChange?: (edgeId: string, newWeight: number) => void
  width: number
  height: number
}

function getNodeState(
  nodeId: string,
  currentStep: AlgorithmStep | null
): NodeState {
  if (!currentStep) return NodeState.UNVISITED
  if (currentStep.currentNode === nodeId) return NodeState.CURRENT
  if (currentStep.visitedNodes.has(nodeId)) return NodeState.VISITED
  if (currentStep.queueNodes.has(nodeId)) return NodeState.IN_QUEUE
  return NodeState.UNVISITED
}

function getEdgeStyle(
  edgeId: string,
  currentStep: AlgorithmStep | null
): { stroke: string; strokeWidth: number } {
  if (!currentStep) {
    return { stroke: EDGE_COLORS.normal, strokeWidth: 2 }
  }
  if (currentStep.highlightedEdges.includes(edgeId)) {
    return { stroke: EDGE_COLORS.highlighted, strokeWidth: 4 }
  }
  if (currentStep.shortestPathEdges.includes(edgeId)) {
    return { stroke: EDGE_COLORS.shortestPath, strokeWidth: 3 }
  }
  return { stroke: EDGE_COLORS.normal, strokeWidth: 2 }
}

function EdgeComponent({
  edge,
  sourceNode,
  targetNode,
  currentStep,
  isEditable,
  onWeightClick,
  isEditing,
  editValue,
  onEditChange,
  onEditSubmit,
  onEditCancel
}: {
  edge: GraphEdge
  sourceNode: GraphNode
  targetNode: GraphNode
  currentStep: AlgorithmStep | null
  isEditable: boolean
  onWeightClick: (edgeId: string) => void
  isEditing: boolean
  editValue: string
  onEditChange: (value: string) => void
  onEditSubmit: () => void
  onEditCancel: () => void
}) {
  const { stroke, strokeWidth } = getEdgeStyle(edge.id, currentStep)

  const dx = targetNode.x - sourceNode.x
  const dy = targetNode.y - sourceNode.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return null

  const offsetX = (dx / length) * NODE_RADIUS
  const offsetY = (dy / length) * NODE_RADIUS

  const x1 = sourceNode.x + offsetX
  const y1 = sourceNode.y + offsetY
  const x2 = targetNode.x - offsetX
  const y2 = targetNode.y - offsetY

  const midX = (sourceNode.x + targetNode.x) / 2
  const midY = (sourceNode.y + targetNode.y) / 2

  const perpX = -dy / length * 12
  const perpY = dx / length * 12

  const labelX = midX + perpX
  const labelY = midY + perpY

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        markerEnd={edge.directed ? 'url(#arrowhead)' : undefined}
      />
      {isEditing ? (
        <foreignObject x={labelX - 20} y={labelY - 12} width={40} height={24}>
          <input
            type="number"
            min="1"
            max="99"
            value={editValue}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onEditSubmit}
            onKeyDown={e => {
              if (e.key === 'Enter') onEditSubmit()
              if (e.key === 'Escape') onEditCancel()
            }}
            autoFocus
            className="w-full h-full text-center text-sm border border-gray-400 rounded bg-white dark:bg-gray-800"
          />
        </foreignObject>
      ) : (
        <g
          onClick={isEditable ? (e) => {
            e.stopPropagation()
            onWeightClick(edge.id)
          } : undefined}
          style={{ cursor: isEditable ? 'pointer' : 'default' }}
        >
          {isEditable && (
            <rect
              x={labelX - 12}
              y={labelY - 10}
              width={24}
              height={20}
              fill="transparent"
              rx={4}
              className="hover:fill-blue-100 dark:hover:fill-blue-900/30"
            />
          )}
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-sm fill-gray-700 dark:fill-gray-300"
          >
            {edge.weight}
          </text>
        </g>
      )}
    </g>
  )
}

function NodeComponent({
  node,
  state,
  isSource,
  isTarget,
  distance,
  isDragging,
  onMouseDown
}: {
  node: GraphNode
  state: NodeState
  isSource: boolean
  isTarget: boolean
  distance: number | null
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void
}) {
  const fill = NODE_COLORS[state]
  const stroke = isSource ? SOURCE_BORDER_COLOR : isTarget ? '#dc2626' : NODE_STROKE_COLORS[state]
  const strokeWidth = isSource || isTarget ? 4 : 2

  return (
    <g
      onMouseDown={e => onMouseDown(e, node.id)}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      className="select-none"
    >
      <circle
        cx={node.x}
        cy={node.y}
        r={NODE_RADIUS}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        className={state === NodeState.CURRENT && !isDragging ? 'animate-pulse' : ''}
      />
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-sm font-bold fill-white pointer-events-none"
      >
        {node.label}
      </text>
      {distance !== null && (
        <text
          x={node.x}
          y={node.y + NODE_RADIUS + 14}
          textAnchor="middle"
          className="text-xs fill-gray-600 dark:fill-gray-400"
        >
          {distance === Infinity ? '∞' : distance}
        </text>
      )}
    </g>
  )
}

export function DijkstraCanvas({
  graph,
  currentStep,
  sourceNode,
  targetNode,
  onNodeClick,
  onNodeMove,
  onEdgeWeightChange,
  width,
  height
}: DijkstraCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const hasDragged = useRef(false)
  const ctrlKeyRef = useRef(false)

  // Pan and zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  // Touch state refs (persist across effect re-runs)
  const touchDistRef = useRef<number | null>(null)
  const touchPanStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)

  // Keep refs in sync with state
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])

  const [editingEdge, setEditingEdge] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const isEditable = !sourceNode && !!onEdgeWeightChange

  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]))

  const handleWeightClick = useCallback((edgeId: string) => {
    const edge = graph.edges.find(e => e.id === edgeId)
    if (edge) {
      setEditingEdge(edgeId)
      setEditValue(String(edge.weight))
    }
  }, [graph.edges])

  const handleEditSubmit = useCallback(() => {
    if (editingEdge && onEdgeWeightChange) {
      const newWeight = parseInt(editValue, 10)
      if (!isNaN(newWeight) && newWeight >= 1 && newWeight <= 99) {
        onEdgeWeightChange(editingEdge, newWeight)
      }
    }
    setEditingEdge(null)
    setEditValue('')
  }, [editingEdge, editValue, onEdgeWeightChange])

  const handleEditCancel = useCallback(() => {
    setEditingEdge(null)
    setEditValue('')
  }, [])

  // Convert screen coordinates to SVG coordinates (accounting for pan/zoom)
  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }

    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()

    // Convert to SVG viewport coordinates
    const svgX = (clientX - rect.left) * (width / rect.width)
    const svgY = (clientY - rect.top) * (height / rect.height)

    // Apply inverse pan/zoom transform
    const x = (svgX - pan.x) / zoom
    const y = (svgY - pan.y) / zoom

    return { x, y }
  }, [width, height, pan, zoom])

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()

    const point = getSVGPoint(e.clientX, e.clientY)
    dragStartPos.current = point
    hasDragged.current = false
    ctrlKeyRef.current = e.ctrlKey || e.metaKey
    setDraggingNode(nodeId)
  }, [getSVGPoint])

  // Canvas pan start
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (draggingNode) return

    e.preventDefault()
    e.stopPropagation()
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [draggingNode, pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Handle node dragging
    if (draggingNode) {
      const point = getSVGPoint(e.clientX, e.clientY)

      if (dragStartPos.current) {
        const dx = point.x - dragStartPos.current.x
        const dy = point.y - dragStartPos.current.y
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasDragged.current = true
        }
      }

      onNodeMove(draggingNode, point.x, point.y)
      return
    }

    // Handle canvas panning
    if (isPanning && panStart.current) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y

      // Scale the pan movement to SVG coordinates
      const svg = svgRef.current
      if (svg) {
        const rect = svg.getBoundingClientRect()
        const scaleX = width / rect.width
        const scaleY = height / rect.height

        setPan({
          x: panStart.current.panX + dx * scaleX,
          y: panStart.current.panY + dy * scaleY
        })
      }
    }
  }, [draggingNode, isPanning, getSVGPoint, onNodeMove, width, height])

  const handleMouseUp = useCallback(() => {
    if (draggingNode && !hasDragged.current) {
      onNodeClick(draggingNode, ctrlKeyRef.current)
    }
    setDraggingNode(null)
    dragStartPos.current = null
    ctrlKeyRef.current = false
    setIsPanning(false)
    panStart.current = null
  }, [draggingNode, onNodeClick])

  const handleMouseLeave = useCallback(() => {
    setDraggingNode(null)
    dragStartPos.current = null
    setIsPanning(false)
    panStart.current = null
  }, [])

  // Reset zoom button
  const handleResetView = useCallback(() => {
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }, [])

  // Prevent default touch and wheel behavior on the SVG and handle zoom/pan natively
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const handleNativeTouchStart = (e: TouchEvent) => {
      e.stopPropagation()
      if (e.touches.length === 2) {
        e.preventDefault()
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        if (touch1 && touch2) {
          touchDistRef.current = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
        }
      } else if (e.touches.length === 1) {
        const touch = e.touches[0]
        if (touch) {
          touchPanStartRef.current = { x: touch.clientX, y: touch.clientY, panX: panRef.current.x, panY: panRef.current.y }
        }
      }
    }

    const handleNativeTouchMove = (e: TouchEvent) => {
      e.stopPropagation()
      e.preventDefault()

      if (e.touches.length === 2 && touchDistRef.current !== null) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        if (touch1 && touch2) {
          const newDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
          const scale = newDist / touchDistRef.current

          const currentZoom = zoomRef.current
          const currentPan = panRef.current
          const newZoom = Math.max(0.25, Math.min(4, currentZoom * scale))

          const rect = svg.getBoundingClientRect()
          const centerX = ((touch1.clientX + touch2.clientX) / 2 - rect.left) * (width / rect.width)
          const centerY = ((touch1.clientY + touch2.clientY) / 2 - rect.top) * (height / rect.height)

          const newPanX = centerX - (centerX - currentPan.x) * (newZoom / currentZoom)
          const newPanY = centerY - (centerY - currentPan.y) * (newZoom / currentZoom)

          setZoom(newZoom)
          setPan({ x: newPanX, y: newPanY })
          touchDistRef.current = newDist
        }
      } else if (e.touches.length === 1 && touchPanStartRef.current) {
        const touch = e.touches[0]
        if (touch) {
          const dx = touch.clientX - touchPanStartRef.current.x
          const dy = touch.clientY - touchPanStartRef.current.y

          const rect = svg.getBoundingClientRect()
          const scaleX = width / rect.width
          const scaleY = height / rect.height

          setPan({
            x: touchPanStartRef.current.panX + dx * scaleX,
            y: touchPanStartRef.current.panY + dy * scaleY
          })
        }
      }
    }

    const handleNativeTouchEnd = () => {
      touchDistRef.current = null
      touchPanStartRef.current = null
    }

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const currentZoom = zoomRef.current
      const currentPan = panRef.current

      const rect = svg.getBoundingClientRect()
      const mouseX = (e.clientX - rect.left) * (width / rect.width)
      const mouseY = (e.clientY - rect.top) * (height / rect.height)

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.25, Math.min(4, currentZoom * zoomFactor))

      const newPanX = mouseX - (mouseX - currentPan.x) * (newZoom / currentZoom)
      const newPanY = mouseY - (mouseY - currentPan.y) * (newZoom / currentZoom)

      setZoom(newZoom)
      setPan({ x: newPanX, y: newPanY })
    }

    svg.addEventListener('touchstart', handleNativeTouchStart, { passive: false })
    svg.addEventListener('touchmove', handleNativeTouchMove, { passive: false })
    svg.addEventListener('touchend', handleNativeTouchEnd)
    svg.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => {
      svg.removeEventListener('touchstart', handleNativeTouchStart)
      svg.removeEventListener('touchmove', handleNativeTouchMove)
      svg.removeEventListener('touchend', handleNativeTouchEnd)
      svg.removeEventListener('wheel', handleNativeWheel)
    }
  }, [width, height])

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="bg-slate-50 dark:bg-slate-900 rounded-lg touch-none"
        viewBox={`0 0 ${width} ${height}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isPanning ? 'grabbing' : draggingNode ? 'grabbing' : 'grab' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <g>
            {graph.edges.map(edge => {
              const source = nodeMap.get(edge.source)
              const target = nodeMap.get(edge.target)
              if (!source || !target) return null
              return (
                <EdgeComponent
                  key={edge.id}
                  edge={edge}
                  sourceNode={source}
                  targetNode={target}
                  currentStep={currentStep}
                  isEditable={isEditable}
                  onWeightClick={handleWeightClick}
                  isEditing={editingEdge === edge.id}
                  editValue={editValue}
                  onEditChange={setEditValue}
                  onEditSubmit={handleEditSubmit}
                  onEditCancel={handleEditCancel}
                />
              )
            })}
          </g>

          <g>
            {graph.nodes.map(node => {
              const state = getNodeState(node.id, currentStep)
              const distance = currentStep?.distances.get(node.id) ?? null
              return (
                <NodeComponent
                  key={node.id}
                  node={node}
                  state={state}
                  isSource={node.id === sourceNode}
                  isTarget={node.id === targetNode}
                  distance={distance}
                  isDragging={draggingNode === node.id}
                  onMouseDown={handleNodeMouseDown}
                />
              )
            })}
          </g>
        </g>
      </svg>

      {/* Reset view button */}
      {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
        <button
          onClick={handleResetView}
          className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-700 rounded shadow hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
          title="Ansicht zurücksetzen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      )}
    </div>
  )
}
