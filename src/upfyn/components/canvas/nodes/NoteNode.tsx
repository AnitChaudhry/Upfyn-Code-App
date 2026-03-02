// NoteNode — editable user text block
import React, { useState, useCallback, memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode, { type BaseNodeData } from './BaseNode';

function NoteNode({ id, data, selected }: NodeProps) {
  const nodeData = data as BaseNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(String(nodeData.content || ''));

  const handleSave = useCallback(() => {
    setIsEditing(false);
    nodeData.onEdit?.(id);
  }, [id, nodeData]);

  const actions = (
    <>
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="p-0.5 rounded hover:bg-blue-100 text-blue-500 transition-colors"
          title="Edit"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
    <BaseNode id={id} nodeType="note" data={nodeData} selected={selected} actions={actions}>
      {isEditing ? (
        <textarea
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === 'Escape') handleSave(); }}
          className="w-full bg-white/70 border border-blue-200 rounded px-2 py-1 text-xs resize-none min-h-[60px] outline-none focus:border-blue-400"
          rows={4}
        />
      ) : (
        <div className="cursor-text" onDoubleClick={() => setIsEditing(true)}>
          {editText || <span className="text-gray-400 italic">Double-click to edit...</span>}
        </div>
      )}
    </BaseNode>
  );
}

export default memo(NoteNode);
