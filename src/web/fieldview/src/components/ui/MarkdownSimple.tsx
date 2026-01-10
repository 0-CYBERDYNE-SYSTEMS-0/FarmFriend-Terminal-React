// Simple Markdown renderer without external dependencies
import React from 'react'
import { CodeBlock } from './CodeBlock'
import { 
  HTMLArtifact, 
  JSONArtifact, 
  ImageArtifact, 
  CodeArtifact 
} from './ArtifactPreview'

interface ArtifactPreviewProps {
  content: string
  title?: string
  type: 'html' | 'json' | 'image' | 'code' | 'text'
  lang?: string
}

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
  
  // Simple markdown parsing and rendering
  const renderMarkdown = (text: string): JSX.Element[] => {
    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let currentParagraph: string[] = []
    let inCodeBlock = false
    let codeLang = ''
    let codeContent: string[] = []
    
    for (const line of lines) {
      // Code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Start code block
          inCodeBlock = true
          codeLang = line.slice(3).trim() || 'text'
        } else {
          // End code block
          inCodeBlock = false
          elements.push(
            <CodeBlock 
              code={codeContent.join('\n')} 
              lang={codeLang as any} 
            />
          )
          codeContent = []
        }
        continue
      }
      
      if (inCodeBlock) {
        codeContent.push(line)
        continue
      }
      
      // Headers
      if (line.startsWith('#')) {
        if (currentParagraph.length > 0) {
          elements.push(<p className="mb-2">{currentParagraph.join(' ')}</p>)
          currentParagraph = []
        }
        const level = line.match(/^#+/)?.[0].length || 1
        const HeaderTag = `h${Math.min(level, 6)}`
        elements.push(
          React.createElement(
            HeaderTag,
            { className: `font-bold mt-4 mb-2 text-${level === 1 ? '2xl' : level === 2 ? 'xl' : level === 3 ? 'lg' : 'md'}` },
            line.replace(/^#+\s*/, '')
          )
        )
        continue
      }
      
      // Lists
      if (line.match(/^\s*[-*+]\s/)) {
        if (currentParagraph.length > 0) {
          elements.push(<p className="mb-2">{currentParagraph.join(' ')}</p>)
          currentParagraph = []
        }
        elements.push(
          <li className="ml-4 mb-1">{line.replace(/^\s*[-*+]\s/, '')}</li>
        )
        continue
      }
      
      // Block quotes
      if (line.startsWith('>')) {
        if (currentParagraph.length > 0) {
          elements.push(<p className="mb-2">{currentParagraph.join(' ')}</p>)
          currentParagraph = []
        }
        elements.push(
          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">
            {line.replace(/^>\s?/, '')}
          </blockquote>
        )
        continue
      }
      
      // Empty line
      if (line.trim() === '') {
        if (currentParagraph.length > 0) {
          elements.push(<br />)
        } else {
          elements.push(<p className="mb-2">{currentParagraph.join(' ')}</p>)
          currentParagraph = []
        }
        continue
      }
      
      // Regular text
      currentParagraph.push(line)
    }
    
    // Add remaining paragraph
    if (currentParagraph.length > 0) {
      elements.push(<p className="mb-2">{currentParagraph.join(' ')}</p>)
    }
    
    return elements
  }

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {renderMarkdown(content)}
    </div>
  )
}