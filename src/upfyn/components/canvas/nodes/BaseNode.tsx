// BaseNode — shared shell for all canvas node types (compact + full modes)
import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';

export type NodeStyle = {
  bg: string;
  border: string;
  accent: string;
  icon: string;
};

export const NODE_STYLES: Record<string, NodeStyle> = {
  note:       { bg: 'bg-blue-50',   border: 'border-blue-300',   accent: 'text-blue-600',   icon: '📝' },
  prompt:     { bg: 'bg-blue-50',   border: 'border-blue-400',   accent: 'text-blue-700',   icon: '💬' },
  response:   { bg: 'bg-purple-50', border: 'border-purple-300', accent: 'text-purple-700',  icon: '🤖' },
  research:   { bg: 'bg-teal-50',   border: 'border-teal-300',   accent: 'text-teal-700',    icon: '🔍' },
  suggestion: { bg: 'bg-amber-50',  border: 'border-amber-300',  accent: 'text-amber-700',   icon: '💡' },
  pdf:        { bg: 'bg-red-50',    border: 'border-red-300',    accent: 'text-red-600',     icon: '📄' },
  summary:    { bg: 'bg-green-50',  border: 'border-green-300',  accent: 'text-green-700',   icon: '📋' },
  webpage:    { bg: 'bg-indigo-50', border: 'border-indigo-300', accent: 'text-indigo-700',  icon: '🌐' },
  // New Spine AI-style block types
  chat:       { bg: 'bg-sky-50',    border: 'border-sky-400',    accent: 'text-sky-700',     icon: '💬' },
  deepresearch: { bg: 'bg-cyan-50', border: 'border-cyan-400',   accent: 'text-cyan-700',    icon: '🔬' },
  image:      { bg: 'bg-pink-50',   border: 'border-pink-300',   accent: 'text-pink-600',    icon: '🖼️' },
  table:      { bg: 'bg-slate-50',  border: 'border-slate-400',  accent: 'text-slate-700',   icon: '📊' },
  list:       { bg: 'bg-violet-50', border: 'border-violet-300', accent: 'text-violet-600',  icon: '📋' },
  inputs:     { bg: 'bg-orange-50', border: 'border-orange-300', accent: 'text-orange-600',  icon: '⚙️' },
  comparison: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-300', accent: 'text-fuchsia-600', icon: '⚖️' },
  frame:      { bg: 'bg-gray-50',   border: 'border-gray-300',   accent: 'text-gray-600',    icon: '📦' },
};

/** Model option for per-block model selection */
export interface ModelOption {
  value: string;
  label: string;
  provider: string;
}

