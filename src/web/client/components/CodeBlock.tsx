import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = 'text', className = '' }: CodeBlockProps) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const highlight = async () => {
      try {
        const highlighted = await codeToHtml(code, {
          lang: language,
          theme: 'dark-plus',
        });
        setHtml(highlighted);
      } catch {
        // Fallback to pre/code if language not supported
        setHtml(`<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto"><code>${escapeHtml(code)}</code></pre>`);
      }
      setLoading(false);
    };
    highlight();
  }, [code, language]);

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  if (loading) {
    return (
      <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
        <pre className="text-gray-300 text-sm overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
