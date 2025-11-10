import { useCallback, useRef, useEffect, useState } from 'react'
import { useBoxEventPropagator } from './useBoxEventPropagator'
import { useBoxSyncFeedback } from './useBoxSyncFeedback'

/**
 * Main box synchronization hook for real-time collaboration
 * Integrates event tracking, propagation, and visual feedback
 */
export const useBoxSync = ({
  noteId,
  userId,
  canvasElements,
  onElementsChange,
  broadcastChannel,
  onBoxSync,
  onSyncError,
  enableRealTimeSync = true,
  enableConflictResolution = true,
  enableVisualFeedback = true,
  syncDebounceMs = 50,
  maxRetries = 3,
  syncTimeout = 1000
}) => {
  const syncStateRef = useRef({
    isInitialized: false,
    lastSyncTime: 0,
    totalSyncs: 0,
    failedSyncs: 0,
    localChanges: new Set(),
    remoteChanges: new Set(),
    syncInProgress: false,
    pendingBoxChanges: [] // Queue for rapid updates
  })

  const [syncStatus, setSyncStatus] = useState('idle')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMetrics, setSyncMetrics] = useState({
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageLatency: 0,
    lastSyncLatency: 0
  })

  // Initialize box event propagator
  const propagator = useBoxEventPropagator({
    noteId,
    userId,
    canvasElements,
    onRemoteUpdate: handleRemoteUpdate,
    enableConflictResolution,
    propagationDelay: syncDebounceMs,
    maxRetries: maxRetries
  })

  // Initialize visual feedback system
  const feedback = useBoxSyncFeedback()

  // Handle remote updates from other users
  const handleRemoteUpdate = useCallback((remoteEvents, metadata) => {
    // Handle special event types (like initial state)
    if (remoteEvents.length === 1 && remoteEvents[0].type === 'box_initial_state') {
      const initialStateEvent = remoteEvents[0]
      console.log('[BoxSync] Initial state event received', {
        fromUserId: metadata.fromUserId,
        boxCount: initialStateEvent.data?.boxes?.length || 0
      })

      const operationId = feedback.startSyncOperation('initial-state', {
        eventCount: 1,
        fromUserId: metadata.fromUserId,
        boxCount: initialStateEvent.data?.boxes?.length || 0
      })

      try {
        // Convert box data to element format
        const boxElements = (initialStateEvent.data?.boxes || []).map(box => ({
          ...box,
          type: 'rectangle',
          isDeleted: false,
          lastModified: Date.now()
        }))

        // Merge with existing elements, replacing any existing boxes
        const existingNonBoxElements = canvasElements.filter(el => el.type !== 'rectangle')
        const updatedElements = [...existingNonBoxElements, ...boxElements]

        // Track remote changes
        boxElements.forEach(element => {
          syncStateRef.current.remoteChanges.add(element.id)
        })

        // Notify parent of element changes
        if (onElementsChange) {
          onElementsChange(updatedElements, {
            source: 'remote-initial-state',
            userId: metadata.fromUserId,
            eventCount: boxElements.length
          })
        }

        // Update connection quality based on latency
        feedback.updateConnectionQuality(metadata.propagationLatency)
        
        // Complete operation successfully
        feedback.completeSyncOperation(operationId, true, {
          processedEvents: boxElements.length,
          latency: metadata.propagationLatency
        })

        // Update metrics
        updateSyncMetrics('remote-success', metadata.propagationLatency)

      } catch (error) {
        console.error('[BoxSync] Error applying initial state:', error)
        
        feedback.completeSyncOperation(operationId, false, {
          error: error.message,
          processedEvents: 0
        })

        feedback.addSyncError('Failed to apply initial state', {
          error: error.message,
          fromUserId: metadata.fromUserId
        })

        updateSyncMetrics('remote-error', 0)
      }
      return
    }

    // Handle regular remote updates
    console.log('[BoxSync] Remote update received', {
      eventCount: remoteEvents.length,
      fromUserId: metadata.fromUserId,
      propagationLatency: metadata.propagationLatency.toFixed(2)
    })

    const operationId = feedback.startSyncOperation('remote-update', {
      eventCount: remoteEvents.length,
      fromUserId: metadata.fromUserId
    })

    try {
      // Apply remote changes to canvas elements
      const updatedElements = applyRemoteChanges(canvasElements, remoteEvents)
      
      // Track remote changes
      remoteEvents.forEach(event => {
        syncStateRef.current.remoteChanges.add(event.elementId)
      })

      // Notify parent of element changes
      if (onElementsChange) {
        onElementsChange(updatedElements, {
          source: 'remote-sync',
          userId: metadata.fromUserId,
          eventCount: remoteEvents.length
        })
      }

      // Update connection quality based on latency
      feedback.updateConnectionQuality(metadata.propagationLatency)
      
      // Complete operation successfully
      feedback.completeSyncOperation(operationId, true, {
        processedEvents: remoteEvents.length,
        latency: metadata.propagationLatency
      })

      // Update metrics
      updateSyncMetrics('remote-success', metadata.propagationLatency)

    } catch (error) {
      console.error('[BoxSync] Error applying remote update:', error)
      
      feedback.completeSyncOperation(operationId, false, {
        error: error.message,
        processedEvents: 0
      })

      feedback.addSyncError('Failed to apply remote update', {
        error: error.message,
        fromUserId: metadata.fromUserId
      })

      updateSyncMetrics('remote-error', 0)
    }
  }, [canvasElements, onElementsChange, feedback, updateSyncMetrics])

  // Apply remote changes to canvas elements
  const applyRemoteChanges = useCallback((currentElements, remoteEvents) => {
    const elementMap = new Map(currentElements.map(el => [el.id, el]))
    
    remoteEvents.forEach(event => {
      const { elementId, changeType, boxProperties } = event
      
      switch (changeType) {
        case 'create':
        case 'update':
          // Create or update the element
          elementMap.set(elementId, {
            ...boxProperties,
            id: elementId,
            isDeleted: false,
            lastModified: boxProperties.lastModified || Date.now()
          })
          break
          
        case 'delete':
          // Mark element as deleted
          const existingElement = elementMap.get(elementId)
          if (existingElement) {
            elementMap.set(elementId, {
              ...existingElement,
              isDeleted: true
            })
          }
          break
      }
    })
    
    return Array.from(elementMap.values()).filter(el => !el.isDeleted)
  }, [])

  // Update sync metrics
  const updateSyncMetrics = useCallback((operationType, latency) => {
    setSyncMetrics(prev => {
      const totalOperations = prev.totalOperations + 1
      const successfulOperations = operationType.includes('success') 
        ? prev.successfulOperations + 1 
        : prev.successfulOperations
      const failedOperations = operationType.includes('error') 
        ? prev.failedOperations + 1 
        : prev.failedOperations
      
      const averageLatency = prev.totalOperations === 0 
        ? latency 
        : ((prev.averageLatency * prev.totalOperations) + latency) / totalOperations
      
      return {
        totalOperations,
        successfulOperations,
        failedOperations,
        averageLatency,
        lastSyncLatency: latency
      }
    })
  }, [])

  // Initialize box synchronization
  const initializeSync = useCallback(async () => {
    if (syncStateRef.current.isInitialized) return
    
    console.log('[BoxSync] Initializing box synchronization')
    
    try {
      // Initialize the propagator
      await propagator.initialize()
      
      // Initialize feedback system
      feedback.initialize()
      
      syncStateRef.current.isInitialized = true
      syncStateRef.current.lastSyncTime = Date.now()
      
      setSyncStatus('connected')
      
      if (onSyncStatusChange) {
        onSyncStatusChange('connected', null)
      }
      
      console.log('[BoxSync] Initialization complete')
    } catch (error) {
      console.error('[BoxSync] Failed to initialize:', error)
      
      setSyncStatus('error')
      feedback.addSyncError('Failed to initialize box synchronization', { error: error.message })
      
      if (onSyncStatusChange) {
        onSyncStatusChange('error', error)
      }
    }
  }, [propagator, feedback, onSyncStatusChange])

  // Sync box elements to collaborators
  const syncBoxElements = useCallback((elements, changeType = 'update', metadata = {}) => {
    if (!enableRealTimeSync || !syncStateRef.current.isInitialized) {
      console.log('[BoxSync] Skipping sync - disabled or not initialized')
      return
    }

    // Filter for box elements only
    const boxElements = elements.filter(el => 
      el.type === 'rectangle' || 
      (el.type === 'custom' && el.customType === 'box')
    )

    if (boxElements.length === 0) {
      console.log('[BoxSync] No box elements to sync')
      return
    }

    console.log('[BoxSync] Starting box sync', {
      elementCount: boxElements.length,
      changeType,
      hasMetadata: Object.keys(metadata).length > 0
    })

    // Batch multiple rapid changes
    const now = Date.now()
    const lastSyncTime = syncStateRef.current.lastSyncTime || 0
    const timeSinceLastSync = now - lastSyncTime

    // If we're already syncing and it's been less than 100ms, queue this update
    if (syncStateRef.current.syncInProgress && timeSinceLastSync < 100) {
      console.log('[BoxSync] Queuing rapid update')
      syncStateRef.current.pendingBoxChanges = syncStateRef.current.pendingBoxChanges || []
      syncStateRef.current.pendingBoxChanges.push({
        elements: boxElements,
        changeType,
        metadata,
        timestamp: now
      })
      return
    }

    const operationId = feedback.startSyncOperation('local-update', {
      elementCount: boxElements.length,
      changeType,
      batched: timeSinceLastSync < 200
    })

    try {
      // Track local changes
      boxElements.forEach(element => {
        syncStateRef.current.localChanges.add(element.id)
      })

      // Batch elements if there are many
      let elementsToSync = boxElements
      if (boxElements.length > 10) {
        console.log('[BoxSync] Batching large update:', boxElements.length, 'elements')
        elementsToSync = boxElements.slice(0, 10) // Send first 10 immediately
        
        // Queue remaining elements for later sync
        const remainingElements = boxElements.slice(10)
        if (remainingElements.length > 0) {
          setTimeout(() => {
            console.log('[BoxSync] Syncing remaining', remainingElements.length, 'elements')
            syncBoxElements(remainingElements, changeType, {
              ...metadata,
              isBatchContinuation: true
            })
          }, 50)
        }
      }

      // Propagate changes to collaborators
      propagator.propagateChanges(elementsToSync, changeType, {
        ...metadata,
        operationId,
        timestamp: now,
        isBatched: elementsToSync.length !== boxElements.length
      })

      // Update sync status
      setSyncStatus('syncing')
      setIsSyncing(true)
      syncStateRef.current.syncInProgress = true
      syncStateRef.current.totalSyncs++
      syncStateRef.current.lastSyncTime = now

      // Complete operation after propagation
      feedback.completeSyncOperation(operationId, true, {
        propagatedElements: elementsToSync.length,
        changeType,
        batched: elementsToSync.length !== boxElements.length
      })

      updateSyncMetrics('local-success', 0)

      console.log('[BoxSync] Box sync initiated successfully')

      // Process any queued changes after a short delay
      if (syncStateRef.current.pendingBoxChanges?.length > 0) {
        setTimeout(() => {
          const queuedChanges = syncStateRef.current.pendingBoxChanges
          syncStateRef.current.pendingBoxChanges = []
          
          queuedChanges.forEach(queued => {
            console.log('[BoxSync] Processing queued change')
            syncBoxElements(queued.elements, queued.changeType, queued.metadata)
          })
        }, 100)
      }

    } catch (error) {
      console.error('[BoxSync] Error initiating box sync:', error)
      
      feedback.completeSyncOperation(operationId, false, {
        error: error.message,
        propagatedElements: 0
      })

      feedback.addSyncError('Failed to sync box elements', {
        error: error.message,
        changeType,
        elementCount: boxElements.length
      })

      updateSyncMetrics('local-error', 0)
      setSyncStatus('error')
    } finally {
      // Reset syncing state after a short delay
      setTimeout(() => {
        setIsSyncing(false)
        syncStateRef.current.syncInProgress = false
        setSyncStatus('connected')
      }, 100)
    }
  }, [enableRealTimeSync, propagator, feedback, updateSyncMetrics])

  // Handle propagator events
  useEffect(() => {
    if (!propagator) return

    const handlePropagationComplete = (event) => {
      console.log('[BoxSync] Propagation completed', event.detail)
      updateSyncMetrics('propagation-success', event.detail.latency || 0)
    }

    const handlePropagationError = (event) => {
      console.error('[BoxSync] Propagation failed', event.detail)
      updateSyncMetrics('propagation-error', 0)
      setSyncStatus('error')
    }

    propagator.addEventListener('propagation-complete', handlePropagationComplete)
    propagator.addEventListener('propagation-error', handlePropagationError)

    return () => {
      propagator.removeEventListener('propagation-complete', handlePropagationComplete)
      propagator.removeEventListener('propagation-error', handlePropagationError)
    }
  }, [propagator, updateSyncMetrics])

  // Conflict resolution for concurrent box modifications
  const resolveBoxConflicts = useCallback((changes) => {
    const conflicts = []
    const resolutions = []

    // Check for version conflicts in updates
    const resolvedUpdated = changes.updated.filter(box => {
      const localVersion = syncStateRef.current.boxVersions.get(box.id) || 0
      const incomingVersion = box.version || 0

      if (incomingVersion < localVersion) {
        conflicts.push({
          type: 'version_conflict',
          boxId: box.id,
          localVersion,
          incomingVersion,
          resolution: 'keep_local'
        })
        return false // Skip this update
      }

      if (incomingVersion === localVersion && box.modifiedBy !== userId) {
        conflicts.push({
          type: 'simultaneous_edit',
          boxId: box.id,
          localVersion,
          incomingVersion,
          resolution: 'merge_properties'
        })
        
        // Merge non-positional properties
        // For now, keep the incoming version but log the conflict
        resolutions.push({
          boxId: box.id,
          action: 'merged_properties',
          timestamp: Date.now()
        })
      }

      return true
    })

    return {
      created: changes.created,
      updated: resolvedUpdated,
      deleted: changes.deleted,
      hasConflicts: conflicts.length > 0,
      conflicts,
      resolutions
    }
  }, [userId])

  // Initialize sync system
  useEffect(() => {
    if (enableRealTimeSync && !syncStateRef.current.isInitialized) {
      initializeSync()
    }
  }, [enableRealTimeSync, initializeSync])

  // Send current box state to new collaborators
  const sendCurrentBoxState = useCallback(async (targetUserId) => {
    if (!propagator || !canvasElements) return

    try {
      const boxElements = canvasElements.filter(el => el.type === 'rectangle')
      if (boxElements.length === 0) return

      const syncEvent = {
        type: 'box_initial_state',
        noteId,
        userId,
        targetUserId,
        timestamp: Date.now(),
        data: {
          boxes: boxElements.map(box => ({
            id: box.id,
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            angle: box.angle,
            strokeColor: box.strokeColor,
            backgroundColor: box.backgroundColor,
            strokeWidth: box.strokeWidth,
            strokeStyle: box.strokeStyle,
            roughness: box.roughness,
            opacity: box.opacity,
            zIndex: box.zIndex || 0
          }))
        }
      }

      await propagator.propagateEvent(syncEvent)
      console.log('[useBoxSync] Sent current box state to new collaborator:', targetUserId)
    } catch (error) {
      console.error('[useBoxSync] Failed to send current box state:', error)
    }
  }, [propagator, canvasElements, noteId, userId])

  // Reset synchronization state
  const resetBoxSync = useCallback(() => {
    syncStateRef.current = {
      pendingBoxChanges: new Map(),
      syncInProgress: false,
      lastSyncTime: Date.now(),
      retryCount: new Map(),
      boxVersions: new Map(),
      conflictQueue: []
    }
    setSyncStatus('idle')
    setActiveSyncs(0)
    setLastSyncError(null)
    setSyncLatency(0)
  }, [])

  // Force immediate synchronization
  const forceBoxSync = useCallback(async () => {
    if (syncStateRef.current.pendingBoxChanges.size > 0) {
      await processBoxSyncQueue()
    }
  }, [processBoxSyncQueue])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[BoxSync] Cleaning up box synchronization')
      
      if (propagator) {
        propagator.cleanup()
      }
      
      if (feedback) {
        feedback.cleanup()
      }
      
      syncStateRef.current.localChanges.clear()
      syncStateRef.current.remoteChanges.clear()
    }
  }, [propagator, feedback])

  return {
    // Main sync function
    syncBoxElements,
    
    // Status and metrics
    syncStatus,
    isSyncing,
    syncMetrics,
    
    // Utility functions
    initialize: initializeSync,
    cleanup: () => {
      if (propagator) propagator.cleanup()
      if (feedback) feedback.cleanup()
    },
    sendCurrentBoxState, // Function to send current state to new collaborators
    
    // Debug information
    getDebugInfo: () => ({
      isInitialized: syncStateRef.current.isInitialized,
      localChangesCount: syncStateRef.current.localChanges.size,
      remoteChangesCount: syncStateRef.current.remoteChanges.size,
      totalSyncs: syncStateRef.current.totalSyncs,
      failedSyncs: syncStateRef.current.failedSyncs,
      propagator: propagator?.getDebugInfo(),
      feedback: feedback?.getDebugInfo()
    })
  }
}