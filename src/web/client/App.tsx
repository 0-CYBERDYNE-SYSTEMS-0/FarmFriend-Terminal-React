import { useState, useEffect, useRef, useCallback } from 'react'
import { Markdown } from './components/Markdown'
import { ArtifactPreview } from './components/ArtifactPreview'
import { FileUpload } from './components/FileUpload'
import { ConsoleEventLog } from './components/ConsoleEventLog'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

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
  metadata?: any
}

type GatewayChannelStatus = {
  name: string
  enabled: boolean
  running: boolean
  healthy: boolean
  last_error?: string
  details?: Record<string, unknown>
}

type GatewayStatusReport = {
  timestamp: string
  workspace_dir: string
  channels: GatewayChannelStatus[]
}

type ControlOverview = {
  timestamp: string
  workspace_dir: string
  gateway?: GatewayStatusReport | null
  scheduler: {
    task_count: number
    enabled_count: number
    next_run_at: number | null
  }
  health: {
    ok: boolean
    issues: Array<{ type?: string; severity?: string; message?: string; path?: string }>
  }
  contract: {
    files: Array<{ name: string; exists: boolean }>
  }
}

type SchedulerTask = {
  id: string
  name: string
  enabled: boolean
  next_run_at?: number
  last_run?: { started_at: string; finished_at?: string; ok?: boolean; error?: string }
  schedule: { schedule_type: string }
}

const DEFAULT_SESSION = 'main'

