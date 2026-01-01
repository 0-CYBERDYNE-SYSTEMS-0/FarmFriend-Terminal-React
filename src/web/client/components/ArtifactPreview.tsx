import { useMemo, useState } from 'react';

interface ArtifactPreviewProps {
  content: string;
  type?: 'html' | 'json' | 'image' | 'markdown' | 'text';
  className?: string;
}

export function ArtifactPreview({ content, type = 'text', className = '' }: ArtifactPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-detect type if not specified
  const detectedType = useMemo(() => {
    if (type !== 'text') return type;
    const trimmed = content.trim();
    const lower = trimmed.toLowerCase();

    // Check for HTML
    if (lower.startsWith('<!doctype html>') || lower.startsWith('<html')) {
      return 'html';
    }
    // Check for JSON
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        JSON.parse(content);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }
    // Check for Markdown
    if (content.match(/^#{1,6}\s+/m) || content.includes('```')) {
      return 'markdown';
    }
    // Check for image URL
    if (content.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
      return 'image';
    }
    return 'text';
  }, [content, type]);

  const actualType = detectedType as 'html' | 'json' | 'image' | 'markdown' | 'text';

  const renderContent = () => {
    switch (actualType) {
      case 'html':
        return (
          <div className="relative">
            <div className="bg-gray-800 px-3 py-2 text-xs text-gray-400 flex justify-between items-center">
              <span>HTML Artifact</span>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-blue-400 hover:text-blue-300"
              >
                {expanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {expanded ? (
              <iframe
                srcDoc={content}
                className="w-full h-96 border-0 bg-white"
                sandbox="allow-scripts allow-same-origin"
                title="HTML Preview"
              />
            ) : (
              <div className="bg-gray-900 p-4 max-h-64 overflow-auto">
                <pre className="text-green-400 text-xs">{content.slice(0, 1000)}{content.length > 1000 && '...'}</pre>
              </div>
            )}
          </div>
        );

      case 'json':
        try {
          const parsed = JSON.parse(content);
          return (
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-3 py-2 text-xs text-gray-400">JSON</div>
              <pre className="p-4 text-blue-300 text-sm overflow-x-auto">
                {JSON.stringify(parsed, null, 2)}
              </pre>
            </div>
          );
        } catch {
          return <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg">{content}</pre>;
        }

      case 'image':
        return (
          <div className="bg-gray-900 rounded-lg p-4">
            <img src={content} alt="Artifact" className="max-w-full h-auto rounded" />
            <a href={content} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs mt-2 inline-block">
              Open image in new tab
            </a>
          </div>
        );

      case 'markdown':
        return (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-800 px-3 py-2 text-xs text-gray-400">Markdown</div>
            <div className="p-4 prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-gray-300">{content}</pre>
            </div>
          </div>
        );

      default:
        return <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg whitespace-pre-wrap">{content}</pre>;
    }
  };

  return (
    <div className={`artifact-preview my-2 ${className}`}>
      {renderContent()}
    </div>
  );
}
