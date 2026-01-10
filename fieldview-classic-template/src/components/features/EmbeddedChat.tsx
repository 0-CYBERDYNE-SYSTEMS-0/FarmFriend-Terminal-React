// Embedded chat component template
// This handles WebSocket connection and message display

import { useState, useEffect, useRef } from 'react'
import { type ChatMessage, type FileAttachment } from '@/store/types'
import { Markdown } from '@/components/ui/Markdown'

interface EmbeddedChatProps {
  layout?: 'full' | 'embedded'
  sessionId?: string
}

export function EmbeddedChat({ layout = 'embedded', sessionId = 'main' }: EmbeddedChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const wsRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // WebSocket connection logic (template)
  useEffect(() => {
    const wsUrl = `ws://localhost:8080/ws/terminal/${sessionId}`
    
    function connect() {
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        setIsConnected(true)
        console.log('Connected to WebSocket')
      }
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      }
      
      ws.onclose = () => {
        setIsConnected(false)
        setTimeout(connect, 3000) // Auto-reconnect
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }
      
      wsRef.current = ws
    }
    
    connect()
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [sessionId])

  const handleMessage = (msg: any) => {
    switch (msg.type) {
      case 'response':
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: msg.content,
          timestamp: msg.timestamp * 1000
        }])
        break
        
      case 'thinking':
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'thinking',
          content: msg.content,
          timestamp: msg.timestamp * 1000
        }])
        break
        
      case 'tool_call':
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'tool',
          content: msg.content,
          timestamp: msg.timestamp * 1000,
          toolName: msg.tool_name
        }])
        break
        
      case 'error':
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'error',
          content: msg.content,
          timestamp: msg.timestamp * 1000
        }])
        break
        
      case 'system':
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'system',
          content: msg.content,
          timestamp: msg.timestamp * 1000
        }])
        break
    }
  }

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current?.readyState === 1) return
    
    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: Date.now()
    }
    
    setMessages(prev => [...prev, userMsg])
    
    wsRef.current.send(JSON.stringify({
      type: 'command',
      data: { command: input }
    }))
    
    setInput('')
    setIsProcessing(true)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const containerClass = layout === 'embedded' 
    ? 'h-[70vh] min-h-[480px]'
    : 'h-[calc(100vh-120px)]'

  return (
    <div className={`bg-slate-900 rounded-lg ${containerClass} flex flex-col`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="mb-4">
            <div className={`flex items-start gap-2 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}>
              <span className={`text-xs px-2 py-1 rounded ${
                message.role === 'user' ? 'bg-blue-600 text-white' :
                message.role === 'assistant' ? 'bg-green-600 text-white' :
                message.role === 'thinking' ? 'bg-purple-600 text-white' :
                message.role === 'tool' ? 'bg-yellow-600 text-white' :
                message.role === 'error' ? 'bg-red-600 text-white' :
                'bg-gray-600 text-white'
              }`}>
                {message.role}
                {message.toolName && `: ${message.toolName}`}
              </span>
              <div className={`flex-1 ${
                message.role === 'user' ? 'text-right' : ''
              }`}>
                <div className={`inline-block max-w-md p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-100'
                }`}>
                  {message.role === 'thinking' ? (
                    <div className="message-thinking">
                      <Markdown content={message.content} />
                    </div>
                  ) : (
                    <Markdown content={message.content} />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-gray-400">
            <span className="animate-pulse">●</span>
            <span>Processing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your command..."
            className="flex-1 px-4 py-2 bg-gray-800 text-gray-100 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          {isConnected ? 'Connected' : 'Connecting...'} | Press Enter to send
        </div>
      </div>
    </div>
  )
}