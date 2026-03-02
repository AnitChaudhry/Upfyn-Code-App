// ComparisonNode — multi-model side-by-side comparison (Flora AI pattern)
import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_STYLES, BLOCK_MODELS, type BaseNodeData, type ModelOption } from './BaseNode';

interface ComparisonResult {
  modelId: string;
  modelLabel: string;
  content: string;
  status: 'pending' | 'running' | 'completed';
}

interface ComparisonNodeData extends BaseNodeData {
  models?: string[];
  results?: ComparisonResult[];
  sendMessage?: (msg: any) => void;
}

function ComparisonNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ComparisonNodeData;
  const style = NODE_STYLES.comparison;

  const [prompt, setPrompt] = useState(String(nodeData.content || ''));
  const [selectedModels, setSelectedModels] = useState<string[]>(nodeData.models || ['sonnet', 'openai/gpt-4o']);
  const [results, setResults] = useState<ComparisonResult[]>(nodeData.results || []);
  const [isRunning, setIsRunning] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const toggleModel = useCallback((modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) return prev.filter(m => m !== modelId);
      if (prev.length >= 4) return prev; // Max 4 models
      return [...prev, modelId];
    });
  }, []);

  const handleRun = useCallback(() => {
    if (!prompt.trim() || selectedModels.length === 0 || isRunning) return;
    setIsRunning(true);

    // Initialize results for each model
    const initialResults: ComparisonResult[] = selectedModels.map(modelId => {
      const model = BLOCK_MODELS.find(m => m.value === modelId);
      return {
        modelId,
        modelLabel: model?.label || modelId,
        content: '',
        status: 'running' as const,
      };
    });
    setResults(initialResults);

    // In production, each model would be called in parallel via the backend
    if (nodeData.sendMessage) {
      selectedModels.forEach(modelId => {
        nodeData.sendMessage!({
          type: 'claude-command',
          command: prompt,
          options: { canvasMode: true, blockId: id, comparisonModelId: modelId },
        });
      });
    }

    // Placeholder: simulate responses
    setTimeout(() => {
      setResults(prev => prev.map(r => ({
        ...r,
        content: `[${r.modelLabel}] Response to: "${prompt.slice(0, 50)}..."\n\nThis is a simulated comparison response. In production, each model would provide its own answer in parallel.`,
        status: 'completed' as const,
      })));
      setIsRunning(false);
    }, 3000);
  }, [prompt, selectedModels, isRunning, nodeData.sendMessage, id]);

  return (
    <div
      className={`
        rounded-xl border-2 shadow-sm w-[480px] transition-shadow
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
            Compare Models
          </span>
          <span className="text-[9px] text-gray-400">({selectedModels.length} models)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-600 hover:bg-fuchsia-200 transition-colors"
          >
            {showModelPicker ? 'Hide' : 'Models'}
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
        </div>
      </div>

      {/* Model Picker */}
      {showModelPicker && (
        <div className="px-3 py-2 border-b border-fuchsia-200/30 flex flex-wrap gap-1">
          {BLOCK_MODELS.map(m => (
            <button
              key={m.value}
              onClick={() => toggleModel(m.value)}
              className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                selectedModels.includes(m.value)
                  ? 'bg-fuchsia-500 text-white border-fuchsia-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-fuchsia-300'
              } ${selectedModels.length >= 4 && !selectedModels.includes(m.value) ? 'opacity-40' : ''}`}
              disabled={selectedModels.length >= 4 && !selectedModels.includes(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Prompt Input */}
      <div className="px-3 py-2 border-b border-fuchsia-200/30">
        <div className="flex items-end gap-1.5">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Enter a prompt to compare across models..."
            rows={2}
            className="flex-1 bg-white/60 text-gray-700 text-[11px] placeholder-gray-400 resize-none outline-none px-2 py-1.5 rounded-lg border border-fuchsia-200/50 focus:border-fuchsia-400/50"
          />
          <button
            onClick={handleRun}
            disabled={!prompt.trim() || selectedModels.length === 0 || isRunning}
            className="shrink-0 px-3 py-1.5 bg-fuchsia-500 text-white rounded-md text-[10px] font-medium hover:bg-fuchsia-600 disabled:opacity-40 transition-colors"
          >
            {isRunning ? 'Running...' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Results — side by side */}
      {results.length > 0 && (
        <div className={`grid grid-cols-${Math.min(results.length, 4)} divide-x divide-fuchsia-100`}
          style={{ gridTemplateColumns: `repeat(${Math.min(results.length, 4)}, 1fr)` }}
        >
          {results.map(r => (
            <div key={r.modelId} className="px-2 py-2 min-w-0">
              <div className="flex items-center gap-1 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  r.status === 'completed' ? 'bg-emerald-400' :
                  r.status === 'running' ? 'bg-fuchsia-400 animate-pulse' :
                  'bg-gray-300'
                }`} />
                <span className="text-[9px] font-semibold text-gray-500 truncate">{r.modelLabel}</span>
              </div>
              <div className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-wrap break-words max-h-[150px] overflow-y-auto">
                {r.content || (r.status === 'running' ? 'Generating...' : '')}
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && (
        <div className="px-3 py-4 text-center">
          <span className="text-[10px] text-gray-400">
            Select models, enter a prompt, and click Compare to see side-by-side results.
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
    </div>
  );
}

export default memo(ComparisonNode);
