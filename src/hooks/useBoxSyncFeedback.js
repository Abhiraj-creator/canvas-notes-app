import { useCallback, useRef, useState, useEffect } from 'react'

/**
 * Visual feedback system for box synchronization
 * Provides status indicators, progress bars, and error notifications
 */
export const useBoxSyncFeedback = () => {
  const [syncStatus, setSyncStatus] = useState('idle') // idle, syncing, success, error
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncErrors, setSyncErrors] = useState([])
  const [connectionQuality, setConnectionQuality] = useState(100) // 0-100
  const [activeOperations, setActiveOperations] = useState(new Map())

  const feedbackRef = useRef({
    operationId: 0,
    lastStatusUpdate: 0,
    statusUpdateThrottle: 100 // ms
  })

  // Start a sync operation
  const startSyncOperation = useCallback((operationType, metadata = {}) => {
    const operationId = `op_${++feedbackRef.current.operationId}`
    const startTime = Date.now()

    console.log('[BoxSyncFeedback] Starting operation', {
      operationId,
      operationType,
      metadata
    })

    // Add to active operations
    setActiveOperations(prev => {
      const newOps = new Map(prev)
      newOps.set(operationId, {
        type: operationType,
        startTime,
        metadata,
        status: 'in-progress'
      })
      return newOps
    })

    // Update sync status
    setSyncStatus('syncing')
    setSyncProgress(0)

    return operationId
  }, [])

  // Update operation progress
  const updateOperationProgress = useCallback((operationId, progress, details = {}) => {
    setActiveOperations(prev => {
      const newOps = new Map(prev)
      const operation = newOps.get(operationId)
      
      if (operation) {
        newOps.set(operationId, {
          ...operation,
          progress,
          ...details
        })
      }
      
      return newOps
    })

    // Update overall progress
    setActiveOperations(currentOps => {
      const inProgressOps = Array.from(currentOps.values()).filter(op => op.status === 'in-progress')
      if (inProgressOps.length > 0) {
        const avgProgress = inProgressOps.reduce((sum, op) => sum + (op.progress || 0), 0) / inProgressOps.length
        setSyncProgress(Math.round(avgProgress))
      }
      return currentOps
    })
  }, [])

  // Complete a sync operation
  const completeSyncOperation = useCallback((operationId, success, result = {}) => {
    const endTime = Date.now()
    
    setActiveOperations(prev => {
      const newOps = new Map(prev)
      const operation = newOps.get(operationId)
      
      if (operation) {
        const duration = endTime - operation.startTime
        
        console.log('[BoxSyncFeedback] Operation completed', {
          operationId,
          success,
          duration,
          result
        })

        newOps.set(operationId, {
          ...operation,
          status: success ? 'completed' : 'failed',
          endTime,
          duration,
          result
        })

        // Remove completed operation after a delay
        setTimeout(() => {
          setActiveOperations(currentOps => {
            const updatedOps = new Map(currentOps)
            updatedOps.delete(operationId)
            return updatedOps
          })
        }, 2000)
      }
      
      return newOps
    })

    // Update sync status
    if (success) {
      setSyncStatus('success')
      setSyncProgress(100)
      
      // Reset to idle after success
      setTimeout(() => {
        setSyncStatus('idle')
        setSyncProgress(0)
      }, 1500)
    } else {
      setSyncStatus('error')
      setSyncProgress(0)
      
      // Add error notification
      const errorMessage = result.error || 'Sync operation failed'
      addSyncError(errorMessage, {
        operationId,
        operationType: result.operationType,
        details: result
      })
    }
  }, [])

  // Add sync error
  const addSyncError = useCallback((message, details = {}) => {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const error = {
      id: errorId,
      message,
      timestamp: Date.now(),
      details
    }

    setSyncErrors(prev => [...prev, error])

    // Auto-remove error after 10 seconds
    setTimeout(() => {
      setSyncErrors(prev => prev.filter(e => e.id !== errorId))
    }, 10000)
  }, [])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setSyncErrors([])
  }, [])

  // Update connection quality (0-100)
  const updateConnectionQuality = useCallback((quality) => {
    // Throttle updates to prevent excessive re-renders
    const now = Date.now()
    if (now - feedbackRef.current.lastStatusUpdate < feedbackRef.current.statusUpdateThrottle) {
      return
    }

    feedbackRef.current.lastStatusUpdate = now
    
    // Smooth the quality updates
    setConnectionQuality(prev => {
      const newQuality = Math.max(0, Math.min(100, quality))
      // Use weighted average for smoother transitions
      return Math.round(prev * 0.7 + newQuality * 0.3)
    })
  }, [])

  // Get current sync status text
  const getStatusText = useCallback(() => {
    switch (syncStatus) {
      case 'idle':
        return 'Ready'
      case 'syncing':
        return 'Syncing...'
      case 'success':
        return 'Synced'
      case 'error':
        return 'Sync Error'
      default:
        return 'Unknown'
    }
  }, [syncStatus])

  // Get connection quality text
  const getConnectionQualityText = useCallback(() => {
    if (connectionQuality >= 90) return 'Excellent'
    if (connectionQuality >= 70) return 'Good'
    if (connectionQuality >= 50) return 'Fair'
    if (connectionQuality >= 30) return 'Poor'
    return 'Very Poor'
  }, [connectionQuality])

  // Get status icon
  const getStatusIcon = useCallback(() => {
    switch (syncStatus) {
      case 'idle':
        return '⭕'
      case 'syncing':
        return '🔄'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '❓'
    }
  }, [syncStatus])

  // Get connection quality color
  const getConnectionQualityColor = useCallback(() => {
    if (connectionQuality >= 90) return 'text-green-500'
    if (connectionQuality >= 70) return 'text-green-400'
    if (connectionQuality >= 50) return 'text-yellow-500'
    if (connectionQuality >= 30) return 'text-orange-500'
    return 'text-red-500'
  }, [connectionQuality])

  // Get component props for sync status indicator
  const getBoxSyncStatusIndicatorProps = useCallback(() => {
    return {
      syncStatus,
      syncProgress,
      connectionQuality,
      getStatusIcon,
      getStatusText,
      getConnectionQualityText,
      getConnectionQualityColor
    }
  }, [syncStatus, syncProgress, connectionQuality, getStatusIcon, getStatusText, getConnectionQualityText, getConnectionQualityColor])

  // Get component props for error notifications
  const getBoxSyncErrorNotificationProps = useCallback(() => {
    return {
      syncErrors,
      onDismissError: (errorId) => setSyncErrors(prev => prev.filter(e => e.id !== errorId))
    }
  }, [syncErrors])

  return {
    // State
    syncStatus,
    syncProgress,
    syncErrors,
    connectionQuality,
    activeOperations,
    
    // Methods
    startSyncOperation,
    updateOperationProgress,
    completeSyncOperation,
    addSyncError,
    clearErrors,
    updateConnectionQuality,
    
    // Helpers
    getStatusText,
    getConnectionQualityText,
    getStatusIcon,
    getConnectionQualityColor,
    
    // Component props
    getBoxSyncStatusIndicatorProps,
    getBoxSyncErrorNotificationProps
  }
}