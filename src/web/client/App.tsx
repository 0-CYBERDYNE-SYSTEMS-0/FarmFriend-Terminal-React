import { useState, useEffect, useRef, useCallback } from 'react'
import { Markdown } from './components/Markdown'
import { ArtifactPreview } from './components/ArtifactPreview'
import { FileUpload } from './components/FileUpload'
import { ConsoleEventLog } from './components/ConsoleEventLog'

// Types for WebSocket messages
type WebSocketMessage =
  | { type: 'system'; content: string; session_id: string; timestamp: number }
  | { type: 'response'; content: string; session_id: string; timestamp: number }
  | { type: 'thinking'; content: string; session_id: string; timestamp: number }
  | { type: 'thinking_xml'; content: string; session_id: string; timestamp: number }
  | { type: 'tool_call'; tool_name: string; content: string; session_id: string; timestamp: number }
  | { type: 'error'; content: string; session_id: string; timestamp: number }
  | { type: 'pong'; session_id: string; timestamp: number }
  | { type: 'command_received'; content: string; session_id: string; timestamp: number }
  | { type: 'turn_finished'; session_id: string; timestamp: number }

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system' | 'error' | 'thinking'
  content: string
  timestamp: number
  toolName?: string
  attachments?: Array<{ name: string; type: string; size: number; data: string }>
}

type FileAttachment = {
  name: string
  type: string
  size: number
  data: string
}

type ConsoleEvent = {
  id: string
  type: string
  content: string
  timestamp: number
}

const DEFAULT_SESSION = 'default-session'
const WS_URL = `ws://127.0.0.1:8787/ws/terminal/${DEFAULT_SESSION}`

// Detect if content is an artifact (HTML, JSON, image, etc.)
function detectContentType(content: string): 'artifact' | 'markdown' | 'text' {
  const trimmed = content.trim()

  // HTML artifact
  if (trimmed.startsWith('<!DOCTYPE html>') || trimmed.startsWith('<html')) {
    return 'artifact'
  }

  // JSON artifact (only if it's a complete JSON object and fairly large)
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 100) {
    try {
      JSON.parse(trimmed)
      return 'artifact'
    } catch {
      // Not valid JSON
    }
  }

  // Image URL
  if (trimmed.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
    return 'artifact'
  }

  // Markdown detection (headers, code blocks, lists, etc.)
  const markdownPatterns = [
    /^#{1,6}\s+/m,           // Headers
    /```[\s\S]*```/,          // Code blocks
    /^\s*[-*+]\s+/m,          // Lists
    /^\s*\d+\.\s+/m,          // Numbered lists
    /\*\*.+?\*\*/,            // Bold
    /\[.+?\]\(.+?\)/,         // Links
  ]

  const hasMarkdown = markdownPatterns.some(pattern => pattern.test(content))
  if (hasMarkdown) {
    return 'markdown'
  }

  // Default to text
  return 'text'
}

