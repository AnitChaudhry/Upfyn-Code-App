// ResponseNode — AI response with Branch/Copy actions (supports compact + full modes)
import React, { memo, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode, { type BaseNodeData } from './BaseNode';

function ResponseNode({ id, data, selected }: NodeProps) {
  const nodeData = data as BaseNodeData;

  const handleCopy = useCallback(() => {
    const text = String(nodeData.fullContent || nodeData.content || '');
    navigator.clipboard.writeText(text).catch(() => {});
  }, [nodeData.fullContent, nodeData.content]);

  // Compact mode — rendered entirely by BaseNode's compact path
  if (nodeData.compact) {
    return <BaseNode id={id} nodeType="response" data={nodeData} selected={selected} />;
  }

  // Full mode with actions
  const actions = (
    <>
      {nodeData.onBranch && (
        <button
          onClick={() => nodeData.onBranch!(id)}
          className="p-0.5 rounded hover:bg-purple-100 text-purple-500 transition-colors"
          title="Branch — create new prompt from this"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
      <button
        onClick={handleCopy}
        className="p-0.5 rounded hover:bg-purple-100 text-purple-400 transition-colors"
        title="Copy content"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </>
  );

  return (
    <BaseNode id={id} nodeType="response" data={nodeData} selected={selected} actions={actions} />
  );
}

export default memo(ResponseNode);
