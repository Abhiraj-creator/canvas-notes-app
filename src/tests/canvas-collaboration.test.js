import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCanvasState } from '../hooks/useCanvasState'
import { useCanvasTools } from '../hooks/useCanvasTools'
import { useCanvasSync } from '../hooks/useCanvasSync'

// Mock dependencies
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({ single: vi.fn(() => ({ data: null, error: null })) }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
      send: vi.fn(),
      unsubscribe: vi.fn()
    }))
  }
}))

describe('Canvas Real-time Collaboration Tests', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useCanvasTools', () => {
    it('should initialize with default tool', () => {
      const { result } = renderHook(() => useCanvasTools())
      
      expect(result.current.selectedTool).toBe('selection')
      expect(result.current.isToolStable).toBe(true)
    })

    it('should persist tool selection to localStorage', () => {
      const { result } = renderHook(() => useCanvasTools())
      
      act(() => {
        result.current.changeTool('rectangle', { strokeColor: '#ff0000' })
      })
      
      expect(result.current.selectedTool).toBe('rectangle')
      expect(result.current.toolOptions.strokeColor).toBe('#ff0000')
      expect(localStorage.getItem('canvas-tool')).toBe('rectangle')
      expect(localStorage.getItem('canvas-tool-options')).toContain('strokeColor')
    })

    it('should restore tool from localStorage on mount', () => {
      localStorage.setItem('canvas-tool', 'circle')
      localStorage.setItem('canvas-tool-options', JSON.stringify({ strokeColor: '#00ff00' }))
      
      const { result } = renderHook(() => useCanvasTools())
      
      expect(result.current.selectedTool).toBe('circle')
      expect(result.current.toolOptions.strokeColor).toBe('#00ff00')
    })

    it('should prevent rapid tool changes', () => {
      const { result } = renderHook(() => useCanvasTools())
      
      act(() => {
        result.current.changeTool('rectangle')
        result.current.changeTool('circle')
        result.current.changeTool('line')
      })
      
      // Should only register the last change after debounce
      expect(result.current.selectedTool).toBe('line')
    })

    it('should reset tool to default', () => {
      const { result } = renderHook(() => useCanvasTools())
      
      act(() => {
        result.current.changeTool('rectangle')
        result.current.resetTool()
      })
      
      expect(result.current.selectedTool).toBe('selection')
      expect(localStorage.getItem('canvas-tool')).toBe('selection')
    })
  })

  describe('useCanvasSync', () => {
    it('should queue changes for debounced sync', async () => {
      const { result } = renderHook(() => useCanvasSync({
        noteId: 'test-note',
        userId: 'test-user',
        debounceMs: 100,
        onSync: vi.fn()
      }))
      
      const elements = [{ id: '1', type: 'rectangle' }]
      const files = {}
      
      act(() => {
        result.current.queueChange(elements, files)
      })
      
      expect(result.current.pendingChanges).toBe(1)
      expect(result.current.isSyncing).toBe(false)
      
      await waitFor(() => {
        expect(result.current.pendingChanges).toBe(0)
      }, { timeout: 200 })
    })

    it('should batch multiple rapid changes', async () => {
      const onSync = vi.fn()
      const { result } = renderHook(() => useCanvasSync({
        noteId: 'test-note',
        userId: 'test-user',
        debounceMs: 50,
        onSync
      }))
      
      act(() => {
        result.current.queueChange([{ id: '1' }], {})
        result.current.queueChange([{ id: '2' }], {})
        result.current.queueChange([{ id: '3' }], {})
      })
      
      await waitFor(() => {
        expect(onSync).toHaveBeenCalledTimes(1)
        expect(result.current.pendingChanges).toBe(0)
      }, { timeout: 100 })
    })

    it('should handle sync errors gracefully', async () => {
      const onSync = vi.fn().mockRejectedValue(new Error('Sync failed'))
      const { result } = renderHook(() => useCanvasSync({
        noteId: 'test-note',
        userId: 'test-user',
        onSync
      }))
      
      act(() => {
        result.current.queueChange([{ id: '1' }], {})
      })
      
      await waitFor(() => {
        expect(result.current.pendingChanges).toBe(0)
        expect(result.current.lastError).toBe('Sync failed')
      }, { timeout: 200 })
    })

    it('should force sync when requested', async () => {
      const onSync = vi.fn()
      const { result } = renderHook(() => useCanvasSync({
        noteId: 'test-note',
        userId: 'test-user',
        onSync
      }))
      
      act(() => {
        result.current.queueChange([{ id: '1' }], {})
        result.current.forceSync()
      })
      
      expect(onSync).toHaveBeenCalled()
      expect(result.current.pendingChanges).toBe(0)
    })
  })

  describe('useCanvasState', () => {
    it('should initialize with empty content', () => {
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user'
      }))
      
      expect(result.current.getCanvasState().content.elements).toEqual([])
      expect(result.current.getCanvasState().content.files).toEqual({})
      expect(result.current.selectedTool).toBe('selection')
    })

    it('should update canvas content and detect changes', () => {
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user'
      }))
      
      const elements = [{ id: '1', type: 'rectangle', x: 100, y: 100 }]
      const files = {}
      
      const result1 = result.current.updateCanvasContent(elements, files)
      
      expect(result1.changed).toBe(true)
      expect(result1.changes.added).toBe(1)
      expect(result1.changes.modified).toBe(0)
      expect(result1.changes.removed).toBe(0)
    })

    it('should detect element modifications', () => {
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user'
      }))
      
      const initialElements = [{ id: '1', type: 'rectangle', x: 100, y: 100 }]
      result.current.updateCanvasContent(initialElements, {})
      
      const modifiedElements = [{ id: '1', type: 'rectangle', x: 150, y: 150 }]
      const result2 = result.current.updateCanvasContent(modifiedElements, {})
      
      expect(result2.changed).toBe(true)
      expect(result2.changes.modified).toBe(1)
    })

    it('should detect element removals', () => {
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user'
      }))
      
      const initialElements = [
        { id: '1', type: 'rectangle', x: 100, y: 100 },
        { id: '2', type: 'circle', x: 200, y: 200 }
      ]
      result.current.updateCanvasContent(initialElements, {})
      
      const removedElements = [{ id: '1', type: 'rectangle', x: 100, y: 100 }]
      const result2 = result.current.updateCanvasContent(removedElements, {})
      
      expect(result2.changed).toBe(true)
      expect(result2.changes.removed).toBe(1)
    })

    it('should apply external updates without affecting tool state', () => {
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user'
      }))
      
      // Set a tool
      act(() => {
        result.current.changeTool('rectangle')
      })
      
      // Apply external content update
      const externalElements = [{ id: '1', type: 'circle', x: 300, y: 300 }]
      const updatedState = result.current.applyExternalUpdate({
        elements: externalElements,
        files: {}
      })
      
      // Tool should remain unchanged
      expect(result.current.selectedTool).toBe('rectangle')
      expect(updatedState.elements).toEqual(externalElements)
    })

    it('should handle tool changes independently', () => {
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user'
      }))
      
      act(() => {
        result.current.changeTool('line', { strokeWidth: 3 })
      })
      
      expect(result.current.selectedTool).toBe('line')
      expect(result.current.toolOptions.strokeWidth).toBe(3)
      expect(result.current.isToolStable).toBe(true)
    })

    it('should prevent rapid tool changes', async () => {
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user'
      }))
      
      act(() => {
        result.current.changeTool('rectangle')
        result.current.changeTool('circle')
        result.current.changeTool('line')
      })
      
      // Should only register the last change after debounce
      expect(result.current.selectedTool).toBe('line')
    })

    it('should sync content changes', async () => {
      const onContentChange = vi.fn()
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user',
        onContentChange,
        debounceMs: 50
      }))
      
      act(() => {
        result.current.updateCanvasContent([{ id: '1', type: 'rectangle' }], {})
      })
      
      await waitFor(() => {
        expect(onContentChange).toHaveBeenCalled()
      }, { timeout: 100 })
    })

    it('should handle broadcast channel updates', () => {
      const mockBroadcastChannel = {
        send: vi.fn()
      }
      
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user',
        broadcastChannel: mockBroadcastChannel
      }))
      
      act(() => {
        result.current.updateCanvasContent([{ id: '1', type: 'rectangle' }], {})
      })
      
      expect(mockBroadcastChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'canvas-update'
        })
      )
    })
  })

  describe('Performance Tests', () => {
    it('should handle large canvas efficiently', () => {
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user'
      }))
      
      // Create 1000 elements
      const largeElements = Array.from({ length: 1000 }, (_, i) => ({
        id: `element-${i}`,
        type: 'rectangle',
        x: i * 10,
        y: i * 10,
        width: 100,
        height: 100
      }))
      
      const startTime = performance.now()
      const result1 = result.current.updateCanvasContent(largeElements, {})
      const endTime = performance.now()
      
      expect(result1.changed).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // Should process in under 100ms
    })

    it('should debounce rapid updates efficiently', async () => {
      const onContentChange = vi.fn()
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user',
        onContentChange,
        debounceMs: 100
      }))
      
      const startTime = performance.now()
      
      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.updateCanvasContent([{ id: `element-${i}` }], {})
        })
      }
      
      await waitFor(() => {
        expect(onContentChange).toHaveBeenCalledTimes(1)
      }, { timeout: 200 })
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(300) // Should complete in under 300ms
    })
  })

  describe('Integration Tests', () => {
    it('should maintain tool state during content updates', () => {
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user'
      }))
      
      // Set tool
      act(() => {
        result.current.changeTool('rectangle', { strokeColor: '#ff0000' })
      })
      
      // Multiple content updates
      act(() => {
        result.current.updateCanvasContent([{ id: '1', type: 'rectangle' }], {})
        result.current.updateCanvasContent([{ id: '2', type: 'circle' }], {})
        result.current.updateCanvasContent([{ id: '3', type: 'line' }], {})
      })
      
      // Tool should remain stable
      expect(result.current.selectedTool).toBe('rectangle')
      expect(result.current.toolOptions.strokeColor).toBe('#ff0000')
      expect(result.current.isToolStable).toBe(true)
    })

    it('should handle concurrent tool and content changes', async () => {
      const onContentChange = vi.fn()
      const { result } = renderHook(() => useCanvasState({
        noteId: 'test-note',
        userId: 'test-user',
        onContentChange,
        debounceMs: 50
      }))
      
      // Simulate concurrent changes
      act(() => {
        result.current.changeTool('line')
        result.current.updateCanvasContent([{ id: '1', type: 'rectangle' }], {})
        result.current.changeTool('circle')
        result.current.updateCanvasContent([{ id: '2', type: 'circle' }], {})
      })
      
      // Tool should be the last one set
      expect(result.current.selectedTool).toBe('circle')
      
      await waitFor(() => {
        expect(onContentChange).toHaveBeenCalled()
      }, { timeout: 100 })
    })
  })
})