// Enhanced Embedded Chat with Artifact Support
import { useState, useEffect, useRef } from 'react'
import { type ChatMessage, type FileAttachment } from '@/store/types'
import { Markdown } from '@/components/ui/Markdown'
import { buildWsUrls } from '@/utils/ws'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Artifact management disabled in chat UI

  useEffect(() => {
    function connect() {
      const wsUrls = buildWsUrls(sessionId)
      const tryConnect = (index: number) => {
        const wsUrl = wsUrls[index]
        let opened = false
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          opened = true
          setIsConnected(true)
          console.log('Connected to WebSocket')
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data)
          handleMessage(msg)
        }

        ws.onclose = () => {
          if (!opened && index + 1 < wsUrls.length) {
            tryConnect(index + 1)
            return
          }
          setIsConnected(false)
          setTimeout(connect, 3000)
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setIsConnected(false)
        }

        wsRef.current = ws
      }

      tryConnect(0)
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
        // Accumulate streaming chunks into the last assistant message
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]

          // If last message is from assistant, update it with streaming content
          if (lastMessage && lastMessage.role === 'assistant') {
            const updatedContent = msg.content.startsWith(lastMessage.content)
              ? msg.content
              : lastMessage.content + msg.content
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: updatedContent
              }
            ]
          }

          // Otherwise create new assistant message
          return [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: msg.content,
            timestamp: msg.timestamp * 1000
          }]
        })
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

      case 'command_received':
        setIsProcessing(true)
        break

      case 'turn_finished':
        setIsProcessing(false)
        break
    }
  }

  const sendMessage = () => {
    if (!input.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return

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
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    const attachments: FileAttachment[] = []
    
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result
        if (typeof result === 'string') {
          attachments.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: result
          })
        }
      }
      reader.readAsDataURL(file)
    }
    
    // Send attachments with next message
    setTimeout(() => {
      if (attachments.length > 0) {
        wsRef.current.send(JSON.stringify({
          type: 'command',
          data: { 
            command: input,
            files: attachments 
          }
        }))
      }
    }, 100)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const containerClass = layout === 'embedded' 
    ? 'h-[70vh] min-h-[480px]'
    : 'h-[calc(100vh-120px)]'

  return (
    <div className={`bg-slate-900 rounded-lg ${containerClass} flex`}>
      {/* Messages and Input */}
      <div className="flex-1 flex flex-col">
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
          
          {/* Show artifacts toggle if hidden and artifacts exist */}
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
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.js,.ts,.py,.java,.cpp,.c,.html,.css,.json,.xml,.sql"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded transition-colors"
              title="Attach files"
            >
              📎
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your command or attach files..."
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
            {isConnected ? 'Connected' : 'Connecting...'} | Press Enter to send | Max 25MB per file
          </div>
        </div>
      </div>
    </div>
  )
}
