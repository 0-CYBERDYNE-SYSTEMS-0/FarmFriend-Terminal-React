import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
// import rehypeHighlight from 'rehype-highlight'
import { CodeBlock } from './CodeBlock'

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className = '' }: MarkdownProps) {
  // Regular markdown rendering with syntax highlighting
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // rehypePlugins={[rehypeHighlight]}
        components={{
          code: (props: any) => {
            const { inline, children } = props
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
// function extractLanguage(content: string): string {
//   const match = content.match(/^```(\w+)?/)
//   return match ? match[1] || 'text' : 'text'
// }
