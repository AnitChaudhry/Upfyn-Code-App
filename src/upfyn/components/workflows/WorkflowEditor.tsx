import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Zap, MessageSquare, Clock, GitBranch, AlertCircle, Plug, GripVertical, X } from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';
import IntegrationStepConfig from './IntegrationStepConfig';
import KeywordSuggestionPopup from './KeywordSuggestionPopup';
import { useKeywordDetection } from '../../hooks/useKeywordDetection';

export interface WorkflowStep {
  id: string;
  type: 'ai-prompt' | 'webhook' | 'condition' | 'delay' | 'integration';
  label: string;
  config: Record<string, any>;
  order: number;
}

interface Webhook {
  id: number;
  name: string;
  url: string;
  method: string;
}

interface Workflow {
  id?: number;
  name: string;
  description: string;
  steps: WorkflowStep[];
  schedule?: string;
  schedule_enabled?: number | boolean;
  schedule_timezone?: string;
}

interface WorkflowEditorProps {
  workflow?: Workflow & { id: number };
  onSave: () => void;
  onCancel: () => void;
}

const STEP_TYPES = [
  { value: 'ai-prompt', label: 'AI Prompt', desc: 'Ask AI to process data', icon: MessageSquare, color: 'text-blue-400 bg-blue-500/10', ring: 'ring-blue-500/20' },
  { value: 'webhook', label: 'Webhook', desc: 'Call an HTTP endpoint', icon: Zap, color: 'text-yellow-400 bg-yellow-500/10', ring: 'ring-yellow-500/20' },
  { value: 'delay', label: 'Delay', desc: 'Wait before continuing', icon: Clock, color: 'text-purple-400 bg-purple-500/10', ring: 'ring-purple-500/20' },
  { value: 'condition', label: 'Condition', desc: 'Branch on a condition', icon: GitBranch, color: 'text-green-400 bg-green-500/10', ring: 'ring-green-500/20' },
  { value: 'integration', label: 'Integration', desc: 'Use a connected app', icon: Plug, color: 'text-cyan-400 bg-cyan-500/10', ring: 'ring-cyan-500/20' },
] as const;

let stepIdCounter = 0;
const genStepId = () => `step_${Date.now()}_${++stepIdCounter}`;

const SCHEDULE_PRESETS = [
  { label: 'Every minute', cron: '* * * * *' },
  { label: 'Every 5 minutes', cron: '*/5 * * * *' },
  { label: 'Every 15 minutes', cron: '*/15 * * * *' },
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
  { label: 'Daily at midnight', cron: '0 0 * * *' },
  { label: 'Daily at 9 AM', cron: '0 9 * * *' },
  { label: 'Weekly (Monday)', cron: '0 9 * * 1' },
  { label: 'Monthly (1st)', cron: '0 0 1 * *' },
];

