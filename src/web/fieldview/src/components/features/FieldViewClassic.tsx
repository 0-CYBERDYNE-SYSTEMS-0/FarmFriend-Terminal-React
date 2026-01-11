// This is a template FieldViewClassic component extracted from the original codebase
// It provides the agriculture-themed dashboard with embedded chat

import { type StatusPillData, type GatewayIndicator } from '@/store/types'
import { StatusPills } from '@/components/ui/StatusPills'
import { EmbeddedChat } from './EmbeddedChatWithArtifacts'

interface FieldViewClassicProps {
  shared: {
    data: any
    loading: boolean
    error: any
    channels: any[]
    healthyCount: number
    unhealthy: any[]
    contractCoverage: number
    statusPills: StatusPillData[]
    gatewayIndicator: GatewayIndicator
  }
  showControl: boolean
  onOpenControl: () => void
  onOpenChat: () => void
  mode: string
  onModeChange: (mode: string) => void
  chatSharedState: any
}

export function FieldViewClassic({
  shared,
  showControl,
  onOpenControl,
  onOpenChat,
  mode,
  onModeChange,
}: FieldViewClassicProps) {
  const { data, loading, channels, healthyCount, unhealthy, statusPills } = shared

  return (
    <div className="min-h-screen fieldview-shell text-slate-900">
      <header className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.25em] text-emerald-700">FarmFriend FieldView</span>
          <h1 className="text-3xl md:text-4xl font-semibold fieldview-title">Today on farm</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode toggle - simplified for template */}
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-emerald-200 bg-white text-sm"
          >
            <option value="classic">Classic</option>
            <option value="mission">Mission</option>
            <option value="guided">Guided</option>
          </select>
          
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
                Start with what matters: check connectivity, review tasks, then send daily update to your team.
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
                        {unhealthy.map((channel: any) => (
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
                  <p className="text-xs text-emerald-700 mt-1">Next run: {data?.scheduler?.next_run_at ? new Date(data.scheduler.next_run_at).toLocaleString() : 'Not scheduled'}</p>
                </div>
              </div>
              <div className="field-card">
                <h3 className="text-sm font-semibold text-emerald-900">Workspace readiness</h3>
                <div className="mt-2 text-sm text-emerald-900/80">
                  <p>{shared.contractCoverage}% of contract files present</p>
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Field chat</h2>
                <p className="text-xs text-slate-400">Quick questions, quick answers.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">main</span>
            </div>
            <EmbeddedChat layout="embedded" sessionId="main" />
          </section>
        </div>
      </main>
    </div>
  )
}