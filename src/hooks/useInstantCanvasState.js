import { useCallback, useRef, useEffect } from 'react'
import { useCanvasTools } from './useCanvasTools'
import { useCanvasSync } from './useCanvasSync'
import { useCanvasRenderer } from './useCanvasRenderer'

/**
 * Enhanced canvas state manager with instant rendering capabilities
 * Provides real-time updates with minimal latency
 */
export const useInstantCanvasState = ({ 
  noteId, 
  userId, 
  broadcastChannel,
  onContentChange,
  onToolChange,
  debounceMs = 16, // 60fps = 16.67ms, use 16ms for smooth updates
  enableInstantRendering = true
}) => {
  const canvasContentRef = useRef({
    elements: [],
    files: {},
    version: 0
  })
  
  const { 
    selectedTool, 
    toolOptions, 
    changeTool, 
    getCurrentTool,
    resetTool,
    isToolStable,
    toolStateRef 
  } = useCanvasTools()

  // Initialize optimized renderer
  const {
    queueUpdate,
    forceRender,
    getPerformanceMetrics,
    cleanup: cleanupRenderer,
    isRendering,
    hasPendingUpdates
  } = useCanvasRenderer()

  const {
    queueChange,
    forceSync,
    getPendingChanges,
    getLastSyncTime
  } = useCanvasSync({
    noteId,
    userId,
    broadcastChannel,
    onSync: onContentChange,
    debounceMs: enableInstantRendering ? 16 : debounceMs // Use 16ms for instant mode
  })

  // Track content changes for delta detection
  const contentVersionRef = useRef(0)
  const elementMapRef = useRef(new Map())
  const updateBatchRef = useRef([])
  const batchTimeoutRef = useRef(null)

  // Initialize element map
  const initializeElementMap = useCallback((elements) => {
    elementMapRef.current.clear()
    elements.forEach(element => {
      elementMapRef.current.set(element.id, {
        ...element,
        _version: element.version || 0
      })
    })
  }, [])

  // Batch updates for instant rendering
  const batchUpdate = useCallback((updateFunction, priority = 'normal') => {
    updateBatchRef.current.push({
      function: updateFunction,
      priority,
      timestamp: Date.now()
    })

    // Clear existing batch timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }

    // Process batch immediately for instant mode, otherwise debounce
    if (enableInstantRendering) {
      batchTimeoutRef.current = setTimeout(() => {
        processUpdateBatch()
      }, 0) // Process immediately
    } else {
      batchTimeoutRef.current = setTimeout(() => {
        processUpdateBatch()
      }, 16) // 60fps
    }
  }, [enableInstantRendering])

  // Process batched updates
  const processUpdateBatch = useCallback(() => {
    if (updateBatchRef.current.length === 0) return

    const updates = [...updateBatchRef.current]
    updateBatchRef.current = []

    // Queue all updates for rendering
    updates.forEach(update => {
      queueUpdate(update.function, update.priority)
    })

    batchTimeoutRef.current = null
  }, [queueUpdate])

  // Detect changes between current and new elements
  const detectChanges = useCallback((newElements) => {
    const changes = {
      updated: [],
      removed: [],
      added: []
    }

    const newElementMap = new Map()
    newElements.forEach(element => {
      newElementMap.set(element.id, element)
    })

    // Find updated and added elements
    newElements.forEach(element => {
      const existing = elementMapRef.current.get(element.id)
      if (!existing) {
        changes.added.push(element)
      } else if (existing._version !== (element.version || 0)) {
        changes.updated.push(element)
      }
    })

    // Find removed elements
    elementMapRef.current.forEach((existing, id) => {
      if (!newElementMap.has(id)) {
        changes.removed.push({ id })
      }
    })

    return changes
  }, [])

  // Update canvas content with instant rendering
  const updateCanvasContent = useCallback((elements, files = {}) => {
    const changes = detectChanges(elements)
    
    if (changes.updated.length === 0 && changes.added.length === 0 && changes.removed.length === 0) {
      return { changed: false }
    }

    // Update element map
    initializeElementMap(elements)

    // Update content ref
    canvasContentRef.current = {
      elements: [...elements],
      files: { ...files },
      version: ++contentVersionRef.current
    }

    // Queue changes for synchronization
    changes.updated.forEach(element => queueChange(element, 'update'))
    changes.added.forEach(element => queueChange(element, 'update'))
    changes.removed.forEach(element => queueChange(element, 'remove'))

    // Queue instant rendering updates
    if (enableInstantRendering) {
      batchUpdate(() => {
        // This will be executed in the next animation frame
        console.log(`[InstantCanvas] Rendering ${changes.updated.length + changes.added.length} changes`)
      }, 'high')
    }

    return {
      changed: true,
      changes,
      content: canvasContentRef.current
    }
  }, [detectChanges, initializeElementMap, queueChange, enableInstantRendering, batchUpdate])

  // Apply external content updates with instant rendering
  const applyExternalUpdate = useCallback((updatePayload) => {
    const { changed = [], removed = [] } = updatePayload

    // Create updated elements array
    const currentElements = [...canvasContentRef.current.elements]
    const elementMap = new Map()
    currentElements.forEach(el => elementMap.set(el.id, el))

    // Remove elements
    removed.forEach(id => {
      elementMap.delete(id)
    })

    // Update or add changed elements
    changed.forEach(element => {
      elementMap.set(element.id, element)
    })

    // Convert back to array
    const updatedElements = Array.from(elementMap.values())

    // Update internal state without triggering sync
    canvasContentRef.current = {
      ...canvasContentRef.current,
      elements: updatedElements,
      version: ++contentVersionRef.current
    }

    // Update element map
    initializeElementMap(updatedElements)

    // Queue instant rendering for external updates
    if (enableInstantRendering) {
      batchUpdate(() => {
        console.log(`[InstantCanvas] Applied ${changed.length} external changes`)
      }, 'high')
    }

    return {
      elements: updatedElements,
      files: canvasContentRef.current.files
    }
  }, [enableInstantRendering, batchUpdate, initializeElementMap])

  // Handle tool changes (local only)
  const handleToolChange = useCallback((toolType, options = {}) => {
    changeTool(toolType, options)
    if (onToolChange) {
      onToolChange(toolType, options)
    }
  }, [changeTool, onToolChange])

  // Get current canvas state with performance metrics
  const getCanvasState = useCallback(() => ({
    content: canvasContentRef.current,
    tool: getCurrentTool(),
    version: contentVersionRef.current,
    pendingChanges: getPendingChanges(),
    lastSync: getLastSyncTime(),
    rendering: isRendering(),
    hasPendingUpdates: hasPendingUpdates(),
    performance: getPerformanceMetrics(),
    instantRendering: enableInstantRendering
  }), [getCurrentTool, getPendingChanges, getLastSyncTime, isRendering, hasPendingUpdates, getPerformanceMetrics, enableInstantRendering])

  // Force sync pending changes
  const forceContentSync = useCallback(() => {
    forceSync()
    if (enableInstantRendering) {
      forceRender()
    }
  }, [forceSync, forceRender, enableInstantRendering])

  // Check if canvas is stable (no pending changes)
  const isCanvasStable = useCallback(() => {
    return getPendingChanges() === 0 && isToolStable() && !isRendering()
  }, [getPendingChanges, isToolStable, isRendering])

  // Cleanup function
  const cleanup = useCallback(() => {
    forceSync()
    cleanupRenderer()
    elementMapRef.current.clear()
    
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }
    
    updateBatchRef.current = []
  }, [forceSync, cleanupRenderer])

  return {
    // Content management
    updateCanvasContent,
    applyExternalUpdate,
    getCanvasState,
    forceContentSync,
    
    // Tool management
    selectedTool,
    toolOptions,
    changeTool: handleToolChange,
    resetTool,
    isToolStable,
    
    // State checking
    isCanvasStable,
    
    // Performance monitoring
    getPerformanceMetrics,
    
    // Cleanup
    cleanup,
    
    // Refs for external access
    contentRef: canvasContentRef,
    toolRef: toolStateRef
  }
}