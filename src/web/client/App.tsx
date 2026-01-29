import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react'
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
  | { type: 'history'; content: string; session_id: string; timestamp: number }
  | { type: 'pong'; session_id: string; timestamp: number }
  | { type: 'command_received'; content: string; session_id: string; timestamp: number }
  | { type: 'turn_finished'; session_id: string; timestamp: number }

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system' | 'error' | 'thinking'
  content: string
  timestamp: number
  toolName?: string
  historyIndex?: number
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

const HISTORY_PAGE_SIZE = 200

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

type ControlOverviewState = {
  data: ControlOverview | null
  loading: boolean
  error: string | null
}

type SchedulerTask = {
  id: string
  name: string
  enabled: boolean
  next_run_at?: number
  last_run?: { started_at: string; finished_at?: string; ok?: boolean; error?: string }
  schedule: { schedule_type: string }
}

type SessionListEntry = {
  sessionId: string
  sessionKey?: string
  kind?: string
  provider?: string
  chatType?: string
  displayName?: string
  updatedAt?: string
  totalMessages?: number
  totalTokens?: number
  overrides?: Record<string, any>
}

type WorkspaceFileEntry = {
  name: string
  exists: boolean
  size?: number
}

type SkillsInstalledEntry = {
  slug: string
  name?: string
  summary?: string
  description?: string
  tags?: string[]
  path: string
  source: string
  kind: string
  editable: boolean
}

type RegistrySearchEntry = {
  score: number
  slug?: string
  displayName?: string
  summary?: string | null
  version?: string | null
  updatedAt?: number
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

function useControlData<T>(path: string, token: string, refreshMs = 20000, deps: unknown[] = []) {
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
  }, [path, token, refreshMs, ...deps])

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

