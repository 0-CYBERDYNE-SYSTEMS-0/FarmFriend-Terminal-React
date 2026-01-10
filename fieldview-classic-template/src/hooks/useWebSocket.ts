// WebSocket hook for managing terminal connections
import { useState, useEffect, useRef, useCallback } from 'react'
import type { WebClientMessage, WebServerMessage } from '@/store/types'

interface UseWebSocketOptions {
  sessionId?: string
  onMessage?: (message: WebServerMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

export function useWebSocket({
  sessionId = 'main',
  onMessage,
  onConnect,
  onDisconnect,
  onError
}: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    setIsConnecting(true)
    const wsUrl = `ws://localhost:8080/ws/terminal/${sessionId}`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      
      ws.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        onConnect?.()
      }
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WebServerMessage
          onMessage?.(msg)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      ws.onclose = () => {
        setIsConnected(false)
        setIsConnecting(false)
        onDisconnect?.()
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }
      
      ws.onerror = (error) => {
        setIsConnecting(false)
        onError?.(error)
      }
      
    } catch (error) {
      setIsConnecting(false)
      console.error('Failed to connect WebSocket:', error)
    }
  }, [sessionId, onConnect, onDisconnect, onError, onMessage])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  const send = useCallback((message: WebClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    isConnecting,
    send,
    disconnect,
    reconnect: connect
  }
}