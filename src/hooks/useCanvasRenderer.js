import { useCallback, useRef } from 'react'

/**
 * Optimized canvas rendering hook with requestAnimationFrame
 * Provides instant visual updates with minimal latency
 */
export const useCanvasRenderer = () => {
  const animationFrameRef = useRef(null)
  const pendingUpdatesRef = useRef([])
  const isRenderingRef = useRef(false)
  const lastRenderTimeRef = useRef(0)
  const renderMetricsRef = useRef({
    frameCount: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    droppedFrames: 0
  })

  // Performance monitoring
  const performanceMonitorRef = useRef({
    startTime: 0,
    frameStartTime: 0,
    renderStartTime: 0,
    updateStartTime: 0
  })

  // Browser compatibility check
  const supportsRequestAnimationFrame = typeof window !== 'undefined' && 
    window.requestAnimationFrame && 
    window.cancelAnimationFrame

  // Cross-browser RAF implementation
  const requestAnimationFrame = useCallback((callback) => {
    if (supportsRequestAnimationFrame) {
      return window.requestAnimationFrame(callback)
    } else {
      // Fallback for older browsers
      return setTimeout(() => callback(Date.now()), 16) // ~60fps
    }
  }, [supportsRequestAnimationFrame])

  const cancelAnimationFrame = useCallback((id) => {
    if (supportsRequestAnimationFrame) {
      window.cancelAnimationFrame(id)
    } else {
      clearTimeout(id)
    }
  }, [supportsRequestAnimationFrame])

  // Queue an update for rendering
  const queueUpdate = useCallback((updateFunction, priority = 'normal') => {
    const update = {
      id: `${Date.now()}-${Math.random()}`,
      function: updateFunction,
      priority,
      timestamp: Date.now(),
      queuedAt: performance.now()
    }

    pendingUpdatesRef.current.push(update)
    
    // Sort by priority (high priority first)
    pendingUpdatesRef.current.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    // Start rendering if not already running
    if (!isRenderingRef.current) {
      scheduleRender()
    }
  }, [])

  // Schedule the next render frame
  const scheduleRender = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    performanceMonitorRef.current.frameStartTime = performance.now()
    
    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      renderFrame(timestamp)
    })
  }, [requestAnimationFrame, cancelAnimationFrame, renderFrame])

  // Render a single frame
  const renderFrame = useCallback((timestamp) => {
    if (!isRenderingRef.current) {
      isRenderingRef.current = true
      lastRenderTimeRef.current = timestamp
    }

    performanceMonitorRef.current.renderStartTime = performance.now()

    try {
      // Process all pending updates
      const updates = [...pendingUpdatesRef.current]
      pendingUpdatesRef.current = []

      let processedCount = 0
      let totalUpdateTime = 0

      for (const update of updates) {
        const updateStartTime = performance.now()
        
        try {
          update.function()
          processedCount++
          
          const updateTime = performance.now() - updateStartTime
          totalUpdateTime += updateTime
          
          // Monitor update performance
          if (updateTime > 16) { // Frame budget exceeded
            console.warn(`[CanvasRenderer] Slow update detected: ${updateTime.toFixed(2)}ms`)
          }
        } catch (error) {
          console.error('[CanvasRenderer] Update error:', error)
        }
      }

      // Update performance metrics
      const renderTime = performance.now() - performanceMonitorRef.current.renderStartTime
      updateRenderMetrics(renderTime)

      // Log performance for debugging
      if (processedCount > 0) {
        console.log(`[CanvasRenderer] Frame processed: ${processedCount} updates in ${renderTime.toFixed(2)}ms`)
      }

    } catch (error) {
      console.error('[CanvasRenderer] Frame render error:', error)
    } finally {
      isRenderingRef.current = false
      animationFrameRef.current = null

      // Schedule next frame if there are pending updates
      if (pendingUpdatesRef.current.length > 0) {
        scheduleRender()
      }
    }
  }, [scheduleRender, updateRenderMetrics])

  // Update render performance metrics
  const updateRenderMetrics = useCallback((renderTime) => {
    const metrics = renderMetricsRef.current
    metrics.frameCount++
    metrics.totalRenderTime += renderTime
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.frameCount
    metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime)
    metrics.minRenderTime = Math.min(metrics.minRenderTime, renderTime)

    // Check for dropped frames (target: 60fps = 16.67ms per frame)
    if (renderTime > 16.67) {
      metrics.droppedFrames++
    }
  }, [])

  // Get current performance metrics
  const getPerformanceMetrics = useCallback(() => {
    const metrics = renderMetricsRef.current
    return {
      ...metrics,
      fps: metrics.frameCount / (metrics.totalRenderTime / 1000),
      frameDropRate: metrics.droppedFrames / metrics.frameCount,
      isPerformant: metrics.averageRenderTime < 16.67 && metrics.frameDropRate < 0.05
    }
  }, [])

  // Force immediate render
  const forceRender = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    // Process pending updates immediately
    const updates = [...pendingUpdatesRef.current]
    pendingUpdatesRef.current = []
    
    updates.forEach(update => {
      try {
        update.function()
      } catch (error) {
        console.error('[CanvasRenderer] Force render error:', error)
      }
    })
    
    isRenderingRef.current = false
  }, [cancelAnimationFrame])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    pendingUpdatesRef.current = []
    isRenderingRef.current = false
    
    console.log('[CanvasRenderer] Cleanup completed')
  }, [cancelAnimationFrame])

  return {
    queueUpdate,
    forceRender,
    getPerformanceMetrics,
    cleanup,
    isRendering: () => isRenderingRef.current,
    hasPendingUpdates: () => pendingUpdatesRef.current.length > 0
  }
}