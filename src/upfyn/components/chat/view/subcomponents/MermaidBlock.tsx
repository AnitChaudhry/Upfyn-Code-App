import React, { useEffect, useRef, useState, useId } from 'react';

let mermaidInitialized = false;

async function getMermaid() {
  const m = await import('mermaid');
  if (!mermaidInitialized) {
    m.default.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#1e293b',
        primaryColor: '#3b82f6',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#475569',
        lineColor: '#64748b',
        secondaryColor: '#1e40af',
        tertiaryColor: '#0f172a',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '14px',
      },
      flowchart: { htmlLabels: true, curve: 'basis' },
      sequence: { mirrorActors: false },
    });
    mermaidInitialized = true;
  }
  return m.default;
}

type MermaidBlockProps = {
  code: string;
};

export default function MermaidBlock({ code }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId().replace(/:/g, '-');
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const mermaid = await getMermaid();
        const { svg: rendered } = await mermaid.render(`mermaid${uniqueId}`, code.trim());
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to render diagram');
          setSvg(null);
        }
      }
    };
    render();
    return () => { cancelled = true; };
  }, [code, uniqueId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  if (error) {
    return (
      <div className="my-2 rounded-lg border border-red-500/30 bg-red-950/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-medium text-red-400">Mermaid diagram error</span>
        </div>
        <pre className="text-xs text-red-300/70 whitespace-pre-wrap font-mono">{code}</pre>
      </div>
    );
  }

  return (
    <div className="relative group my-2 rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700/50 bg-slate-800/30">
        <span className="text-xs text-slate-400 font-medium uppercase">mermaid</span>
        <button
          type="button"
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-0.5 rounded bg-slate-700/80 hover:bg-slate-700 text-slate-300 border border-slate-600"
        >
          {copied ? 'Copied' : 'Copy source'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex items-center justify-center p-4 min-h-[80px] overflow-x-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      >
        {!svg && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Rendering diagram...
          </div>
        )}
      </div>
    </div>
  );
}
