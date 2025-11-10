import { useCallback, useRef, useEffect } from 'react'
import { useCanvasTools } from './useCanvasTools'
import { useCanvasSync } from './useCanvasSync'

/**
 * Comprehensive canvas state manager that separates content from tool state
 * and provides optimized synchronization
 */
export const useCanvasState = ({ 
  noteId, 
  userId, 
  broadcastChannel,
  onContentChange,
  onToolChange,
  debounceMs = 50
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
    debounceMs
  })

  // Track content changes for delta detection
  const contentVersionRef = useRef(0)
  const elementMapRef = useRef(new Map())

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

  // Update canvas content with change detection
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

    return {
      changed: true,
      changes,
      content: canvasContentRef.current
    }
  }, [detectChanges, initializeElementMap, queueChange])

  // Apply external content updates (from other users)
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

    return {
      elements: updatedElements,
      files: canvasContentRef.current.files
    }
  }, [initializeElementMap])

  // Handle tool changes (local only)
  const handleToolChange = useCallback((toolType, options = {}) => {
    changeTool(toolType, options)
    if (onToolChange) {
      onToolChange(toolType, options)
    }
  }, [changeTool, onToolChange])

  // Get current canvas state
  const getCanvasState = useCallback(() => ({
    content: canvasContentRef.current,
    tool: getCurrentTool(),
    version: contentVersionRef.current,
    pendingChanges: getPendingChanges(),
    lastSync: getLastSyncTime()
  }), [getCurrentTool, getPendingChanges, getLastSyncTime])

  // Force sync pending changes
  const forceContentSync = useCallback(() => {
    forceSync()
  }, [forceSync])

  // Check if canvas is stable (no pending changes)
  const isCanvasStable = useCallback(() => {
    return getPendingChanges() === 0 && isToolStable()
  }, [getPendingChanges, isToolStable])

  // Cleanup function
  const cleanup = useCallback(() => {
    forceSync()
    elementMapRef.current.clear()
  }, [forceSync])

  return {
    // Content management
    updateCanvasContent,
    applyExternalUpdate,
    getCanvasState,
    forceContentSync,
    isCanvasStable,
    cleanup,

    // Tool management (local only)
    selectedTool,
    toolOptions,
    changeTool: handleToolChange,
    resetTool,
    isToolStable,

    // State refs for advanced usage
    contentRef: canvasContentRef,
    toolRef: toolStateRef
  }
}