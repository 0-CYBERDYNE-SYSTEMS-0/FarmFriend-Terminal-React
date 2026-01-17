import { type StatusPillData, type GatewayIndicator } from '@/store/types'
import { StatusPills } from '@/components/ui/StatusPills'
import { EmbeddedChat } from './EmbeddedChatWithArtifacts'

interface FieldViewCommandCenterProps {
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

export function FieldViewCommandCenter({
  shared,
  showControl,
  onOpenControl,
  onOpenChat,
  mode,
  onModeChange,
}: FieldViewCommandCenterProps) {
  const { data, loading, channels, healthyCount, unhealthy, statusPills } = shared
  const status = data?.status || {}
  const schedulerOverview = data?.overviewData?.scheduler
  const schedulerEnabledCount = schedulerOverview?.enabled_count ?? (status.scheduler_lock_active ? 1 : 0)
  const schedulerAgeLabel = status.scheduler_lock_age_ms
    ? `${Math.round(status.scheduler_lock_age_ms / 1000)}s ago`
    : 'N/A'
  const schedulerIntensity = schedulerEnabledCount
    ? schedulerEnabledCount * 11
    : status.scheduler_lock_active
      ? 55
      : 18
  const irrigationPercent = Math.min(100, Math.max(12, schedulerIntensity))
  const cpuPercent = Math.min(100, Math.max(18, (channels.length || 2) * 12))
  const memoryPercent = Math.min(100, Math.max(24, shared.contractCoverage))

  return (
    <div className="min-h-screen command-shell text-slate-50">
      <header className="command-header">
        <div>
          <p className="command-eyebrow">FarmFriend Command Center</p>
          <h1 className="command-title">Agrarian Ops Grid</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value)}
            className="command-select"
          >
            <option value="classic">Classic</option>
            <option value="command">Command</option>
            <option value="mission">Mission</option>
            <option value="guided">Guided</option>
          </select>
          <button onClick={onOpenChat} className="command-button">
            Open Chat
          </button>
          {showControl && (
            <button onClick={onOpenControl} className="command-button ghost">
              Control Barn
            </button>
          )}
        </div>
      </header>

      <div className="px-6 pb-10">
        <div className="command-rail">
          <StatusPills pills={statusPills} />
          <div className="command-ticker">
            <span>Gateway: {shared.gatewayIndicator.toUpperCase()}</span>
            <span>Active channels: {healthyCount}/{channels.length || 0}</span>
            <span>Schedulers: {schedulerEnabledCount}</span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="space-y-6">
            <div className="command-grid">
              <div className="command-card">
                <h2 className="command-card-title">Machine Load</h2>
                <div className="command-meter">
                  <div className="command-meter-bar" style={{ width: `${cpuPercent}%` }} />
                </div>
                <div className="command-meta">
                  <span>CPU Burn</span>
                  <strong>{cpuPercent}%</strong>
                </div>
                <div className="command-meta">
                  <span>Memory Sync</span>
                  <strong>{memoryPercent}%</strong>
                </div>
              </div>

              <div className="command-card">
                <h2 className="command-card-title">Irrigation Flow</h2>
                <div className="command-meter">
                  <div className="command-meter-bar amber" style={{ width: `${irrigationPercent}%` }} />
                </div>
                <div className="command-meta">
                  <span>Pulse Rate</span>
                  <strong>{irrigationPercent}%</strong>
                </div>
                <div className="command-meta">
                  <span>Next Run</span>
                  <strong>
                    {schedulerOverview?.next_run_at
                      ? new Date(schedulerOverview.next_run_at).toLocaleString()
                      : status.scheduler_lock_active
                        ? `Active (${schedulerAgeLabel})`
                        : 'Not scheduled'}
                  </strong>
                </div>
              </div>

              <div className="command-card">
                <h2 className="command-card-title">Socket Map</h2>
                <ul className="command-socket-list">
                  <li><span>Daemon WS</span><span>ws://127.0.0.1:28888</span></li>
                  <li><span>Web WS</span><span>ws://127.0.0.1:8787/ws/terminal/main</span></li>
                  <li><span>FieldView</span><span>http://127.0.0.1:8788</span></li>
                  <li><span>Artifacts</span><span>ff-terminal-workspace/artifacts</span></li>
                </ul>
              </div>

              <div className="command-card">
                <h2 className="command-card-title">Alerts + Drift</h2>
                {loading && <p className="command-muted">Checking gateway...</p>}
                {!loading && (
                  <div className="space-y-2 text-sm">
                    <p>{healthyCount}/{channels.length || 0} channels healthy</p>
                    {unhealthy.length === 0 && <p className="command-muted">No alerts. Field stable.</p>}
                    {unhealthy.length > 0 && (
                      <ul className="list-disc ml-5 text-rose-200">
                        {unhealthy.map((channel: any) => (
                          <li key={channel.name}>{channel.name}: {channel.last_error || 'Needs attention'}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="command-card wide">
              <div className="flex items-center justify-between">
                <h2 className="command-card-title">Command Queue</h2>
                <span className="command-chip">AUTOMATION GRID</span>
              </div>
              <div className="command-queue">
                <div>
                  <p className="command-muted">Recent Actions</p>
                  <ul>
                    <li>✓ Scheduler armed</li>
                    <li>✓ Memory sync pass</li>
                    <li>• Awaiting field directive</li>
                  </ul>
                </div>
                <div>
                  <p className="command-muted">Next Objectives</p>
                  <ul>
                    <li>Calibrate greenhouse sensors</li>
                    <li>Confirm irrigation baseline</li>
                    <li>Generate daily report</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="command-chat">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold">Field chat</h2>
                <p className="text-xs text-slate-400">Direct line to the agent runtime.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">main</span>
            </div>
            <EmbeddedChat layout="embedded" sessionId="main" />
          </section>
        </div>
      </div>
    </div>
  )
}
