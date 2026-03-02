// DeepResearchNode — two-model research block (Spine AI Deep Research pattern)
import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_STYLES, BLOCK_MODELS, type BaseNodeData } from './BaseNode';

type ResearchPhase = 'idle' | 'planning' | 'researching' | 'writing' | 'completed';

interface DeepResearchData extends BaseNodeData {
  plannerModel?: string;
  writerModel?: string;
  searchEnabled?: { web: boolean; documents: boolean };
  report?: string;
  sendMessage?: (msg: any) => void;
}

function DeepResearchNode({ id, data, selected }: NodeProps) {
  const nodeData = data as DeepResearchData;
  const style = NODE_STYLES.deepresearch;

  const [topic, setTopic] = useState(String(nodeData.content || ''));
  const [phase, setPhase] = useState<ResearchPhase>('idle');
  const [report, setReport] = useState(nodeData.report || '');
  const [webSearch, setWebSearch] = useState(nodeData.searchEnabled?.web ?? true);
  const [docSearch, setDocSearch] = useState(nodeData.searchEnabled?.documents ?? false);

  const handleRun = useCallback(() => {
    if (!topic.trim() || phase === 'planning' || phase === 'researching' || phase === 'writing') return;

    setPhase('planning');
    setReport('');

    // Build research prompt with two-phase approach
    const researchPrompt = `You are a deep research AI. Conduct comprehensive research on the following topic and produce a structured report with citations.

Topic: ${topic}

Instructions:
1. First, plan your research approach (what sources to check, what questions to answer)
2. Then, write a comprehensive report with:
   - Executive summary
   - Key findings (with section headings)
   - Data and evidence
   - Conclusions and recommendations
   - Sources/citations

${webSearch ? 'Web search is enabled — use current information from the internet.' : ''}
${docSearch ? 'Document search is enabled — reference connected documents on the canvas.' : ''}

Format the report in clean markdown with ## headings for each section.`;

    if (nodeData.sendMessage) {
      nodeData.sendMessage({
        type: 'claude-command',
        command: researchPrompt,
        options: { canvasMode: true, blockId: id, deepResearch: true },
      });
      // Phase transitions would be driven by streaming responses in production
      setTimeout(() => setPhase('researching'), 2000);
      setTimeout(() => setPhase('writing'), 5000);
    } else {
      setReport('Deep research requires a connected AI session.');
      setPhase('completed');
    }
  }, [topic, phase, webSearch, docSearch, nodeData.sendMessage, id]);

  const phaseLabel: Record<ResearchPhase, string> = {
    idle: 'Ready',
    planning: 'Planning research...',
    researching: 'Gathering data...',
    writing: 'Writing report...',
    completed: 'Completed',
  };

  const phaseColor: Record<ResearchPhase, string> = {
    idle: 'bg-gray-300',
    planning: 'bg-cyan-400 animate-pulse',
    researching: 'bg-blue-400 animate-pulse',
    writing: 'bg-violet-400 animate-pulse',
    completed: 'bg-emerald-400',
  };

  return (
    <div
      className={`
        rounded-xl border-2 shadow-sm w-[340px] transition-shadow
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
            Deep Research
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${phaseColor[phase]}`} />
            <span className="text-[9px] text-gray-500">{phaseLabel[phase]}</span>
          </div>
          {nodeData.onDelete && (
            <button
              onClick={() => nodeData.onDelete!(id)}
              className="p-0.5 rounded hover:bg-red-100 text-red-400 transition-colors ml-1"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Topic Input */}
      <div className="px-3 py-2 border-b border-cyan-200/30">
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Enter research topic or question..."
          rows={2}
          className="w-full bg-white/60 text-gray-700 text-[11px] placeholder-gray-400 resize-none outline-none px-2 py-1.5 rounded-lg border border-cyan-200/50 focus:border-cyan-400/50"
        />
      </div>

      {/* Search Toggles */}
      <div className="px-3 py-1.5 flex items-center gap-3 border-b border-cyan-200/30">
        <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={webSearch}
            onChange={e => setWebSearch(e.target.checked)}
            className="w-3 h-3 rounded border-gray-300 text-cyan-500 focus:ring-cyan-400"
          />
          Web Search
        </label>
        <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={docSearch}
            onChange={e => setDocSearch(e.target.checked)}
            className="w-3 h-3 rounded border-gray-300 text-cyan-500 focus:ring-cyan-400"
          />
          Canvas Docs
        </label>
        <button
          onClick={handleRun}
          disabled={!topic.trim() || (phase !== 'idle' && phase !== 'completed')}
          className="ml-auto text-[10px] px-2.5 py-1 bg-cyan-500 text-white rounded-md font-medium hover:bg-cyan-600 disabled:opacity-40 transition-colors"
        >
          {phase === 'idle' || phase === 'completed' ? 'Research' : 'Running...'}
        </button>
      </div>

      {/* Report Output */}
      <div className="px-3 py-2 text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap break-words max-h-[250px] overflow-y-auto min-h-[40px]">
        {report || (phase === 'idle' ? (
          <span className="text-gray-400 italic">Enter a topic and click Research to start.</span>
        ) : (
          <div className="flex items-center gap-1.5 text-gray-400">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            {phaseLabel[phase]}
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
    </div>
  );
}

export default memo(DeepResearchNode);
