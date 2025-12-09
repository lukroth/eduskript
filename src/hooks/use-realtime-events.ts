'use client'

/**
 * Real-Time Events Hook
 *
 * Provides a React hook for subscribing to Server-Sent Events.
 * Automatically handles connection lifecycle, reconnection, and cleanup.
 *
 * Usage:
 *   useRealtimeEvents(['class-invitation'], (event) => {
 *     console.log('New invitation:', event)
 *   })
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { AppEvent } from '@/lib/events/types'

type EventType = AppEvent['type']

interface UseRealtimeEventsOptions {
  /** Whether to enable the SSE connection (default: true) */
  enabled?: boolean
  /** Callback when connection is established */
  onConnect?: () => void
  /** Callback when connection is lost */
  onDisconnect?: () => void
  /** Callback on connection error */
  onError?: (error: Event) => void
}

/**
 * Subscribe to real-time events from the server
 *
 * @param eventTypes - Array of event types to listen for
 * @param onEvent - Callback when a matching event is received
 * @param options - Additional configuration options
 *
 * @example
 * ```tsx
 * // Listen for class invitations
 * useRealtimeEvents(['class-invitation'], (event) => {
 *   if (event.type === 'class-invitation') {
 *     toast.info(`You've been invited to ${event.className}`)
 *   }
 * })
 *
 * // Listen for multiple event types
 * useRealtimeEvents(
 *   ['class-invitation', 'collaboration-request'],
 *   (event) => handleNotification(event)
 * )
 * ```
 */
export function useRealtimeEvents<T extends EventType>(
  eventTypes: T[],
  onEvent: (event: Extract<AppEvent, { type: T }>) => void,
  options: UseRealtimeEventsOptions = {}
) {
  const { enabled = true, onConnect, onDisconnect, onError } = options
  const { status } = useSession()
  const eventSourceRef = useRef<EventSource | null>(null)

  // Use refs for callbacks to avoid reconnection on callback changes
  const onEventRef = useRef(onEvent)
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)
  const onErrorRef = useRef(onError)

  // Keep refs updated
  useEffect(() => {
    onEventRef.current = onEvent
    onConnectRef.current = onConnect
    onDisconnectRef.current = onDisconnect
    onErrorRef.current = onError
  })

  // Stable string representation of event types for dependency array
  const eventTypesKey = eventTypes.join(',')

  useEffect(() => {
    // Only connect when authenticated, enabled, and in browser
    if (!enabled || status !== 'authenticated' || typeof window === 'undefined') {
      return
    }

    // Create EventSource connection
    const eventSource = new EventSource('/api/events/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('[SSE Hook] Connection established')
      onConnectRef.current?.()
    }

    eventSource.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as AppEvent

        // Skip connection confirmation messages
        if ((event as { type: string }).type === 'connected') {
          console.log('[SSE Hook] Connected to server, subscribed to channels')
          return
        }

        console.log('[SSE Hook] Received event:', event.type, event)

        // Only handle events we're subscribed to
        const types = eventTypesKey.split(',')
        if (types.includes(event.type)) {
          console.log('[SSE Hook] Event matches subscription, calling handler')
          onEventRef.current(event as Extract<AppEvent, { type: T }>)
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    eventSource.onerror = (error) => {
      onErrorRef.current?.(error)
      onDisconnectRef.current?.()
      // EventSource automatically reconnects, no manual intervention needed
    }

    // Cleanup on unmount or dependency change
    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [enabled, status, eventTypesKey])

  // Return connection state for debugging (safe for SSR)
  // Note: EventSource.OPEN is 1, we use literal to avoid SSR reference error
  const isConnected = typeof window !== 'undefined' &&
    eventSourceRef.current?.readyState === 1

  return { isConnected }
}

/**
 * Hook to track SSE connection state
 *
 * @returns Object with connection state and methods
 */
export function useRealtimeConnection() {
  const { status } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use the main hook with empty event types just to track connection
  useRealtimeEvents(
    [],
    () => {},
    {
      enabled: status === 'authenticated',
      onConnect: () => {
        setIsConnected(true)
        setError(null)
      },
      onDisconnect: () => {
        setIsConnected(false)
      },
      onError: () => {
        setError('Connection error')
      }
    }
  )

  return { isConnected, error }
}
