import { useState, useEffect } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useTheme } from '@/contexts/ThemeContext'
import { FieldViewClassic } from '@/components/features/FieldViewClassic'
import { FieldViewCommandCenter } from '@/components/features/FieldViewCommandCenter'
import '@/styles/globals.css'

// Apply theme class to document root
function ThemeApplier() {
  const { themeName } = useTheme()

  useEffect(() => {
    document.documentElement.className = `theme-${themeName}`
  }, [themeName])

  return null
}

function App() {
  const [showControl] = useState(true)
  const [mode, setMode] = useState('classic')
  const [overviewData] = useState(null)
  const [loading] = useState(false)
  const [error] = useState(null)
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    let active = true
    const fetchStatus = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8787/fieldview/status')
        if (!res.ok) return
        const data = await res.json()
        if (active) setStatus(data)
      } catch {
        // ignore
      }
    }
    fetchStatus()
    const interval = window.setInterval(fetchStatus, 4000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  // Shared state for FieldView dashboard
  const shared = {
    data: { status, overviewData },
    loading,
    error,
    channels: Array.from({ length: status?.ws_clients ?? 0 }).map((_, idx) => ({
      name: `WS Client ${idx + 1}`,
      healthy: true
    })),
    healthyCount: status?.ws_clients ?? 0,
    unhealthy: status?.daemon_connected === false ? [{ name: 'Daemon', last_error: 'Disconnected' }] : [],
    contractCoverage: Math.min(100, Math.max(0, status?.artifacts_count ? status.artifacts_count * 5 : 0)),
    statusPills: [
      { label: 'Gateway', value: status?.daemon_connected ? 'Connected' : 'Disconnected', tone: status?.daemon_connected ? 'good' as const : 'bad' as const },
      { label: 'Sockets', value: `${status?.ws_clients ?? 0} clients`, tone: 'muted' as const },
      { label: 'Artifacts', value: `${status?.artifacts_count ?? 0} saved`, tone: 'good' as const },
    ],
    gatewayIndicator: status?.daemon_connected ? 'online' as const : 'offline' as const
  }

  return (
    <ThemeProvider>
      <ThemeApplier />
      {mode === 'command' ? (
        <FieldViewCommandCenter
          shared={shared}
          showControl={showControl}
          onOpenControl={() => console.log('Open Control Barn')}
          onOpenChat={() => console.log('Open Full Chat')}
          mode={mode}
          onModeChange={setMode}
          chatSharedState={null}
        />
      ) : (
        <FieldViewClassic
          shared={shared}
          showControl={showControl}
          onOpenControl={() => console.log('Open Control Barn')}
          onOpenChat={() => console.log('Open Full Chat')}
          mode={mode}
          onModeChange={setMode}
          chatSharedState={null}
        />
      )}
    </ThemeProvider>
  )
}

export default App
