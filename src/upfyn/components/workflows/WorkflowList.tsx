import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Play, Edit2, Trash2, Zap, CheckCircle, XCircle, Loader2, History, Clock, Timer, ArrowRight, Sparkles, Wand2, X, AlertCircle } from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';
import type { WorkflowStep } from './WorkflowEditor';

interface WorkflowRun {
  id: number;
  workflow_id: number;
  status: string;
  steps_completed: number;
  total_steps: number;
  result: any;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

interface Workflow {
  id: number;
  name: string;
  description: string | null;
  steps: WorkflowStep[];
  schedule: string | null;
  schedule_enabled: number;
  schedule_timezone: string;
  is_active: number;
  last_run: string | null;
  created_at: string;
}

interface WorkflowListProps {
  onEdit: (workflow: Workflow) => void;
  onCreate: () => void;
  refreshKey?: number;
}

const STEP_COLORS: Record<string, string> = {
  'ai-prompt': 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  'webhook': 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
  'delay': 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
  'condition': 'bg-green-500/10 text-green-400 ring-green-500/20',
  'integration': 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
};

const AI_SUGGESTIONS = [
  'Send a Slack message when a GitHub issue is created',
  'Email me a daily summary of calendar events',
  'Create a Notion page from each new Trello card',
  'Notify Discord when a payment is received',
];

export default function WorkflowList({ onEdit, onCreate, refreshKey }: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [runResult, setRunResult] = useState<{ id: number; success: boolean; message: string; results?: any[] } | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [historyRuns, setHistoryRuns] = useState<WorkflowRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // AI generation state
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/api/workflows');
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows, refreshKey]);

  const toggleHistory = async (id: number) => {
    if (historyId === id) { setHistoryId(null); return; }
    setHistoryId(id);
    setHistoryLoading(true);
    try {
      const res = await authenticatedFetch(`/api/workflows/${id}/runs`);
      if (res.ok) {
        const data = await res.json();
        setHistoryRuns(data.runs || []);
      }
    } catch { setHistoryRuns([]); }
    setHistoryLoading(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await authenticatedFetch(`/api/workflows/${id}`, { method: 'DELETE' });
      fetchWorkflows();
    } catch { /* ignore */ }
  };

  const handleRun = async (id: number) => {
    setRunningId(id);
    setRunResult(null);
    try {
      const res = await authenticatedFetch(`/api/workflows/${id}/run`, { method: 'POST' });
      const data = await res.json();
      setRunResult({
        id,
        success: data.success,
        message: data.success ? `Completed ${data.results?.length || 0} steps` : (data.error || 'Failed'),
        results: data.results
      });
      fetchWorkflows();
    } catch {
      setRunResult({ id, success: false, message: 'Network error' });
    }
    setRunningId(null);
  };

  const handleAiGenerate = async () => {
    if (!aiDescription.trim()) return;
    setAiGenerating(true);
    setAiError('');
    try {
      const res = await authenticatedFetch('/api/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiDescription.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAiPrompt(false);
        setAiDescription('');
        fetchWorkflows();
        // Open the newly created workflow in editor for review
        if (data.workflow) {
          onEdit(data.workflow);
        }
      } else {
        setAiError(data.error || 'Failed to generate workflow');
      }
    } catch {
      setAiError('Network error');
    }
    setAiGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground/40">Loading workflows...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground tracking-tight">Workflows</h3>
          <p className="text-xs text-muted-foreground/50 mt-0.5">
            Automate tasks with AI prompts, webhooks, and integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiPrompt(!showAiPrompt)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              showAiPrompt
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            AI Create
          </button>
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            New Workflow
          </button>
        </div>
      </div>

      {/* AI Generation Panel */}
      {showAiPrompt && (
        <div className="bg-gradient-to-br from-primary/[0.03] to-transparent border border-primary/15 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground">Describe your workflow</span>
            </div>
            <button
              onClick={() => { setShowAiPrompt(false); setAiError(''); }}
              className="p-1 text-muted-foreground/40 hover:text-foreground rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            value={aiDescription}
            onChange={e => setAiDescription(e.target.value)}
            placeholder="Describe what you want to automate in plain English..."
            rows={3}
            className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/40 rounded-xl text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 resize-none transition-colors"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !aiGenerating) {
                handleAiGenerate();
              }
            }}
          />

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-1.5">
            {AI_SUGGESTIONS.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => setAiDescription(suggestion)}
                className="px-2.5 py-1 text-[10px] text-muted-foreground/50 hover:text-foreground bg-muted/20 hover:bg-muted/40 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {aiError && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 bg-red-500/[0.03] border border-red-500/15 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {aiError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !aiDescription.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Workflow
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-muted-foreground/25" />
          </div>
          <h4 className="text-sm font-semibold text-foreground tracking-tight mb-1">No workflows yet</h4>
          <p className="text-xs text-muted-foreground/50 max-w-xs leading-relaxed mb-5">
            Chain AI prompts, webhook calls, conditions, and app integrations into automated pipelines.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiPrompt(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/15 transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Create with AI
            </button>
            <button
              onClick={onCreate}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf, index) => (
            <div
              key={wf.id}
              className="bg-card/50 border border-border/30 rounded-2xl p-4 hover:border-border/50 transition-all duration-200"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Title row */}
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground tracking-tight">{wf.name}</h4>
                    {wf.schedule && wf.schedule_enabled ? (
                      <span className="flex items-center gap-1 text-[10px] text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded-full">
                        <Timer className="w-2.5 h-2.5" />
                        Scheduled
                      </span>
                    ) : null}
                  </div>

                  {wf.description && (
                    <p className="text-xs text-muted-foreground/60 mb-3 line-clamp-1">{wf.description}</p>
                  )}

                  {/* Step flow visualization */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {wf.steps.map((step, i) => (
                      <React.Fragment key={step.id || i}>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ring-1 ${
                          STEP_COLORS[step.type] || 'bg-muted text-muted-foreground ring-border/30'
                        }`}>
                          {step.label}
                        </span>
                        {i < wf.steps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground/20 flex-shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                    {wf.steps.length === 0 && (
                      <span className="text-[10px] text-muted-foreground/30 italic">No steps configured</span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-2.5 text-[10px] text-muted-foreground/35">
                    <span>{wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}</span>
                    {wf.schedule && wf.schedule_enabled && (
                      <span className="font-mono">{wf.schedule}</span>
                    )}
                    {wf.last_run && (
                      <span>Last run {new Date(wf.last_run).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleRun(wf.id)}
                    disabled={runningId === wf.id || wf.steps.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500/8 text-green-400 hover:bg-green-500/15 rounded-lg transition-colors disabled:opacity-30"
                    title="Run workflow"
                  >
                    {runningId === wf.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Run
                  </button>
                  <button
                    onClick={() => toggleHistory(wf.id)}
                    className={`p-2 rounded-lg transition-colors ${historyId === wf.id ? 'text-primary bg-primary/5' : 'text-muted-foreground/40 hover:text-foreground hover:bg-muted/30'}`}
                    title="Execution history"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onEdit(wf)}
                    className="p-2 text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(wf.id)}
                    className="p-2 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Run result */}
              {runResult?.id === wf.id && (
                <div className={`mt-3 p-3 rounded-xl text-xs ${runResult.success ? 'bg-green-500/[0.03] border border-green-500/15' : 'bg-red-500/[0.03] border border-red-500/15'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {runResult.success ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className={`font-medium ${runResult.success ? 'text-green-400' : 'text-red-400'}`}>
                      {runResult.message}
                    </span>
                  </div>
                  {runResult.results && (
                    <div className="space-y-1 mt-2">
                      {runResult.results.map((r: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px]">
                          {r.success ? (
                            <CheckCircle className="w-2.5 h-2.5 text-green-400/60" />
                          ) : (
                            <XCircle className="w-2.5 h-2.5 text-red-400/60" />
                          )}
                          <span className="text-muted-foreground">{r.label}</span>
                          {r.result?.status && <span className="text-muted-foreground/30">({r.result.status})</span>}
                          {r.error && <span className="text-red-400/60">{r.error}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Execution history */}
              {historyId === wf.id && (
                <div className="mt-3 border-t border-border/15 pt-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <History className="w-3 h-3 text-muted-foreground/50" />
                    <span className="text-[11px] font-semibold text-foreground">Execution History</span>
                  </div>
                  {historyLoading ? (
                    <div className="flex items-center gap-2 py-3 text-[10px] text-muted-foreground/40">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading...
                    </div>
                  ) : historyRuns.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground/30 py-3 italic">No runs yet</div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {historyRuns.map(run => (
                        <div key={run.id} className="flex items-start gap-2.5 text-[10px] bg-muted/10 rounded-lg p-2.5">
                          <div className="shrink-0 mt-0.5">
                            {run.status === 'completed' ? (
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            ) : run.status === 'failed' ? (
                              <XCircle className="w-3 h-3 text-red-400" />
                            ) : run.status === 'running' ? (
                              <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
                            ) : (
                              <Clock className="w-3 h-3 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                run.status === 'completed' ? 'text-green-400' :
                                run.status === 'failed' ? 'text-red-400' :
                                'text-muted-foreground'
                              }`}>
                                {run.status === 'completed' ? 'Success' : run.status === 'failed' ? 'Failed' : run.status}
                              </span>
                              <span className="text-muted-foreground/25">
                                {run.steps_completed}/{run.total_steps} steps
                              </span>
                              <span className="text-muted-foreground/25">
                                {new Date(run.started_at).toLocaleString()}
                              </span>
                            </div>
                            {run.error && (
                              <p className="text-red-400/60 mt-0.5 truncate">{run.error}</p>
                            )}
                            {run.completed_at && (
                              <span className="text-muted-foreground/20">
                                Duration: {Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