function resolveWsUrl(sessionId: string): string {
  if (typeof window === 'undefined') {
    return `ws://127.0.0.1:8787/ws/terminal/${sessionId}`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/ws/terminal/${sessionId}`
}

async function fetchJson<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, { headers })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `Request failed: ${res.status}`)
  }
  return await res.json()
}

function formatNextRun(ts?: number | null): string {
  if (!ts) return 'Not scheduled'
  const date = new Date(ts * 1000)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString()
}

function useControlOverview(refreshMs = 15000) {
  const [data, setData] = useState<ControlOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        const payload = await fetchJson<ControlOverview>('/api/control/overview')
        if (!active) return
        setData(payload)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const timer = setInterval(load, refreshMs)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [refreshMs])

  return { data, error, loading }
}

function useControlData<T>(path: string, token: string, refreshMs = 20000) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        const payload = await fetchJson<T>(path, token)
        if (!active) return
        setData(payload)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const timer = refreshMs > 0 ? setInterval(load, refreshMs) : null
    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [path, token, refreshMs])

  return { data, error, loading }
}

// Detect if content is an artifact (HTML, JSON, image, etc.)
function detectContentType(content: string): 'artifact' | 'markdown' | 'text' {
  const trimmed = content.trim()
  const lower = trimmed.toLowerCase()
  const htmlSignal = /<(html|head|body|style|script|svg|canvas|iframe|table|div|section|article|main|header|footer|nav|form)\b/i

  // HTML artifact
  if (
    lower.startsWith('<!doctype html>') ||
    lower.startsWith('<html') ||
    (trimmed.startsWith('<') && htmlSignal.test(trimmed.slice(0, 200)))
  ) {
    return 'artifact'
  }

  // JSON artifact (only if it's a complete JSON object/array)
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
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
  const { theme } = useTheme();

  if (role === 'user') {
    return <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${theme.user}`}>{content}</p>
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

  // Assistant and system messages with themed colors
  const colorClass = role === 'assistant' ? theme.assistant :
                     role === 'error' ? theme.error :
                     role === 'system' ? theme.system :
                     theme.assistant;

  return <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${colorClass}`}>{content}</p>
}

function AppContent({ layout = 'full' }: { layout?: 'full' | 'embedded' }) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [assistantContent, setAssistantContent] = useState('')
  const lastChunkAtRef = useRef<number | null>(null)
  const turnStartedAtRef = useRef<number | null>(null)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [messageAddedForTurn, setMessageAddedForTurn] = useState(false)
  const [showConsole, setShowConsole] = useState(false)
  const [consoleEvents, setConsoleEvents] = useState<ConsoleEvent[]>([])
  const [isMobile, setIsMobile] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Streaming optimization: buffer content and update smoothly
  const streamBufferRef = useRef<string>('')
  const streamRafRef = useRef<number | null>(null)

  // Detect mobile/tablet vs desktop for console layout
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768) // Mobile breakpoint
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Auto-scroll only if user is near bottom
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, assistantContent, scrollToBottom])

  // WebSocket connection
  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(resolveWsUrl(DEFAULT_SESSION))
        wsRef.current = ws

        ws.onopen = () => {
          setIsConnected(true)
          console.log('Connected to FarmFriend Terminal')
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data) as WebSocketMessage

          // Add to console event log (skip streaming response chunks)
          if (msg.type !== 'response') {
            setConsoleEvents((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${msg.type}`,
                type: msg.type,
                content: 'content' in msg ? (msg.content || '') : '',
                timestamp: Date.now(),
                metadata: 'metadata' in msg ? msg.metadata : undefined
              }
            ])
          }

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
              // Accumulate streaming content with smooth batching
              lastChunkAtRef.current = Date.now()
              streamBufferRef.current += msg.content

              // Cancel any pending RAF and schedule a new one for smooth updates
              if (streamRafRef.current !== null) {
                cancelAnimationFrame(streamRafRef.current)
              }

              streamRafRef.current = requestAnimationFrame(() => {
                setAssistantContent(streamBufferRef.current)
                streamRafRef.current = null
              })
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
              lastChunkAtRef.current = null
              turnStartedAtRef.current = null
              setIsProcessing(false)
              break

            case 'command_received':
              turnStartedAtRef.current = Date.now()
              lastChunkAtRef.current = Date.now()
              setIsProcessing(true)
              break

            case 'turn_finished':
              // Finalize any pending content using functional update to avoid stale closure
              const finalContent = streamBufferRef.current
              setAssistantContent(prevContent => {
                const content = finalContent || prevContent
                if (content && !messageAddedForTurn) {
                  setMessages(messages => [...messages, {
                    id: `${Date.now()}-assistant`,
                    role: 'assistant',
                    content: content,
                    timestamp: msg.timestamp * 1000
                  }])
                  setMessageAddedForTurn(true)

                  // Add complete response to console events
                  setConsoleEvents((prev) => [
                    ...prev,
                    {
                      id: `${Date.now()}-response-complete`,
                      type: 'response',
                      content: content,
                      timestamp: Date.now()
                    }
                  ])
                }
                streamBufferRef.current = '' // Clear buffer
                return ''  // Always clear assistantContent
              })
              lastChunkAtRef.current = null
              turnStartedAtRef.current = null
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
    if (!isProcessing) return

    const interval = setInterval(() => {
      const lastChunkAt = lastChunkAtRef.current
      if (!lastChunkAt) return

      const idleMs = Date.now() - lastChunkAt
      if (idleMs < 20000) return

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
        lastChunkAtRef.current = null
        turnStartedAtRef.current = null
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [assistantContent, isProcessing, messageAddedForTurn])

  const sendMessage = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed && attachments.length === 0) return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    // Reset flag for new turn and clear stream buffer
    setMessageAddedForTurn(false)
    streamBufferRef.current = ''
    setAssistantContent('')

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

  const consoleVisible = layout === 'full' && showConsole

  return (
    <div className={`flex flex-col ${layout === 'full' ? 'h-screen bg-neutral-950' : 'h-full bg-neutral-900/60'} text-neutral-100 ${layout === 'embedded' ? 'rounded-xl border border-neutral-800/80' : ''}`}>
      {/* Header */}
      {layout === 'full' && (
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-neutral-100">FarmFriend Terminal</h1>
            <span className="text-sm text-neutral-500">Operations console</span>
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
                  ? 'bg-gradient-to-r from-emerald-600 to-lime-500 text-white shadow-lg shadow-emerald-500/25'
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
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto px-4 py-6 relative ${isMobile && consoleVisible ? 'mb-[calc(45vh+6rem)]' : ''}`}>
        {consoleVisible && !isMobile ? (
          // Desktop: Side-by-side layout
          <div className="flex h-full gap-4">
            {/* Chat view */}
            <div className="flex-1">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-neutral-500 py-20">
                    <p className="text-lg mb-2">Welcome to FarmFriend Terminal</p>
                    <p className="text-sm">Ask about today’s work, field notes, or schedules</p>
                  </div>
                )}

                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary-600 px-4 py-2'
                      : msg.role === 'error'
                        ? 'bg-red-900/50 border border-red-800 px-4 py-2'
                      : msg.role === 'system'
                        ? 'text-sm bg-transparent px-0 py-1'
                      : msg.role === 'thinking'
                        ? 'bg-transparent px-0 py-0 w-full'
                        : 'bg-neutral-800 px-4 py-2'
                    }`}>
                      {msg.role === 'thinking' && (
                        <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <span>💭</span>
                          <span>Thinking</span>
                        </div>
                      )}
                      <MessageContent content={msg.content} role={msg.role} />
                    </div>
                  </div>
                ))}

                {assistantContent && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-neutral-800">
                      <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${theme.assistant}`}>
                        {assistantContent}
                        <span className={`inline-block w-2 h-4 ml-1 animate-pulse ${theme.spinner}`} />
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Desktop Console panel */}
            <div className="w-96 min-w-0">
              <ConsoleEventLog
                events={consoleEvents}
                onClear={() => setConsoleEvents([])}
              />
            </div>
          </div>
        ) : (
          // Mobile & Chat-only: Full-width chat view
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-neutral-500 py-20">
                <p className="text-lg mb-2">Welcome to FarmFriend Terminal</p>
                <p className="text-sm">Ask about today’s work, field notes, or schedules</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary-600 px-4 py-2'
                      : msg.role === 'error'
                      ? 'bg-red-900/50 border border-red-800 px-4 py-2'
                      : msg.role === 'system'
                      ? 'text-sm bg-transparent px-0 py-1'
                      : msg.role === 'thinking'
                        ? 'bg-transparent px-0 py-0 w-full'
                        : 'bg-neutral-800 px-4 py-2'
                  }`}
                >
                  {msg.role === 'thinking' && (
                    <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <span>💭</span>
                      <span>Thinking</span>
                    </div>
                  )}
                  <MessageContent content={msg.content} role={msg.role} />
                </div>
              </div>
            ))}

            {assistantContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-neutral-800">
                  <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${theme.assistant}`}>
                    {assistantContent}
                    <span className={`inline-block w-2 h-4 ml-1 animate-pulse ${theme.spinner}`} />
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Mobile Console Drawer */}
        {isMobile && consoleVisible && (
          <div className="fixed inset-x-0 bottom-0 z-40 bg-neutral-900 border-t border-neutral-800 rounded-t-2xl shadow-2xl animate-slide-up h-[45vh] flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <h3 className="text-sm font-semibold text-neutral-100">Console Events</h3>
              </div>
              <button
                onClick={() => setShowConsole(false)}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                aria-label="Close console"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-hidden min-h-0">
              <ConsoleEventLog
                events={consoleEvents}
                onClear={() => setConsoleEvents([])}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`border-t border-neutral-800 bg-neutral-900/50 backdrop-blur ${isMobile && consoleVisible ? 'fixed bottom-[45vh] left-0 right-0 z-50' : ''}`}>
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

function FieldView({ showControl, onOpenControl, onOpenChat }: { showControl: boolean; onOpenControl: () => void; onOpenChat: () => void }) {
  const { data, loading, error } = useControlOverview()
  const channels = data?.gateway?.channels ?? []
  const healthyCount = channels.filter((c) => c.healthy && c.enabled).length
  const unhealthy = channels.filter((c) => c.enabled && !c.healthy)
  const contractFiles = data?.contract?.files ?? []
  const contractCoverage = contractFiles.length
    ? Math.round((contractFiles.filter((f) => f.exists).length / contractFiles.length) * 100)
    : 0

  return (
    <div className="min-h-screen fieldview-shell text-slate-900">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.25em] text-emerald-700">FarmFriend FieldView</span>
          <h1 className="text-3xl md:text-4xl font-semibold fieldview-title">Today on the farm</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenChat}
            className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold shadow-sm shadow-emerald-600/30 hover:bg-emerald-700 transition"
          >
            Open Chat
          </button>
          {showControl && (
            <button
              onClick={onOpenControl}
              className="px-4 py-2 rounded-full border border-emerald-700/40 text-emerald-900 text-sm font-semibold hover:bg-emerald-100 transition"
            >
              Control Barn
            </button>
          )}
        </div>
      </header>

      <main className="px-6 pb-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="field-card">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-emerald-900">Morning briefing</h2>
                <span className="text-xs text-emerald-700">{new Date().toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-sm text-emerald-900/80">
                Start with what matters: check connectivity, review tasks, then send the daily update to your team.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="px-3 py-1.5 rounded-full bg-amber-200 text-amber-900 text-xs font-semibold">
                  Draft daily update
                </button>
                <button className="px-3 py-1.5 rounded-full bg-emerald-200 text-emerald-900 text-xs font-semibold">
                  Review schedule
                </button>
                <button className="px-3 py-1.5 rounded-full bg-rose-200 text-rose-900 text-xs font-semibold">
                  Report an issue
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="field-card">
                <h3 className="text-sm font-semibold text-emerald-900">Connectivity</h3>
                {loading && <p className="text-xs text-emerald-700 mt-2">Checking gateway...</p>}
                {!loading && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-emerald-800">
                      {healthyCount}/{channels.length || 0} channels healthy
                    </p>
                    {channels.length === 0 && <p className="text-emerald-700">No channels configured yet.</p>}
                    {unhealthy.map((ch) => (
                      <p key={ch.name} className="text-rose-700">
                        {ch.name}: {ch.last_error || 'Needs attention'}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="field-card">
                <h3 className="text-sm font-semibold text-emerald-900">Automation</h3>
                <div className="mt-3 text-sm text-emerald-800">
                  <p>Scheduled tasks: {data?.scheduler?.enabled_count ?? 0}</p>
                  <p className="text-xs text-emerald-700 mt-1">Next run: {formatNextRun(data?.scheduler?.next_run_at)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="field-card">
                <h3 className="text-sm font-semibold text-emerald-900">Workspace readiness</h3>
                <div className="mt-3 text-sm text-emerald-800">
                  <p>{contractCoverage}% of contract files present</p>
                  <p className="text-xs text-emerald-700 mt-1">Operator notes and memory stay consistent.</p>
                </div>
              </div>

              <div className="field-card">
                <h3 className="text-sm font-semibold text-emerald-900">Health alerts</h3>
                <div className="mt-3 text-sm text-emerald-800">
                  {error && <p className="text-rose-700">{error}</p>}
                  {!error && (
                    <p>{data?.health?.ok ? 'All systems normal.' : `${data?.health?.issues?.length || 0} issues need review.`}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="field-card field-chat">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-neutral-100">Field chat</h2>
                <p className="text-xs text-neutral-400">Quick questions, quick answers.</p>
              </div>
              <span className="text-xs text-neutral-400">{DEFAULT_SESSION}</span>
            </div>
            <div className="h-[70vh] min-h-[480px]">
              <AppContent layout="embedded" />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function ControlBarn({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState(() => localStorage.getItem('ff-control-token') || '')
  const [configText, setConfigText] = useState('')
  const [configStatus, setConfigStatus] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('ff-control-token', token)
  }, [token])

  const gateway = useControlData<GatewayStatusReport>('/api/control/gateway/status', token, 8000)
  const health = useControlData<{ ok: boolean; issues: Array<{ message?: string }> }>('/api/control/health', token, 15000)
  const scheduler = useControlData<{ tasks: SchedulerTask[] }>('/api/control/scheduler/tasks', token, 15000)
  const contract = useControlData<{ snapshot: Record<string, string | undefined> }>('/api/control/workspace/contract', token, 30000)
  const gatewayLogs = useControlData<{ events: any[] }>('/api/control/logs/gateway?limit=60', token, 12000)
  const schedulerLogs = useControlData<{ events: any[] }>('/api/control/logs/scheduler?limit=60', token, 12000)
  const config = useControlData<{ path: string; authorized: boolean; config: any }>('/api/control/config', token, 0)

  useEffect(() => {
    if (config.data?.config) {
      setConfigText(JSON.stringify(config.data.config, null, 2))
    }
  }, [config.data])

  const saveConfig = async () => {
    try {
      setConfigStatus('Saving...')
      const parsed = JSON.parse(configText || '{}')
      const res = await fetch('/api/control/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ config: parsed })
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      setConfigStatus('Saved. Restart the daemon to apply changes.')
    } catch (err) {
      setConfigStatus(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="min-h-screen controlbarn-shell text-slate-100">
      <header className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Control Barn</p>
          <h1 className="text-3xl font-semibold">Admin configuration</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Control token"
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200"
          />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-slate-700 text-slate-100 text-sm font-semibold hover:bg-slate-600 transition"
          >
            Back to FieldView
          </button>
        </div>
      </header>

      <main className="px-6 py-8 grid gap-6 lg:grid-cols-3">
        <section className="control-card">
          <h2 className="text-sm font-semibold text-slate-200">Gateway</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {gateway.loading && <p>Loading status...</p>}
            {gateway.error && <p className="text-rose-300">{gateway.error}</p>}
            {gateway.data?.channels?.map((ch) => (
              <div key={ch.name} className="flex items-center justify-between">
                <span>{ch.name}</span>
                <span className={`${ch.healthy ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {ch.enabled ? (ch.healthy ? 'healthy' : 'unhealthy') : 'disabled'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="control-card">
          <h2 className="text-sm font-semibold text-slate-200">Scheduler</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {scheduler.loading && <p>Loading tasks...</p>}
            {scheduler.error && <p className="text-rose-300">{scheduler.error}</p>}
            {scheduler.data?.tasks?.length === 0 && <p>No scheduled tasks</p>}
            {scheduler.data?.tasks?.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between">
                <span>{task.name}</span>
                <span className="text-xs text-slate-400">{formatNextRun(task.next_run_at)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="control-card">
          <h2 className="text-sm font-semibold text-slate-200">Health</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {health.loading && <p>Checking health...</p>}
            {health.error && <p className="text-rose-300">{health.error}</p>}
            {health.data?.ok && <p className="text-emerald-300">All clear</p>}
            {!health.data?.ok && health.data?.issues?.map((issue, idx) => (
              <p key={idx} className="text-amber-300">{issue.message || 'Issue detected'}</p>
            ))}
          </div>
        </section>

        <section className="control-card lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-200">Workspace contract</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-slate-300">
            {Object.entries(contract.data?.snapshot || {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                <span>{key.replace('.md', '')}</span>
                <span className={value ? 'text-emerald-300' : 'text-rose-300'}>
                  {value ? 'ok' : 'missing'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="control-card">
          <h2 className="text-sm font-semibold text-slate-200">Config</h2>
          <p className="text-xs text-slate-400 mt-1">{config.data?.path || 'config.json'}</p>
          <textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            className="mt-3 w-full h-48 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 p-3 font-mono"
          />
          <button
            onClick={saveConfig}
            className="mt-3 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
          >
            Save Config
          </button>
          {configStatus && <p className="mt-2 text-xs text-slate-400">{configStatus}</p>}
        </section>

        <section className="control-card lg:col-span-3">
          <h2 className="text-sm font-semibold text-slate-200">Logs</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2 text-xs text-slate-300">
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
              <h3 className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Gateway</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {gatewayLogs.data?.events?.slice(-20).map((evt, idx) => (
                  <div key={idx} className="text-slate-400">{JSON.stringify(evt)}</div>
                ))}
              </div>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
              <h3 className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Scheduler</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {schedulerLogs.data?.events?.slice(-20).map((evt, idx) => (
                  <div key={idx} className="text-slate-400">{JSON.stringify(evt)}</div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

// Wrap with ThemeProvider
export default function App() {
  const [view, setView] = useState<'field' | 'control' | 'chat'>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash.includes('control')) return 'control'
    if (hash.includes('chat')) return 'chat'
    return 'field'
  })
  const [controlUnlocked, setControlUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') === '1') return true
    return localStorage.getItem('ff-control-unlock') === 'true'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') === '1') {
      localStorage.setItem('ff-control-unlock', 'true')
      setControlUnlocked(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.location.hash = view === 'field' ? '' : `#${view}`
  }, [view])

  return (
    <ThemeProvider>
      {view === 'field' && (
        <FieldView
          showControl={controlUnlocked}
          onOpenControl={() => setView('control')}
          onOpenChat={() => setView('chat')}
        />
      )}
      {view === 'control' && <ControlBarn onClose={() => setView('field')} />}
      {view === 'chat' && <AppContent layout="full" />}
    </ThemeProvider>
  )
}
