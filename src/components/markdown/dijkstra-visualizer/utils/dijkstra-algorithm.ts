import type { Graph, AlgorithmStep } from '../types'

interface Neighbor {
  neighborId: string
  neighborLabel: string
  edgeId: string
  weight: number
}

function getNeighbors(graph: Graph, nodeId: string): Neighbor[] {
  const neighbors: Neighbor[] = []
  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]))

  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      const targetNode = nodeMap.get(edge.target)
      neighbors.push({
        neighborId: edge.target,
        neighborLabel: targetNode?.label || edge.target,
        edgeId: edge.id,
        weight: edge.weight
      })
    }
    if ((!graph.isDirected || !edge.directed) && edge.target === nodeId) {
      const sourceNode = nodeMap.get(edge.source)
      neighbors.push({
        neighborId: edge.source,
        neighborLabel: sourceNode?.label || edge.source,
        edgeId: edge.id,
        weight: edge.weight
      })
    }
  }

  return neighbors
}

function compareByWeightThenLabel(a: { weight: number; label: string }, b: { weight: number; label: string }): number {
  if (a.weight !== b.weight) {
    return a.weight - b.weight
  }
  return a.label.localeCompare(b.label)
}

function getShortestPathEdges(
  previousNodes: Map<string, string | null>,
  graph: Graph
): string[] {
  const pathEdges: string[] = []

  for (const [node, prev] of previousNodes) {
    if (prev === null) continue
    const edge = graph.edges.find(
      e =>
        (e.source === prev && e.target === node) ||
        ((!graph.isDirected || !e.directed) && e.source === node && e.target === prev)
    )
    if (edge) pathEdges.push(edge.id)
  }

  return pathEdges
}

function getNodeLabel(graph: Graph, nodeId: string): string {
  const node = graph.nodes.find(n => n.id === nodeId)
  return node?.label || nodeId
}

function formatDistance(d: number): string {
  return d === Infinity ? '∞' : String(d)
}

export function computeDijkstraSteps(
  graph: Graph,
  sourceNodeId: string,
  targetNodeId?: string | null
): AlgorithmStep[] {
  const steps: AlgorithmStep[] = []
  const distances = new Map<string, number>()
  const previousNodes = new Map<string, string | null>()
  const visited = new Set<string>()
  const inQueue = new Set<string>()

  // Initialize distances
  graph.nodes.forEach(node => {
    distances.set(node.id, node.id === sourceNodeId ? 0 : Infinity)
    previousNodes.set(node.id, null)
  })

  const sourceLabel = getNodeLabel(graph, sourceNodeId)

  const queue: Array<{ node: string; distance: number; label: string }> = [
    { node: sourceNodeId, distance: 0, label: sourceLabel }
  ]
  inQueue.add(sourceNodeId)

  // Record initial state
  steps.push({
    stepNumber: 0,
    currentNode: null,
    visitedNodes: new Set(visited),
    distances: new Map(distances),
    previousNodes: new Map(previousNodes),
    queueNodes: new Set(inQueue),
    highlightedEdges: [],
    shortestPathEdges: [],
    description: `Initialisiere: Distanz zu Quelle "${sourceLabel}" = 0, alle anderen = ∞`
  })

  while (queue.length > 0) {
    queue.sort((a, b) =>
      compareByWeightThenLabel(
        { weight: a.distance, label: a.label },
        { weight: b.distance, label: b.label }
      )
    )
    const { node: currentNode } = queue.shift()!

    if (visited.has(currentNode)) continue

    const currentLabel = getNodeLabel(graph, currentNode)
    const currentDist = distances.get(currentNode)!

    steps.push({
      stepNumber: steps.length,
      currentNode,
      visitedNodes: new Set(visited),
      distances: new Map(distances),
      previousNodes: new Map(previousNodes),
      queueNodes: new Set(inQueue),
      highlightedEdges: [],
      shortestPathEdges: getShortestPathEdges(previousNodes, graph),
      description: `Besuche Knoten "${currentLabel}" mit Distanz ${formatDistance(currentDist)}`
    })

    visited.add(currentNode)
    inQueue.delete(currentNode)

    if (targetNodeId && currentNode === targetNodeId) {
      const targetLabel = getNodeLabel(graph, targetNodeId)
      steps.push({
        stepNumber: steps.length,
        currentNode: null,
        visitedNodes: new Set(visited),
        distances: new Map(distances),
        previousNodes: new Map(previousNodes),
        queueNodes: new Set(),
        highlightedEdges: [],
        shortestPathEdges: getShortestPathEdges(previousNodes, graph),
        description: `Ziel "${targetLabel}" erreicht! Kürzester Weg gefunden mit Distanz ${formatDistance(currentDist)}.`
      })
      return steps
    }

    const neighbors = getNeighbors(graph, currentNode).sort((a, b) =>
      compareByWeightThenLabel(
        { weight: a.weight, label: a.neighborLabel },
        { weight: b.weight, label: b.neighborLabel }
      )
    )

    for (const { neighborId, edgeId, weight } of neighbors) {
      if (visited.has(neighborId)) continue

      const neighborLabel = getNodeLabel(graph, neighborId)
      const newDistance = currentDist + weight
      const currentDistance = distances.get(neighborId)!

      steps.push({
        stepNumber: steps.length,
        currentNode,
        visitedNodes: new Set(visited),
        distances: new Map(distances),
        previousNodes: new Map(previousNodes),
        queueNodes: new Set(inQueue),
        highlightedEdges: [edgeId],
        shortestPathEdges: getShortestPathEdges(previousNodes, graph),
        description: `Prüfe Kante zu "${neighborLabel}": ${formatDistance(currentDist)} + ${weight} = ${newDistance} vs. aktuell ${formatDistance(currentDistance)}`
      })

      if (newDistance < currentDistance) {
        distances.set(neighborId, newDistance)
        previousNodes.set(neighborId, currentNode)

        if (!inQueue.has(neighborId)) {
          queue.push({ node: neighborId, distance: newDistance, label: neighborLabel })
          inQueue.add(neighborId)
        } else {
          const idx = queue.findIndex(q => q.node === neighborId)
          if (idx !== -1) {
            const item = queue[idx]
            if (item) item.distance = newDistance
          }
        }

        steps.push({
          stepNumber: steps.length,
          currentNode,
          visitedNodes: new Set(visited),
          distances: new Map(distances),
          previousNodes: new Map(previousNodes),
          queueNodes: new Set(inQueue),
          highlightedEdges: [edgeId],
          shortestPathEdges: getShortestPathEdges(previousNodes, graph),
          description: `Update: Distanz zu "${neighborLabel}" verbessert auf ${newDistance}`
        })
      }
    }
  }

  steps.push({
    stepNumber: steps.length,
    currentNode: null,
    visitedNodes: new Set(visited),
    distances: new Map(distances),
    previousNodes: new Map(previousNodes),
    queueNodes: new Set(),
    highlightedEdges: [],
    shortestPathEdges: getShortestPathEdges(previousNodes, graph),
    description: 'Algorithmus beendet! Alle kürzesten Wege gefunden.'
  })

  return steps
}
