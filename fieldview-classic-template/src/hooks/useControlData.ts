import { useEffect, useState } from 'react'

export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `Request failed: ${res.status}`)
  }
  return await res.json()
}

export function useControlOverview<T = unknown>(path: string, refreshMs = 15000) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        const payload = await fetchJson<T>(path)
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
  }, [path, refreshMs])

  return { data, error, loading }
}