export default function WorkflowEditor({ workflow, onSave, onCancel }: WorkflowEditorProps) {
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow?.steps || []);
  const [schedule, setSchedule] = useState(workflow?.schedule || '');
  const [scheduleEnabled, setScheduleEnabled] = useState(!!workflow?.schedule_enabled);
  const [scheduleTimezone, setScheduleTimezone] = useState(workflow?.schedule_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const { activeMatch, detectKeywords, dismiss: dismissKeyword } = useKeywordDetection();

  useEffect(() => {
    authenticatedFetch('/api/webhooks').then(r => r.json()).then(data => {
      setWebhooks(data.webhooks || []);
    }).catch(() => {});
  }, []);

  const addStep = useCallback((type: WorkflowStep['type']) => {
    const stepType = STEP_TYPES.find(s => s.value === type);
    const newStep: WorkflowStep = {
      id: genStepId(),
      type,
      label: stepType?.label || type,
      config: type === 'delay' ? { seconds: 5 } : {},
      order: steps.length
    };
    setSteps(prev => [...prev, newStep]);
    setExpandedStep(newStep.id);
    setShowAddMenu(false);
  }, [steps.length]);

  const removeStep = useCallback((stepId: string) => {
    setSteps(prev => prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i })));
    if (expandedStep === stepId) setExpandedStep(null);
  }, [expandedStep]);

  const moveStep = useCallback((stepId: string, direction: 'up' | 'down') => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === stepId);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const updateStepConfig = useCallback((stepId: string, key: string, value: any) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, config: { ...s.config, [key]: value } } : s));
  }, []);

  const updateStepLabel = useCallback((stepId: string, label: string) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, label } : s));
  }, []);

  const handleAddIntegrationAction = useCallback((integrationId: string, toolSlug: string, label: string) => {
    const newStep: WorkflowStep = {
      id: genStepId(),
      type: 'integration',
      label,
      config: { integrationId, toolSlug, arguments: {} },
      order: steps.length,
    };
    setSteps(prev => [...prev, newStep]);
    setExpandedStep(newStep.id);
    dismissKeyword();
  }, [steps.length, dismissKeyword]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    const rect = e.target.getBoundingClientRect();
    detectKeywords(val, e.target.selectionStart || 0, rect);
  }, [detectKeywords]);

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Workflow name is required'); return; }
    if (steps.length === 0) { setError('Add at least one step'); return; }

    setSaving(true);
    try {
      const body = {
        name, description, steps,
        schedule: schedule || null,
        schedule_enabled: scheduleEnabled,
        schedule_timezone: scheduleTimezone
      };
      const url = workflow?.id ? `/api/workflows/${workflow.id}` : '/api/workflows';
      const method = workflow?.id ? 'PUT' : 'POST';
      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        setSaving(false);
        return;
      }
      onSave();
    } catch {
      setError('Network error');
    }
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20 bg-card/50">
        <button onClick={onCancel} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground tracking-tight">
          {workflow?.id ? 'Edit Workflow' : 'New Workflow'}
        </span>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Workflow'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Name & description */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground/70 mb-1.5 block">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Workflow"
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/40 rounded-xl text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground/70 mb-1.5 block">Description</label>
            <div className="relative">
              <textarea
                ref={descriptionRef}
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Describe what this workflow does... Try typing 'email', 'slack', or 'calendar' to auto-detect integrations"
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/40 rounded-xl text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 resize-none transition-colors"
              />
              {activeMatch && (
                <KeywordSuggestionPopup
                  keyword={activeMatch.keyword}
                  integrationId={activeMatch.integrationId}
                  integrationName={activeMatch.integrationName}
                  position={activeMatch.position}
                  onDismiss={dismissKeyword}
                  onAddAction={handleAddIntegrationAction}
                />
              )}
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-card/50 border border-border/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
              </div>
              Schedule
            </span>
            <button
              onClick={() => setScheduleEnabled(!scheduleEnabled)}
              className={`relative w-9 h-5 rounded-full transition-colors ${scheduleEnabled ? 'bg-primary' : 'bg-muted/60'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${scheduleEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {scheduleEnabled && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Cron Expression</label>
                <div className="flex items-center gap-2">
                  <input
                    value={schedule}
                    onChange={e => setSchedule(e.target.value)}
                    placeholder="*/15 * * * *"
                    className="flex-1 px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 font-mono transition-colors"
                  />
                  <select
                    value={schedule}
                    onChange={e => setSchedule(e.target.value)}
                    className="px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                  >
                    <option value="">Presets...</option>
                    {SCHEDULE_PRESETS.map(p => (
                      <option key={p.cron} value={p.cron}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Timezone</label>
                <input
                  value={scheduleTimezone}
                  onChange={e => setScheduleTimezone(e.target.value)}
                  placeholder="UTC"
                  className="w-48 px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/35 leading-relaxed">
                Runs automatically when the server is online. Missed runs while offline appear as "missed" in execution history.
              </p>
            </div>
          )}
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-foreground">Steps ({steps.length})</span>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border/30 rounded-2xl">
              <p className="text-xs text-muted-foreground/40">No steps yet. Add your first step below.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {steps.map((step, idx) => {
                const stepType = STEP_TYPES.find(s => s.value === step.type);
                const Icon = stepType?.icon || Zap;
                const isExpanded = expandedStep === step.id;

                return (
                  <div key={step.id} className={`border rounded-2xl overflow-hidden transition-colors ${isExpanded ? 'border-border/50 bg-card/50' : 'border-border/25 bg-card/30'}`}>
                    {/* Step header */}
                    <div
                      className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground/20 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground/40 w-5 text-center font-mono">{idx + 1}</span>
                      <div className={`p-1.5 rounded-lg ${stepType?.color || 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">{step.label}</span>
                      <span className="text-[10px] text-muted-foreground/35">{stepType?.label}</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={e => { e.stopPropagation(); moveStep(step.id, 'up'); }}
                          disabled={idx === 0}
                          className="p-1 text-muted-foreground/30 hover:text-foreground rounded transition-colors disabled:opacity-20"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); moveStep(step.id, 'down'); }}
                          disabled={idx === steps.length - 1}
                          className="p-1 text-muted-foreground/30 hover:text-foreground rounded transition-colors disabled:opacity-20"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); removeStep(step.id); }}
                          className="p-1 text-muted-foreground/30 hover:text-red-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Step config (expanded) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-border/15 space-y-3">
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Step Label</label>
                          <input
                            value={step.label}
                            onChange={e => updateStepLabel(step.id, e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                          />
                        </div>

                        {step.type === 'ai-prompt' && (
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Prompt</label>
                            <textarea
                              value={step.config.prompt || ''}
                              onChange={e => updateStepConfig(step.id, 'prompt', e.target.value)}
                              placeholder="Describe what the AI should do..."
                              rows={3}
                              className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none transition-colors"
                            />
                          </div>
                        )}

                        {step.type === 'webhook' && (
                          <>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Webhook</label>
                              <select
                                value={step.config.webhookId || ''}
                                onChange={e => updateStepConfig(step.id, 'webhookId', e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                              >
                                <option value="">Select a webhook...</option>
                                {webhooks.map(wh => (
                                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.method} {wh.url})</option>
                                ))}
                              </select>
                              {webhooks.length === 0 && (
                                <p className="text-[10px] text-muted-foreground/35 mt-1">No webhooks created yet. Go to the Webhooks tab first.</p>
                              )}
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Payload Template (JSON)</label>
                              <textarea
                                value={step.config.payloadTemplate || ''}
                                onChange={e => updateStepConfig(step.id, 'payloadTemplate', e.target.value)}
                                placeholder='{"key": "value"}'
                                rows={2}
                                className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none font-mono transition-colors"
                              />
                            </div>
                          </>
                        )}

                        {step.type === 'delay' && (
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Delay (seconds, max 30)</label>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={step.config.seconds || 5}
                              onChange={e => updateStepConfig(step.id, 'seconds', Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                              className="w-24 px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                            />
                          </div>
                        )}

                        {step.type === 'condition' && (
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Condition Expression</label>
                            <input
                              value={step.config.expression || ''}
                              onChange={e => updateStepConfig(step.id, 'expression', e.target.value)}
                              placeholder="e.g. response.status === 200"
                              className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 font-mono transition-colors"
                            />
                            <p className="text-[10px] text-muted-foreground/30 mt-1">Condition evaluation coming soon</p>
                          </div>
                        )}

                        {step.type === 'integration' && (
                          <IntegrationStepConfig
                            stepId={step.id}
                            config={step.config}
                            onUpdateConfig={(key, value) => updateStepConfig(step.id, key, value)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add step */}
          <div className="mt-3">
            {showAddMenu ? (
              <div className="border border-border/30 rounded-2xl p-3 bg-card/50">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-semibold text-foreground">Add a step</span>
                  <button onClick={() => setShowAddMenu(false)} className="p-1 text-muted-foreground/40 hover:text-foreground rounded transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STEP_TYPES.map(st => {
                    const Icon = st.icon;
                    return (
                      <button
                        key={st.value}
                        onClick={() => addStep(st.value as WorkflowStep['type'])}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/20 bg-background/50 hover:border-border/50 hover:bg-muted/20 transition-all text-center"
                      >
                        <div className={`p-2 rounded-xl ${st.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-medium text-foreground block">{st.label}</span>
                          <span className="text-[9px] text-muted-foreground/40">{st.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMenu(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground/50 hover:text-foreground border border-dashed border-border/30 hover:border-border/50 rounded-2xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Step
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 bg-red-500/[0.03] border border-red-500/15 rounded-xl">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
