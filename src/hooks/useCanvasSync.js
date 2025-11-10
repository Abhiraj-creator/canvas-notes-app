import { useCallback, useRef, useEffect } from 'react'

/**
 * Hook to manage canvas synchronization with delta updates and debouncing
 * Optimizes performance by sending only changed elements
 */
export const useCanvasSync = ({ 
  noteId, 
  userId, 
  broadcastChannel, 
  onSync, 
  debounceMs = 50,
  maxBatchSize = 100 
}) => {
  const syncQueueRef = useRef([])
  const syncTimeoutRef = useRef(null)
  const lastSyncRef = useRef(Date.now())
  const pendingChangesRef = useRef(new Map())
  const syncInProgressRef = useRef(false)

  // Create a unique ID for tracking changes
  const generateChangeId = useCallback((element) => {
    return `${element.id}-${element.version || 0}-${Date.now()}`
  }, [])

  // Queue changes for batch processing
  const queueChange = useCallback((element, type = 'update') => {
    const changeId = generateChangeId(element)
    
    // Skip if this exact change is already queued
    if (pendingChangesRef.current.has(changeId)) {
      return
    }

    const change = {
      id: changeId,
      elementId: element.id,
      type,
      element: type === 'remove' ? { id: element.id } : element,
      timestamp: Date.now()
    }

    pendingChangesRef.current.set(changeId, change)
    syncQueueRef.current.push(change)

    // Process queue if it reaches max batch size
    if (syncQueueRef.current.length >= maxBatchSize) {
      processSyncQueue()
    } else {
      // Otherwise debounce
      scheduleSync()
    }
  }, [generateChangeId, maxBatchSize])

  // Schedule sync with debouncing
  const scheduleSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      processSyncQueue()
    }, debounceMs)
  }, [debounceMs])

  // Process the sync queue
  const processSyncQueue = useCallback(async () => {
    if (syncInProgressRef.current || syncQueueRef.current.length === 0) {
      return
    }

    syncInProgressRef.current = true
    const changes = [...syncQueueRef.current]
    syncQueueRef.current = []

    try {
      // Group changes by type
      const changed = changes
        .filter(c => c.type === 'update')
        .map(c => c.element)
        .filter((el, index, arr) => arr.findIndex(e => e.id === el.id) === index) // Remove duplicates

      const removed = changes
        .filter(c => c.type === 'remove')
        .map(c => c.element.id)
        .filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates

      if (changed.length === 0 && removed.length === 0) {
        syncInProgressRef.current = false
        return
      }

      const syncPayload = {
        changed,
        removed,
        timestamp: Date.now(),
        userId,
        noteId
      }

      console.log('[CanvasSync] Processing sync', {
        changed: changed.length,
        removed: removed.length,
        totalChanges: changes.length
      })

      // Clear processed changes from pending map
      changes.forEach(change => {
        pendingChangesRef.current.delete(change.id)
      })

      // Call sync callback
      if (onSync) {
        await onSync(syncPayload)
      }

      // Broadcast if channel is available
      if (broadcastChannel) {
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'canvas-update',
          payload: syncPayload
        })
      }

      lastSyncRef.current = Date.now()

    } catch (error) {
      console.error('[CanvasSync] Error processing sync:', error)
      
      // Re-queue failed changes (with exponential backoff)
      const retryDelay = Math.min(1000, Math.pow(2, syncQueueRef.current.length) * 100)
      setTimeout(() => {
        changes.forEach(change => {
          if (!pendingChangesRef.current.has(change.id)) {
            syncQueueRef.current.push(change)
            pendingChangesRef.current.set(change.id, change)
          }
        })
        scheduleSync()
      }, retryDelay)
    } finally {
      syncInProgressRef.current = false
    }
  }, [userId, noteId, broadcastChannel, onSync])

  // Force sync any pending changes
  const forceSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    processSyncQueue()
  }, [processSyncQueue])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  return {
    queueChange,
    forceSync,
    getPendingChanges: () => syncQueueRef.current.length,
    getLastSyncTime: () => lastSyncRef.current
  }
}