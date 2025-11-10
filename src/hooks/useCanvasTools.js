import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Hook to manage canvas tool selection state separately from canvas content
 * This ensures tool selections remain local and persistent during collaboration
 */
export const useCanvasTools = () => {
  const [selectedTool, setSelectedTool] = useState('selection')
  const [toolOptions, setToolOptions] = useState({})
  const toolStateRef = useRef({
    selectedTool: 'selection',
    toolOptions: {},
    lastToolChange: Date.now()
  })

  // Persist tool state to prevent unwanted resets
  useEffect(() => {
    const savedToolState = localStorage.getItem('canvas-tool-state')
    if (savedToolState) {
      try {
        const parsed = JSON.parse(savedToolState)
        toolStateRef.current = parsed
        setSelectedTool(parsed.selectedTool)
        setToolOptions(parsed.toolOptions)
      } catch (error) {
        console.warn('Failed to load saved tool state:', error)
      }
    }
  }, [])

  // Save tool state when it changes
  useEffect(() => {
    toolStateRef.current = {
      selectedTool,
      toolOptions,
      lastToolChange: Date.now()
    }
    localStorage.setItem('canvas-tool-state', JSON.stringify(toolStateRef.current))
  }, [selectedTool, toolOptions])

  const changeTool = useCallback((newTool, options = {}) => {
    // Prevent rapid tool changes that might cause instability
    const now = Date.now()
    if (now - toolStateRef.current.lastToolChange < 50) {
      return
    }

    setSelectedTool(newTool)
    setToolOptions(options)
    toolStateRef.current = {
      selectedTool: newTool,
      toolOptions: options,
      lastToolChange: now
    }
  }, [])

  const getCurrentTool = useCallback(() => ({
    type: selectedTool,
    options: toolOptions
  }), [selectedTool, toolOptions])

  const resetTool = useCallback(() => {
    changeTool('selection', {})
  }, [changeTool])

  const isToolStable = useCallback(() => {
    const now = Date.now()
    return now - toolStateRef.current.lastToolChange > 100
  }, [])

  return {
    selectedTool,
    toolOptions,
    changeTool,
    getCurrentTool,
    resetTool,
    isToolStable,
    toolStateRef
  }
}