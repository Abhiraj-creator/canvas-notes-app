import { useCallback, useRef } from 'react'

/**
 * Performance monitoring hook for canvas rendering
 * Tracks metrics and provides real-time performance analysis
 */
export const useCanvasPerformance = () => {
  const metricsRef = useRef({
    // Rendering metrics
    frameCount: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    droppedFrames: 0,
    
    // Update metrics
    updateCount: 0,
    totalUpdateTime: 0,
    averageUpdateTime: 0,
    maxUpdateTime: 0,
    
    // Sync metrics
    syncCount: 0,
    totalSyncTime: 0,
    averageSyncTime: 0,
    maxSyncTime: 0,
    
    // Memory metrics
    memoryUsage: 0,
    peakMemoryUsage: 0,
    
    // Timing
    startTime: Date.now(),
    lastMetricTime: Date.now()
  })

  const performanceThresholdsRef = useRef({
    maxFrameTime: 16.67, // 60fps
    maxUpdateTime: 8,    // Half frame budget
    maxSyncTime: 100,    // Reasonable sync time
    maxMemoryIncrease: 50 * 1024 * 1024, // 50MB
    maxDroppedFrameRate: 0.05 // 5%
  })

  // Record rendering performance
  const recordRender = useCallback((renderTime) => {
    const metrics = metricsRef.current
    metrics.frameCount++
    metrics.totalRenderTime += renderTime
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.frameCount
    metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime)
    metrics.minRenderTime = Math.min(metrics.minRenderTime, renderTime)

    // Check for dropped frames
    if (renderTime > performanceThresholdsRef.current.maxFrameTime) {
      metrics.droppedFrames++
    }

    // Update memory usage if available
    if (performance.memory) {
      metrics.memoryUsage = performance.memory.usedJSHeapSize
      metrics.peakMemoryUsage = Math.max(metrics.peakMemoryUsage, metrics.memoryUsage)
    }
  }, [])

  // Record update performance
  const recordUpdate = useCallback((updateTime) => {
    const metrics = metricsRef.current
    metrics.updateCount++
    metrics.totalUpdateTime += updateTime
    metrics.averageUpdateTime = metrics.totalUpdateTime / metrics.updateCount
    metrics.maxUpdateTime = Math.max(metrics.maxUpdateTime, updateTime)
  }, [])

  // Record sync performance
  const recordSync = useCallback((syncTime) => {
    const metrics = metricsRef.current
    metrics.syncCount++
    metrics.totalSyncTime += syncTime
    metrics.averageSyncTime = metrics.totalSyncTime / metrics.syncCount
    metrics.maxSyncTime = Math.max(metrics.maxSyncTime, syncTime)
  }, [])

  // Get current performance metrics
  const getMetrics = useCallback(() => {
    const metrics = metricsRef.current
    const elapsedTime = (Date.now() - metrics.startTime) / 1000
    
    return {
      // Basic metrics
      ...metrics,
      
      // Calculated metrics
      fps: metrics.frameCount / elapsedTime,
      frameDropRate: metrics.droppedFrames / metrics.frameCount,
      updatesPerSecond: metrics.updateCount / elapsedTime,
      syncsPerSecond: metrics.syncCount / elapsedTime,
      
      // Performance status
      isPerformant: checkPerformance(metrics),
      performanceGrade: getPerformanceGrade(metrics),
      
      // Recommendations
      recommendations: getPerformanceRecommendations(metrics)
    }
  }, [])

  // Check if performance is acceptable
  const checkPerformance = useCallback((metrics) => {
    const thresholds = performanceThresholdsRef.current
    
    return (
      metrics.averageRenderTime < thresholds.maxFrameTime &&
      metrics.averageUpdateTime < thresholds.maxUpdateTime &&
      metrics.averageSyncTime < thresholds.maxSyncTime &&
      metrics.frameDropRate < thresholds.maxDroppedFrameRate
    )
  }, [])

  // Get performance grade (A-F)
  const getPerformanceGrade = useCallback((metrics) => {
    const avgRenderTime = metrics.averageRenderTime
    
    if (avgRenderTime < 8) return 'A+'    // Excellent (< 8ms)
    if (avgRenderTime < 12) return 'A'     // Very good (< 12ms)
    if (avgRenderTime < 16) return 'B'     // Good (< 16ms)
    if (avgRenderTime < 20) return 'C'     // Acceptable (< 20ms)
    if (avgRenderTime < 30) return 'D'     // Poor (< 30ms)
    return 'F'                            // Unacceptable (≥ 30ms)
  }, [])

  // Get performance recommendations
  const getPerformanceRecommendations = useCallback((metrics) => {
    const recommendations = []
    const thresholds = performanceThresholdsRef.current

    if (metrics.averageRenderTime > thresholds.maxFrameTime) {
      recommendations.push({
        type: 'rendering',
        issue: 'High render time',
        value: `${metrics.averageRenderTime.toFixed(2)}ms`,
        recommendation: 'Consider reducing canvas complexity or implementing level-of-detail'
      })
    }

    if (metrics.frameDropRate > thresholds.maxDroppedFrameRate) {
      recommendations.push({
        type: 'rendering',
        issue: 'High frame drop rate',
        value: `${(metrics.frameDropRate * 100).toFixed(1)}%`,
        recommendation: 'Optimize rendering pipeline or reduce update frequency'
      })
    }

    if (metrics.averageUpdateTime > thresholds.maxUpdateTime) {
      recommendations.push({
        type: 'updates',
        issue: 'Slow updates',
        value: `${metrics.averageUpdateTime.toFixed(2)}ms`,
        recommendation: 'Optimize data structures and reduce unnecessary calculations'
      })
    }

    if (metrics.averageSyncTime > thresholds.maxSyncTime) {
      recommendations.push({
        type: 'sync',
        issue: 'Slow synchronization',
        value: `${metrics.averageSyncTime.toFixed(2)}ms`,
        recommendation: 'Implement delta updates and reduce sync payload size'
      })
    }

    if (performance.memory && metrics.memoryUsage > thresholds.maxMemoryIncrease) {
      recommendations.push({
        type: 'memory',
        issue: 'High memory usage',
        value: `${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        recommendation: 'Implement object pooling and reduce memory allocations'
      })
    }

    return recommendations
  }, [])

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      frameCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: Infinity,
      droppedFrames: 0,
      updateCount: 0,
      totalUpdateTime: 0,
      averageUpdateTime: 0,
      maxUpdateTime: 0,
      syncCount: 0,
      totalSyncTime: 0,
      averageSyncTime: 0,
      maxSyncTime: 0,
      memoryUsage: 0,
      peakMemoryUsage: 0,
      startTime: Date.now(),
      lastMetricTime: Date.now()
    }
  }, [])

  // Get performance report
  const getPerformanceReport = useCallback(() => {
    const metrics = getMetrics()
    const elapsedTime = (Date.now() - metrics.startTime) / 1000
    
    return {
      summary: {
        runtime: `${elapsedTime.toFixed(1)}s`,
        totalFrames: metrics.frameCount,
        averageFPS: metrics.fps.toFixed(1),
        performanceGrade: metrics.performanceGrade,
        isPerformant: metrics.isPerformant
      },
      rendering: {
        averageRenderTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
        maxRenderTime: `${metrics.maxRenderTime.toFixed(2)}ms`,
        minRenderTime: `${metrics.minRenderTime.toFixed(2)}ms`,
        frameDropRate: `${(metrics.frameDropRate * 100).toFixed(1)}%`
      },
      updates: {
        totalUpdates: metrics.updateCount,
        averageUpdateTime: `${metrics.averageUpdateTime.toFixed(2)}ms`,
        maxUpdateTime: `${metrics.maxUpdateTime.toFixed(2)}ms`
      },
      sync: {
        totalSyncs: metrics.syncCount,
        averageSyncTime: `${metrics.averageSyncTime.toFixed(2)}ms`,
        maxSyncTime: `${metrics.maxSyncTime.toFixed(2)}ms`
      },
      memory: {
        currentUsage: performance.memory ? 
          `${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB` : 'Not available',
        peakUsage: performance.memory ? 
          `${(metrics.peakMemoryUsage / 1024 / 1024).toFixed(1)}MB` : 'Not available'
      },
      recommendations: metrics.recommendations,
      timestamp: new Date().toISOString()
    }
  }, [getMetrics])

  return {
    recordRender,
    recordUpdate,
    recordSync,
    getMetrics,
    getPerformanceReport,
    resetMetrics,
    checkPerformance,
    getPerformanceGrade
  }
}