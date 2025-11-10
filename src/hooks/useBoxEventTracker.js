import { useCallback, useRef, useEffect } from 'react'
import { debounce } from 'lodash'

/**
 * Box event tracking system for real-time synchronization
 * Monitors all box creation, modification, and deletion events
 */
export const useBoxEventTracker = ({
  noteId,
  userId,
  onBoxEvent,
  debounceMs = 50,
  maxBatchSize = 50,
  enableThrottling = true
}) => {
  const eventQueueRef = useRef([])
  const pendingEventsRef = useRef(new Map())
  const processedEventsRef = useRef(new Set())
  const eventCounterRef = useRef(0)
  const lastBatchTimeRef = useRef(0)
  
  // Event types we want to track
  const TRACKABLE_EVENT_TYPES = [
    'create',
    'update',
    'delete',
    'move',
    'resize',
    'style',
    'z-index',
    'lock',
    'unlock'
  ]

  // Generate unique event ID
  const generateEventId = useCallback(() => {
    return `${userId}-${noteId}-${Date.now()}-${++eventCounterRef.current}`
  }, [userId, noteId])

  // Check if element is a box (rectangle, ellipse, diamond, etc.)
  const isBoxElement = useCallback((element) => {
    if (!element) return false
    
    const boxTypes = ['rectangle', 'ellipse', 'diamond', 'rectangle', 'text']
    const isBoxType = boxTypes.includes(element.type)
    
    // Additional check for custom box properties
    const hasBoxProperties = element.width !== undefined && 
                            element.height !== undefined &&
                            element.x !== undefined && 
                            element.y !== undefined
    
    return isBoxType && hasBoxProperties
  }, [])

  // Extract relevant box properties for synchronization
  const extractBoxProperties = useCallback((element) => {
    if (!isBoxElement(element)) return null

    return {
      id: element.id,
      type: element.type,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      angle: element.angle || 0,
      strokeColor: element.strokeColor,
      backgroundColor: element.backgroundColor,
      strokeWidth: element.strokeWidth,
      strokeStyle: element.strokeStyle,
      roughness: element.roughness,
      opacity: element.opacity,
      zIndex: element.zIndex || 0,
      isDeleted: element.isDeleted || false,
      version: element.version || 1,
      versionNonce: element.versionNonce || Date.now(),
      updated: element.updated || Date.now(),
      locked: element.locked || false,
      groupIds: element.groupIds || [],
      frameId: element.frameId,
      link: element.link,
      customData: element.customData
    }
  }, [isBoxElement])

  // Process individual box event
  const processBoxEvent = useCallback((eventType, element, previousElement = null) => {
    if (!isBoxElement(element)) return null

    const eventId = generateEventId()
    const boxProperties = extractBoxProperties(element)
    
    if (!boxProperties) return null

    const event = {
      id: eventId,
      type: eventType,
      userId,
      noteId,
      timestamp: Date.now(),
      elementId: element.id,
      box: boxProperties,
      previousBox: previousElement ? extractBoxProperties(previousElement) : null,
      isLocal: true,
      isSynced: false
    }

    // Add metadata for specific event types
    switch (eventType) {
      case 'create':
        event.metadata = {
          createdBy: userId,
          createdAt: event.timestamp
        }
        break
      
      case 'update':
        event.metadata = {
          updatedBy: userId,
          updatedAt: event.timestamp,
          changes: getPropertyChanges(previousElement, element)
        }
        break
      
      case 'move':
        event.metadata = {
          movedBy: userId,
          movedAt: event.timestamp,
          delta: {
            x: element.x - (previousElement?.x || 0),
            y: element.y - (previousElement?.y || 0)
          }
        }
        break
      
      case 'resize':
        event.metadata = {
          resizedBy: userId,
          resizedAt: event.timestamp,
          delta: {
            width: element.width - (previousElement?.width || 0),
            height: element.height - (previousElement?.height || 0)
          }
        }
        break
      
      case 'delete':
        event.metadata = {
          deletedBy: userId,
          deletedAt: event.timestamp
        }
        break
    }

    return event
  }, [userId, noteId, generateEventId, extractBoxProperties])

  // Get property changes between two elements
  const getPropertyChanges = useCallback((prev, curr) => {
    const changes = []
    
    if (!prev || !curr) return changes

    const properties = [
      'x', 'y', 'width', 'height', 'angle',
      'strokeColor', 'backgroundColor', 'strokeWidth',
      'strokeStyle', 'roughness', 'opacity', 'zIndex'
    ]

    properties.forEach(prop => {
      if (prev[prop] !== curr[prop]) {
        changes.push({
          property: prop,
          oldValue: prev[prop],
          newValue: curr[prop]
        })
      }
    })

    return changes
  }, [])

  // Batch process events
  const processEventBatch = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return

    const batchStartTime = performance.now()
    const events = [...eventQueueRef.current]
    eventQueueRef.current = []

    // Group events by type for efficient processing
    const groupedEvents = {
      created: [],
      updated: [],
      deleted: [],
      moved: [],
      resized: [],
      styled: []
    }

    events.forEach(event => {
      if (event.type in groupedEvents) {
        groupedEvents[event.type].push(event)
      }
    })

    const batchEvent = {
      id: generateEventId(),
      type: 'batch',
      userId,
      noteId,
      timestamp: Date.now(),
      events: groupedEvents,
      eventCount: events.length,
      batchTime: batchStartTime
    }

    // Deduplicate events
    const deduplicatedEvents = deduplicateEvents(events)
    batchEvent.events = deduplicatedEvents
    batchEvent.deduplicatedCount = deduplicatedEvents.length

    // Notify callback
    if (onBoxEvent) {
      try {
        await onBoxEvent(batchEvent)
      } catch (error) {
        console.error('[BoxEventTracker] Error processing batch event:', error)
      }
    }

    lastBatchTimeRef.current = performance.now()
    
    console.log('[BoxEventTracker] Batch processed', {
      totalEvents: events.length,
      deduplicatedEvents: deduplicatedEvents.length,
      processingTime: (performance.now() - batchStartTime).toFixed(2),
      types: Object.keys(groupedEvents).map(type => ({
        type,
        count: groupedEvents[type].length
      }))
    })
  }, [userId, noteId, onBoxEvent, generateEventId, deduplicateEvents])

  // Deduplicate events to prevent redundant syncs
  const deduplicateEvents = useCallback((events) => {
    const seen = new Set()
    const deduplicated = []

    events.forEach(event => {
      const key = `${event.elementId}-${event.type}-${event.timestamp}`
      
      if (!seen.has(key) && !processedEventsRef.current.has(event.id)) {
        seen.add(key)
        deduplicated.push(event)
        processedEventsRef.current.add(event.id)
        
        // Clean up old processed events
        if (processedEventsRef.current.size > 1000) {
          const oldestEvents = Array.from(processedEventsRef.current).slice(0, 100)
          oldestEvents.forEach(id => processedEventsRef.current.delete(id))
        }
      }
    })

    return deduplicated
  }, [])

  // Debounced batch processor
  const debouncedProcessBatch = useCallback(
    debounce(processEventBatch, debounceMs, { 
      maxWait: debounceMs * 2,
      leading: false,
      trailing: true 
    }),
    [processEventBatch, debounceMs]
  )

  // Track box creation events
  const trackBoxCreated = useCallback((element) => {
    const event = processBoxEvent('create', element)
    if (event) {
      eventQueueRef.current.push(event)
      debouncedProcessBatch()
      
      console.log('[BoxEventTracker] Box created', {
        elementId: element.id,
        type: element.type,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      })
    }
  }, [processBoxEvent, debouncedProcessBatch])

  // Track box update events
  const trackBoxUpdated = useCallback((element, previousElement) => {
    const event = processBoxEvent('update', element, previousElement)
    if (event) {
      eventQueueRef.current.push(event)
      debouncedProcessBatch()
      
      console.log('[BoxEventTracker] Box updated', {
        elementId: element.id,
        changes: event.metadata?.changes?.length || 0
      })
    }
  }, [processBoxEvent, debouncedProcessBatch])

  // Track box movement events
  const trackBoxMoved = useCallback((element, previousElement) => {
    const event = processBoxEvent('move', element, previousElement)
    if (event) {
      eventQueueRef.current.push(event)
      debouncedProcessBatch()
      
      console.log('[BoxEventTracker] Box moved', {
        elementId: element.id,
        delta: event.metadata?.delta
      })
    }
  }, [processBoxEvent, debouncedProcessBatch])

  // Track box resize events
  const trackBoxResized = useCallback((element, previousElement) => {
    const event = processBoxEvent('resize', element, previousElement)
    if (event) {
      eventQueueRef.current.push(event)
      debouncedProcessBatch()
      
      console.log('[BoxEventTracker] Box resized', {
        elementId: element.id,
        delta: event.metadata?.delta
      })
    }
  }, [processBoxEvent, debouncedProcessBatch])

  // Track box deletion events
  const trackBoxDeleted = useCallback((element) => {
    const event = processBoxEvent('delete', element)
    if (event) {
      eventQueueRef.current.push(event)
      debouncedProcessBatch()
      
      console.log('[BoxEventTracker] Box deleted', {
        elementId: element.id,
        type: element.type
      })
    }
  }, [processBoxEvent, debouncedProcessBatch])

  // Track style changes
  const trackStyleChanged = useCallback((element, previousElement) => {
    const event = processBoxEvent('style', element, previousElement)
    if (event) {
      eventQueueRef.current.push(event)
      debouncedProcessBatch()
      
      console.log('[BoxEventTracker] Style changed', {
        elementId: element.id,
        changes: event.metadata?.changes
      })
    }
  }, [processBoxEvent, debouncedProcessBatch])

  // Track z-index changes
  const trackZIndexChanged = useCallback((element, previousElement) => {
    const event = processBoxEvent('z-index', element, previousElement)
    if (event) {
      eventQueueRef.current.push(event)
      debouncedProcessBatch()
      
      console.log('[BoxEventTracker] Z-index changed', {
        elementId: element.id,
        oldZIndex: previousElement?.zIndex,
        newZIndex: element.zIndex
      })
    }
  }, [processBoxEvent, debouncedProcessBatch])

  // Process incoming remote events
  const processRemoteEvent = useCallback((remoteEvent) => {
    if (remoteEvent.userId === userId) return // Skip own events

    // Validate event
    if (!remoteEvent.box || !remoteEvent.elementId) {
      console.warn('[BoxEventTracker] Invalid remote event', remoteEvent)
      return null
    }

    // Mark as remote event
    const processedEvent = {
      ...remoteEvent,
      isLocal: false,
      isSynced: true,
      receivedAt: Date.now()
    }

    console.log('[BoxEventTracker] Remote event processed', {
      fromUser: remoteEvent.userId,
      elementId: remoteEvent.elementId,
      eventType: remoteEvent.type,
      latency: Date.now() - remoteEvent.timestamp
    })

    return processedEvent
  }, [userId])

  // Get current event queue status
  const getQueueStatus = useCallback(() => {
    return {
      pendingEvents: eventQueueRef.current.length,
      processedEvents: processedEventsRef.current.size,
      lastBatchTime: lastBatchTimeRef.current,
      pendingChanges: Array.from(pendingEventsRef.current.keys())
    }
  }, [])

  // Clear event queue
  const clearQueue = useCallback(() => {
    eventQueueRef.current = []
    pendingEventsRef.current.clear()
    processedEventsRef.current.clear()
    lastBatchTimeRef.current = 0
    
    console.log('[BoxEventTracker] Event queue cleared')
  }, [])

  // Force process pending events
  const forceProcessQueue = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return

    debouncedProcessBatch.cancel()
    await processEventBatch()
  }, [debouncedProcessBatch, processEventBatch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedProcessBatch.cancel()
      clearQueue()
    }
  }, [])

  return {
    // Event tracking methods
    trackBoxCreated,
    trackBoxUpdated,
    trackBoxMoved,
    trackBoxResized,
    trackBoxDeleted,
    trackStyleChanged,
    trackZIndexChanged,
    
    // Remote event processing
    processRemoteEvent,
    
    // Queue management
    getQueueStatus,
    clearQueue,
    forceProcessQueue,
    
    // Utility methods
    isBoxElement,
    extractBoxProperties,
    
    // Event validation
    TRACKABLE_EVENT_TYPES
  }
}