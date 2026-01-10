import { useState, useEffect } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useTheme } from '@/contexts/ThemeContext'
import '@/styles/globals.css'

// Apply theme class to document root
function ThemeApplier() {
  const { themeName } = useTheme()
  
  useEffect(() => {
    document.documentElement.className = `theme-${themeName}`
  }, [themeName])
  
  return null
}

// Temporary placeholder component
function FieldViewClassic({ showControl, onOpenControl, onOpenChat, mode, onModeChange, overview }: {
  showControl: boolean
  onOpenControl: () => void
  onOpenChat: () => void
  mode: string
  onModeChange: (mode: string) => void
  overview: any
}) {
  // Use parameters to avoid unused warnings
  console.log('FieldView mode:', mode)
  console.log('Overview:', overview)
  
  return (
    <div className="fieldview-shell min-h-screen">
      <header className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.25em] text-emerald-700">FieldView Classic</span>
          <h1 className="text-3xl md:text-4xl font-semibold fieldview-title">Today on farm</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { onOpenChat(); onModeChange('chat'); }}
            className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold shadow-sm shadow-emerald-600/30 hover:bg-emerald-700 transition"
          >
            Open Chat
          </button>
          {showControl && (
            <button
              onClick={() => { onOpenControl(); onModeChange('control'); }}
              className="px-4 py-2 rounded-full border border-emerald-700/40 text-emerald-900 text-sm font-semibold hover:bg-emerald-100 transition"
            >
              Control Barn
            </button>
          )}
        </div>
      </header>

      <main className="px-6 pb-10">
        <div className="field-card mb-6">
          <h2 className="text-lg font-semibold text-emerald-900">FieldView Template</h2>
          <p className="mt-2 text-sm text-emerald-900/80">
            This is a base FieldView Classic UI template. Components and functionality will be added in next iteration.
          </p>
          <div className="mt-4 text-xs text-emerald-700">
            Current mode: {mode} | Control shown: {showControl ? 'yes' : 'no'} | Loading: {overview?.loading ? 'yes' : 'no'}
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  const [showControl] = useState(true)
  const [overviewData] = useState(null)
  const [loading] = useState(false)
  const [error] = useState(null)

  return (
    <ThemeProvider>
      <ThemeApplier />
      <FieldViewClassic
        showControl={showControl}
        onOpenControl={() => console.log('Open Control Barn')}
        onOpenChat={() => console.log('Open Full Chat')}
        mode="classic"
        onModeChange={(mode) => console.log('Mode changed to:', mode)}
        overview={{
          data: overviewData,
          loading,
          error
        }}
      />
    </ThemeProvider>
  )
}

export default App