import { useCallback, useRef, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Enhanced WebSocket-based communication channel for real-time box synchronization
 * Provides bidirectional communication with sub-second latency
 */
export const useBoxSyncChannel = ({ 
  noteId, 
  userId, 
  onBoxSync,
  onConnectionChange,
  heartbeatInterval = 30000,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5
}) => {
  const channelRef = useRef(null)
  const connectionStateRef = useRef({
    isConnected: false,
    reconnectAttempts: 0,
    lastHeartbeat: Date.now(),
    connectionId: null,
    subscribers: new Set()
  })
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [latency, setLatency] = useState(0)
  const [activeConnections, setActiveConnections] = useState(0)

  // Generate unique connection ID
  const generateConnectionId = useCallback(() => {
    return `${userId}-${noteId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [userId, noteId])

  // Send heartbeat to maintain connection
  const sendHeartbeat = useCallback(() => {
    if (!channelRef.current || !connectionStateRef.current.isConnected) return

    const heartbeatData = {
      type: 'heartbeat',
      connectionId: connectionStateRef.current.connectionId,
      timestamp: Date.now(),
      userId,
      noteId
    }

    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'box-heartbeat',
        payload: heartbeatData
      })
      
      connectionStateRef.current.lastHeartbeat = Date.now()
      console.log('[BoxSyncChannel] Heartbeat sent', heartbeatData)
    } catch (error) {
      console.error('[BoxSyncChannel] Heartbeat failed:', error)
      handleConnectionError(error)
    }
  }, [userId, noteId])

  // Handle incoming heartbeat
  const handleHeartbeat = useCallback((payload) => {
    if (payload.userId === userId) return // Skip own heartbeats

    const now = Date.now()
    const messageLatency = now - payload.timestamp
    
    setLatency(messageLatency)
    
    console.log('[BoxSyncChannel] Heartbeat received', {
      fromUser: payload.userId,
      latency: messageLatency,
      connectionId: payload.connectionId
    })
  }, [userId])

  // Establish connection to the box sync channel
  const connect = useCallback(async () => {
    if (channelRef.current) {
      console.log('[BoxSyncChannel] Already connected')
      return
    }

    try {
      setConnectionStatus('connecting')
      
      // Create channel with unique name
      const channelName = `box-sync-${noteId}`
      const connectionId = generateConnectionId()
      
      connectionStateRef.current.connectionId = connectionId
      
      const channel = supabase.channel(channelName, {
        config: { 
          broadcast: { 
            self: false,
            ack: true // Enable acknowledgments
          } 
        }
      })

      channelRef.current = channel

      // Handle box synchronization events
      channel.on('broadcast', { event: 'box-sync' }, ({ payload }) => {
        if (payload.userId === userId) return // Skip own broadcasts
        
        console.log('[BoxSyncChannel] Box sync received', {
          fromUser: payload.userId,
          created: payload.created?.length || 0,
          updated: payload.updated?.length || 0,
          deleted: payload.deleted?.length || 0
        })

        if (onBoxSync) {
          onBoxSync(payload)
        }
      })

      // Handle heartbeat events
      channel.on('broadcast', { event: 'box-heartbeat' }, ({ payload }) => {
        handleHeartbeat(payload)
      })

      // Handle connection status events
      channel.on('broadcast', { event: 'connection-status' }, ({ payload }) => {
        if (payload.userId !== userId) {
          setActiveConnections(payload.totalConnections || 0)
          console.log('[BoxSyncChannel] Connection status update', payload)
        }
      })

      // Handle presence events for connection tracking
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const connections = Object.values(state).flat()
        setActiveConnections(connections.length)
        
        console.log('[BoxSyncChannel] Presence sync', {
          totalConnections: connections.length,
          connections: connections.map(c => ({ userId: c.userId, connectionId: c.connectionId }))
        })
      })

      channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[BoxSyncChannel] New connections joined', newPresences)
        setActiveConnections(prev => prev + newPresences.length)
      })

      channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[BoxSyncChannel] Connections left', leftPresences)
        setActiveConnections(prev => Math.max(0, prev - leftPresences.length))
      })

      // Subscribe to channel
      const subscription = await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          connectionStateRef.current.isConnected = true
          setConnectionStatus('connected')
          connectionStateRef.current.reconnectAttempts = 0

          console.log('[BoxSyncChannel] Connected successfully', {
            connectionId,
            channelName
          })

          // Track presence
          await channel.track({
            userId,
            connectionId,
            joinedAt: new Date().toISOString(),
            status: 'active'
          })

          // Send initial connection status
          broadcastConnectionStatus()

          if (onConnectionChange) {
            onConnectionChange('connected', { connectionId, latency: 0 })
          }

          // Start heartbeat interval
          const heartbeatTimer = setInterval(sendHeartbeat, heartbeatInterval)
          
          // Store cleanup function
          connectionStateRef.current.cleanup = () => {
            clearInterval(heartbeatTimer)
          }

        } else if (status === 'CHANNEL_ERROR') {
          handleConnectionError(new Error('Channel subscription failed'))
        }
      })

      return subscription

    } catch (error) {
      console.error('[BoxSyncChannel] Connection failed:', error)
      handleConnectionError(error)
      throw error
    }
  }, [noteId, userId, onBoxSync, onConnectionChange, heartbeatInterval, generateConnectionId, sendHeartbeat, handleHeartbeat])

  // Broadcast connection status to all participants
  const broadcastConnectionStatus = useCallback(() => {
    if (!channelRef.current || !connectionStateRef.current.isConnected) return

    const statusPayload = {
      type: 'connection-status',
      connectionId: connectionStateRef.current.connectionId,
      userId,
      noteId,
      totalConnections: activeConnections,
      timestamp: Date.now()
    }

    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'connection-status',
        payload: statusPayload
      })
    } catch (error) {
      console.error('[BoxSyncChannel] Failed to broadcast connection status:', error)
    }
  }, [userId, noteId, activeConnections])

  // Send box synchronization data
  const sendBoxSync = useCallback(async (boxSyncData) => {
    if (!channelRef.current || !connectionStateRef.current.isConnected) {
      throw new Error('Not connected to box sync channel')
    }

    const startTime = performance.now()
    
    try {
      const syncPayload = {
        ...boxSyncData,
        connectionId: connectionStateRef.current.connectionId,
        timestamp: Date.now(),
        latency: latency
      }

      await channelRef.current.send({
        type: 'broadcast',
        event: 'box-sync',
        payload: syncPayload
      })

      const sendTime = performance.now() - startTime
      console.log('[BoxSyncChannel] Box sync sent', {
        sendTime: sendTime.toFixed(2),
        changes: (boxSyncData.created?.length || 0) + 
                 (boxSyncData.updated?.length || 0) + 
                 (boxSyncData.deleted?.length || 0)
      })

      return { success: true, sendTime }

    } catch (error) {
      console.error('[BoxSyncChannel] Failed to send box sync:', error)
      throw error
    }
  }, [latency])

  // Handle connection errors
  const handleConnectionError = useCallback((error) => {
    console.error('[BoxSyncChannel] Connection error:', error)
    
    connectionStateRef.current.isConnected = false
    setConnectionStatus('error')
    setLastSyncError(error.message)

    if (onConnectionChange) {
      onConnectionChange('error', { error: error.message })
    }

    // Attempt reconnection
    if (connectionStateRef.current.reconnectAttempts < maxReconnectAttempts) {
      connectionStateRef.current.reconnectAttempts++
      
      console.log('[BoxSyncChannel] Attempting reconnection', {
        attempt: connectionStateRef.current.reconnectAttempts,
        maxAttempts: maxReconnectAttempts
      })

      setTimeout(() => {
        disconnect()
        connect()
      }, reconnectInterval * Math.pow(2, connectionStateRef.current.reconnectAttempts - 1))
    } else {
      setConnectionStatus('failed')
      console.error('[BoxSyncChannel] Max reconnection attempts reached')
    }
  }, [onConnectionChange, maxReconnectAttempts, reconnectInterval])

  // Disconnect from the channel
  const disconnect = useCallback(async () => {
    if (connectionStateRef.current.cleanup) {
      connectionStateRef.current.cleanup()
      connectionStateRef.current.cleanup = null
    }

    if (channelRef.current) {
      try {
        await channelRef.current.untrack()
        await channelRef.current.unsubscribe()
      } catch (error) {
        console.error('[BoxSyncChannel] Error during disconnect:', error)
      }
      
      channelRef.current = null
    }

    connectionStateRef.current.isConnected = false
    connectionStateRef.current.connectionId = null
    setConnectionStatus('disconnected')
    setLatency(0)
    setActiveConnections(0)

    if (onConnectionChange) {
      onConnectionChange('disconnected', {})
    }

    console.log('[BoxSyncChannel] Disconnected')
  }, [onConnectionChange])

  // Get current connection status
  const getConnectionStatus = useCallback(() => {
    return {
      status: connectionStatus,
      isConnected: connectionStateRef.current.isConnected,
      connectionId: connectionStateRef.current.connectionId,
      latency,
      activeConnections,
      reconnectAttempts: connectionStateRef.current.reconnectAttempts
    }
  }, [connectionStatus, latency, activeConnections])

  // Add connection event listener
  const addConnectionListener = useCallback((listener) => {
    connectionStateRef.current.subscribers.add(listener)
    
    return () => {
      connectionStateRef.current.subscribers.delete(listener)
    }
  }, [])

  // Notify connection listeners
  const notifyConnectionListeners = useCallback((event, data) => {
    connectionStateRef.current.subscribers.forEach(listener => {
      try {
        listener(event, data)
      } catch (error) {
        console.error('[BoxSyncChannel] Error in connection listener:', error)
      }
    })
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (noteId && userId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [noteId, userId, connect, disconnect])

  // Monitor connection health
  useEffect(() => {
    if (!connectionStateRef.current.isConnected) return

    const healthCheck = setInterval(() => {
      const now = Date.now()
      const timeSinceLastHeartbeat = now - connectionStateRef.current.lastHeartbeat
      
      if (timeSinceLastHeartbeat > heartbeatInterval * 2) {
        console.warn('[BoxSyncChannel] Connection health check failed')
        handleConnectionError(new Error('Connection timeout'))
      }
    }, heartbeatInterval)

    return () => {
      clearInterval(healthCheck)
    }
  }, [connectionStateRef.current.isConnected, heartbeatInterval])

  return {
    // Connection management
    connect,
    disconnect,
    sendBoxSync,
    
    // Status and metrics
    getConnectionStatus,
    connectionStatus,
    latency,
    activeConnections,
    
    // Event listeners
    addConnectionListener,
    
    // Connection state
    isConnected: connectionStateRef.current.isConnected,
    connectionId: connectionStateRef.current.connectionId
  }
}