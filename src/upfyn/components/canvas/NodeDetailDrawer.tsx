// NodeDetailDrawer — right slide-over panel for viewing full node content
import React, { memo, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NODE_STYLES } from './nodes/BaseNode';
import type { Node } from '@xyflow/react';

interface NodeDetailDrawerProps {
  node: Node | null;
  onClose: () => void;
  onPin: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}

function NodeDetailDrawer({ node, onClose, onPin, onDelete }: NodeDetailDrawerProps) {
  // Escape to close
  useEffect(() => {
    if (!node) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [node, onClose]);

  const handleCopy = useCallback(() => {
    if (!node) return;
    const text = String(node.data?.fullContent || node.data?.content || '');
    navigator.clipboard.writeText(text).catch(() => {});
  }, [node]);

  if (!node) return null;

  const nodeType = node.type || 'response';
  const style = NODE_STYLES[nodeType] || NODE_STYLES.note;
  const fullContent = String(node.data?.fullContent || node.data?.content || '');
  const label = String(node.data?.label || nodeType);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${style.bg}`}>
          <div className="flex items-center gap-2">
            <span className="text-base">{style.icon}</span>
            <span className={`text-sm font-semibold ${style.accent} uppercase tracking-wide`}>
              {label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/10 text-gray-500 transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {fullContent}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => { onPin(node.id); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Pin to Canvas
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
          <button
            onClick={() => { onDelete(node.id); onClose(); }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

export default memo(NodeDetailDrawer);
