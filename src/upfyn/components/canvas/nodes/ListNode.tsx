// ListNode — bulk parallel operations block (Spine AI List Block pattern)
import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_STYLES, type BaseNodeData } from './BaseNode';

interface ListItem {
  id: string;
  text: string;
  status?: 'pending' | 'processing' | 'done';
  result?: string;
}

interface ListNodeData extends BaseNodeData {
  items?: ListItem[];
  sendMessage?: (msg: any) => void;
}

let _listItemId = 0;

function ListNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ListNodeData;
  const style = NODE_STYLES.list;

  const [items, setItems] = useState<ListItem[]>(
    (nodeData.items || []).map(i => ({ ...i, id: i.id || `li_${++_listItemId}` }))
  );
  const [newItem, setNewItem] = useState('');
  const [bulkPrompt, setBulkPrompt] = useState('');

  const handleAddItem = useCallback(() => {
    const text = newItem.trim();
    if (!text) return;
    setItems(prev => [...prev, { id: `li_${++_listItemId}`, text, status: 'pending' }]);
    setNewItem('');
  }, [newItem]);

  const handleRemoveItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const handleBulkProcess = useCallback(() => {
    if (!bulkPrompt.trim() || items.length === 0) return;

    // Mark all as processing
    setItems(prev => prev.map(i => ({ ...i, status: 'processing' as const })));

    // In production, each item would be sent for parallel AI processing
    setTimeout(() => {
      setItems(prev => prev.map(i => ({
        ...i,
        status: 'done' as const,
        result: `Processed: ${i.text} (${bulkPrompt})`
      })));
    }, 2000);
  }, [bulkPrompt, items]);

  const doneCount = items.filter(i => i.status === 'done').length;
  const processingCount = items.filter(i => i.status === 'processing').length;

  return (
    <div
      className={`
        rounded-xl border-2 shadow-sm w-[280px] transition-shadow
        ${style.bg} ${style.border}
        ${selected ? 'ring-2 ring-primary/40 shadow-md' : 'hover:shadow-md'}
      `}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />

      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${style.border}/30`}>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{style.icon}</span>
          <span className={`text-xs font-semibold ${style.accent} uppercase tracking-wide`}>
            {nodeData.label || 'List'}
          </span>
          <span className="text-[9px] text-gray-400">
            ({items.length}{doneCount > 0 ? `, ${doneCount} done` : ''})
          </span>
        </div>
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
      </div>

      {/* Items list */}
      <div className="max-h-[180px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-[10px] text-gray-400 text-center py-3">Add items to the list</p>
        ) : (
          <div className="divide-y divide-violet-100">
            {items.map(item => (
              <div key={item.id} className="flex items-start gap-1.5 px-3 py-1.5 group">
                <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                  item.status === 'done' ? 'bg-emerald-400' :
                  item.status === 'processing' ? 'bg-violet-400 animate-pulse' :
                  'bg-gray-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-700 truncate">{item.text}</p>
                  {item.result && (
                    <p className="text-[9px] text-gray-400 truncate mt-0.5">{item.result}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-300 transition-all shrink-0"
                  title="Remove"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add item */}
      <div className="px-3 py-1.5 border-t border-violet-200/30">
        <div className="flex items-center gap-1.5 mb-1.5">
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddItem(); }}
            placeholder="Add item..."
            className="flex-1 bg-white/60 text-gray-700 text-[11px] placeholder-gray-400 outline-none px-2 py-1 rounded border border-violet-200/50 focus:border-violet-400/50"
          />
          <button
            onClick={handleAddItem}
            disabled={!newItem.trim()}
            className="text-[10px] px-2 py-1 bg-violet-500 text-white rounded font-medium hover:bg-violet-600 disabled:opacity-40 transition-colors"
          >
            +
          </button>
        </div>
        {/* Bulk action */}
        {items.length > 0 && (
          <div className="flex items-center gap-1.5">
            <input
              value={bulkPrompt}
              onChange={e => setBulkPrompt(e.target.value)}
              placeholder="Bulk action for all items..."
              className="flex-1 bg-white/60 text-gray-700 text-[10px] placeholder-gray-400 outline-none px-2 py-1 rounded border border-violet-200/50 focus:border-violet-400/50"
            />
            <button
              onClick={handleBulkProcess}
              disabled={!bulkPrompt.trim() || processingCount > 0}
              className="text-[9px] px-2 py-1 bg-violet-600 text-white rounded font-medium hover:bg-violet-700 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {processingCount > 0 ? 'Running...' : 'Run All'}
            </button>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
    </div>
  );
}

export default memo(ListNode);
