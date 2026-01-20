import { useEffect } from 'react'
import { HTMLArtifact, JSONArtifact, CodeArtifact } from '@/components/ui/ArtifactPreview'

interface ArtifactItem {
  id: string
  content: string
  title: string
  type: 'html' | 'json' | 'code'
  lang?: string
}

interface ArtifactViewerModalProps {
  artifacts: ArtifactItem[]
  activeIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function ArtifactViewerModal({ artifacts, activeIndex, onClose, onPrev, onNext }: ArtifactViewerModalProps) {
  const artifact = artifacts[activeIndex]

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
      if (event.key === 'ArrowLeft') {
        onPrev()
      }
      if (event.key === 'ArrowRight') {
        onNext()
      }
    }

    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, onNext, onPrev])

  if (!artifact) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 text-slate-100 w-[96vw] h-[92vh] max-w-6xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Artifact Viewer</div>
            <div className="text-lg font-semibold text-slate-100">{artifact.title}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 px-2 py-1 rounded border border-slate-700">
              {activeIndex + 1} / {artifacts.length}
            </span>
            <button
              onClick={onPrev}
              className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              disabled={activeIndex === 0}
            >
              Prev
            </button>
            <button
              onClick={onNext}
              className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              disabled={activeIndex === artifacts.length - 1}
            >
              Next
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-slate-900">
          {artifact.type === 'html' && (
            <HTMLArtifact content={artifact.content} title={artifact.title} type="html" />
          )}
          {artifact.type === 'json' && (
            <JSONArtifact content={artifact.content} title={artifact.title} type="json" />
          )}
          {artifact.type === 'code' && (
            <CodeArtifact content={artifact.content} title={artifact.title} type="code" lang={artifact.lang} />
          )}
        </div>
      </div>
    </div>
  )
}
