import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { rehypeHighlight } from 'rehype-highlight'
import { CodeBlock } from './CodeBlock'
import { 
  HTMLArtifact, 
  JSONArtifact, 
  ImageArtifact, 
  CodeArtifact 
} from './ArtifactPreview'
import type { ArtifactPreviewProps } from './ArtifactPreview'

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className = '' }: MarkdownProps) {
  // Artifact detection
  const detectArtifact = (content: string): { type: 'html' | 'json' | 'image' | 'code' | 'text' | null } => {
    const trimmed = content.trim()
    
    // HTML detection
    if (/^<[^>]+>$/.test(trimmed) || trimmed.includes('<html')) {
      return { type: 'html' }
    }
    
    // JSON detection
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed)
        return { type: 'json' }
      } catch {
        // Invalid JSON
      }
    }
    
    // Image URL detection
    if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|svg|webp)$/i.test(trimmed)) {
      return { type: 'image' }
    }
    
    // Code block detection (```lang)
    const codeMatch = trimmed.match(/^```(\w+)?\n([\s\S]*?)\n```$/)
    if (codeMatch) {
      return { type: 'code' }
    }
    
    // Fenced code detection (single backticks)
    if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.length > 2) {
      return { type: 'code' }
    }
    
    return { type: 'text' }
  }
  
  const artifact = detectArtifact(content)
  
  // If it's an artifact, render the appropriate preview
  if (artifact.type && artifact.type !== 'text') {
    const getLanguageFromCode = (content: string): string => {
      const match = content.match(/^```(\w+)?/)
      return match ? match[1] || 'text' : 'text'
    }
    
    const props: ArtifactPreviewProps & { lang?: string } = {
      content,
      title: artifact.type === 'html' ? 'HTML Content' :
              artifact.type === 'json' ? 'JSON Data' :
              artifact.type === 'image' ? 'Image' :
              'Code',
      type: artifact.type,
      lang: artifact.type === 'code' ? getLanguageFromCode(content) : undefined
    }
    
    const ArtifactComponent = 
      artifact.type === 'html' ? HTMLArtifact :
      artifact.type === 'json' ? JSONArtifact :
      artifact.type === 'image' ? ImageArtifact :
      CodeArtifact
    
    return <ArtifactComponent {...props} />
  }
  
  // Regular markdown rendering with syntax highlighting
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: ({ inline, children, ...props }) => {
            if (inline) {
              return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
            }
            
            const codeContent = Array.isArray(children) ? children.join('') : String(children)
            const lang = props.className?.replace('language-', '') || 'text'
            
            return <CodeBlock code={codeContent} lang={lang as any} />
          },
          pre: ({ children }) => children,
          // Custom renderers for other elements if needed
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// Utility to extract language from markdown code blocks
function extractLanguage(content: string): string {
  const match = content.match(/^```(\w+)?/)
  return match ? match[1] || 'text' : 'text'
}