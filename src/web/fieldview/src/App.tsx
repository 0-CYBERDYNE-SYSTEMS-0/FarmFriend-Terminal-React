import { useState, useEffect } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useTheme } from '@/contexts/ThemeContext'
import { FieldViewClassic } from '@/components/features/FieldViewClassic'
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

  // Shared state for FieldView dashboard
  const shared = {
    data: overviewData,
    loading,
    error,
    channels: [],
    healthyCount: 0,
    unhealthy: [],
    contractCoverage: 100,
    statusPills: [
      { label: 'Gateway', value: 'Connected', tone: 'good' as const },
      { label: 'Tasks', value: '0 running', tone: 'muted' as const },
      { label: 'Memory', value: 'Synced', tone: 'good' as const },
    ],
    gatewayIndicator: 'online' as const
  }

  return (
    <ThemeProvider>
      <ThemeApplier />
      <FieldViewClassic
        shared={shared}
        showControl={showControl}
        onOpenControl={() => console.log('Open Control Barn')}
        onOpenChat={() => console.log('Open Full Chat')}
        mode={mode}
        onModeChange={setMode}
        chatSharedState={null}
      />
    </ThemeProvider>
  )
}

export default App
