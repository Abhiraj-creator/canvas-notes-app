import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { X, Users, Zap, Gauge, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { CanvasCollaboration } from './CanvasCollaboration'
import { useInstantCanvasState } from '../hooks/useInstantCanvasState'
import { useCanvasPerformance } from '../hooks/useCanvasPerformance'
import { useBoxSync } from '../hooks/useBoxSync'
import { BoxSyncStatusIndicator, BoxSyncErrorNotification } from './BoxSyncComponents'

/**
 * Enhanced CanvasEditor with instant real-time rendering
 * Provides immediate visual updates with optimized performance
 */
export const InstantCanvasEditor = ({ noteId, onClose }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCollaboration, setShowCollaboration] = useState(false)
  const [activeCollaborators, setActiveCollaborators] = useState([])
  const [showPerformance, setShowPerformance] = useState(false)
  const [instantMode, setInstantMode] = useState(true)
  const [enableRealTimeSync, setEnableRealTimeSync] = useState(true)
  
  const { user } = useStore()
  const broadcastChannelRef = useRef(null)
  const isChannelSubscribedRef = useRef(false)
  const excalidrawRef = useRef(null)
  const performanceMonitorRef = useRef(null)

  // Initialize performance monitoring
  const {
    recordRender,
    recordUpdate,
    recordSync,
    getMetrics,
    getPerformanceReport,
    resetMetrics
  } = useCanvasPerformance()

  // Initialize box synchronization for real-time collaboration
  const {
    syncBoxElements,
    syncStatus,
    isSyncing,
    syncMetrics,
    initialize: initializeBoxSync,
    getDebugInfo: getBoxSyncDebugInfo
  } = useBoxSync({
    noteId,
    userId: user?.id,
    broadcastChannel: broadcastChannelRef.current,
    canvasElements: contentRef.current?.elements || [],
    onElementsChange: (updatedElements, metadata) => {
      console.log('[InstantCanvasEditor] Box sync elements changed', {
        elementCount: updatedElements.length,
        source: metadata?.source,
        userId: metadata?.userId
      })
      
      // Update canvas content with synchronized elements
      updateCanvasContent(updatedElements, contentRef.current?.files || {})
      
      // Record sync performance
      recordSync(metadata?.latency || 0)
    },
    enableRealTimeSync: true,
    enableVisualFeedback: true,
    enableConflictResolution: true,
    syncDebounceMs: 16, // 60 FPS for smooth real-time sync
    maxRetries: 3,
    retryDelay: 1000,
    onSyncStatusChange: (status, error) => {
      console.log('[InstantCanvasEditor] Box sync status changed:', status)
      if (error) {
        console.error('[InstantCanvasEditor] Box sync error:', error)
        toast.error(`Box sync error: ${error.message}`)
      }
    }
  })

  // Initialize instant canvas state manager
  const {
    updateCanvasContent,
    applyExternalUpdate,
    getCanvasState,
    forceContentSync,
    selectedTool,
    toolOptions,
    changeTool,
    isToolStable,
    contentRef,
    toolRef,
    getPerformanceMetrics: getInstantMetrics
  } = useInstantCanvasState({
    noteId,
    userId: user?.id,
    broadcastChannel: broadcastChannelRef.current,
    debounceMs: instantMode ? 16 : 50,
    enableInstantRendering: instantMode,
    onContentChange: async (payload) => {
      // Record sync performance
      const syncStart = performance.now()
      
      // Save to database after successful sync
      try {
        const { error } = await supabase
          .from('notes')
          .update({
            canvas_data: {
              elements: contentRef.current.elements,
              files: contentRef.current.files
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', noteId)

        if (error) {
          console.error('[InstantCanvasEditor] Failed to save to database:', error)
        }
        
        // Record successful sync
        recordSync(performance.now() - syncStart)
      } catch (err) {
        console.error('[InstantCanvasEditor] Error saving canvas:', err)
      }
    }
  })

  // Load initial canvas data
  useEffect(() => {
    if (!noteId) return

    const loadCanvasData = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('canvas_data')
          .eq('id', noteId)
          .single()

        if (!error && data?.canvas_data) {
          const canvasData = data.canvas_data
          
          // Initialize canvas content (without appState)
          updateCanvasContent(
            canvasData.elements || [],
            canvasData.files || {}
          )
        }
      } catch (err) {
        console.error('[InstantCanvasEditor] Error loading canvas data:', err)
        toast.error('Failed to load canvas data')
      } finally {
        setLoading(false)
      }
    }

    loadCanvasData()
  }, [noteId, updateCanvasContent])

  // Set up real-time collaboration channel
  useEffect(() => {
    if (!noteId || !user) return

    const channel = supabase.channel(`canvas-${noteId}`, {
      config: { broadcast: { self: false } }
    })

    broadcastChannelRef.current = channel

    // Handle incoming canvas updates
    channel.on('broadcast', { event: 'canvas-update' }, ({ payload }) => {
      if (payload.userId === user.id) return // Skip own updates

      try {
        const updateStart = performance.now()
        const updatedState = applyExternalUpdate(payload.canvasData)
        
        // Record external update performance
        recordUpdate(performance.now() - updateStart)
        
        // Update Excalidraw scene without affecting local tool state
        if (excalidrawAPI) {
          const renderStart = performance.now()
          
          excalidrawAPI.updateScene({
            elements: updatedState.elements,
            appState: excalidrawAPI.getAppState(), // Preserve local tool state
            files: updatedState.files,
            commitToHistory: false
          })
          
          // Record render performance
          recordRender(performance.now() - renderStart)
        }
      } catch (err) {
        console.error('[InstantCanvasEditor] Error applying external update:', err)
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        isChannelSubscribedRef.current = true
        
        // Initialize box synchronization after channel is subscribed
        if (enableRealTimeSync) {
          await initializeBoxSync()
          console.log('[InstantCanvasEditor] Box sync initialized')
        }
      }
    })

    return () => {
      channel.unsubscribe()
      broadcastChannelRef.current = null
      isChannelSubscribedRef.current = false
    }
  }, [noteId, user, excalidrawAPI, applyExternalUpdate, recordUpdate, recordRender])

  // Track active collaborators
  useEffect(() => {
    if (!noteId || !user) return

    const presenceChannel = supabase.channel(`canvas-presence-${noteId}`)
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const collaborators = Object.values(state)
          .flat()
          .map((presence) => presence.user)
          .filter((u) => u && u.id !== user.id)
        setActiveCollaborators(collaborators)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const newCollaborators = newPresences
          .map((p) => p.user)
          .filter((u) => u && u.id !== user.id)
        setActiveCollaborators((prev) => {
          const existingIds = prev.map((c) => c.id)
          const unique = newCollaborators.filter((c) => !existingIds.includes(c.id))
          return [...prev, ...unique]
        })

        // Send current box state to new collaborators
        if (enableRealTimeSync && boxSync.sendCurrentBoxState) {
          newCollaborators.forEach(collaborator => {
            console.log('[InstantCanvasEditor] Sending box state to new collaborator:', collaborator.id)
            boxSync.sendCurrentBoxState(collaborator.id)
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftIds = leftPresences.map((p) => p.user?.id).filter(Boolean)
        setActiveCollaborators((prev) => prev.filter((c) => !leftIds.includes(c.id)))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user: {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0]
            },
            online_at: new Date().toISOString()
          })
        }
      })

    return () => {
      presenceChannel.untrack()
      presenceChannel.unsubscribe()
    }
  }, [noteId, user])

  // Performance monitoring interval
  useEffect(() => {
    if (!showPerformance) return

    performanceMonitorRef.current = setInterval(() => {
      const metrics = getMetrics()
      const instantMetrics = getInstantMetrics()
      
      console.log('[InstantCanvasEditor] Performance:', {
        fps: metrics.fps.toFixed(1),
        avgRenderTime: metrics.averageRenderTime.toFixed(2),
        frameDropRate: (metrics.frameDropRate * 100).toFixed(1),
        grade: metrics.performanceGrade,
        instantMode,
        pendingUpdates: instantMetrics.hasPendingUpdates
      })
    }, 2000)

    return () => {
      if (performanceMonitorRef.current) {
        clearInterval(performanceMonitorRef.current)
      }
    }
  }, [showPerformance, getMetrics, getInstantMetrics, instantMode])

  // Handle canvas changes with instant rendering and box synchronization
  const handleChange = useCallback((elements, appState, files) => {
    if (!noteId) return

    const updateStart = performance.now()
    
    // Update canvas content (this will handle sync and rendering automatically)
    const result = updateCanvasContent(elements, files)
    
    if (result.changed) {
      const updateTime = performance.now() - updateStart
      recordUpdate(updateTime)
      
      // Trigger box synchronization for real-time collaboration
      if (enableRealTimeSync && syncBoxElements) {
        syncBoxElements(elements, 'update', {
          source: 'canvas-change',
          updateTime: updateTime.toFixed(2),
          instantMode
        })
      }
      
      console.log('[InstantCanvasEditor] Canvas content updated', {
        changes: result.changes,
        totalElements: elements.length,
        updateTime: updateTime.toFixed(2),
        instantMode,
        boxSyncEnabled: enableRealTimeSync
      })
    }
  }, [noteId, updateCanvasContent, recordUpdate, instantMode, enableRealTimeSync, syncBoxElements])

  // Handle tool changes (local only, no sync)
  const handleToolChange = useCallback((toolType, options = {}) => {
    changeTool(toolType, options)
    console.log('[InstantCanvasEditor] Tool changed (local only)', { toolType, options })
  }, [changeTool])

  // Handle Excalidraw API initialization
  const handleExcalidrawAPI = useCallback((api) => {
    if (api) {
      excalidrawRef.current = api
      setExcalidrawAPI(api)
      
      // Apply any pending content updates
      const currentState = getCanvasState()
      if (currentState.content.elements.length > 0) {
        const renderStart = performance.now()
        
        api.updateScene({
          elements: currentState.content.elements,
          files: currentState.content.files
        })
        
        recordRender(performance.now() - renderStart)
      }
    }
  }, [getCanvasState, recordRender])

  // Toggle instant mode
  const toggleInstantMode = useCallback(() => {
    setInstantMode(prev => !prev)
    toast.success(`Instant rendering ${!instantMode ? 'enabled' : 'disabled'}`)
  }, [instantMode])

  // Get performance report
  const getFullPerformanceReport = useCallback(() => {
    const report = getPerformanceReport()
    const instantMetrics = getInstantMetrics()
    
    return {
      ...report,
      instantMetrics,
      instantMode,
      timestamp: new Date().toISOString()
    }
  }, [getPerformanceReport, getInstantMetrics, instantMode])

  // UI configuration
  const uiOptions = useMemo(() => ({
    canvasActions: {
      saveToActiveFile: false,
      loadScene: false,
      export: { saveFileToDisk: true },
      changeViewBackgroundColor: true,
      clearCanvas: true,
      theme: true,
      saveAsImage: true
    },
    tools: {
      image: true
    }
  }), [])

  // Prevent body scroll when canvas is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      forceContentSync()
      if (performanceMonitorRef.current) {
        clearInterval(performanceMonitorRef.current)
      }
    }
  }, [forceContentSync])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-[#121212] z-[100] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading instant canvas...</p>
        </div>
      </div>
    )
  }

  const currentState = getCanvasState()
  const performanceMetrics = getMetrics()

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#121212] z-[100] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Instant Canvas Editor</h2>
          
          {/* Instant mode indicator */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            instantMode 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            <Zap className="w-4 h-4" />
            {instantMode ? 'Instant Mode' : 'Standard Mode'}
          </div>

          {/* Box sync status indicator */}
          {enableRealTimeSync && (
            <BoxSyncStatusIndicator 
              status={syncStatus}
              isSyncing={isSyncing}
              metrics={syncMetrics}
              className="text-sm"
            />
          )}

          {/* Box sync error notification */}
          {enableRealTimeSync && (
            <BoxSyncErrorNotification className="text-sm" />
          )}

          {/* Active collaborators indicator */}
          {activeCollaborators.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {activeCollaborators.slice(0, 3).map((collaborator, index) => (
                  <div
                    key={collaborator.id}
                    className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800"
                    title={collaborator.email}
                  >
                    {collaborator.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {activeCollaborators.length} active
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Performance toggle */}
          <button
            onClick={() => setShowPerformance(!showPerformance)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showPerformance
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
            }`}
            title="Toggle performance monitoring"
          >
            <Activity className="w-4 h-4" />
            {showPerformance && (
              <span className="text-sm">
                {performanceMetrics.performanceGrade}
              </span>
            )}
          </button>

          {/* Instant mode toggle */}
          <button
            onClick={toggleInstantMode}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              instantMode
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Toggle instant rendering mode"
          >
            <Zap className="w-4 h-4" />
            {instantMode ? 'On' : 'Off'}
          </button>

          {/* Real-time sync toggle */}
          <button
            onClick={() => setEnableRealTimeSync(!enableRealTimeSync)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              enableRealTimeSync
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Toggle real-time box synchronization"
          >
            <div className={`w-2 h-2 rounded-full ${
              enableRealTimeSync ? 'bg-green-400' : 'bg-gray-400'
            }`} />
            Sync {enableRealTimeSync ? 'On' : 'Off'}
          </button>

          {/* Collaboration */}
          <button
            onClick={() => setShowCollaboration(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Users className="w-4 h-4" />
            Share
          </button>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Performance Panel */}
      {showPerformance && (
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-purple-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  FPS: <span className="font-medium">{performanceMetrics.fps.toFixed(1)}</span>
                </span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Avg Render: <span className="font-medium">{performanceMetrics.averageRenderTime.toFixed(2)}ms</span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Frame Drops: <span className="font-medium">{(performanceMetrics.frameDropRate * 100).toFixed(1)}%</span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Grade: <span className={`font-medium ${
                  performanceMetrics.performanceGrade === 'A+' ? 'text-green-500' :
                  performanceMetrics.performanceGrade === 'A' ? 'text-green-400' :
                  performanceMetrics.performanceGrade === 'B' ? 'text-yellow-500' :
                  performanceMetrics.performanceGrade === 'C' ? 'text-orange-500' :
                  'text-red-500'
                }`}>{performanceMetrics.performanceGrade}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetMetrics}
                className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Reset Metrics
              </button>
              <button
                onClick={() => {
                  const report = getFullPerformanceReport()
                  console.log('[InstantCanvasEditor] Full Performance Report:', report)
                  toast.success('Performance report logged to console')
                }}
                className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Export Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative">
        {excalidrawAPI && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-sm">
              <div className="text-gray-600 dark:text-gray-400 mb-2">
                Tool: <span className="font-medium text-gray-800 dark:text-white">{selectedTool}</span>
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <div>Pending: {currentState.pendingChanges}</div>
                <div>Rendering: {currentState.rendering ? 'Yes' : 'No'}</div>
                <div>Mode: {instantMode ? 'Instant' : 'Standard'}</div>
              </div>
            </div>
          </div>
        )}

        <Excalidraw
          ref={excalidrawRef}
          excalidrawAPI={handleExcalidrawAPI}
          initialData={{
            elements: currentState.content.elements,
            files: currentState.content.files,
            appState: {
              // Preserve local tool state
              currentItemTool: selectedTool,
              ...toolOptions
            }
          }}
          onChange={handleChange}
          onToolChange={handleToolChange}
          UIOptions={uiOptions}
          theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
          langCode="en"
          renderTopRightUI={() => null} // Hide default top-right UI
        />
      </div>

      {/* Collaboration Panel */}
      <AnimatePresence>
        {showCollaboration && (
          <CanvasCollaboration
            noteId={noteId}
            onClose={() => setShowCollaboration(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default InstantCanvasEditor