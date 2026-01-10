import { useState } from 'react'
import { CodeBlock } from '@/components/ui/CodeBlock'

export interface ArtifactPreviewProps {
  content: string
  title?: string
  type: 'html' | 'json' | 'image' | 'text' | 'code'
}

export function HTMLArtifact({ content, title = "HTML Artifact" }: ArtifactPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'render' | 'source'>('render')
  
  const downloadFile = () => {
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.html`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const openInNewTab = () => {
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  return (
    <div className="artifact-preview border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-300">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode(previewMode === 'render' ? 'source' : 'render')}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          >
            {previewMode === 'render' ? 'View Source' : 'View Render'}
          </button>
          <button
            onClick={downloadFile}
            className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
          >
            Download
          </button>
          <button
            onClick={openInNewTab}
            className="px-3 py-1 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded transition-colors"
          >
            Open New Tab
          </button>
        </div>
      </div>
      
      {previewMode === 'render' ? (
        <iframe
          srcDoc={content}
          className="w-full h-96 border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title={title}
        />
      ) : (
        <div className="p-4">
          <CodeBlock code={content} lang="html" />
        </div>
      )}
    </div>
  )
}

export function JSONArtifact({ content, title = "JSON Data" }: ArtifactPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const parsedContent = useState<any | null>(null)
  
  const formatJSON = () => {
    try {
      const parsed = JSON.parse(content)
      parsedContent[1] = parsed
      setError(null)
      setExpanded(true)
    } catch (err) {
      setError('Invalid JSON: ' + (err as Error).message)
    }
  }
  
  const downloadFile = () => {
    const formatted = expanded 
      ? JSON.stringify(parsedContent[0], null, 2)
      : content
    const blob = new Blob([formatted], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="artifact-preview border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-300">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={formatJSON}
            className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
          >
            {expanded ? 'Collapse' : 'Format'}
          </button>
          <button
            onClick={downloadFile}
            className="px-3 py-1 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded transition-colors"
          >
            Download
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}
      
      <div className="p-4 max-h-96 overflow-auto">
        {expanded && parsedContent[0] ? (
          <CodeBlock code={JSON.stringify(parsedContent[0], null, 2)} lang="json" />
        ) : (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap">{content}</pre>
        )}
      </div>
    </div>
  )
}

export function ImageArtifact({ content, title = "Image" }: ArtifactPreviewProps) {
  const downloadFile = () => {
    // Assuming content is base64 or URL
    if (content.startsWith('data:')) {
      const a = document.createElement('a')
      a.href = content
      a.download = `${title}.png`
      a.click()
    } else {
      window.open(content, '_blank')
    }
  }

  return (
    <div className="artifact-preview border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-300">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <button
          onClick={downloadFile}
          className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
        >
          Download
        </button>
      </div>
      <div className="p-4 flex justify-center">
        <img 
          src={content} 
          alt={title}
          className="max-w-full h-auto rounded shadow-lg"
          style={{ maxHeight: '400px' }}
        />
      </div>
    </div>
  )
}

export function CodeArtifact({ content, title = "Code", lang = 'text' }: ArtifactPreviewProps & { lang?: string }) {
  const downloadFile = () => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.${getFileExtension(lang)}`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      html: 'html',
      css: 'css',
      json: 'json',
      xml: 'xml',
      sql: 'sql',
      bash: 'sh',
      powershell: 'ps1'
    }
    return extensions[lang] || 'txt'
  }

  return (
    <div className="artifact-preview border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-300">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <button
          onClick={downloadFile}
          className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
        >
          Download
        </button>
      </div>
      <div className="p-4">
        <CodeBlock code={content} lang={lang as any} />
      </div>
    </div>
  )
}