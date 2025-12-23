import { useState, useEffect, useRef, useCallback } from 'react'

// Types for WebSocket messages
type WebSocketMessage =
  | { type: 'system'; content: string; session_id: string; timestamp: number }
  | { type: 'response'; content: string; session_id: string; timestamp: number }
  | { type: 'thinking'; content: string; session_id: string; timestamp: number }
  | { type: 'tool_call'; tool_name: string; content: string; session_id: string; timestamp: number }
  | { type: 'error'; content: string; session_id: string; timestamp: number }
  | { type: 'pong'; session_id: string; timestamp: number }
  | { type: 'command_received'; content: string; session_id: string; timestamp: number }

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system' | 'error'
  content: string
  timestamp: number
  toolName?: string
}

const DEFAULT_SESSION = 'default-session'
const WS_URL = `ws://127.0.0.1:8787/ws/terminal/${DEFAULT_SESSION}`

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [assistantContent, setAssistantContent] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, assistantContent, scrollToBottom])

  // WebSocket connection
  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
          setIsConnected(true)
          console.log('Connected to FF-Terminal')
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data) as WebSocketMessage

          switch (msg.type) {
            case 'system':
              // Skip verbose system messages
              if (!msg.content.includes('Starting turn') &&
                  !msg.content.includes('Provider:') &&
                  !msg.content.includes('Model:')) {
                setMessages(prev => [...prev, {
                  id: `${Date.now()}-system`,
                  role: 'system',
                  content: msg.content,
                  timestamp: msg.timestamp * 1000
                }])
              }
              break

            case 'response':
              // Accumulate streaming content
              setAssistantContent(prev => prev + msg.content)
              break

            case 'thinking':
              // Skip thinking for cleaner UI
              break

            case 'tool_call':
              // Show tool execution
              setMessages(prev => [...prev, {
                id: `${Date.now()}-tool`,
                role: 'system',
                content: `Running: ${msg.tool_name}`,
                timestamp: msg.timestamp * 1000,
                toolName: msg.tool_name
              }])
              break

            case 'error':
              setMessages(prev => [...prev, {
                id: `${Date.now()}-error`,
                role: 'error',
                content: msg.content,
                timestamp: msg.timestamp * 1000
              }])
              setIsProcessing(false)
              break

            case 'command_received':
              setIsProcessing(true)
              break
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setIsConnected(false)
        }

        ws.onclose = () => {
          setIsConnected(false)
          setIsProcessing(false)
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 3000)
        }
      } catch (error) {
        console.error('Connection error:', error)
        setIsConnected(false)
      }
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  // Detect when streaming ends (no new content for 500ms)
  useEffect(() => {
    if (!isProcessing || assistantContent === '') return

    const timeout = setTimeout(() => {
      if (assistantContent) {
        setMessages(prev => [...prev, {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: assistantContent,
          timestamp: Date.now()
        }])
        setAssistantContent('')
        setIsProcessing(false)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [assistantContent, isProcessing])

  const sendMessage = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    // Add user message
    setMessages(prev => [...prev, {
      id: `${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now()
    }])

    // Send to server
    wsRef.current.send(JSON.stringify({
      type: 'command',
      data: { command: trimmed }
    }))

    setInput('')
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-neutral-100">FF-Terminal</h1>
          <span className="text-sm text-neutral-500">AI Development Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-neutral-500">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-neutral-500 py-20">
              <p className="text-lg mb-2">Welcome to FF-Terminal</p>
              <p className="text-sm">Ask me anything about your code</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : msg.role === 'error'
                  ? 'bg-red-900/50 text-red-200 border border-red-800'
                  : msg.role === 'system'
                  ? 'text-neutral-400 text-sm'
                  : 'bg-neutral-800 text-neutral-100'
              }`}>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}

          {/* Streaming content */}
          {assistantContent && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-neutral-800 text-neutral-100">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {assistantContent}
                  <span className="inline-block w-2 h-4 bg-primary-500 ml-1 animate-pulse" />
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Shift+Enter for new line)"
              className="flex-1 min-h-[44px] max-h-[200px] px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={1}
              disabled={!isConnected || isProcessing}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !isConnected || isProcessing}
              className="px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-lg text-sm font-medium transition-colors"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending
                </span>
              ) : (
                'Send'
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
