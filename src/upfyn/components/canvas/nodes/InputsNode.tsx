// InputsNode — parameter variables that cascade to connected blocks (Spine AI Inputs Block pattern)
import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_STYLES, type BaseNodeData } from './BaseNode';

interface Variable {
  key: string;
  value: string;
  type: 'text' | 'number' | 'toggle';
}

interface InputsNodeData extends BaseNodeData {
  variables?: Record<string, string>;
}

function InputsNode({ id, data, selected }: NodeProps) {
  const nodeData = data as InputsNodeData;
  const style = NODE_STYLES.inputs;

  const initialVars: Variable[] = Object.entries(nodeData.variables || {}).map(([key, value]) => ({
    key,
    value: String(value),
    type: 'text' as const,
  }));

  const [variables, setVariables] = useState<Variable[]>(initialVars.length > 0 ? initialVars : []);
  const [newKey, setNewKey] = useState('');

  const handleAddVariable = useCallback(() => {
    const key = newKey.trim();
    if (!key || variables.some(v => v.key === key)) return;
    setVariables(prev => [...prev, { key, value: '', type: 'text' }]);
    setNewKey('');
  }, [newKey, variables]);

  const handleUpdateValue = useCallback((key: string, value: string) => {
    setVariables(prev => prev.map(v => v.key === key ? { ...v, value } : v));
  }, []);

  const handleRemoveVariable = useCallback((key: string) => {
    setVariables(prev => prev.filter(v => v.key !== key));
  }, []);

  const handleChangeType = useCallback((key: string, type: Variable['type']) => {
    setVariables(prev => prev.map(v => v.key === key ? { ...v, type } : v));
  }, []);

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
            {nodeData.label || 'Inputs'}
          </span>
          <span className="text-[9px] text-gray-400">({variables.length} vars)</span>
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

      {/* Variables list */}
      <div className="max-h-[200px] overflow-y-auto">
        {variables.length === 0 ? (
          <p className="text-[10px] text-gray-400 text-center py-3">
            Add variables that cascade to connected blocks via <code className="bg-orange-100 px-1 rounded">{'{{key}}'}</code>
          </p>
        ) : (
          <div className="divide-y divide-orange-100">
            {variables.map(v => (
              <div key={v.key} className="px-3 py-1.5 group">
                <div className="flex items-center gap-1.5 mb-1">
                  <code className="text-[10px] font-mono text-orange-600 bg-orange-100/60 px-1 py-0.5 rounded">
                    {`{{${v.key}}}`}
                  </code>
                  <select
                    value={v.type}
                    onChange={e => handleChangeType(v.key, e.target.value as Variable['type'])}
                    className="text-[9px] text-gray-400 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="toggle">toggle</option>
                  </select>
                  <button
                    onClick={() => handleRemoveVariable(v.key)}
                    className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-300 transition-all"
                    title="Remove variable"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {v.type === 'toggle' ? (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.value === 'true'}
                      onChange={e => handleUpdateValue(v.key, e.target.checked ? 'true' : 'false')}
                      className="w-3 h-3 rounded border-orange-300 text-orange-500 focus:ring-orange-400"
                    />
                    <span className="text-[10px] text-gray-500">{v.value === 'true' ? 'On' : 'Off'}</span>
                  </label>
                ) : (
                  <input
                    value={v.value}
                    onChange={e => handleUpdateValue(v.key, e.target.value)}
                    type={v.type === 'number' ? 'number' : 'text'}
                    placeholder={`Enter ${v.key} value...`}
                    className="w-full bg-white/60 text-gray-700 text-[11px] placeholder-gray-400 outline-none px-2 py-1 rounded border border-orange-200/50 focus:border-orange-400/50"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add variable */}
      <div className="px-3 py-1.5 border-t border-orange-200/30">
        <div className="flex items-center gap-1.5">
          <input
            value={newKey}
            onChange={e => setNewKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') handleAddVariable(); }}
            placeholder="variable_name"
            className="flex-1 bg-white/60 text-gray-700 text-[11px] font-mono placeholder-gray-400 outline-none px-2 py-1 rounded border border-orange-200/50 focus:border-orange-400/50"
          />
          <button
            onClick={handleAddVariable}
            disabled={!newKey.trim()}
            className="text-[10px] px-2 py-1 bg-orange-500 text-white rounded font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
    </div>
  );
}

export default memo(InputsNode);
