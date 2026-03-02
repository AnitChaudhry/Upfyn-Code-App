// TemplateManager — save/load canvas workflow templates (Flora AI pattern)
import React, { memo, useState, useCallback, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { NODE_STYLES } from '../nodes/BaseNode';

interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  isBuiltIn?: boolean;
}

interface TemplateManagerProps {
  onLoadTemplate: (nodes: Node[], edges: Edge[]) => void;
  currentNodes: Node[];
  currentEdges: Edge[];
  onClose: () => void;
}

// Built-in templates
const BUILT_IN_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'tpl_research_report',
    name: 'Research Report',
    description: 'Deep research block connected to a summary table',
    isBuiltIn: true,
    createdAt: 0,
    nodes: [
      {
        id: 'tpl_n1',
        type: 'inputs',
        position: { x: 0, y: 0 },
        data: { label: 'Parameters', variables: { topic: '', depth: 'detailed' } },
      },
      {
        id: 'tpl_n2',
        type: 'deepresearch',
        position: { x: 350, y: 0 },
        data: { label: 'Deep Research', content: '', searchEnabled: { web: true, documents: false } },
      },
      {
        id: 'tpl_n3',
        type: 'table',
        position: { x: 350, y: 300 },
        data: { label: 'Key Findings', columns: [], rows: [] },
      },
      {
        id: 'tpl_n4',
        type: 'note',
        position: { x: 0, y: 300 },
        data: { label: 'Notes', content: 'Add your research notes here...' },
      },
    ],
    edges: [
      { id: 'tpl_e1', source: 'tpl_n1', target: 'tpl_n2' },
      { id: 'tpl_e2', source: 'tpl_n2', target: 'tpl_n3' },
      { id: 'tpl_e3', source: 'tpl_n1', target: 'tpl_n4' },
    ],
  },
  {
    id: 'tpl_code_review',
    name: 'Code Review',
    description: 'Prompt → Analysis → Suggestions pipeline',
    isBuiltIn: true,
    createdAt: 0,
    nodes: [
      {
        id: 'tpl_n1',
        type: 'note',
        position: { x: 0, y: 0 },
        data: { label: 'Code', content: 'Paste your code here...' },
      },
      {
        id: 'tpl_n2',
        type: 'chat',
        position: { x: 350, y: 0 },
        data: { label: 'Code Review Chat', content: '', messages: [] },
      },
      {
        id: 'tpl_n3',
        type: 'list',
        position: { x: 350, y: 350 },
        data: { label: 'Action Items', items: [] },
      },
    ],
    edges: [
      { id: 'tpl_e1', source: 'tpl_n1', target: 'tpl_n2' },
      { id: 'tpl_e2', source: 'tpl_n2', target: 'tpl_n3' },
    ],
  },
  {
    id: 'tpl_content_pipeline',
    name: 'Content Pipeline',
    description: 'Multi-model comparison for content generation',
    isBuiltIn: true,
    createdAt: 0,
    nodes: [
      {
        id: 'tpl_n1',
        type: 'inputs',
        position: { x: 0, y: 0 },
        data: { label: 'Brief', variables: { topic: '', tone: 'professional', audience: 'general' } },
      },
      {
        id: 'tpl_n2',
        type: 'comparison',
        position: { x: 350, y: 0 },
        data: { label: 'Model Comparison', content: '', models: ['sonnet', 'openai/gpt-4o'] },
      },
      {
        id: 'tpl_n3',
        type: 'note',
        position: { x: 0, y: 300 },
        data: { label: 'Final Draft', content: 'Paste the best output here and refine...' },
      },
    ],
    edges: [
      { id: 'tpl_e1', source: 'tpl_n1', target: 'tpl_n2' },
      { id: 'tpl_e2', source: 'tpl_n2', target: 'tpl_n3' },
    ],
  },
];

const STORAGE_KEY = 'upfyn_canvas_templates';