function AppContent({
  layout = 'full',
  gatewayIndicator,
  onBack,
  sharedState,
}: {
  layout?: 'full' | 'embedded'
  gatewayIndicator?: GatewayIndicator
  onBack?: () => void
  sharedState?: {
    messages: ChatMessage[]
    setMessages: Dispatch<SetStateAction<ChatMessage[]>>
    input: string
    setInput: Dispatch<SetStateAction<string>>
    attachments: FileAttachment[]
    setAttachments: Dispatch<SetStateAction<FileAttachment[]>>
  }
}) {
  const { theme } = useTheme();
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([])
  const [internalInput, setInternalInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [assistantContent, setAssistantContent] = useState('')
  const lastChunkAtRef = useRef<number | null>(null)
  const turnStartedAtRef = useRef<number | null>(null)
  const [internalAttachments, setInternalAttachments] = useState<FileAttachment[]>([])
  const [messageAddedForTurn, setMessageAddedForTurn] = useState(false)
  const [showConsole, setShowConsole] = useState(false)
  const [consoleEvents, setConsoleEvents] = useState<ConsoleEvent[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftRestoredRef = useRef(false)
  const historyLoadedRef = useRef(false)
  const historyModeRef = useRef<'initial' | 'more' | null>(null)
  const oldestIndexRef = useRef<number | null>(null)

  // Streaming optimization: buffer content and update smoothly
  const streamBufferRef = useRef<string>('')
  const streamRafRef = useRef<number | null>(null)

  const messages = sharedState?.messages ?? internalMessages
  const setMessages = sharedState?.setMessages ?? setInternalMessages
  const input = sharedState?.input ?? internalInput
  const setInput = sharedState?.setInput ?? setInternalInput
  const attachments = sharedState?.attachments ?? internalAttachments
  const setAttachments = sharedState?.setAttachments ?? setInternalAttachments

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

  const requestHistory = useCallback((mode: 'initial' | 'more') => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    historyModeRef.current = mode
    setHistoryLoading(true)
    const beforeIndex = mode === 'more' ? oldestIndexRef.current : undefined
    ws.send(JSON.stringify({ type: 'get_history', limit: HISTORY_PAGE_SIZE, beforeIndex }))
  }, [])

  const handleLoadMore = useCallback(() => {
    if (historyLoading || !hasMoreHistory) return
    if (oldestIndexRef.current === null) return
    requestHistory('more')
  }, [hasMoreHistory, historyLoading, requestHistory])

  // Restore draft input from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (draftRestoredRef.current) return
    draftRestoredRef.current = true
    const draftKey = `ff-chat-draft:${DEFAULT_SESSION}`
    const draft = localStorage.getItem(draftKey)
    if (draft && !input) {
      setInput(draft)
    }
  }, [setInput])

  // Persist draft input to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const draftKey = `ff-chat-draft:${DEFAULT_SESSION}`
    const handle = window.setTimeout(() => {
      if (input) {
        localStorage.setItem(draftKey, input)
      } else {
        localStorage.removeItem(draftKey)
      }
    }, 250)
    return () => window.clearTimeout(handle)
  }, [input])

  // WebSocket connection
  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(resolveWsUrl(DEFAULT_SESSION))
        wsRef.current = ws

        ws.onopen = () => {
          setIsConnected(true)
          console.log('Connected to FarmFriend Terminal')
          try {
            if (!historyLoadedRef.current) {
              requestHistory('initial')
            }
          } catch {
            // ignore history fetch failures
          }
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data) as WebSocketMessage

          if (msg.type === 'history') {
            try {
              const parsed = JSON.parse(msg.content || '[]') as Array<{ role: string; content: string; timestamp?: number; index?: number }>
              const mode = historyModeRef.current === 'more' ? 'more' : 'initial'
              historyModeRef.current = null
              setHistoryLoading(false)

              const hydrated = parsed.map((item, idx) => {
                const ts = item.timestamp || Date.now()
                const historyIndex = typeof item.index === 'number' ? item.index : undefined
                const id = historyIndex !== undefined ? `history-${historyIndex}` : `${ts}-${idx}-history`
                return {
                  id,
                  role: (item.role as ChatMessage['role']) || 'assistant',
                  content: item.content || '',
                  timestamp: ts,
                  historyIndex
                }
              })

              if (hydrated.length > 0) {
                const firstIndex = hydrated[0].historyIndex
                if (typeof firstIndex === 'number') {
                  oldestIndexRef.current = firstIndex
                }
              } else if (mode === 'more') {
                setHasMoreHistory(false)
              }

              if (hydrated.length < HISTORY_PAGE_SIZE) {
                setHasMoreHistory(false)
              }

              if (mode === 'initial' && !historyLoadedRef.current) {
                historyLoadedRef.current = true
                setMessages(prev => {
                  if (!prev.length) return hydrated
                  return [...hydrated, ...prev]
                })
              } else if (mode === 'more' && hydrated.length) {
                setMessages(prev => {
                  const existingIndexes = new Set(prev.map((m) => m.historyIndex).filter((v): v is number => typeof v === 'number'))
                  const deduped = hydrated.filter((m) => m.historyIndex === undefined || !existingIndexes.has(m.historyIndex))
                  return [...deduped, ...prev]
                })
              }
            } catch {
              setHistoryLoading(false)
              // ignore bad history payload
            }
            return
          }

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
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-1.5 rounded-full bg-neutral-800 text-neutral-200 text-xs font-semibold hover:bg-neutral-700 transition"
              >
                Back to FieldView
              </button>
            )}
            <h1 className="text-lg font-semibold text-neutral-100">FarmFriend Terminal</h1>
            <span className="text-sm text-neutral-500">Operations console</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-neutral-500">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
            {gatewayIndicator && <StatusLight indicator={gatewayIndicator} variant="dark" />}
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

                {hasMoreHistory && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={historyLoading}
                      className={`
                        px-4 py-2 rounded-full text-sm font-medium
                        transition-all duration-200
                        ${historyLoading
                          ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                          : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'}
                      `}
                    >
                      {historyLoading ? 'Loading…' : 'Load older messages'}
                    </button>
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

            {hasMoreHistory && (
              <div className="flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={historyLoading}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium
                    transition-all duration-200
                    ${historyLoading
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'}
                  `}
                >
                  {historyLoading ? 'Loading…' : 'Load older messages'}
                </button>
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


function statusToneClass(tone: 'good' | 'warn' | 'bad' | 'muted') {
  if (tone === 'good') return 'bg-emerald-100 text-emerald-900 border-emerald-200'
  if (tone === 'warn') return 'bg-amber-100 text-amber-950 border-amber-200'
  if (tone === 'bad') return 'bg-rose-100 text-rose-900 border-rose-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

type GatewayIndicator = { tone: 'good' | 'warn' | 'bad' | 'muted'; label: string; detail: string }

function statusDotClass(tone: GatewayIndicator['tone']) {
  if (tone === 'good') return 'bg-emerald-500 shadow-emerald-400/50'
  if (tone === 'warn') return 'bg-amber-400 shadow-amber-300/50'
  if (tone === 'bad') return 'bg-rose-500 shadow-rose-400/50'
  return 'bg-slate-400 shadow-slate-300/50'
}

function deriveGatewayIndicator(input: {
  loading?: boolean
  error?: string | null
  channels?: GatewayChannelStatus[] | null
}): GatewayIndicator {
  if (input.loading) {
    return { tone: 'muted', label: 'Gateway', detail: 'checking' }
  }
  if (input.error) {
    return { tone: 'bad', label: 'Gateway', detail: 'offline' }
  }
  const channels = input.channels ?? []
  const enabled = channels.filter((c) => c.enabled)
  if (enabled.length === 0) {
    return { tone: 'warn', label: 'Gateway', detail: 'no channels' }
  }
  const healthy = enabled.filter((c) => c.healthy && c.running)
  if (healthy.length !== enabled.length) {
    return { tone: 'bad', label: 'Gateway', detail: `${healthy.length}/${enabled.length} healthy` }
  }
  return { tone: 'good', label: 'Gateway', detail: 'healthy' }
}

type FieldViewMode = 'classic' | 'mission' | 'guided'

type StatusPillData = { label: string; value: string; tone: 'good' | 'warn' | 'bad' | 'muted' }

type FieldViewShared = {
  data: ControlOverview | null
  loading: boolean
  error: string | null
  channels: GatewayChannelStatus[]
  healthyCount: number
  unhealthy: GatewayChannelStatus[]
  contractCoverage: number
  contractFiles: Array<{ name: string; exists: boolean }>
  statusPills: StatusPillData[]
  gatewayIndicator: GatewayIndicator
}

type FieldViewProps = {
  showControl: boolean
  onOpenControl: () => void
  onOpenChat: () => void
  mode: FieldViewMode
  onModeChange: (mode: FieldViewMode) => void
  overview: ControlOverviewState
  chatSharedState: {
    messages: ChatMessage[]
    setMessages: Dispatch<SetStateAction<ChatMessage[]>>
    input: string
    setInput: Dispatch<SetStateAction<string>>
    attachments: FileAttachment[]
    setAttachments: Dispatch<SetStateAction<FileAttachment[]>>
  }
}

const FIELDVIEW_MODES: Array<{ id: FieldViewMode; label: string }> = [
  { id: 'classic', label: 'FieldView' },
  { id: 'mission', label: 'Mission' },
  { id: 'guided', label: 'Guided Day' },
]

function FieldModeToggle({ mode, onModeChange }: { mode: FieldViewMode; onModeChange: (mode: FieldViewMode) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/70 border border-emerald-200/60 px-2 py-1 text-[11px] font-semibold text-emerald-900 shadow-sm">
      <span className="px-2 uppercase tracking-[0.28em] text-[10px] text-emerald-700">Mode</span>
      {FIELDVIEW_MODES.map((option) => (
        <button
          key={option.id}
          onClick={() => onModeChange(option.id)}
          className={`px-2.5 py-1 rounded-full transition ${
            mode === option.id
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-emerald-900/80 hover:bg-emerald-100'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function StatusPills({ pills }: { pills: StatusPillData[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <div
          key={pill.label}
          className={`px-3 py-1 rounded-full border text-xs font-semibold ${statusToneClass(pill.tone)}`}
        >
          <span className="uppercase tracking-[0.2em] text-[10px] mr-2">{pill.label}</span>
          {pill.value}
        </div>
      ))}
    </div>
  )
}

