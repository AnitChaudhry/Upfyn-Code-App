/**
 * Desktop Workflows Panel — cofounder.co-style workflow builder
 * Features:
 * - Keyword awakening: detects dev tool keywords as you type descriptions
 * - 5 step types: shell, ai-prompt, webhook, delay, file-op
 * - Step reordering, expand/collapse config panels
 * - AI-powered workflow generation (via BYOK)
 * - Execution with output streaming
 * - Run history tracking
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap, Plus, Play, Trash2, Edit2, Loader2, RefreshCw, Save,
  ArrowLeft, ArrowRight, Clock, CheckCircle, XCircle, ChevronUp,
  ChevronDown, GripVertical, MessageSquare, Globe, GitBranch,
  Terminal, FolderOpen, X, Sparkles, Wand2, AlertCircle, History,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useClaudeSession } from '@/contexts/ClaudeSessionContext';
import { useKeywordDetection, type KeywordMatch } from '@/hooks/useKeywordDetection';
import {
  CATALOG_BY_ID, DEV_CATALOG_BY_ID, COMPOSIO_CATALOG_BY_ID, COMPOSIO_CATALOG,
  type SuggestedStep, type DevToolEntry, type ComposioIntegrationEntry,
} from '@/lib/desktopToolCatalog';
import { composioConnect, composioWaitForConnection, composioCatalog } from '@/lib/composioApi';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkflowStep {
  id: string;
  type: 'shell' | 'ai-prompt' | 'webhook' | 'delay' | 'file-op' | 'integration';
  label: string;
  config: Record<string, any>;
  order: number;
}

interface WorkflowRun {
  id: string;
  status: 'completed' | 'failed' | 'running';
  stepsCompleted: number;
  totalSteps: number;
  output: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  trigger?: string;
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  runs?: WorkflowRun[];
}

interface WorkflowsPanelProps {
  projectPath: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const WORKFLOWS_FILE = '.upfyn/workflows.json';

import { Plug } from 'lucide-react';

const STEP_TYPES = [
  { value: 'shell', label: 'Shell Command', desc: 'Run a terminal command', icon: Terminal, color: 'text-yellow-400 bg-yellow-500/10', ring: 'ring-yellow-500/20' },
  { value: 'ai-prompt', label: 'AI Prompt', desc: 'Ask AI to process data', icon: MessageSquare, color: 'text-blue-400 bg-blue-500/10', ring: 'ring-blue-500/20' },
  { value: 'webhook', label: 'Webhook', desc: 'Call an HTTP endpoint', icon: Globe, color: 'text-cyan-400 bg-cyan-500/10', ring: 'ring-cyan-500/20' },
  { value: 'delay', label: 'Delay', desc: 'Wait before continuing', icon: Clock, color: 'text-purple-400 bg-purple-500/10', ring: 'ring-purple-500/20' },
  { value: 'file-op', label: 'File Operation', desc: 'Copy, move, or process files', icon: FolderOpen, color: 'text-green-400 bg-green-500/10', ring: 'ring-green-500/20' },
  { value: 'integration', label: 'Integration', desc: 'Use a connected app', icon: Plug, color: 'text-orange-400 bg-orange-500/10', ring: 'ring-orange-500/20' },
] as const;

const STEP_COLORS: Record<string, string> = {
  'shell': 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
  'ai-prompt': 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  'webhook': 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
  'delay': 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
  'file-op': 'bg-green-500/10 text-green-400 ring-green-500/20',
  'integration': 'bg-orange-500/10 text-orange-400 ring-orange-500/20',
};

const AI_SUGGESTIONS = [
  'Run tests, lint, then build for production',
  'Git add, commit, and push to main',
  'Clean node_modules, reinstall, and rebuild',
  'Run database migrations then seed data',
  'Docker build image and push to registry',
  'Backup project files then deploy to Vercel',
];

let stepIdCounter = 0;
const genStepId = () => `step_${Date.now()}_${++stepIdCounter}`;

// ─── Keyword Suggestion Popup ───────────────────────────────────────────────
// Context-aware: dev tools show actions, Composio integrations show connect button

interface KeywordPopupProps {
  match: KeywordMatch;
  onDismiss: () => void;
  onAddStep: (step: SuggestedStep) => void;
  onAddIntegrationStep: (integrationId: string, toolSlug: string, label: string) => void;
  onConnectionComplete: () => void;
}

const KeywordSuggestionPopup: React.FC<KeywordPopupProps> = ({
  match, onDismiss, onAddStep, onAddIntegrationStep, onConnectionComplete,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(match.isConnected ?? false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onDismiss]);

  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectStatus, setConnectStatus] = useState<'idle' | 'opening' | 'waiting' | 'success' | 'error'>('idle');

  // Handle Composio OAuth connection — opens themed dialog
  const handleConnect = async () => {
    setShowConnectDialog(true);
    setConnecting(true);
    setConnectError('');
    setConnectStatus('opening');

    try {
      const data = await composioConnect(match.toolId);
      if (data.redirectUrl) {
        // Open OAuth in system browser
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(data.redirectUrl);
        setConnectStatus('waiting');

        // Poll for completion
        const pollInterval = setInterval(async () => {
          try {
            const waitData = await composioWaitForConnection(data.connectedAccountId);
            if (waitData.status === 'ACTIVE') {
              clearInterval(pollInterval);
              setConnected(true);
              setConnecting(false);
              setConnectStatus('success');
              onConnectionComplete();
            }
          } catch { /* keep polling */ }
        }, 2000);

        // Timeout after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (connectStatus === 'waiting') {
            setConnecting(false);
            setConnectStatus('error');
            setConnectError('Connection timed out. Please try again.');
          }
        }, 120000);
      }
    } catch (err: any) {
      setConnecting(false);
      setConnectStatus('error');
      setConnectError(err.message || 'Failed to initiate connection');
    }
  };

  // ── Dev tool popup (local) ──
  if (match.isLocal) {
    const devEntry = DEV_CATALOG_BY_ID[match.toolId];
    const suggestions = devEntry?.suggestedSteps || [];

    return (
      <div
        ref={popupRef}
        className="fixed z-50 bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden min-w-[240px] max-w-[300px]"
        style={{ top: match.position.top, left: Math.min(match.position.left, window.innerWidth - 320) }}
      >
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/20 border-b border-border/20">
          <div className="p-1.5 rounded-lg bg-yellow-500/10">
            <Terminal className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground">{match.toolName}</div>
            <div className="text-[10px] text-muted-foreground/40">
              Detected "<span className="text-primary/60 font-medium">{match.keyword}</span>"
            </div>
          </div>
          <button onClick={onDismiss} className="p-1 text-muted-foreground/30 hover:text-foreground rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-1.5">
          {suggestions.length > 0 ? (
            <div className="space-y-0.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  onClick={() => onAddStep(suggestion)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-foreground hover:bg-muted/30 rounded-xl transition-colors group"
                >
                  <Plus className="w-3.5 h-3.5 text-yellow-400 group-hover:text-yellow-300" />
                  <span className="flex-1 text-left">Add: {suggestion.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2.5 py-3 text-xs text-muted-foreground/50">No suggestions available</div>
          )}
        </div>
      </div>
    );
  }

  // ── Composio integration popup (cloud) ──
  const composioEntry = COMPOSIO_CATALOG_BY_ID[match.toolId];
  const actions = composioEntry?.popularActions || [];

  return (
    <>
      <div
        ref={popupRef}
        className="fixed z-50 bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden min-w-[240px] max-w-[300px]"
        style={{ top: match.position.top, left: Math.min(match.position.left, window.innerWidth - 320) }}
      >
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/20 border-b border-border/20">
          <div className="p-1.5 rounded-lg bg-cyan-500/10">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground">{match.toolName}</div>
            <div className="text-[10px] text-muted-foreground/40">
              Detected "<span className="text-primary/60 font-medium">{match.keyword}</span>"
            </div>
          </div>
          <button onClick={onDismiss} className="p-1 text-muted-foreground/30 hover:text-foreground rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-1.5">
          {/* Not connected — show connect button */}
          {!connected && (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full flex items-center gap-2.5 px-2.5 py-2.5 text-xs text-foreground hover:bg-muted/30 rounded-xl transition-colors"
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <Plug className="w-3.5 h-3.5 text-primary" />
              )}
              <span>{connecting ? 'Connecting...' : `Connect ${match.toolName} to use actions`}</span>
            </button>
          )}

          {/* Connected — show available actions */}
          {connected && actions.length > 0 && (
            <div className="space-y-0.5">
              {actions.map((action) => (
                <button
                  key={action.slug}
                  onClick={() => onAddIntegrationStep(match.toolId, action.slug, action.label)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-foreground hover:bg-muted/30 rounded-xl transition-colors group"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300" />
                  <span className="flex-1 text-left">Add: {action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Themed Connect Dialog ── */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="bg-card border-border/40 rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="p-2 rounded-xl bg-cyan-500/10">
                <Plug className="w-4 h-4 text-cyan-400" />
              </div>
              Connect {match.toolName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/60">
              Grant Upfyn Code permission to use {match.toolName} in your workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Status indicator */}
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 rounded-xl">
              {connectStatus === 'opening' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Opening authorization page...</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">A browser window will open for you to grant access.</p>
                  </div>
                </>
              )}
              {connectStatus === 'waiting' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Waiting for authorization...</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">Complete the sign-in in your browser, then return here.</p>
                  </div>
                </>
              )}
              {connectStatus === 'success' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-xs font-medium text-green-400">Connected successfully!</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{match.toolName} is now available in your workflows.</p>
                  </div>
                </>
              )}
              {connectStatus === 'error' && (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-xs font-medium text-red-400">Connection failed</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{connectError || 'Something went wrong. Please try again.'}</p>
                  </div>
                </>
              )}
              {connectStatus === 'idle' && (
                <>
                  <Plug className="w-4 h-4 text-muted-foreground/40" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Ready to connect</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">Click below to authorize {match.toolName}.</p>
                  </div>
                </>
              )}
            </div>

            {/* Available actions preview */}
            {(connectStatus === 'success' || connected) && actions.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground/60 mb-2">Available Actions</p>
                <div className="space-y-1">
                  {actions.map((action) => (
                    <button
                      key={action.slug}
                      onClick={() => {
                        onAddIntegrationStep(match.toolId, action.slug, action.label);
                        setShowConnectDialog(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted/30 rounded-xl transition-colors group border border-border/20"
                    >
                      <Plus className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300" />
                      <span className="flex-1 text-left font-medium">{action.label}</span>
                      <span className="text-[9px] text-muted-foreground/30 font-mono">{action.params.join(', ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Permissions info */}
            {connectStatus !== 'success' && (
              <div className="px-3 py-2 bg-muted/10 rounded-xl">
                <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
                  This will open {match.toolName}'s authorization page in your browser.
                  You can revoke access at any time from Settings.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {connectStatus === 'success' ? (
              <button
                onClick={() => setShowConnectDialog(false)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            ) : connectStatus === 'error' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowConnectDialog(false)}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConnectDialog(false)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Workflow Editor ────────────────────────────────────────────────────────

interface WorkflowEditorProps {
  workflow: Workflow;
  isNew: boolean;
  onSave: (workflow: Workflow) => void;
  onCancel: () => void;
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow: initial, isNew, onSave, onCancel }) => {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [steps, setSteps] = useState<WorkflowStep[]>(initial.steps || []);
  const [trigger, setTrigger] = useState(initial.trigger || '');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [error, setError] = useState('');

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const { activeMatch, detectKeywords, dismiss: dismissKeyword, refreshConnections } = useKeywordDetection();

  const addStep = useCallback((type: WorkflowStep['type'], label?: string, config?: Record<string, any>) => {
    const stepType = STEP_TYPES.find(s => s.value === type);
    const newStep: WorkflowStep = {
      id: genStepId(),
      type,
      label: label || stepType?.label || type,
      config: config || (type === 'delay' ? { seconds: 5 } : type === 'webhook' ? { url: '', method: 'POST', headers: '{}' } : { command: '' }),
      order: steps.length,
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

  const handleAddFromKeyword = useCallback((suggestion: SuggestedStep) => {
    const config: Record<string, any> = {};
    if (suggestion.type === 'shell' || suggestion.type === 'file-op') {
      config.command = suggestion.command;
    } else if (suggestion.type === 'ai-prompt') {
      config.prompt = suggestion.command;
    } else if (suggestion.type === 'webhook') {
      const parts = suggestion.command.split(' ');
      config.method = parts[0] || 'POST';
      config.url = parts[1] || '';
      config.headers = '{}';
    }
    addStep(suggestion.type, suggestion.label, config);
    dismissKeyword();
  }, [addStep, dismissKeyword]);

  // Add Composio integration step from keyword popup
  const handleAddIntegrationStep = useCallback((integrationId: string, toolSlug: string, label: string) => {
    addStep('integration', label, { integrationId, toolSlug, arguments: {} });
    dismissKeyword();
  }, [addStep, dismissKeyword]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    const rect = e.target.getBoundingClientRect();
    detectKeywords(val, e.target.selectionStart || 0, rect);
  }, [detectKeywords]);

  const handleSave = () => {
    setError('');
    if (!name.trim()) { setError('Workflow name is required'); return; }
    if (steps.length === 0) { setError('Add at least one step'); return; }

    const updated: Workflow = {
      ...initial,
      name: name.trim(),
      description,
      steps,
      trigger: trigger.trim() || undefined,
    };
    onSave(updated);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20 bg-card/50">
        <button onClick={onCancel} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground tracking-tight">
          {isNew ? 'New Workflow' : 'Edit Workflow'}
        </span>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          <Save className="w-3.5 h-3.5" />
          Save Workflow
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Name & Description */}
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
                placeholder='Describe what this workflow does... Try typing "git", "npm", "test", "deploy", "email", or "slack" to auto-detect tools'
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/40 rounded-xl text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 resize-none transition-colors"
              />
              {activeMatch && (
                <KeywordSuggestionPopup
                  match={activeMatch}
                  onDismiss={dismissKeyword}
                  onAddStep={handleAddFromKeyword}
                  onAddIntegrationStep={handleAddIntegrationStep}
                  onConnectionComplete={refreshConnections}
                />
              )}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground/70 mb-1.5 block">Keyword Trigger (optional)</label>
            <input
              value={trigger}
              onChange={e => setTrigger(e.target.value)}
              placeholder="e.g. deploy, build, test"
              className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/40 rounded-xl text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-colors"
            />
            <p className="text-[10px] text-muted-foreground/35 mt-1">
              Type this keyword in chat to trigger this workflow automatically
            </p>
          </div>
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

                        {step.type === 'shell' && (
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Command</label>
                            <input
                              value={step.config.command || ''}
                              onChange={e => updateStepConfig(step.id, 'command', e.target.value)}
                              placeholder="npm run build"
                              className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 font-mono transition-colors"
                            />
                          </div>
                        )}

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
                            <p className="text-[10px] text-muted-foreground/30 mt-1">Requires a configured AI provider in Settings → AI Providers</p>
                          </div>
                        )}

                        {step.type === 'webhook' && (
                          <>
                            <div className="flex gap-2">
                              <div className="w-24">
                                <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Method</label>
                                <select
                                  value={step.config.method || 'POST'}
                                  onChange={e => updateStepConfig(step.id, 'method', e.target.value)}
                                  className="w-full px-2 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                                >
                                  <option value="GET">GET</option>
                                  <option value="POST">POST</option>
                                  <option value="PUT">PUT</option>
                                  <option value="PATCH">PATCH</option>
                                  <option value="DELETE">DELETE</option>
                                </select>
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">URL</label>
                                <input
                                  value={step.config.url || ''}
                                  onChange={e => updateStepConfig(step.id, 'url', e.target.value)}
                                  placeholder="https://api.example.com/webhook"
                                  className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 font-mono transition-colors"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Headers (JSON)</label>
                              <input
                                value={step.config.headers || '{}'}
                                onChange={e => updateStepConfig(step.id, 'headers', e.target.value)}
                                placeholder='{"Authorization": "Bearer ..."}'
                                className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 font-mono transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Body (JSON, optional)</label>
                              <textarea
                                value={step.config.body || ''}
                                onChange={e => updateStepConfig(step.id, 'body', e.target.value)}
                                placeholder='{"message": "Workflow triggered"}'
                                rows={2}
                                className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none font-mono transition-colors"
                              />
                            </div>
                          </>
                        )}

                        {step.type === 'delay' && (
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Delay (seconds, max 60)</label>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={step.config.seconds || 5}
                              onChange={e => updateStepConfig(step.id, 'seconds', Math.min(60, Math.max(1, parseInt(e.target.value) || 1)))}
                              className="w-24 px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                            />
                          </div>
                        )}

                        {step.type === 'file-op' && (
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">File Command</label>
                            <input
                              value={step.config.command || ''}
                              onChange={e => updateStepConfig(step.id, 'command', e.target.value)}
                              placeholder="cp -r ./dist ./backups/"
                              className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 font-mono transition-colors"
                            />
                          </div>
                        )}

                        {step.type === 'integration' && (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Integration</label>
                              <input
                                value={step.config.integrationId || ''}
                                onChange={e => updateStepConfig(step.id, 'integrationId', e.target.value)}
                                placeholder="GMAIL, SLACK, GITHUB..."
                                className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 font-mono transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Action (Tool Slug)</label>
                              <input
                                value={step.config.toolSlug || ''}
                                onChange={e => updateStepConfig(step.id, 'toolSlug', e.target.value)}
                                placeholder="GMAIL_SEND_EMAIL"
                                className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 font-mono transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Arguments (JSON)</label>
                              <textarea
                                value={typeof step.config.arguments === 'object' ? JSON.stringify(step.config.arguments, null, 2) : (step.config.arguments || '{}')}
                                onChange={e => {
                                  try {
                                    const parsed = JSON.parse(e.target.value);
                                    updateStepConfig(step.id, 'arguments', parsed);
                                  } catch {
                                    updateStepConfig(step.id, 'arguments', e.target.value);
                                  }
                                }}
                                placeholder='{"to": "user@example.com", "subject": "Hello"}'
                                rows={3}
                                className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none font-mono transition-colors"
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground/30">
                              Use {'{{prev.field}}'} to reference output from the previous step.
                              Requires the integration to be connected via Composio.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add step menu */}
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
};

// ─── Main Panel ─────────────────────────────────────────────────────────────

const WorkflowsPanel: React.FC<WorkflowsPanelProps> = ({ projectPath }) => {
  const claudeSession = useClaudeSession();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [isNewWorkflow, setIsNewWorkflow] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runOutput, setRunOutput] = useState<{ id: string; output: string; success?: boolean } | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  // AI generation
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  // Connected integrations
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [connectedApps, setConnectedApps] = useState<Map<string, boolean>>(new Map());
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  const filePath = `${projectPath.replace(/\\/g, '/')}/${WORKFLOWS_FILE}`;

  // Load connected Composio integrations
  const loadConnectedApps = useCallback(async () => {
    setIntegrationsLoading(true);
    try {
      const catalog = await composioCatalog();
      const map = new Map<string, boolean>();
      for (const entry of catalog) {
        map.set(entry.id, entry.connected);
      }
      setConnectedApps(map);
    } catch {
      // Not authenticated or backend unreachable
    }
    setIntegrationsLoading(false);
  }, []);

  useEffect(() => {
    if (showIntegrations) {
      loadConnectedApps();
    }
  }, [showIntegrations, loadConnectedApps]);

  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const content = await api.readFileContent(filePath);
      const data = JSON.parse(content);
      setWorkflows(data.workflows || []);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const saveWorkflows = useCallback(async (updated: Workflow[]) => {
    await api.runShellCommand(`mkdir -p "${projectPath.replace(/\\/g, '/')}/.upfyn"`, projectPath);
    await api.writeFileContent(filePath, JSON.stringify({ workflows: updated }, null, 2));
  }, [filePath, projectPath]);

  const handleCreate = () => {
    const newWf: Workflow = {
      id: `wf-${Date.now()}`,
      name: '',
      description: '',
      steps: [],
      trigger: '',
      enabled: true,
      createdAt: new Date().toISOString(),
      runs: [],
    };
    setEditingWorkflow(newWf);
    setIsNewWorkflow(true);
    setView('editor');
  };

  const handleEdit = (wf: Workflow) => {
    setEditingWorkflow(wf);
    setIsNewWorkflow(false);
    setView('editor');
  };

  const handleSave = async (updated: Workflow) => {
    let list: Workflow[];
    if (isNewWorkflow) {
      list = [...workflows, updated];
    } else {
      list = workflows.map(w => w.id === updated.id ? updated : w);
    }
    setWorkflows(list);
    await saveWorkflows(list);
    setView('list');
    setEditingWorkflow(null);
    setIsNewWorkflow(false);
  };

  const handleDelete = async (id: string) => {
    const updated = workflows.filter(w => w.id !== id);
    setWorkflows(updated);
    await saveWorkflows(updated);
  };

  const handleRun = async (workflow: Workflow) => {
    setRunningId(workflow.id);
    setRunOutput({ id: workflow.id, output: '' });

    let output = '';
    let allSuccess = true;
    let stepsCompleted = 0;
    const startedAt = new Date().toISOString();

    for (const step of workflow.steps) {
      output += `\n> Step ${step.order + 1}: ${step.label}\n`;
      setRunOutput({ id: workflow.id, output });

      try {
        if (step.type === 'shell' || step.type === 'file-op') {
          const result = await api.runShellCommand(step.config.command || '', projectPath);
          output += result.stdout || '';
          if (result.stderr) output += `\nSTDERR: ${result.stderr}`;
          if (!result.success) {
            output += `\n  Failed (exit ${result.exit_code})\n`;
            allSuccess = false;
            break;
          }
          output += '\n  Done\n';
        } else if (step.type === 'ai-prompt') {
          output += `  [AI Prompt] ${step.config.prompt || ''}\n`;
          // Execute via shared Claude session (same session as Chat/Canvas)
          try {
            const response = await claudeSession.sendPrompt(
              projectPath,
              step.config.prompt || '',
              'sonnet',
              'workflow',
            );
            output += `  AI Response: ${response.slice(0, 200)}${response.length > 200 ? '...' : ''}\n`;
          } catch (err: any) {
            // Fallback to BYOK if Claude CLI is busy or unavailable
            try {
              const response = await api.byokChatSync('anthropic', 'claude-sonnet-4-20250514', [
                { role: 'user', content: step.config.prompt || '' }
              ], 'You are a helpful coding assistant.');
              output += `  AI Response (BYOK): ${response.slice(0, 200)}${response.length > 200 ? '...' : ''}\n`;
            } catch {
              output += `  (AI unavailable: ${err.message})\n`;
            }
          }
          output += '  Done\n';
        } else if (step.type === 'webhook') {
          const method = step.config.method || 'POST';
          const url = step.config.url || '';
          output += `  [${method}] ${url}\n`;
          if (url) {
            try {
              const curlCmd = `curl -s -X ${method} -H "Content-Type: application/json" ${step.config.headers && step.config.headers !== '{}' ? `-H '${step.config.headers}'` : ''} ${step.config.body ? `-d '${step.config.body}'` : ''} "${url}"`;
              const result = await api.runShellCommand(curlCmd, projectPath);
              output += `  Response: ${(result.stdout || '').slice(0, 300)}\n`;
              if (!result.success) {
                allSuccess = false;
                break;
              }
            } catch (err: any) {
              output += `  Webhook error: ${err.message}\n`;
              allSuccess = false;
              break;
            }
          } else {
            output += '  (No URL configured)\n';
          }
          output += '  Done\n';
        } else if (step.type === 'delay') {
          const seconds = step.config.seconds || 5;
          output += `  Waiting ${seconds}s...\n`;
          setRunOutput({ id: workflow.id, output });
          await new Promise(resolve => setTimeout(resolve, seconds * 1000));
          output += '  Done\n';
        } else if (step.type === 'integration') {
          const toolSlug = step.config.toolSlug || '';
          const args = step.config.arguments || {};
          output += `  [Integration] ${step.config.integrationId}: ${toolSlug}\n`;
          try {
            const { composioExecuteTool } = await import('@/lib/composioApi');
            const result = await composioExecuteTool(toolSlug, args);
            output += `  Result: ${JSON.stringify(result).slice(0, 300)}\n`;
            output += '  Done\n';
          } catch (err: any) {
            output += `  Integration error: ${err.message}\n`;
            if (err.message?.includes('Not authenticated')) {
              output += '  (Please log in first to use Composio integrations)\n';
            }
            allSuccess = false;
            break;
          }
        }
        stepsCompleted++;
      } catch (err: any) {
        output += `\n  Error: ${err.message}\n`;
        allSuccess = false;
        break;
      }

      setRunOutput({ id: workflow.id, output });
    }

    output += `\n--- Workflow ${allSuccess ? 'completed successfully' : 'failed'} ---\n`;
    setRunOutput({ id: workflow.id, output, success: allSuccess });

    // Save run history
    const run: WorkflowRun = {
      id: `run-${Date.now()}`,
      status: allSuccess ? 'completed' : 'failed',
      stepsCompleted,
      totalSteps: workflow.steps.length,
      output,
      startedAt,
      completedAt: new Date().toISOString(),
    };

    const updatedWorkflows = workflows.map(w => {
      if (w.id !== workflow.id) return w;
      const runs = [...(w.runs || []), run].slice(-20); // Keep last 20 runs
      return { ...w, lastRun: new Date().toISOString(), runs };
    });
    setWorkflows(updatedWorkflows);
    await saveWorkflows(updatedWorkflows);
    setRunningId(null);
  };

  const handleAiGenerate = async () => {
    if (!aiDescription.trim()) return;
    setAiGenerating(true);
    setAiError('');

    try {
      const systemPrompt = `You are a workflow generator. Given a description, generate a JSON workflow for a desktop automation tool.

Available step types:
- "shell": Run a terminal command. Config: { "command": "..." }
- "ai-prompt": Run an AI prompt. Config: { "prompt": "..." }
- "webhook": Call an HTTP endpoint. Config: { "url": "...", "method": "POST", "headers": "{}", "body": "{}" }
- "delay": Wait N seconds. Config: { "seconds": 5 }
- "file-op": File operations. Config: { "command": "..." }

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "name": "...",
  "description": "...",
  "trigger": "...",
  "steps": [
    { "type": "shell", "label": "...", "config": { "command": "..." } }
  ]
}`;

      // Try shared Claude session first, fall back to BYOK
      let response: string;
      try {
        response = await claudeSession.sendPrompt(
          projectPath,
          `${systemPrompt}\n\nGenerate a workflow for: ${aiDescription.trim()}`,
          'sonnet',
          'workflow',
        );
      } catch {
        response = await api.byokChatSync('anthropic', 'claude-sonnet-4-20250514', [
          { role: 'user', content: `Generate a workflow for: ${aiDescription.trim()}` }
        ], systemPrompt);
      }

      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI response was not valid JSON');

      const generated = JSON.parse(jsonMatch[0]);
      const newWf: Workflow = {
        id: `wf-${Date.now()}`,
        name: generated.name || 'Generated Workflow',
        description: generated.description || aiDescription.trim(),
        steps: (generated.steps || []).map((s: any, i: number) => ({
          id: genStepId(),
          type: s.type || 'shell',
          label: s.label || `Step ${i + 1}`,
          config: s.config || {},
          order: i,
        })),
        trigger: generated.trigger || '',
        enabled: true,
        createdAt: new Date().toISOString(),
        runs: [],
      };

      // Open in editor for review
      setEditingWorkflow(newWf);
      setIsNewWorkflow(true);
      setView('editor');
      setShowAiPrompt(false);
      setAiDescription('');
    } catch (err: any) {
      if (err.message?.includes('No API key')) {
        setAiError('No AI provider configured. Go to Settings → AI Providers to add an API key.');
      } else {
        setAiError(err.message || 'Failed to generate workflow');
      }
    }
    setAiGenerating(false);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground/40">Loading workflows...</span>
      </div>
    );
  }

  // Editor view
  if (view === 'editor' && editingWorkflow) {
    return (
      <WorkflowEditor
        workflow={editingWorkflow}
        isNew={isNewWorkflow}
        onSave={handleSave}
        onCancel={() => { setView('list'); setEditingWorkflow(null); }}
      />
    );
  }

  // List view
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Workflows
            </h3>
            <p className="text-xs text-muted-foreground/50 mt-0.5">
              Automate tasks with shell commands, AI prompts, and webhooks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadWorkflows}
              className="p-2 text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setShowIntegrations(!showIntegrations); setShowAiPrompt(false); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                showIntegrations
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Plug className="w-3.5 h-3.5" />
              Apps
            </button>
            <button
              onClick={() => { setShowAiPrompt(!showAiPrompt); setShowIntegrations(false); }}
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
              onClick={handleCreate}
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

        {/* Connected Apps Panel */}
        {showIntegrations && (
          <div className="bg-gradient-to-br from-orange-500/[0.03] to-transparent border border-orange-500/15 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500/10">
                  <Plug className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <span className="text-xs font-semibold text-foreground">Connected Apps</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={loadConnectedApps}
                  className="p-1.5 text-muted-foreground/40 hover:text-foreground rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${integrationsLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowIntegrations(false)}
                  className="p-1 text-muted-foreground/40 hover:text-foreground rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {integrationsLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground/40">Loading integrations...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {COMPOSIO_CATALOG.map(integration => {
                  const isConnected = connectedApps.get(integration.id) ?? false;
                  return (
                    <div
                      key={integration.id}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                        isConnected
                          ? 'border-green-500/20 bg-green-500/[0.03]'
                          : 'border-border/20 bg-background/50 hover:border-border/40'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-400' : 'bg-muted-foreground/20'}`} />
                      <span className="text-[11px] font-medium text-foreground flex-1 truncate">{integration.name}</span>
                      {isConnected ? (
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                      ) : (
                        <span className="text-[9px] text-muted-foreground/30">Not connected</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/35 leading-relaxed">
              Type integration keywords (e.g. "email", "slack", "github") in your workflow description to connect new apps.
              Log in first to manage connections.
            </p>
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
              Chain shell commands, AI prompts, webhook calls, and delays into automated pipelines.
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
                onClick={handleCreate}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="bg-card/50 border border-border/30 rounded-2xl p-4 hover:border-border/50 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground tracking-tight">{wf.name}</h4>
                      {wf.trigger && (
                        <span className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-full ring-1 ring-cyan-500/20">
                          /{wf.trigger}
                        </span>
                      )}
                    </div>

                    {wf.description && (
                      <p className="text-xs text-muted-foreground/60 mb-3 line-clamp-1">{wf.description}</p>
                    )}

                    {/* Step flow visualization */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {wf.steps.map((step, i) => (
                        <React.Fragment key={step.id}>
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
                      {wf.lastRun && (
                        <span>Last run {new Date(wf.lastRun).toLocaleDateString()}</span>
                      )}
                      {wf.runs && wf.runs.length > 0 && (
                        <span>{wf.runs.filter(r => r.status === 'completed').length}/{wf.runs.length} succeeded</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRun(wf)}
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
                      onClick={() => setHistoryId(historyId === wf.id ? null : wf.id)}
                      className={`p-2 rounded-lg transition-colors ${historyId === wf.id ? 'text-primary bg-primary/5' : 'text-muted-foreground/40 hover:text-foreground hover:bg-muted/30'}`}
                      title="Execution history"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEdit(wf)}
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

                {/* Run output */}
                {runOutput?.id === wf.id && (
                  <div className={`mt-3 border rounded-xl overflow-hidden ${runOutput.success === true ? 'border-green-500/15' : runOutput.success === false ? 'border-red-500/15' : 'border-border/20'}`}>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-b border-border/10">
                      <div className="flex items-center gap-1.5">
                        {runOutput.success === true ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : runOutput.success === false ? (
                          <XCircle className="w-3 h-3 text-red-400" />
                        ) : (
                          <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
                        )}
                        <span className="text-[10px] font-medium text-foreground">Output</span>
                      </div>
                      <button
                        onClick={() => setRunOutput(null)}
                        className="text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono bg-black/50 p-3 max-h-48 overflow-auto whitespace-pre-wrap text-green-400">
                      {runOutput.output}
                    </pre>
                  </div>
                )}

                {/* Execution history */}
                {historyId === wf.id && (
                  <div className="mt-3 border-t border-border/15 pt-3">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <History className="w-3 h-3 text-muted-foreground/50" />
                      <span className="text-[11px] font-semibold text-foreground">Execution History</span>
                    </div>
                    {(!wf.runs || wf.runs.length === 0) ? (
                      <div className="text-[10px] text-muted-foreground/30 py-3 italic">No runs yet</div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {[...wf.runs].reverse().map(run => (
                          <div key={run.id} className="flex items-start gap-2.5 text-[10px] bg-muted/10 rounded-lg p-2.5">
                            <div className="shrink-0 mt-0.5">
                              {run.status === 'completed' ? (
                                <CheckCircle className="w-3 h-3 text-green-400" />
                              ) : run.status === 'failed' ? (
                                <XCircle className="w-3 h-3 text-red-400" />
                              ) : (
                                <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${
                                  run.status === 'completed' ? 'text-green-400' :
                                  run.status === 'failed' ? 'text-red-400' :
                                  'text-muted-foreground'
                                }`}>
                                  {run.status === 'completed' ? 'Success' : run.status === 'failed' ? 'Failed' : 'Running'}
                                </span>
                                <span className="text-muted-foreground/25">
                                  {run.stepsCompleted}/{run.totalSteps} steps
                                </span>
                                <span className="text-muted-foreground/25">
                                  {new Date(run.startedAt).toLocaleString()}
                                </span>
                              </div>
                              {run.completedAt && (
                                <span className="text-muted-foreground/20">
                                  Duration: {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s
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
    </div>
  );
};

export default WorkflowsPanel;
