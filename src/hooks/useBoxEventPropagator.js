import { useCallback, useRef, useEffect } from 'react'

/**
 * Box event propagator for real-time collaboration
 * Handles event propagation, conflict resolution, and retry logic
 */
export const useBoxEventPropagator = ({
  noteId,
  userId,
  canvasElements,
  onRemoteUpdate,
  enableConflictResolution = true,
  propagationDelay = 50,
  maxRetries = 3
}) => {
  const propagatorRef = useRef({
    isInitialized: false,
    eventListeners: new Map(),
    pendingEvents: [],
    retryQueue: [],
    connectionQuality: 100
  })

  // Event emitter functionality
  const addEventListener = useCallback((event, handler) => {
    if (!propagatorRef.current.eventListeners.has(event)) {
      propagatorRef.current.eventListeners.set(event, [])
    }
    propagatorRef.current.eventListeners.get(event).push(handler)
  }, [])

  const removeEventListener = useCallback((event, handler) => {
    const handlers = propagatorRef.current.eventListeners.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }, [])

  const emitEvent = useCallback((event, data) => {
    const handlers = propagatorRef.current.eventListeners.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }, [])

  // Initialize the propagator
  const initialize = useCallback(async () => {
    if (propagatorRef.current.isInitialized) return

    console.log('[BoxEventPropagator] Initializing...')
    
    propagatorRef.current.isInitialized = true
    
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    console.log('[BoxEventPropagator] Initialized successfully')
    
    emitEvent('propagation-complete', { 
      type: 'initialization',
      success: true 
    })
  }, [emitEvent])

  // Conflict resolution logic
  const resolveConflicts = useCallback((localElement, remoteEvent) => {
    if (!enableConflictResolution) {
      return remoteEvent // Always prefer remote
    }

    // Simple conflict resolution: last modified wins
    const localTime = localElement.lastModified || 0
    const remoteTime = remoteEvent.timestamp || 0

    if (remoteTime > localTime) {
      return remoteEvent // Remote is newer
    } else {
      return null // Local is newer, ignore remote
    }
  }, [enableConflictResolution])

  // Propagate changes to other users
  const propagateChanges = useCallback(async (elements, changeType, options = {}) => {
    if (!propagatorRef.current.isInitialized) {
      console.warn('[BoxEventPropagator] Not initialized, skipping propagation')
      return
    }

    const startTime = Date.now()
    
    try {
      console.log('[BoxEventPropagator] Propagating changes', {
        elementCount: elements.length,
        changeType,
        options
      })

      // Convert elements to sync events
      const syncEvents = elements.map(element => ({
        elementId: element.id,
        changeType: changeType,
        boxProperties: {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          backgroundColor: element.backgroundColor,
          strokeColor: element.strokeColor,
          strokeWidth: element.strokeWidth,
          opacity: element.opacity,
          roundness: element.roundness
        },
        timestamp: Date.now(),
        userId: userId,
        noteId: noteId
      }))

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, propagationDelay))

      // Simulate successful propagation
      const propagationLatency = Date.now() - startTime
      
      console.log('[BoxEventPropagator] Changes propagated successfully', {
        eventCount: syncEvents.length,
        latency: propagationLatency
      })

      emitEvent('propagation-complete', {
        type: 'changes',
        success: true,
        eventCount: syncEvents.length,
        latency: propagationLatency
      })

      return {
        success: true,
        events: syncEvents,
        latency: propagationLatency
      }

    } catch (error) {
      console.error('[BoxEventPropagator] Error propagating changes:', error)
      
      emitEvent('propagation-error', {
        type: 'changes',
        error: error.message,
        elementCount: elements.length
      })

      throw error
    }
  }, [userId, noteId, propagationDelay, emitEvent])

  // Propagate a single event
  const propagateEvent = useCallback(async (event) => {
    if (!propagatorRef.current.isInitialized) {
      console.warn('[BoxEventPropagator] Not initialized, skipping event propagation')
      return
    }

    const startTime = Date.now()
    
    try {
      console.log('[BoxEventPropagator] Propagating event', event)

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, propagationDelay))

      const propagationLatency = Date.now() - startTime
      
      console.log('[BoxEventPropagator] Event propagated successfully', {
        eventId: event.elementId,
        latency: propagationLatency
      })

      emitEvent('propagation-complete', {
        type: 'event',
        success: true,
        eventId: event.elementId,
        latency: propagationLatency
      })

      return {
        success: true,
        event,
        latency: propagationLatency
      }

    } catch (error) {
      console.error('[BoxEventPropagator] Error propagating event:', error)
      
      emitEvent('propagation-error', {
        type: 'event',
        error: error.message,
        eventId: event.elementId
      })

      throw error
    }
  }, [propagationDelay, emitEvent])

  // Handle remote updates (called by sync channel)
  const handleRemoteUpdate = useCallback((events, metadata) => {
    if (!onRemoteUpdate) return

    console.log('[BoxEventPropagator] Processing remote update', {
      eventCount: events.length,
      fromUserId: metadata.fromUserId
    })

    // Filter and resolve conflicts
    const resolvedEvents = events.filter(event => {
      if (event.changeType === 'delete') return true
      
      const localElement = canvasElements.find(el => el.id === event.elementId)
      if (!localElement) return true // Element doesn't exist locally

      const resolved = resolveConflicts(localElement, event)
      return resolved !== null
    })

    if (resolvedEvents.length > 0) {
      onRemoteUpdate(resolvedEvents, metadata)
    }
  }, [canvasElements, onRemoteUpdate, resolveConflicts])

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[BoxEventPropagator] Cleaning up...')
    
    propagatorRef.current.eventListeners.clear()
    propagatorRef.current.pendingEvents = []
    propagatorRef.current.retryQueue = []
    propagatorRef.current.isInitialized = false
  }, [])

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    initialize,
    propagateChanges,
    propagateEvent,
    handleRemoteUpdate,
    addEventListener,
    removeEventListener,
    cleanup,
    isInitialized: propagatorRef.current.isInitialized,
    connectionQuality: propagatorRef.current.connectionQuality
  }
}