import { useEffect, useRef, useState } from 'react';
import { marked, type Tokens } from 'marked';
import DOMPurify from 'dompurify';
import { codeToHtml } from 'shiki';

interface MarkdownProps {
  content: string;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const renderer = new marked.Renderer();
renderer.code = (token: Tokens.Code): string => {
  const language = token.lang || 'text';
  const highlighted = (token as Tokens.Code & { highlightedHtml?: string }).highlightedHtml;
  if (highlighted) return highlighted;
  const escaped = escapeHtml(token.text);
  const languageClass = language ? `language-${language}` : '';
  return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto"><code class="${languageClass}">${escaped}</code></pre>`;
};

marked.setOptions({
  breaks: true,
  gfm: true,
});
marked.use({
  renderer,
  async: true,
  walkTokens: async (token) => {
    if (token.type !== 'code') return;
    const language = token.lang || 'text';
    try {
      const highlightedHtml = await codeToHtml(token.text, {
        lang: language,
        theme: 'dark-plus',
      });
      (token as Tokens.Code & { highlightedHtml?: string }).highlightedHtml = highlightedHtml;
    } catch {
      // Fallback to default renderer without syntax highlighting.
    }
  }
});

export function Markdown({ content, className = '' }: MarkdownProps) {
  const [html, setHtml] = useState('');
  const prevContentRef = useRef<string>('');
  const renderIdRef = useRef(0);

  useEffect(() => {
    const renderMarkdown = async () => {
      if (content === prevContentRef.current) return;
      prevContentRef.current = content;
      const renderId = ++renderIdRef.current;
      const rawHtml = await marked.parse(content);
      if (renderId !== renderIdRef.current) return;
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li',
          'blockquote',
          'a', 'img',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'hr',
          'div', 'span',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
        ALLOW_DATA_ATTR: false,
      });
      if (renderId !== renderIdRef.current) return;
      setHtml(cleanHtml);
    };
    renderMarkdown();
  }, [content]);

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
