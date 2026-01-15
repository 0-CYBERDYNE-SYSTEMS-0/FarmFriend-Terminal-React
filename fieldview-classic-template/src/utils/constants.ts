// Utility functions for template

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}m`
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function cn(...classes: string[]): string {
  return classes.filter(Boolean).join(' ')
}

// Domain theme colors
export const DOMAIN_COLORS = {
  agriculture: {
    primary: 'emerald',
    secondary: 'amber',
    accent: 'green'
  },
  healthcare: {
    primary: 'blue',
    secondary: 'teal',
    accent: 'cyan'
  },
  manufacturing: {
    primary: 'gray',
    secondary: 'red',
    accent: 'orange'
  },
  education: {
    primary: 'purple',
    secondary: 'indigo',
    accent: 'pink'
  }
} as const

export type DomainType = keyof typeof DOMAIN_COLORS