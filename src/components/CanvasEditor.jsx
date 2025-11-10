import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { X, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { CanvasCollaboration } from './CanvasCollaboration'
import { useCanvasState } from '../hooks/useCanvasState'

/**
 * Enhanced CanvasEditor with separated canvas content and tool state
 * Provides optimized real-time collaboration with persistent tool selection
 */
export const CanvasEditor = ({ noteId, onClose }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCollaboration, setShowCollaboration] = useState(false)
  const [activeCollaborators, setActiveCollaborators] = useState([])
  
  const { user } = useStore()
  const broadcastChannelRef = useRef(null)
  const isChannelSubscribedRef = useRef(false)
  const excalidrawRef = useRef(null)

  // Initialize canvas state manager
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
    toolRef
  } = useCanvasState({
    noteId,
    userId: user?.id,
    broadcastChannel: broadcastChannelRef.current,
    debounceMs: 50,
    onContentChange: async (payload) => {
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
          console.error('[CanvasEditor] Failed to save to database:', error)
        }
      } catch (err) {
        console.error('[CanvasEditor] Error saving canvas:', err)
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
        console.error('[CanvasEditor] Error loading canvas data:', err)
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
        const updatedState = applyExternalUpdate(payload.canvasData)
        
        // Update Excalidraw scene without affecting local tool state
        if (excalidrawAPI) {
          excalidrawAPI.updateScene({
            elements: updatedState.elements,
            appState: excalidrawAPI.getAppState(), // Preserve local tool state
            files: updatedState.files,
            commitToHistory: false
          })
        }
      } catch (err) {
        console.error('[CanvasEditor] Error applying external update:', err)
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        isChannelSubscribedRef.current = true
      }
    })

    return () => {
      channel.unsubscribe()
      broadcastChannelRef.current = null
      isChannelSubscribedRef.current = false
    }
  }, [noteId, user, excalidrawAPI, applyExternalUpdate])

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

  // Handle canvas changes (elements only, no appState)
  const handleChange = useCallback((elements, appState, files) => {
    if (!noteId) return

    // Update canvas content (this will handle sync automatically)
    const result = updateCanvasContent(elements, files)
    
    if (result.changed) {
      console.log('[CanvasEditor] Canvas content updated', {
        changes: result.changes,
        totalElements: elements.length
      })
    }
  }, [noteId, updateCanvasContent])

  // Handle tool changes (local only, no sync)
  const handleToolChange = useCallback((toolType, options = {}) => {
    changeTool(toolType, options)
    console.log('[CanvasEditor] Tool changed (local only)', { toolType, options })
  }, [changeTool])

  // Handle Excalidraw API initialization
  const handleExcalidrawAPI = useCallback((api) => {
    if (api) {
      excalidrawRef.current = api
      setExcalidrawAPI(api)
      
      // Apply any pending content updates
      const currentState = getCanvasState()
      if (currentState.content.elements.length > 0) {
        api.updateScene({
          elements: currentState.content.elements,
          files: currentState.content.files
        })
      }
    }
  }, [getCanvasState])

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
    }
  }, [forceContentSync])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-[#121212] z-[100] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading canvas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#121212] z-[100] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Canvas Editor</h2>
          
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

      {/* Canvas */}
      <div className="flex-1 relative">
        {excalidrawAPI && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 text-sm">
              <div className="text-gray-600 dark:text-gray-400">
                Tool: <span className="font-medium text-gray-800 dark:text-white">{selectedTool}</span>
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Pending changes: {getCanvasState().pendingChanges}
              </div>
            </div>
          </div>
        )}

        <Excalidraw
          ref={excalidrawRef}
          excalidrawAPI={handleExcalidrawAPI}
          initialData={{
            elements: getCanvasState().content.elements,
            files: getCanvasState().content.files,
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