function StatusLight({
  indicator,
  variant = 'light'
}: {
  indicator: GatewayIndicator
  variant?: 'light' | 'dark'
}) {
  const base = variant === 'dark'
    ? 'bg-slate-900/70 border-slate-700 text-slate-200'
    : 'bg-white/70 border-emerald-200 text-emerald-900'
  const detailClass = variant === 'dark' ? 'text-slate-400' : 'text-emerald-700'

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${base}`}>
      <span className={`h-2.5 w-2.5 rounded-full shadow ${statusDotClass(indicator.tone)}`} />
      <span className="uppercase tracking-[0.2em] text-[10px]">{indicator.label}</span>
      <span className={detailClass}>{indicator.detail}</span>
    </div>
  )
}

function FieldViewClassic({
  shared,
  showControl,
  onOpenControl,
  onOpenChat,
  mode,
  onModeChange,
  chatSharedState,
}: {
  shared: FieldViewShared
  showControl: boolean
  onOpenControl: () => void
  onOpenChat: () => void
  mode: FieldViewMode
  onModeChange: (mode: FieldViewMode) => void
  chatSharedState: FieldViewProps['chatSharedState']
}) {
  const { data, loading, channels, healthyCount, unhealthy, contractCoverage, statusPills } = shared

  return (
    <div className="min-h-screen fieldview-shell text-slate-900">
      <header className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.25em] text-emerald-700">FarmFriend FieldView</span>
          <h1 className="text-3xl md:text-4xl font-semibold fieldview-title">Today on the farm</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FieldModeToggle mode={mode} onModeChange={onModeChange} />
          <StatusLight indicator={shared.gatewayIndicator} />
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
        <div className="mb-6 field-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-900">Live status rail</h2>
            <span className="text-xs text-emerald-700">Gateway + automation snapshot</span>
          </div>
          <div className="mt-3">
            <StatusPills pills={statusPills} />
          </div>
        </div>

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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field-card">
                <h3 className="text-sm font-semibold text-emerald-900">Connectivity</h3>
                {loading && <p className="text-xs text-emerald-700 mt-2">Checking gateway...</p>}
                {!loading && (
                  <div className="mt-2 space-y-1 text-sm text-emerald-900/80">
                    <p>
                      {healthyCount}/{channels.length || 0} channels healthy
                    </p>
                    {channels.length === 0 && <p className="text-emerald-700">No channels configured yet.</p>}
                    {unhealthy.length > 0 && (
                      <ul className="text-xs text-rose-600 list-disc ml-4">
                        {unhealthy.map((channel) => (
                          <li key={channel.name}>{channel.name}: {channel.last_error || 'Needs attention'}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="field-card">
                <h3 className="text-sm font-semibold text-emerald-900">Automation</h3>
                <div className="mt-2 text-sm text-emerald-900/80">
                  <p>Scheduled tasks: {data?.scheduler?.enabled_count ?? 0}</p>
                  <p className="text-xs text-emerald-700 mt-1">Next run: {formatNextRun(data?.scheduler?.next_run_at)}</p>
                </div>
              </div>
              <div className="field-card">
                <h3 className="text-sm font-semibold text-emerald-900">Workspace readiness</h3>
                <div className="mt-2 text-sm text-emerald-900/80">
                  <p>{contractCoverage}% of contract files present</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Operator notes and memory stay consistent.
                  </p>
                </div>
              </div>
              <div className="field-card">
                <h3 className="text-sm font-semibold text-emerald-900">Health alerts</h3>
                <div className="mt-2 text-sm text-emerald-900/80">
                  <p>{data?.health?.issues?.length ? `${data?.health?.issues?.length} items need review` : 'All systems normal.'}</p>
                  <p className="text-xs text-emerald-700 mt-1">Watch for connectivity drops.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="field-chat rounded-2xl p-5 text-slate-100 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Field chat</h2>
                <p className="text-xs text-slate-400">Quick questions, quick answers.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{DEFAULT_SESSION}</span>
            </div>
            <div className="mt-4 h-[70vh] min-h-[480px]">
              <AppContent layout="embedded" sharedState={chatSharedState} />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function FieldViewMission({
  shared,
  showControl,
  onOpenControl,
  onOpenChat,
  mode,
  onModeChange,
}: {
  shared: FieldViewShared
  showControl: boolean
  onOpenControl: () => void
  onOpenChat: () => void
  mode: FieldViewMode
  onModeChange: (mode: FieldViewMode) => void
}) {
  const { data, loading, channels, unhealthy, statusPills } = shared
  const healthIssues = data?.health?.issues ?? []

  return (
    <div className="min-h-screen mission-shell text-slate-900">
      <header className="px-6 py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs uppercase tracking-[0.4em] text-slate-700">FarmFriend Mission Control</span>
          <h1 className="text-3xl md:text-4xl font-semibold mission-title">Operations horizon</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FieldModeToggle mode={mode} onModeChange={onModeChange} />
          <StatusLight indicator={shared.gatewayIndicator} />
          <button
            onClick={onOpenChat}
            className="px-4 py-2 rounded-full bg-slate-900 text-amber-100 text-sm font-semibold shadow-sm hover:bg-slate-800"
          >
            Open Chat
          </button>
          {showControl && (
            <button
              onClick={onOpenControl}
              className="px-4 py-2 rounded-full border border-slate-700 text-slate-900 text-sm font-semibold hover:bg-white/40"
            >
              Control Barn
            </button>
          )}
        </div>
      </header>

      <main className="px-6 pb-12">
        <div className="mission-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Live status strip</h2>
            <span className="text-xs text-slate-600">Gateway + automation + health</span>
          </div>
          <div className="mt-3">
            <StatusPills pills={statusPills} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="mission-card">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Active incidents</h3>
                <span className="text-xs text-slate-600">{unhealthy.length + healthIssues.length} open items</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-800">
                {loading && <p className="text-slate-600">Checking gateway...</p>}
                {!loading && unhealthy.length === 0 && healthIssues.length === 0 && (
                  <p className="text-emerald-700">All clear. No incidents reported.</p>
                )}
                {unhealthy.map((channel) => (
                  <div key={channel.name} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="font-semibold text-rose-900">{channel.name} channel needs attention</p>
                    <p className="text-xs text-rose-700 mt-1">{channel.last_error || 'Investigate connectivity or credentials.'}</p>
                  </div>
                ))}
                {healthIssues.map((issue, index) => (
                  <div key={index} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="font-semibold text-amber-900">{issue.type || 'System alert'}</p>
                    <p className="text-xs text-amber-700 mt-1">{issue.message || 'Review required.'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mission-card">
              <h3 className="text-lg font-semibold text-slate-900">Priority queue</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Now</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">Scan irrigation pressure</p>
                  <p className="text-xs text-slate-600 mt-1">Confirm north line pressure + auto‑log status.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Next</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">Calibrate greenhouse climate</p>
                  <p className="text-xs text-slate-600 mt-1">Review temp & humidity drift.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Later</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">Send daily update</p>
                  <p className="text-xs text-slate-600 mt-1">Draft summary for the team.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Optional</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">Equipment roll‑up</p>
                  <p className="text-xs text-slate-600 mt-1">Quick check of fleet utilization.</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="mission-card">
              <h3 className="text-sm font-semibold text-slate-900">Gateway snapshot</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>Channels online: {channels.filter((c) => c.healthy && c.enabled).length}/{channels.filter((c) => c.enabled).length}</p>
                <p>Enabled channels: {channels.filter((c) => c.enabled).length}</p>
                <p>Scheduled tasks: {data?.scheduler?.enabled_count ?? 0}</p>
              </div>
              <button className="mt-4 w-full rounded-full border border-slate-900/20 bg-slate-900 text-amber-100 text-xs font-semibold py-2">
                Run quick diagnostics
              </button>
            </div>

            <div className="mission-card">
              <h3 className="text-sm font-semibold text-slate-900">Comms hub</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>Broadcast: Daily update to crew</p>
                <p>Escalation: Request on‑call tech</p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <button className="rounded-full bg-amber-200 text-amber-900 text-xs font-semibold py-2">Send update</button>
                <button className="rounded-full border border-slate-900/20 text-slate-900 text-xs font-semibold py-2">Request support</button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function FieldViewGuided({
  shared,
  showControl,
  onOpenControl,
  onOpenChat,
  mode,
  onModeChange,
}: {
  shared: FieldViewShared
  showControl: boolean
  onOpenControl: () => void
  onOpenChat: () => void
  mode: FieldViewMode
  onModeChange: (mode: FieldViewMode) => void
}) {
  const { data, statusPills } = shared
  const steps = [
    {
      time: 'Dawn check‑in',
      title: 'Connectivity sweep',
      detail: 'Confirm gateway channels and update crew status.',
      action: 'Start sweep',
    },
    {
      time: 'Mid‑morning',
      title: 'Automation review',
      detail: `Review ${data?.scheduler?.enabled_count ?? 0} scheduled tasks and confirm next run.`,
      action: 'Review schedule',
    },
    {
      time: 'Midday',
      title: 'Field notes',
      detail: 'Capture a quick voice note; FarmFriend will summarize.',
      action: 'Record note',
    },
    {
      time: 'Afternoon',
      title: 'Health & risk review',
      detail: data?.health?.issues?.length
        ? `${data?.health?.issues?.length} system alerts need attention.`
        : 'All systems normal. Review optional checks.',
      action: 'Review alerts',
    },
    {
      time: 'End of day',
      title: 'Daily report',
      detail: 'Send a wrap‑up update to the team.',
      action: 'Draft report',
    },
  ]

  return (
    <div className="min-h-screen guided-shell text-slate-900">
      <header className="px-6 py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-700">FarmFriend Guided Day</span>
          <h1 className="text-3xl md:text-4xl font-semibold guided-title">Today’s flow</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FieldModeToggle mode={mode} onModeChange={onModeChange} />
          <StatusLight indicator={shared.gatewayIndicator} />
          <button
            onClick={onOpenChat}
            className="px-4 py-2 rounded-full bg-emerald-700 text-white text-sm font-semibold shadow-sm"
          >
            Open Chat
          </button>
          {showControl && (
            <button
              onClick={onOpenControl}
              className="px-4 py-2 rounded-full border border-emerald-700/40 text-emerald-900 text-sm font-semibold hover:bg-emerald-100"
            >
              Control Barn
            </button>
          )}
        </div>
      </header>

      <main className="px-6 pb-12">
        <div className="guided-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-900">Daily readiness</h2>
            <span className="text-xs text-emerald-700">Smart checklist</span>
          </div>
          <div className="mt-3">
            <StatusPills pills={statusPills} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="guided-card">
            <h3 className="text-lg font-semibold text-emerald-900">Guided plan</h3>
            <div className="mt-4 space-y-4">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    {index < steps.length - 1 && <div className="flex-1 w-px bg-emerald-200" />}
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="text-xs uppercase tracking-[0.28em] text-emerald-600">{step.time}</p>
                    <h4 className="text-base font-semibold text-emerald-900 mt-1">{step.title}</h4>
                    <p className="text-sm text-emerald-900/80 mt-1">{step.detail}</p>
                    <button className="mt-3 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-semibold">
                      {step.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="guided-card">
              <h3 className="text-sm font-semibold text-emerald-900">AI co‑pilot</h3>
              <p className="mt-2 text-sm text-emerald-900/80">
                FarmFriend will summarize notes, suggest next actions, and keep your crew aligned.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button className="rounded-full bg-emerald-600 text-white text-xs font-semibold py-2">Ask for summary</button>
                <button className="rounded-full border border-emerald-700/40 text-emerald-900 text-xs font-semibold py-2">Add quick note</button>
              </div>
            </div>

            <div className="guided-card">
              <h3 className="text-sm font-semibold text-emerald-900">Weather + risk</h3>
              <p className="mt-2 text-sm text-emerald-900/80">Mostly clear. Heat stress risk low.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-amber-100 text-amber-900 text-xs font-semibold px-3 py-1">Wind: light</span>
                <span className="rounded-full bg-emerald-100 text-emerald-900 text-xs font-semibold px-3 py-1">Irrigation: steady</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function FieldView({ showControl, onOpenControl, onOpenChat, mode, onModeChange, overview, chatSharedState }: FieldViewProps) {
  const { data, loading, error } = overview
  const channels = data?.gateway?.channels ?? []
  const enabledChannels = channels.filter((c) => c.enabled)
  const healthyCount = enabledChannels.filter((c) => c.healthy && c.running).length
  const unhealthy = enabledChannels.filter((c) => !c.healthy || !c.running)
  const contractFiles = data?.contract?.files ?? []
  const contractCoverage = contractFiles.length
    ? Math.round((contractFiles.filter((f) => f.exists).length / contractFiles.length) * 100)
    : 0

  const gatewayIndicator = deriveGatewayIndicator({ loading, error, channels })

  const gatewayPill: StatusPillData = loading
    ? { label: 'Gateway', value: 'checking…', tone: 'muted' }
    : enabledChannels.length === 0
      ? { label: 'Gateway', value: 'no channels', tone: 'warn' }
      : unhealthy.length
        ? { label: 'Gateway', value: `${healthyCount}/${enabledChannels.length} healthy`, tone: 'bad' }
        : { label: 'Gateway', value: `${healthyCount}/${enabledChannels.length} healthy`, tone: 'good' }

  const automationCount = data?.scheduler?.enabled_count ?? 0
  const automationPill: StatusPillData = {
    label: 'Automation',
    value: automationCount ? `${automationCount} scheduled` : 'idle',
    tone: automationCount ? 'good' : 'warn',
  }

  const healthIssues = data?.health?.issues?.length ?? 0
  const healthPill: StatusPillData = {
    label: 'Health',
    value: healthIssues ? `${healthIssues} alerts` : 'clear',
    tone: healthIssues ? 'warn' : 'good',
  }

  const contractPill: StatusPillData = {
    label: 'Contract',
    value: `${contractCoverage}% ready`,
    tone: contractCoverage >= 100 ? 'good' : 'warn',
  }

  const shared: FieldViewShared = {
    data: data ?? null,
    loading,
    error,
    channels,
    healthyCount,
    unhealthy,
    contractCoverage,
    contractFiles,
    statusPills: [gatewayPill, automationPill, healthPill, contractPill],
    gatewayIndicator,
  }

  if (mode === 'mission') {
    return (
      <FieldViewMission
        shared={shared}
        showControl={showControl}
        onOpenControl={onOpenControl}
        onOpenChat={onOpenChat}
        mode={mode}
        onModeChange={onModeChange}
      />
    )
  }

  if (mode === 'guided') {
    return (
      <FieldViewGuided
        shared={shared}
        showControl={showControl}
        onOpenControl={onOpenControl}
        onOpenChat={onOpenChat}
        mode={mode}
        onModeChange={onModeChange}
      />
    )
  }

  return (
    <FieldViewClassic
      shared={shared}
      showControl={showControl}
      onOpenControl={onOpenControl}
      onOpenChat={onOpenChat}
      mode={mode}
      onModeChange={onModeChange}
      chatSharedState={chatSharedState}
    />
  )
}

function SkillsManager({ token }: { token: string }) {
  const [skillsTab, setSkillsTab] = useState<'installed' | 'registry' | 'create'>('installed')
  const [refreshKey, setRefreshKey] = useState(0)
  const installed = useControlData<{ skills: SkillsInstalledEntry[] }>(
    `/api/control/skills/installed?ts=${refreshKey}`,
    token,
    20000,
    [refreshKey]
  )
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('ff-skills-collapsed') === 'true'
  })
  const [query, setQuery] = useState('')
  const [showSkills, setShowSkills] = useState(true)
  const [showCommands, setShowCommands] = useState(false)
  const [showWorkspace, setShowWorkspace] = useState(true)
  const [showBundled, setShowBundled] = useState(true)
  const [showExternal, setShowExternal] = useState(false)

  const [selectedSkill, setSelectedSkill] = useState<SkillsInstalledEntry | null>(null)
  const [skillContent, setSkillContent] = useState('')
  const [skillStatus, setSkillStatus] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('ff-skills-collapsed', String(collapsed))
  }, [collapsed])

  const allSkills = installed.data?.skills ?? []
  const counts = allSkills.reduce(
    (acc, skill) => {
      const isCommand = skill.kind === 'markdown_commands'
      if (isCommand) acc.commands += 1
      else acc.skills += 1
      if (skill.source === 'workspace') acc.workspace += 1
      else if (skill.source === 'bundled') acc.bundled += 1
      else acc.external += 1
      if (skill.editable) acc.editable += 1
      acc.total += 1
      return acc
    },
    { total: 0, skills: 0, commands: 0, workspace: 0, bundled: 0, external: 0, editable: 0 }
  )

  const filteredSkills = allSkills
    .filter((skill) => {
      const isCommand = skill.kind === 'markdown_commands'
      if (isCommand && !showCommands) return false
      if (!isCommand && !showSkills) return false

      if (skill.source === 'workspace' && !showWorkspace) return false
      if (skill.source === 'bundled' && !showBundled) return false
      if (skill.source === 'external' && !showExternal) return false

      const q = query.trim().toLowerCase()
      if (!q) return true
      const hay = [
        skill.slug,
        skill.name || '',
        skill.summary || '',
        skill.description || '',
        (skill.tags || []).join(' ')
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
    .sort((a, b) => {
      const typeWeight = (s: SkillsInstalledEntry) => (s.kind === 'markdown_commands' ? 1 : 0)
      const sourceWeight = (s: SkillsInstalledEntry) => {
        if (s.source === 'workspace') return 0
        if (s.source === 'bundled') return 1
        return 2
      }
      const type = typeWeight(a) - typeWeight(b)
      if (type !== 0) return type
      const source = sourceWeight(a) - sourceWeight(b)
      if (source !== 0) return source
      return a.slug.localeCompare(b.slug)
    })

  const skillTypeLabel = (skill: SkillsInstalledEntry) => (skill.kind === 'markdown_commands' ? 'Command' : 'Skill')
  const sourceLabel = (skill: SkillsInstalledEntry) => skill.source || 'external'

  const openSkill = async (skill: SkillsInstalledEntry) => {
    try {
      const data = await fetchJson<{ content: string }>(`/api/control/skills/read?path=${encodeURIComponent(skill.path)}`, token)
      setSelectedSkill(skill)
      setSkillContent(data.content)
      setSkillStatus(null)
    } catch (err) {
      setSkillStatus(err instanceof Error ? err.message : String(err))
    }
  }

  const saveSkill = async () => {
    if (!selectedSkill) return
    try {
      setSkillStatus('Saving...')
      const res = await fetch('/api/control/skills/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ path: selectedSkill.path, content: skillContent })
      })
      if (!res.ok) throw new Error(await res.text())
      setSkillStatus('Saved.')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setSkillStatus(err instanceof Error ? err.message : String(err))
    }
  }

  const copyToWorkspace = async () => {
    if (!selectedSkill) return
    try {
      setSkillStatus('Copying...')
      const res = await fetch('/api/control/skills/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ path: selectedSkill.path })
      })
      if (!res.ok) throw new Error(await res.text())
      setSkillStatus('Copied to workspace.')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setSkillStatus(err instanceof Error ? err.message : String(err))
    }
  }

  const [registryQuery, setRegistryQuery] = useState('')
  const [registryResults, setRegistryResults] = useState<RegistrySearchEntry[]>([])
  const [registryStatus, setRegistryStatus] = useState<string | null>(null)

  const searchRegistry = async () => {
    try {
      setRegistryStatus('Searching...')
      const data = await fetchJson<{ results: RegistrySearchEntry[] }>(
        `/api/control/skills/registry/search?q=${encodeURIComponent(registryQuery)}&limit=20`,
        token
      )
      setRegistryResults(data.results || [])
      setRegistryStatus(null)
    } catch (err) {
      setRegistryStatus(err instanceof Error ? err.message : String(err))
    }
  }

  const installFromRegistry = async (slug: string) => {
    try {
      setRegistryStatus(`Installing ${slug}...`)
      const res = await fetch('/api/control/skills/registry/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ slug })
      })
      if (!res.ok) throw new Error(await res.text())
      setRegistryStatus(`Installed ${slug}.`)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setRegistryStatus(err instanceof Error ? err.message : String(err))
    }
  }

  const [createSlug, setCreateSlug] = useState('')
  const [createName, setCreateName] = useState('')
  const [createSummary, setCreateSummary] = useState('')
  const [createInstructions, setCreateInstructions] = useState('')
  const [createStatus, setCreateStatus] = useState<string | null>(null)

  const createSkill = async () => {
    try {
      setCreateStatus('Creating...')
      const res = await fetch('/api/control/skills/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          slug: createSlug,
          name: createName,
          summary: createSummary,
          instructions: createInstructions
        })
      })
      if (!res.ok) throw new Error(await res.text())
      setCreateStatus('Skill created.')
      setCreateSlug('')
      setCreateName('')
      setCreateSummary('')
      setCreateInstructions('')
      setRefreshKey((k) => k + 1)
      setSkillsTab('installed')
    } catch (err) {
      setCreateStatus(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="control-card lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Skills Manager</h2>
          <p className="text-xs text-slate-400">Installed skills, registry search, and quick creation.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!collapsed && (
            <>
              {['installed', 'registry', 'create'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSkillsTab(tab as any)}
                  className={`px-3 py-1.5 rounded-full ${skillsTab === tab ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
                >
                  {tab === 'installed' ? 'Installed' : tab === 'registry' ? 'Registry' : 'Create'}
                </button>
              ))}
            </>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
        <span>Items: {counts.total}</span>
        <span>Skills: {counts.skills}</span>
        <span>Commands: {counts.commands}</span>
        <span>Workspace: {counts.workspace}</span>
        <span>Bundled: {counts.bundled}</span>
        <span>External: {counts.external}</span>
      </div>

      {collapsed && (
        <div className="mt-3 text-xs text-slate-500">
          Skills manager collapsed. Expand to browse, filter, or edit.
        </div>
      )}

      {!collapsed && skillsTab === 'installed' && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search skills by name, slug, or tag..."
                className="w-full max-w-md px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
              />
              <div className="flex flex-wrap gap-2 text-[11px]">
                <button
                  onClick={() => setShowSkills((v) => !v)}
                  className={`px-2.5 py-1 rounded-full border ${showSkills ? 'border-emerald-500/60 text-emerald-200 bg-emerald-500/10' : 'border-slate-700 text-slate-400 bg-slate-900'}`}
                >
                  Skills
                </button>
                <button
                  onClick={() => setShowCommands((v) => !v)}
                  className={`px-2.5 py-1 rounded-full border ${showCommands ? 'border-amber-500/60 text-amber-200 bg-amber-500/10' : 'border-slate-700 text-slate-400 bg-slate-900'}`}
                >
                  Commands
                </button>
                <button
                  onClick={() => setShowWorkspace((v) => !v)}
                  className={`px-2.5 py-1 rounded-full border ${showWorkspace ? 'border-sky-500/60 text-sky-200 bg-sky-500/10' : 'border-slate-700 text-slate-400 bg-slate-900'}`}
                >
                  Workspace
                </button>
                <button
                  onClick={() => setShowBundled((v) => !v)}
                  className={`px-2.5 py-1 rounded-full border ${showBundled ? 'border-indigo-500/60 text-indigo-200 bg-indigo-500/10' : 'border-slate-700 text-slate-400 bg-slate-900'}`}
                >
                  Bundled
                </button>
                <button
                  onClick={() => setShowExternal((v) => !v)}
                  className={`px-2.5 py-1 rounded-full border ${showExternal ? 'border-slate-500/60 text-slate-200 bg-slate-500/10' : 'border-slate-700 text-slate-400 bg-slate-900'}`}
                >
                  External
                </button>
              </div>
            </div>
            <div className="text-[11px] text-slate-400">
              Showing {filteredSkills.length} of {counts.total}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-2 text-sm text-slate-300">
              {installed.loading && <p>Loading skills...</p>}
              {installed.error && <p className="text-rose-300">{installed.error}</p>}
              {!installed.loading && filteredSkills.length === 0 && (
                <p className="text-slate-400">No skills match the current filters.</p>
              )}
              <div className="max-h-[520px] overflow-y-auto pr-1 space-y-2">
                {filteredSkills.map((skill) => {
                  const isSelected = selectedSkill?.path === skill.path
                  const isCommand = skill.kind === 'markdown_commands'
                  const source = sourceLabel(skill)
                  return (
                    <button
                      key={skill.path}
                      onClick={() => openSkill(skill)}
                      className={`w-full text-left px-3 py-3 rounded-xl border transition ${
                        isSelected
                          ? 'border-emerald-500/60 bg-slate-900/80'
                          : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-200">{skill.slug}</span>
                            {skill.name && <span className="text-xs text-slate-400">{skill.name}</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {skill.summary || skill.description || 'No summary'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded-full border ${
                              isCommand
                                ? 'border-amber-500/60 text-amber-200 bg-amber-500/10'
                                : 'border-emerald-500/60 text-emerald-200 bg-emerald-500/10'
                            }`}
                          >
                            {skillTypeLabel(skill)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full border border-slate-700 text-slate-300 bg-slate-900">
                            {source}
                          </span>
                          {!skill.editable && <span className="text-amber-300">read-only</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              {selectedSkill ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">Editing {selectedSkill.slug}</h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-full border ${
                            selectedSkill.kind === 'markdown_commands'
                              ? 'border-amber-500/60 text-amber-200 bg-amber-500/10'
                              : 'border-emerald-500/60 text-emerald-200 bg-emerald-500/10'
                          }`}
                        >
                          {skillTypeLabel(selectedSkill)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full border border-slate-700 text-slate-300 bg-slate-900">
                          {sourceLabel(selectedSkill)}
                        </span>
                        {!selectedSkill.editable && <span className="text-amber-300">read-only</span>}
                      </div>
                    </div>
                    {!selectedSkill.editable && (
                      <button
                        onClick={copyToWorkspace}
                        className="px-2 py-1 rounded-full bg-amber-500 text-xs text-slate-900 font-semibold"
                      >
                        Copy to workspace
                      </button>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400">
                    <p>
                      <span className="text-slate-500">Path:</span>{' '}
                      <span className="font-mono text-slate-300">{selectedSkill.path}</span>
                    </p>
                  </div>
                  <textarea
                    value={skillContent}
                    onChange={(e) => setSkillContent(e.target.value)}
                    className="w-full h-64 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 p-3 font-mono"
                    disabled={!selectedSkill.editable}
                  />
                  {selectedSkill.editable && (
                    <button
                      onClick={saveSkill}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
                    >
                      Save {skillTypeLabel(selectedSkill)}
                    </button>
                  )}
                  {skillStatus && <p className="text-xs text-slate-400">{skillStatus}</p>}
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-800 p-6 text-xs text-slate-400">
                  Select a skill or command on the left to view or edit.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!collapsed && skillsTab === 'registry' && (
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div className="flex gap-2">
            <input
              value={registryQuery}
              onChange={(e) => setRegistryQuery(e.target.value)}
              placeholder="Search registry skills..."
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
            />
            <button
              onClick={searchRegistry}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
            >
              Search
            </button>
          </div>
          {registryStatus && <p className="text-xs text-slate-400">{registryStatus}</p>}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {registryResults.map((entry) => (
              <div key={entry.slug} className="flex items-center justify-between gap-3 border border-slate-800 rounded-lg px-3 py-2 bg-slate-900/60">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{entry.displayName || entry.slug}</p>
                  <p className="text-xs text-slate-400">{entry.summary || 'No summary'}</p>
                </div>
                {entry.slug && (
                  <button
                    onClick={() => installFromRegistry(entry.slug!)}
                    className="px-2 py-1 rounded-full bg-amber-500 text-xs text-slate-900 font-semibold"
                  >
                    Install
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!collapsed && skillsTab === 'create' && (
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <input
            value={createSlug}
            onChange={(e) => setCreateSlug(e.target.value)}
            placeholder="Skill slug (e.g., crop-scout)"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
          />
          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Skill name (optional)"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
          />
          <input
            value={createSummary}
            onChange={(e) => setCreateSummary(e.target.value)}
            placeholder="Short summary"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
          />
          <textarea
            value={createInstructions}
            onChange={(e) => setCreateInstructions(e.target.value)}
            placeholder="Instructions..."
            className="w-full h-40 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200 p-3 font-mono"
          />
          <button
            onClick={createSkill}
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
          >
            Create Skill
          </button>
          {createStatus && <p className="text-xs text-slate-400">{createStatus}</p>}
        </div>
      )}
    </div>
  )
}

function ControlBarn({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState(() => localStorage.getItem('ff-control-token') || '')
  const [configText, setConfigText] = useState('')
  const [configStatus, setConfigStatus] = useState<string | null>(null)
  const [workspaceFileName, setWorkspaceFileName] = useState('AGENTS.md')
  const [workspaceFileContent, setWorkspaceFileContent] = useState('')
  const [workspaceFileStatus, setWorkspaceFileStatus] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('ff-control-token', token)
  }, [token])

  const gateway = useControlData<GatewayStatusReport>('/api/control/gateway/status', token, 8000)
  const health = useControlData<{ ok: boolean; issues: Array<{ message?: string }> }>('/api/control/health', token, 15000)
  const scheduler = useControlData<{ tasks: SchedulerTask[] }>('/api/control/scheduler/tasks', token, 15000)
  const contract = useControlData<{ snapshot: Record<string, string | undefined> }>('/api/control/workspace/contract', token, 30000)
  const gatewayLogs = useControlData<{ events: any[] }>('/api/control/logs/gateway?limit=60', token, 12000)
  const schedulerLogs = useControlData<{ events: any[] }>('/api/control/logs/scheduler?limit=60', token, 12000)
  const gatewayIndicator = deriveGatewayIndicator({
    loading: gateway.loading,
    error: gateway.error,
    channels: gateway.data?.channels
  })
  const config = useControlData<{ path: string; authorized: boolean; config: any }>('/api/control/config', token, 0)
  const workspaceFiles = useControlData<{ files: WorkspaceFileEntry[] }>('/api/control/workspace/files', token, 20000)
  const [sessionsRefreshTick, setSessionsRefreshTick] = useState(0)
  const sessions = useControlData<{ sessions: SessionListEntry[] }>('/api/control/sessions?limit=60', token, 15000, [sessionsRefreshTick])
  const [sessionActionStatus, setSessionActionStatus] = useState<string | null>(null)

  useEffect(() => {
    if (config.data?.config) {
      setConfigText(JSON.stringify(config.data.config, null, 2))
    }
  }, [config.data])

  useEffect(() => {
    const loadWorkspaceFile = async () => {
      if (!workspaceFileName) return
      try {
        const data = await fetchJson<{ content: string }>(`/api/control/workspace/file?name=${encodeURIComponent(workspaceFileName)}`, token)
        setWorkspaceFileContent(data.content)
        setWorkspaceFileStatus(null)
      } catch (err) {
        setWorkspaceFileContent('')
        setWorkspaceFileStatus(err instanceof Error ? err.message : String(err))
      }
    }
    loadWorkspaceFile()
  }, [workspaceFileName, token])

  const saveWorkspaceFile = async () => {
    try {
      setWorkspaceFileStatus('Saving...')
      const res = await fetch('/api/control/workspace/file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: workspaceFileName, content: workspaceFileContent })
      })
      if (!res.ok) throw new Error(await res.text())
      setWorkspaceFileStatus('Saved.')
    } catch (err) {
      setWorkspaceFileStatus(err instanceof Error ? err.message : String(err))
    }
  }

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

  const runSessionAction = async (sessionId: string, action: 'reset' | 'compact') => {
    try {
      setSessionActionStatus(`${action} in progress...`)
      const res = await fetch(`/api/control/sessions/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ sessionId })
      })
      if (!res.ok) throw new Error(await res.text())
      setSessionActionStatus(`${action} requested for ${sessionId}`)
      setSessionsRefreshTick((tick) => tick + 1)
    } catch (err) {
      setSessionActionStatus(err instanceof Error ? err.message : String(err))
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
          <StatusLight indicator={gatewayIndicator} variant="dark" />
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

        <section className="control-card lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Sessions</h2>
            {sessionActionStatus && <span className="text-xs text-slate-400">{sessionActionStatus}</span>}
          </div>
          <div className="mt-3 text-xs text-slate-300">
            {sessions.loading && <p>Loading sessions...</p>}
            {sessions.error && <p className="text-rose-300">{sessions.error}</p>}
            {!sessions.loading && !sessions.error && (sessions.data?.sessions?.length ?? 0) === 0 && (
              <p>No sessions found</p>
            )}
          </div>
          {(sessions.data?.sessions?.length ?? 0) > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-xs text-slate-300">
                <thead className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="text-left py-2 pr-4">Session</th>
                    <th className="text-left py-2 pr-4">Provider</th>
                    <th className="text-left py-2 pr-4">Updated</th>
                    <th className="text-left py-2 pr-4">Messages</th>
                    <th className="text-left py-2 pr-4">Tokens</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.data?.sessions?.map((session) => (
                    <tr key={session.sessionId} className="border-t border-slate-800">
                      <td className="py-2 pr-4">
                        <div className="font-medium text-slate-100">{session.sessionKey || session.sessionId}</div>
                        <div className="text-[0.65rem] text-slate-500">{session.sessionId}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <div>{session.provider || 'internal'}</div>
                        <div className="text-[0.65rem] text-slate-500">
                          {session.kind || session.chatType || 'direct'}
                        </div>
                      </td>
                      <td className="py-2 pr-4">{session.updatedAt ? new Date(session.updatedAt).toLocaleString() : '—'}</td>
                      <td className="py-2 pr-4">{session.totalMessages ?? 0}</td>
                      <td className="py-2 pr-4">{session.totalTokens ?? '—'}</td>
                      <td className="py-2 text-right space-x-2">
                        <button
                          onClick={() => runSessionAction(session.sessionId, 'compact')}
                          className="px-2 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
                        >
                          Compact
                        </button>
                        <button
                          onClick={() => runSessionAction(session.sessionId, 'reset')}
                          className="px-2 py-1 rounded bg-rose-600/70 text-white hover:bg-rose-500"
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

        <section className="control-card lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-200">Workspace files</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
            {workspaceFiles.data?.files?.map((file) => (
              <button
                key={file.name}
                onClick={() => setWorkspaceFileName(file.name)}
                className={`px-3 py-1.5 rounded-full ${workspaceFileName === file.name ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
              >
                {file.name}
              </button>
            ))}
          </div>
          <textarea
            value={workspaceFileContent}
            onChange={(e) => setWorkspaceFileContent(e.target.value)}
            className="mt-3 w-full h-56 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 p-3 font-mono"
          />
          <button
            onClick={saveWorkspaceFile}
            className="mt-3 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
          >
            Save File
          </button>
          {workspaceFileStatus && <p className="mt-2 text-xs text-slate-400">{workspaceFileStatus}</p>}
        </section>

        <SkillsManager token={token} />

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
  const [fieldMode, setFieldMode] = useState<FieldViewMode>(() => {
    if (typeof window === 'undefined') return 'classic'
    const stored = localStorage.getItem('ff-fieldview-mode')
    if (stored === 'mission' || stored === 'guided' || stored === 'classic') return stored
    return 'classic'
  })
  const overview = useControlOverview()
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

  const appGatewayIndicator = deriveGatewayIndicator({
    loading: overview.loading,
    error: overview.error,
    channels: overview.data?.gateway?.channels
  })

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatAttachments, setChatAttachments] = useState<FileAttachment[]>([])

  const chatSharedState = {
    messages: chatMessages,
    setMessages: setChatMessages,
    input: chatInput,
    setInput: setChatInput,
    attachments: chatAttachments,
    setAttachments: setChatAttachments
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('ff-fieldview-mode', fieldMode)
  }, [fieldMode])

  return (
    <ThemeProvider>
      {view === 'field' && (
        <FieldView
          showControl={controlUnlocked}
          onOpenControl={() => setView('control')}
          onOpenChat={() => setView('chat')}
          mode={fieldMode}
          onModeChange={setFieldMode}
          overview={overview}
          chatSharedState={chatSharedState}
        />
      )}
      {view === 'control' && <ControlBarn onClose={() => setView('field')} />}
      {view === 'chat' && (
        <AppContent
          layout="full"
          gatewayIndicator={appGatewayIndicator}
          onBack={() => setView('field')}
          sharedState={chatSharedState}
        />
      )}
    </ThemeProvider>
  )
}
