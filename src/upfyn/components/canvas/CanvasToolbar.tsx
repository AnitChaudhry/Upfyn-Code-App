// CanvasToolbar — left-side toolbar for canvas actions
import React, { memo, useCallback, useRef } from 'react';

interface CanvasToolbarProps {
  onAddNote: () => void;
  onAddPdf: (file: File) => void;
  onRun: () => void;
  onStop: () => void;
  onClearAi: () => void;
  onAutoLayout: () => void;
  onExport: () => void;
  onTemplates?: () => void;
  onSwarm?: () => void;
  isRunning: boolean;
}

function CanvasToolbar({ onAddNote, onAddPdf, onRun, onStop, onClearAi, onAutoLayout, onExport, onTemplates, onSwarm, isRunning }: CanvasToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onAddPdf(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onAddPdf]);

  const tools = [
    {
      label: 'Add Note',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onClick: onAddNote,
      color: 'hover:bg-blue-50 hover:text-blue-600',
    },
    {
      label: 'Add PDF',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      onClick: () => fileInputRef.current?.click(),
      color: 'hover:bg-red-50 hover:text-red-600',
    },
    { type: 'divider' as const },
    {
      label: isRunning ? 'Stop AI' : 'Run AI',
      icon: isRunning ? (
        <div className="w-3 h-3 bg-red-500 rounded-sm" />
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      ),
      onClick: isRunning ? onStop : onRun,
      color: isRunning ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'hover:bg-green-50 hover:text-green-600',
    },
    {
      label: 'Clear AI',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: onClearAi,
      color: 'hover:bg-gray-100 hover:text-gray-600',
    },
    { type: 'divider' as const },
    {
      label: 'Auto Layout',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      onClick: onAutoLayout,
      color: 'hover:bg-indigo-50 hover:text-indigo-600',
    },
    {
      label: 'Templates',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      onClick: onTemplates || (() => {}),
      color: 'hover:bg-violet-50 hover:text-violet-600',
    },
    {
      label: 'Swarm',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      onClick: onSwarm || (() => {}),
      color: 'hover:bg-fuchsia-50 hover:text-fuchsia-600',
    },
    {
      label: 'Export',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      onClick: onExport,
      color: 'hover:bg-emerald-50 hover:text-emerald-600',
    },
  ];

  return (
    <div className="absolute top-1/2 left-3 -translate-y-1/2 z-20">
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-1.5 flex flex-col gap-1">
        {tools.map((tool, i) => {
          if ('type' in tool && tool.type === 'divider') {
            return <div key={i} className="h-px bg-gray-200 mx-1 my-0.5" />;
          }
          const t = tool as { label: string; icon: React.ReactNode; onClick: () => void; color: string };
          return (
            <button
              key={t.label}
              onClick={t.onClick}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 transition-colors ${t.color}`}
              title={t.label}
            >
              {t.icon}
            </button>
          );
        })}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handlePdfSelect}
        className="hidden"
      />
    </div>
  );
}

export default memo(CanvasToolbar);