// Message renderer component
function MessageContent({ content, role }: { content: string; role: string }) {
  if (role === 'user') {
    return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{content}</p>
  }

  // Handle thinking messages with special styling
  if (role === 'thinking') {
    return (
      <div className="message-thinking">
        <p className="mb-0 whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  const contentType = detectContentType(content)

  if (contentType === 'artifact') {
    return <ArtifactPreview content={content} />
  }

  if (contentType === 'markdown') {
    return <Markdown content={content} />
  }

  return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{content}</p>
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [assistantContent, setAssistantContent] = useState('')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [messageAddedForTurn, setMessageAddedForTurn] = useState(false)
  const [showConsole, setShowConsole] = useState(false)
  const [consoleEvents, setConsoleEvents] = useState<ConsoleEvent[]>([])

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

          // Always capture to console event log
          setConsoleEvents((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${msg.type}`,
              type: msg.type,
              content: 'content' in msg ? (msg.content || '') : '',
              timestamp: Date.now()
            }
          ])

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
              // Skip legacy thinking for cleaner UI
              break

            case 'thinking_xml':
              // Display XML-tagged thinking content with special styling
              setMessages(prev => [...prev, {
                id: `${Date.now()}-thinking`,
                role: 'thinking',
                content: msg.content,
                timestamp: msg.timestamp * 1000
              }])
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

            case 'turn_finished':
              // Finalize any pending content using functional update to avoid stale closure
              setAssistantContent(prevContent => {
                if (prevContent && !messageAddedForTurn) {
                  setMessages(messages => [...messages, {
                    id: `${Date.now()}-assistant`,
                    role: 'assistant',
                    content: prevContent,
                    timestamp: msg.timestamp * 1000
                  }])
                  setMessageAddedForTurn(true)
                }
                return ''  // Always clear assistantContent
              })
              setIsProcessing(false)
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

  // Fallback timeout for streaming detection (in case turn_finished is missed)
  useEffect(() => {
    if (!isProcessing || assistantContent === '') return

    const timeout = setTimeout(() => {
      if (assistantContent && !messageAddedForTurn) {
        setMessages(prev => [...prev, {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: assistantContent,
          timestamp: Date.now()
        }])
        setAssistantContent('')
        setIsProcessing(false)
        setMessageAddedForTurn(true)
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [assistantContent, isProcessing, messageAddedForTurn])

  const sendMessage = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed && attachments.length === 0) return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    // Reset flag for new turn
    setMessageAddedForTurn(false)

    // Build message with attachments
    let messageContent = trimmed
    if (attachments.length > 0) {
      const fileRefs = attachments.map(f => `[Attached: ${f.name} (${formatFileSize(f.size)})]`).join('\n')
      messageContent = fileRefs + (trimmed ? '\n\n' + trimmed : '')
    }

    // Add user message with attachments
    setMessages(prev => [...prev, {
      id: `${Date.now()}-user`,
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined
    }])

    // Send to server with file data embedded
    const commandData = attachments.length > 0
      ? { command: trimmed, files: attachments }
      : { command: trimmed }

    wsRef.current.send(JSON.stringify({
      type: 'command',
      data: commandData
    }))

    setInput('')
    setAttachments([])
  }, [input, attachments])

  const handleFilesSelected = useCallback((files: FileAttachment[]) => {
    setAttachments(prev => [...prev, ...files])
  }, [])

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

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
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-neutral-500">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${showConsole
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
              }
            `}
          >
            {showConsole ? (
              <span className="flex items-center gap-2">
                <span>⚡</span>
                <span>Console</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>💬</span>
                <span>Chat</span>
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {showConsole ? (
          <div className="flex h-full gap-4">
            {/* Chat view */}
            <div className="flex-1">
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
                  ? 'text-neutral-400 text-sm bg-transparent'
                  : msg.role === 'thinking'
                  ? 'bg-blue-900/30 text-blue-100 border-l-2 border-blue-500 italic'
                  : 'bg-neutral-800 text-neutral-100 w-full'
              }`}>
                <MessageContent content={msg.content} role={msg.role} />
              </div>
            </div>
          ))}

          {/* Streaming content - show as plain text, not markdown */}
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

            {/* Console panel */}
            <div className="w-96 min-w-0">
              <ConsoleEventLog
                events={consoleEvents}
                onClear={() => setConsoleEvents([])}
              />
            </div>
          </div>
        ) : (
          // Single column chat view
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-neutral-500 py-20">
                <p className="text-lg mb-2">Welcome to FF-Terminal</p>
                <p className="text-sm">Ask me anything about your code</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : msg.role === 'error'
                      ? 'bg-red-900/50 text-red-200 border border-red-800'
                      : msg.role === 'system'
                      ? 'text-neutral-400 text-sm bg-transparent'
                      : msg.role === 'thinking'
                      ? 'bg-blue-900/30 text-blue-100 border-l-2 border-blue-500 italic'
                      : 'bg-neutral-800 text-neutral-100 w-full'
                  }`}
                >
                  <MessageContent content={msg.content} role={msg.role} />
                </div>
              </div>
            ))}

            {/* Streaming content - show as plain text, not markdown */}
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
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <div className="max-w-3xl mx-auto p-4">
          {/* File attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded-lg text-sm"
                >
                  {/* Show image preview or file icon */}
                  {file.type.startsWith('image/') ? (
                    <img
                      src={file.data}
                      alt={file.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  )}
                  <span className="text-neutral-300 truncate max-w-[150px]">{file.name}</span>
                  <span className="text-neutral-500 text-xs">{formatFileSize(file.size)}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <FileUpload onFilesSelected={handleFilesSelected} disabled={!isConnected || isProcessing} />
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
              disabled={(!input.trim() && attachments.length === 0) || !isConnected || isProcessing}
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
            Press Enter to send, Shift+Enter for new line • Drag & drop files to attach
          </p>
        </div>
      </div>
    </div>
  )
}
