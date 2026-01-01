import { useState } from 'react';

interface ConsoleEvent {
  id: string;
  type: string;
  content: string;
  timestamp: number;
  metadata?: any;
}

interface ConsoleEventLogProps {
  events: ConsoleEvent[];
  onClear?: () => void;
}

export function ConsoleEventLog({ events, onClear }: ConsoleEventLogProps) {
  const [filter, setFilter] = useState<string>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const getEventStyle = (type: string, metadata?: any) => {
    // Determine if this is a tool start or end
    const phase = metadata?.phase;
    
    const styles: Record<string, { icon: string; bg: string; border: string; text: string; glow: string }> = {
      thinking_xml: {
        icon: '💭',
        bg: 'from-blue-900/40 to-blue-950/30',
        border: 'border-blue-500/50',
        text: 'text-blue-200',
        glow: 'shadow-blue-500/10'
      },
      tool_call: {
        icon: phase === 'start' ? '🚀' : phase === 'end' ? '✓' : '🔧',
        bg: phase === 'start' 
          ? 'from-amber-900/40 to-amber-950/30'
          : phase === 'end' && metadata?.status === 'ok'
          ? 'from-green-900/40 to-green-950/30'
          : 'from-red-900/40 to-red-950/30',
        border: phase === 'start'
          ? 'border-amber-500/50'
          : phase === 'end' && metadata?.status === 'ok'
          ? 'border-green-500/50'
          : 'border-red-500/50',
        text: phase === 'start'
          ? 'text-amber-200'
          : phase === 'end' && metadata?.status === 'ok'
          ? 'text-green-200'
          : 'text-red-200',
        glow: phase === 'start'
          ? 'shadow-amber-500/10'
          : 'shadow-green-500/10'
      },
      response: {
        icon: '💬',
        bg: 'from-emerald-900/40 to-emerald-950/30',
        border: 'border-emerald-500/50',
        text: 'text-emerald-200',
        glow: 'shadow-emerald-500/10'
      },
      system: {
        icon: metadata?.type === 'progress' ? '⏳' : 'ℹ️',
        bg: metadata?.type === 'progress'
          ? 'from-purple-900/40 to-purple-950/30'
          : 'from-neutral-800/40 to-neutral-950/30',
        border: metadata?.type === 'progress'
          ? 'border-purple-500/50'
          : 'border-neutral-500/50',
        text: metadata?.type === 'progress'
          ? 'text-purple-200'
          : 'text-neutral-300',
        glow: metadata?.type === 'progress'
          ? 'shadow-purple-500/10'
          : 'shadow-neutral-500/10'
      },
      error: {
        icon: '❌',
        bg: 'from-red-900/40 to-red-950/30',
        border: 'border-red-500/50',
        text: 'text-red-200',
        glow: 'shadow-red-500/10'
      },
      turn_finished: {
        icon: '✅',
        bg: 'from-green-900/40 to-green-950/30',
        border: 'border-green-500/50',
        text: 'text-green-200',
        glow: 'shadow-green-500/10'
      }
    };
    return styles[type] || styles.system;
  };

  const toggleExpanded = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredEvents = events.filter((e) => filter === 'all' || e.type === filter);

  return (
    <div className="console-event-log flex flex-col h-full bg-gradient-to-br from-gray-950 via-slate-950 to-black">
      {/* Header */}
      <div className="console-header flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="font-semibold text-sm text-gray-200">Event Log</span>
          <span className="text-xs text-gray-500">({filteredEvents.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="tool_call">Tools</option>
            <option value="thinking_xml">Thinking</option>
            <option value="response">Response</option>
            <option value="error">Errors</option>
          </select>
          {onClear && (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredEvents.map((event) => {
          const style = getEventStyle(event.type, event.metadata);
          const isExpanded = expandedEvents.has(event.id);

          return (
            <div
              key={event.id}
              className={`
                event-card group relative
                bg-gradient-to-r ${style.bg}
                border ${style.border}
                rounded-lg p-3
                hover:${style.glow} hover:shadow-lg
                transition-all duration-200
                cursor-pointer
                ${isExpanded ? 'ring-1 ring-white/10' : ''}
              `}
              onClick={() => toggleExpanded(event.id)}
            >
              {/* Timestamp + Icon + Type */}
              <div className="flex items-start gap-2 mb-1">
                <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
                <span className="text-lg">{style.icon}</span>
                <span className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>
                  {event.type}
                  {event.metadata?.phase && (
                    <span className="opacity-70 ml-1 normal-case">
                      {event.metadata.phase}
                    </span>
                  )}
                </span>
                
                {/* Duration for tool_end */}
                {event.metadata?.duration && (
                  <span className="text-xs text-gray-500 ml-auto">
                    {event.metadata.duration}
                  </span>
                )}
              </div>

              {/* Main content */}
              <div
                className={`
                text-sm text-gray-300
                ${isExpanded ? '' : 'line-clamp-2'}
                transition-all duration-200
              `}
              >
                {event.content}
              </div>

              {/* Tool input/output details */}
              {isExpanded && event.type === 'tool_call' && event.metadata && (
                <div className="mt-2 space-y-2 text-xs">
                  {event.metadata.input && (
                    <div className="bg-black/30 rounded p-2 border-l-2 border-amber-500/50">
                      <div className="text-amber-300 font-semibold mb-1">Input:</div>
                      <div className="text-gray-400 font-mono whitespace-pre-wrap break-all">
                        {typeof event.metadata.input === 'string' 
                          ? event.metadata.input.slice(0, 500)
                          : JSON.stringify(event.metadata.input, null, 2).slice(0, 500)
                        }
                        {event.metadata.input && (typeof event.metadata.input === 'string' ? event.metadata.input : JSON.stringify(event.metadata.input)).length > 500 && '...'}
                      </div>
                    </div>
                  )}
                  {event.metadata.output && (
                    <div className={`bg-black/30 rounded p-2 border-l-2 ${
                      event.metadata.status === 'ok' 
                        ? 'border-green-500/50' 
                        : 'border-red-500/50'
                    }`}>
                      <div className={`font-semibold mb-1 ${
                        event.metadata.status === 'ok' ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {event.metadata.status === 'ok' ? '✓ Output:' : '✗ Error:'}

                      </div>
                      <div className="text-gray-400 font-mono whitespace-pre-wrap break-all">
                        {event.metadata.output.slice(0, 500)}
                        {event.metadata.output.length > 500 && '...'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Expand indicator */}
              {(event.content.length > 100 || (event.type === 'tool_call' && event.metadata)) && (
                <div className="absolute top-3 right-3">
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}

              {/* Glow effect on hover */}
              <div
                className={`
                absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100
                bg-gradient-to-r ${style.bg}
                transition-opacity duration-200
                -z-10 blur-xl
              `}
              />
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-12">
            <div className="text-4xl mb-2">📭</div>
            <div>No events yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
