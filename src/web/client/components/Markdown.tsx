import { useEffect, useState } from 'react';
import { marked } from 'marked';
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
renderer.code = async (code, infostring) => {
  const language = (infostring || '').match(/\S+/)?.[0] || 'text';
  try {
    return await codeToHtml(code, {
      lang: language,
      theme: 'dark-plus',
    });
  } catch {
    const escaped = escapeHtml(code);
    const languageClass = language ? `language-${language}` : '';
    return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto"><code class="${languageClass}">${escaped}</code></pre>`;
  }
};

marked.setOptions({
  breaks: true,
  gfm: true,
});
marked.use({ renderer, async: true });

export function Markdown({ content, className = '' }: MarkdownProps) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const renderMarkdown = async () => {
      const rawHtml = await marked.parse(content);
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
