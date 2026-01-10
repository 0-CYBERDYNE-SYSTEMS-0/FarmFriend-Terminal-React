import { type StatusPillData } from '@/store/types'
// import { useTheme } from '@/contexts/ThemeContext'

interface StatusPillsProps {
  pills: StatusPillData[]
}

export function StatusPills({ pills }: StatusPillsProps) {
  // const { theme } = useTheme()

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((pill, index) => (
        <div
          key={index}
          className={`status-pill ${pill.tone}`}
        >
          <span className="font-medium">{pill.label}:</span>
          <span>{pill.value}</span>
        </div>
      ))}
    </div>
  )
}

export function StatusLight({ indicator }: { indicator: 'online' | 'offline' | 'degraded' }) {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    degraded: 'bg-yellow-500'
  }

  return (
    <div className={`status-light ${colors[indicator]}`} />
  )
}