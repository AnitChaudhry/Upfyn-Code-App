// TableNode — structured data table block (Spine AI Table Block pattern)
import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_STYLES, type BaseNodeData } from './BaseNode';

interface TableNodeData extends BaseNodeData {
  columns?: string[];
  rows?: Record<string, string>[];
  sendMessage?: (msg: any) => void;
}

function TableNode({ id, data, selected }: NodeProps) {
  const nodeData = data as TableNodeData;
  const style = NODE_STYLES.table;

  const [prompt, setPrompt] = useState('');
  const [columns, setColumns] = useState<string[]>(nodeData.columns || []);
  const [rows, setRows] = useState<Record<string, string>[]>(nodeData.rows || []);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    if (nodeData.sendMessage) {
      nodeData.sendMessage({
        type: 'claude-command',
        command: `Generate structured tabular data for: ${prompt}\n\nReturn the data as a markdown table. The first row should be headers.`,
        options: { canvasMode: true, blockId: id, tableBlock: true },
      });
    }

    // Placeholder: parse from AI response in production
    setTimeout(() => {
      setColumns(['Name', 'Value', 'Status']);
      setRows([
        { Name: 'Example', Value: '100', Status: 'Active' },
        { Name: 'Sample', Value: '200', Status: 'Pending' },
      ]);
      setIsGenerating(false);
    }, 1500);
  }, [prompt, isGenerating, nodeData.sendMessage, id]);

  const handleExportCsv = useCallback(() => {
    if (columns.length === 0) return;
    const header = columns.join(',');
    const body = rows.map(r => columns.map(c => `"${(r[c] || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nodeData.label || 'table'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [columns, rows, nodeData.label]);

  return (
    <div
      className={`
        rounded-xl border-2 shadow-sm w-[360px] transition-shadow
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
            {nodeData.label || 'Table'}
          </span>
          {rows.length > 0 && (
            <span className="text-[9px] text-gray-400">({rows.length} rows)</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {rows.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="p-0.5 rounded hover:bg-slate-200 text-slate-500 transition-colors"
              title="Export CSV"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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
        </div>
      </div>

      {/* Table Content */}
      {columns.length > 0 ? (
        <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map(col => (
                  <th key={col} className="px-2 py-1.5 text-left font-semibold text-slate-600 bg-slate-100/50">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                  {columns.map(col => (
                    <td key={col} className="px-2 py-1 text-gray-600">
                      {row[col] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-3 py-2">
          <div className="flex items-end gap-1.5">
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }}
              placeholder="Describe the data you need..."
              className="flex-1 bg-white/60 text-gray-700 text-[11px] placeholder-gray-400 outline-none px-2 py-1.5 rounded-lg border border-slate-200/50 focus:border-slate-400/50"
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="shrink-0 px-2.5 py-1.5 bg-slate-600 text-white rounded-md text-[10px] font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              {isGenerating ? '...' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
    </div>
  );
}

export default memo(TableNode);
