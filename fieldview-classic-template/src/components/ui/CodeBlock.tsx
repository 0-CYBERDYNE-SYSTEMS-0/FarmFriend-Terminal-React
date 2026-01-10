import { useState, useEffect } from 'react'
import { highlight } from 'shiki'
import type { Lang } from 'shiki'

interface CodeBlockProps {
  code: string
  lang?: Lang
  className?: string
}

export function CodeBlock({ code, lang = 'text', className = '' }: CodeBlockProps) {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    highlight(code, { 
      theme: 'github-dark',
      lang,
      fallbackLanguage: 'text'
    }).then(result => {
      setHtml(result)
      setLoading(false)
    }).catch(error => {
      console.error('Shiki error:', error)
      // Fallback to simple pre block
      setHtml(`<pre><code>${code}</code></pre>`)
      setLoading(false)
    })
  }, [code, lang])

  if (loading) {
    return (
      <div className={`bg-gray-800 p-4 rounded-lg overflow-x-auto ${className}`}>
        <div className="text-gray-400">Loading code...</div>
      </div>
    )
  }

  return (
    <div className={`code-block bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-mono text-gray-400">{lang}</span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Copy
        </button>
      </div>
      <div 
        className="overflow-x-auto p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}