// WebPageNode — static thumbnail node for HTML pages on canvas
import React, { memo, useRef, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NODE_STYLES, type BaseNodeData } from './BaseNode';

interface WebPageNodeData extends BaseNodeData {
  html?: string;
  pageName?: string;
  pageIndex?: number;
  onWebPageClick?: (id: string) => void;
}

function WebPageNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WebPageNodeData;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const style = NODE_STYLES.webpage;

  // Write HTML into the iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !nodeData.html) return;

    const handleLoad = () => setLoaded(true);
    iframe.addEventListener('load', handleLoad);

    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(nodeData.html);
      doc.close();
      setLoaded(true);
    }

    return () => iframe.removeEventListener('load', handleLoad);
  }, [nodeData.html]);

  return (
    <div
      className={`
        rounded-xl border-2 shadow-sm w-[240px] transition-shadow cursor-pointer
        ${style.bg} ${style.border}
        ${selected ? 'ring-2 ring-primary/40 shadow-md' : 'hover:shadow-md'}
      `}
      onClick={() => nodeData.onWebPageClick?.(id)}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-indigo-400 !border-indigo-300" />

      {/* Page index badge */}
      {nodeData.pageIndex && (
        <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
          {nodeData.pageIndex}
        </div>
      )}

      {/* Thumbnail — scaled iframe preview */}
      <div className="w-full h-[150px] overflow-hidden rounded-t-lg bg-white relative">
        {nodeData.html ? (
          <div className="w-[960px] h-[600px] origin-top-left" style={{ transform: 'scale(0.25)' }}>
            <iframe
              ref={iframeRef}
              className="w-full h-full border-none pointer-events-none"
              sandbox="allow-same-origin"
              title={nodeData.pageName || 'Page preview'}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
        )}
      </div>

      {/* Label */}
      <div className="px-3 py-2 border-t border-indigo-200/50">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{style.icon}</span>
          <span className="text-[11px] font-semibold text-indigo-700 truncate">
            {nodeData.pageName || nodeData.label || 'Page'}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">Click to edit</p>
      </div>

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-indigo-400 !border-indigo-300" />
    </div>
  );
}

export default memo(WebPageNode);
