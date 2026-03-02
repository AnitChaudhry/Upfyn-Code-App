import React, { useMemo, useState, useCallback, lazy, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTranslation } from 'react-i18next';
import { normalizeInlineCodeFences } from '../../utils/chatFormatting';
import { useArtifactOpen } from '../../contexts/ArtifactContext';

const MermaidBlock = lazy(() => import('./MermaidBlock'));

type MarkdownProps = {
  children: React.ReactNode;
  className?: string;
};

type CodeBlockProps = {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
};

/** Build an HTML document that wraps React JSX/TSX code for iframe preview */
function buildReactPreviewHtml(code: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/recharts@2/umd/Recharts.min.js"><\/script>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css" rel="stylesheet" />
<style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;background:#fff;color:#111}
#root{min-height:100vh}</style>
</head><body><div id="root"></div>
<script type="text/babel">
const { useState, useEffect, useRef, useMemo, useCallback, Fragment } = React;
${code}

// Try to find and render the default export or last component
const _components = [];
${code.replace(/(?:export\s+default\s+)?(?:function|const)\s+([A-Z]\w*)/g, (_, name) => {
    return `_components.push(typeof ${name} !== 'undefined' ? ${name} : null);`;
  })}
const _App = _components.filter(Boolean).pop();
if (_App) {
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(_App));
} else {
  document.getElementById('root').innerHTML = '<p style="color:#666">No component found to render</p>';
}
<\/script></body></html>`;
}

const PREVIEWABLE_LANGUAGES = new Set(['html', 'jsx', 'tsx', 'react']);

function isPreviewableCode(language: string, code: string): boolean {
  if (PREVIEWABLE_LANGUAGES.has(language)) return true;
  // Detect HTML-like content in unmarked code blocks
  if (language === 'text' && code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html')) return true;
  return false;
}

function buildPreviewHtml(language: string, code: string): string {
  if (language === 'jsx' || language === 'tsx' || language === 'react') {
    return buildReactPreviewHtml(code);
  }
  // Plain HTML
  if (code.trim().toLowerCase().startsWith('<!doctype') || code.trim().toLowerCase().startsWith('<html')) {
    return code;
  }
  // HTML fragment — wrap in basic document
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>body{margin:0;padding:16px;font-family:system-ui,sans-serif}</style>
</head><body>${code}</body></html>`;
}

const CodeBlock = ({ node, inline, className, children, ...props }: CodeBlockProps) => {
  const { t } = useTranslation('chat');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const artifactOpen = useArtifactOpen();
  const raw = Array.isArray(children) ? children.join('') : String(children ?? '');
  const looksMultiline = /[\r\n]/.test(raw);
  const inlineDetected = inline || (node && node.type === 'inlineCode');
  const shouldInline = inlineDetected || !looksMultiline;

  if (shouldInline) {
    return (
      <code
        className={`font-mono text-[0.9em] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-900 border border-gray-200 dark:bg-gray-800/60 dark:text-gray-100 dark:border-gray-700 whitespace-pre-wrap break-words ${
          className || ''
        }`}
        {...props}
      >
        {children}
      </code>
    );
  }

  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  const canPreview = isPreviewableCode(language, raw);

  // Render mermaid diagrams as live SVG
  if (language === 'mermaid') {
    return (
      <Suspense fallback={<div className="my-2 p-4 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-slate-500">Loading diagram...</div>}>
        <MermaidBlock code={raw} />
      </Suspense>
    );
  }

  const textToCopy = raw;

  const handleCopy = () => {
    const doSet = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(doSet).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = textToCopy;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand('copy');
          } catch {}
          document.body.removeChild(ta);
          doSet();
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
        } catch {}
        document.body.removeChild(ta);
        doSet();
      }
    } catch {}
  };

  const handleOpenInPanel = () => {
    if (!artifactOpen) return;
    artifactOpen({
      id: `html-preview-${Date.now()}`,
      type: 'html',
      title: language === 'html' ? 'HTML Preview' : 'React Preview',
      data: { html: buildPreviewHtml(language, raw) },
    });
  };

  return (
    <div className="relative group my-2">
      {/* Header bar with language label, Code/Preview toggle, copy + panel buttons */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded-t-lg border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          {language && language !== 'text' && (
            <span className="text-xs text-gray-400 font-medium uppercase">{language}</span>
          )}
          {canPreview && (
            <div className="flex items-center rounded-md bg-gray-700/50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                  viewMode === 'code'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Code
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Preview
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canPreview && artifactOpen && (
            <button
              type="button"
              onClick={handleOpenInPanel}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded-md bg-gray-700/80 hover:bg-gray-700 text-gray-300 border border-gray-600"
              title="Open in side panel"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 active:opacity-100 transition-opacity text-xs px-2 py-0.5 rounded-md bg-gray-700/80 hover:bg-gray-700 text-white border border-gray-600"
            title={copied ? t('codeBlock.copied') : t('codeBlock.copyCode')}
            aria-label={copied ? t('codeBlock.copied') : t('codeBlock.copyCode')}
          >
            {copied ? (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {t('codeBlock.copied')}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                </svg>
                {t('codeBlock.copy')}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Code view */}
      {viewMode === 'code' && (
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 0.5rem 0.5rem',
            fontSize: '0.875rem',
            padding: '1rem',
          }}
          codeTagProps={{
            style: {
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            },
          }}
        >
          {raw}
        </SyntaxHighlighter>
      )}

      {/* Preview view */}
      {viewMode === 'preview' && canPreview && (
        <div className="bg-white rounded-b-lg overflow-hidden border border-gray-700 border-t-0">
          <iframe
            srcDoc={buildPreviewHtml(language, raw)}
            sandbox="allow-scripts allow-same-origin"
            className="w-full border-0"
            style={{ minHeight: '200px', height: '400px' }}
            title="Code preview"
          />
        </div>
      )}
    </div>
  );
};

const markdownComponents = {
  code: CodeBlock,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  p: ({ children }: { children?: React.ReactNode }) => <div className="mb-2 last:mb-0">{children}</div>,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>,
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left text-sm font-semibold border border-gray-200 dark:border-gray-700">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 align-top text-sm border border-gray-200 dark:border-gray-700">{children}</td>
  ),
};

export function Markdown({ children, className }: MarkdownProps) {
  const content = normalizeInlineCodeFences(String(children ?? ''));
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);
  const rehypePlugins = useMemo(() => [rehypeKatex], []);

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={markdownComponents as any}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
