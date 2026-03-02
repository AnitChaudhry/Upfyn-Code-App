// PromptNode — user AI prompt with Run/Rerun/Edit/Delete actions
import React, { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode, { type BaseNodeData } from './BaseNode';

interface PromptNodeData extends BaseNodeData {
  onRerun?: (id: string, text: string) => void;
}

function PromptNode({ id, data, selected }: NodeProps) {
  const nodeData = data as PromptNodeData;

  const actions = (
    <>
      {/* Run — creates a new prompt + runs AI */}
      {nodeData.onRun && (
        <button
          onClick={() => nodeData.onRun!(id, String(nodeData.content || ''))}
          className="p-0.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
          title="Run this prompt"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
      {/* Rerun — re-sends the same prompt text from this node */}
      {nodeData.onRerun && (
        <button
          onClick={() => nodeData.onRerun!(id, String(nodeData.content || ''))}
          className="p-0.5 rounded hover:bg-green-100 text-green-600 transition-colors"
          title="Rerun — send this prompt again"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
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
    <BaseNode id={id} nodeType="prompt" data={nodeData} selected={selected} actions={actions} />
  );
}

export default memo(PromptNode);