function TemplateManager({ onLoadTemplate, currentNodes, currentEdges, onClose }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<CanvasTemplate[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [activeTab, setActiveTab] = useState<'gallery' | 'saved'>('gallery');

  // Load saved templates from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTemplates(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveTemplates = useCallback((newTemplates: CanvasTemplate[]) => {
    setTemplates(newTemplates);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
    } catch { /* ignore */ }
  }, []);

  const handleSave = useCallback(() => {
    if (!saveName.trim() || currentNodes.length === 0) return;

    // Strip callbacks from node data before saving
    const cleanNodes = currentNodes.map(n => ({
      ...n,
      data: {
        label: n.data?.label,
        content: n.data?.content,
        compact: n.data?.compact,
        summary: n.data?.summary,
        fullContent: n.data?.fullContent,
        modelId: n.data?.modelId,
        modelProvider: n.data?.modelProvider,
        variables: n.data?.variables,
        messages: n.data?.messages,
        columns: n.data?.columns,
        rows: n.data?.rows,
        items: n.data?.items,
        searchEnabled: n.data?.searchEnabled,
      },
    }));

    const newTemplate: CanvasTemplate = {
      id: `tpl_user_${Date.now()}`,
      name: saveName.trim(),
      description: saveDescription.trim() || `${currentNodes.length} blocks, ${currentEdges.length} connections`,
      nodes: cleanNodes,
      edges: currentEdges,
      createdAt: Date.now(),
    };

    saveTemplates([...templates, newTemplate]);
    setSaveName('');
    setSaveDescription('');
    setShowSave(false);
  }, [saveName, saveDescription, currentNodes, currentEdges, templates, saveTemplates]);

  const handleDelete = useCallback((templateId: string) => {
    saveTemplates(templates.filter(t => t.id !== templateId));
  }, [templates, saveTemplates]);

  const handleLoad = useCallback((template: CanvasTemplate) => {
    // Re-generate IDs to avoid conflicts with existing nodes
    const idMap = new Map<string, string>();
    const newNodes = template.nodes.map(n => {
      const newId = `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      idMap.set(n.id, newId);
      return { ...n, id: newId };
    });
    const newEdges = template.edges.map(e => ({
      ...e,
      id: `e_${idMap.get(e.source) || e.source}_${idMap.get(e.target) || e.target}`,
      source: idMap.get(e.source) || e.source,
      target: idMap.get(e.target) || e.target,
    }));

    onLoadTemplate(newNodes, newEdges);
    onClose();
  }, [onLoadTemplate, onClose]);

  const allTemplates = activeTab === 'gallery' ? BUILT_IN_TEMPLATES : templates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[520px] max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Canvas Templates</h3>
            <p className="text-[10px] text-gray-400">Pre-built workflows and your saved templates</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSave(!showSave)}
              className="text-[10px] px-2.5 py-1 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors"
            >
              {showSave ? 'Cancel' : 'Save Current'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Save Form */}
        {showSave && (
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex gap-2 mb-2">
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Template name..."
                className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary/30"
              />
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || currentNodes.length === 0}
                className="text-[10px] px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                Save
              </button>
            </div>
            <input
              value={saveDescription}
              onChange={e => setSaveDescription(e.target.value)}
              placeholder="Description (optional)..."
              className="w-full text-[10px] bg-white border border-gray-200 rounded-lg px-3 py-1 outline-none focus:border-primary/30"
            />
            {currentNodes.length === 0 && (
              <p className="text-[9px] text-amber-500 mt-1">Canvas is empty — add blocks first.</p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`text-[11px] px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'gallery' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Built-in ({BUILT_IN_TEMPLATES.length})
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`text-[11px] px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            My Templates ({templates.length})
          </button>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {allTemplates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-400">
                {activeTab === 'saved' ? 'No saved templates yet. Save your current canvas as a template.' : 'No templates available.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {allTemplates.map(template => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-xl p-3 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => handleLoad(template)}
                >
                  {/* Mini preview — show node type icons */}
                  <div className="flex gap-1 mb-2">
                    {template.nodes.slice(0, 5).map((n, i) => {
                      const style = NODE_STYLES[n.type || 'note'] || NODE_STYLES.note;
                      return (
                        <span
                          key={i}
                          className={`text-xs w-6 h-6 rounded-lg flex items-center justify-center ${style.bg} border ${style.border}/30`}
                          title={n.type || 'note'}
                        >
                          {style.icon}
                        </span>
                      );
                    })}
                    {template.nodes.length > 5 && (
                      <span className="text-[9px] text-gray-400 self-center">+{template.nodes.length - 5}</span>
                    )}
                  </div>
                  <h4 className="text-[11px] font-semibold text-gray-700 mb-0.5">{template.name}</h4>
                  <p className="text-[9px] text-gray-400 leading-tight">{template.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] text-gray-300">
                      {template.nodes.length} blocks, {template.edges.length} connections
                    </span>
                    {!template.isBuiltIn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[9px] text-red-400 hover:text-red-500 transition-all"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(TemplateManager);
