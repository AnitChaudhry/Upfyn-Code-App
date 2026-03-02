// PdfNode — uploaded PDF with thumbnail + extracted text
import React, { memo, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode, { type BaseNodeData } from './BaseNode';

interface PdfNodeData extends BaseNodeData {
  fileName?: string;
  pageCount?: number;
  extractedText?: string;
  thumbnail?: string;
}

function PdfNode({ id, data, selected }: NodeProps) {
  const nodeData = data as PdfNodeData;

  const handleCopy = useCallback(() => {
    const text = nodeData.extractedText || nodeData.content || '';
    navigator.clipboard.writeText(String(text)).catch(() => {});
  }, [nodeData]);

  const actions = (
    <>
      <button
        onClick={handleCopy}
        className="p-0.5 rounded hover:bg-red-100 text-red-400 transition-colors"
        title="Copy extracted text"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      {nodeData.onDelete && (
        <button
          onClick={() => nodeData.onDelete!(id)}
          className="p-0.5 rounded hover:bg-red-100 text-red-400 transition-colors"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </>
  );

  return (
    <BaseNode
      id={id}
      nodeType="pdf"
      data={{ ...nodeData, label: nodeData.fileName || 'PDF' }}
      selected={selected}
      actions={actions}
    >
      <div className="space-y-2">
        {nodeData.thumbnail && (
          <img src={nodeData.thumbnail} alt="PDF preview" className="w-full rounded border border-red-200" />
        )}
        {nodeData.pageCount && (
          <div className="text-[10px] text-red-400">{nodeData.pageCount} page{nodeData.pageCount > 1 ? 's' : ''}</div>
        )}
        <div className="text-xs text-gray-600 max-h-[200px] overflow-y-auto">
          {(nodeData.extractedText || nodeData.content || '').toString().slice(0, 500)}
          {((nodeData.extractedText || nodeData.content || '').toString().length > 500) && '...'}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(PdfNode);