/** All available models grouped by provider for per-block selection */
export const BLOCK_MODELS: ModelOption[] = [
  // Anthropic (Claude)
  { value: 'sonnet', label: 'Claude Sonnet', provider: 'anthropic' },
  { value: 'opus', label: 'Claude Opus', provider: 'anthropic' },
  { value: 'haiku', label: 'Claude Haiku', provider: 'anthropic' },
  // OpenRouter
  { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', provider: 'openrouter' },
  { value: 'anthropic/claude-opus-4', label: 'Claude Opus 4', provider: 'openrouter' },
  { value: 'openai/gpt-4o', label: 'GPT-4o', provider: 'openrouter' },
  { value: 'openai/o3', label: 'O3', provider: 'openrouter' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'openrouter' },
  { value: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', provider: 'openrouter' },
  { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1', provider: 'openrouter' },
];

export interface BaseNodeData {
  label?: string;
  content?: string;
  compact?: boolean;
  summary?: string;
  fullContent?: string;
  status?: 'pending' | 'running' | 'completed';
  // Per-block model selection (Spine AI pattern)
  modelId?: string;
  modelProvider?: string;
  // Search config per block
  searchEnabled?: { web: boolean; documents: boolean };
  // Output format preference
  outputFormat?: 'text' | 'list' | 'table' | 'html';
  // Variables for Inputs block cascading
  variables?: Record<string, string>;
  // Callbacks
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRun?: (id: string, text: string) => void;
  onRerun?: (id: string, text: string) => void;
  onBranch?: (id: string) => void;
  onNodeClick?: (id: string) => void;
  onModelChange?: (id: string, modelId: string, provider: string) => void;
  [key: string]: unknown;
}

interface BaseNodeProps {
  id: string;
  nodeType: string;
  data: BaseNodeData;
  selected?: boolean;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** Hide the model selector chip (e.g., for content-only blocks like Note, PDF) */
  hideModelSelector?: boolean;
}

/** AI block types that support per-block model selection */
const AI_BLOCK_TYPES = new Set([
  'prompt', 'response', 'research', 'suggestion', 'chat',
  'deepresearch', 'image', 'table', 'list', 'comparison',
]);

/** Small model selector chip shown in AI block headers */
function ModelSelectorChip({ id, data, nodeType }: { id: string; data: BaseNodeData; nodeType: string }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentModel = BLOCK_MODELS.find(m => m.value === data.modelId);
  const displayLabel = currentModel?.label || 'Auto';

  // Group models by provider
  const grouped = BLOCK_MODELS.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {} as Record<string, ModelOption[]>);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/60 border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700 transition-colors truncate max-w-[80px]"
        title={`Model: ${displayLabel}`}
      >
        {displayLabel}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
          {/* Auto option */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onModelChange?.(id, '', '');
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 ${!data.modelId ? 'bg-primary/5 text-primary font-medium' : 'text-gray-600'}`}
          >
            Auto (default)
          </button>
          {Object.entries(grouped).map(([provider, models]) => (
            <div key={provider}>
              <div className="px-3 py-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{provider}</div>
              {models.map(m => (
                <button
                  key={m.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onModelChange?.(id, m.value, m.provider);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 ${data.modelId === m.value ? 'bg-primary/5 text-primary font-medium' : 'text-gray-600'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BaseNodeComponent({ id, nodeType, data, selected, children, actions, hideModelSelector }: BaseNodeProps) {
  const style = NODE_STYLES[nodeType] || NODE_STYLES.note;
  const isCompact = data.compact === true;
  const showModelSelector = !hideModelSelector && AI_BLOCK_TYPES.has(nodeType);

  if (isCompact) {
    const statusColor = data.status === 'completed' ? 'bg-emerald-400' :
                         data.status === 'running' ? 'bg-amber-400 animate-pulse' :
                         'bg-gray-300';

    return (
      <div
        className={`
          rounded-xl border-2 shadow-sm w-[220px] transition-shadow cursor-pointer
          ${style.bg} ${style.border}
          ${selected ? 'ring-2 ring-primary/40 shadow-md' : 'hover:shadow-md'}
        `}
        onClick={() => data.onNodeClick?.(id)}
      >
        <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />

        {/* Compact header */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{style.icon}</span>
            <span className={`text-[11px] font-semibold ${style.accent} uppercase tracking-wide truncate flex-1`}>
              {data.label || nodeType}
            </span>
            {showModelSelector && <ModelSelectorChip id={id} data={data} nodeType={nodeType} />}
          </div>
          {/* 1-line summary */}
          <p className="text-[11px] text-gray-500 truncate leading-tight">
            {data.summary || (data.content || '').slice(0, 60)}
          </p>
          {/* Status + expand hint */}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
              <span className="text-[10px] text-gray-400 capitalize">{data.status || 'done'}</span>
            </div>
            <span className="text-[10px] text-gray-400 hover:text-gray-600">Click to expand</span>
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
      </div>
    );
  }

  // Full-size node
  return (
    <div
      className={`
        rounded-xl border-2 shadow-sm min-w-[240px] max-w-[360px] transition-shadow
        ${style.bg} ${style.border}
        ${selected ? 'ring-2 ring-primary/40 shadow-md' : 'hover:shadow-md'}
      `}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />

      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${style.border}/30`}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-sm">{style.icon}</span>
          <span className={`text-xs font-semibold ${style.accent} uppercase tracking-wide truncate`}>
            {data.label || nodeType}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {showModelSelector && <ModelSelectorChip id={id} data={data} nodeType={nodeType} />}
          {actions}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
        {children || data.content || ''}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
    </div>
  );
}

export default memo(BaseNodeComponent);
