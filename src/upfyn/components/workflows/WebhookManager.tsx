import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Play, Edit2, X, Check, AlertCircle, Loader2, Link2 } from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';

interface Webhook {
  id: number;
  name: string;
  url: string;
  method: string;
  headers: string;
  description: string | null;
  is_active: number;
  last_triggered: string | null;
  created_at: string;
}

interface TestResult {
  status?: number;
  statusText?: string;
  body?: any;
  error?: string;
}

interface WebhookManagerProps {
  onWebhooksChange?: () => void;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-400',
  POST: 'bg-blue-500/10 text-blue-400',
  PUT: 'bg-yellow-500/10 text-yellow-400',
  PATCH: 'bg-orange-500/10 text-orange-400',
  DELETE: 'bg-red-500/10 text-red-400',
};

export default function WebhookManager({ onWebhooksChange }: WebhookManagerProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; result: TestResult; success: boolean } | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formMethod, setFormMethod] = useState('POST');
  const [formHeaders, setFormHeaders] = useState('{}');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/api/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const resetForm = () => {
    setFormName(''); setFormUrl(''); setFormMethod('POST');
    setFormHeaders('{}'); setFormDescription(''); setFormError('');
    setEditingId(null); setShowForm(false);
  };

  const openEditForm = (webhook: Webhook) => {
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormMethod(webhook.method);
    setFormHeaders(webhook.headers || '{}');
    setFormDescription(webhook.description || '');
    setEditingId(webhook.id);
    setShowForm(true);
    setFormError('');
  };

  const handleSave = async () => {
    setFormError('');
    if (!formName.trim()) { setFormError('Name is required'); return; }
    if (!formUrl.trim()) { setFormError('URL is required'); return; }
    try { new URL(formUrl); } catch { setFormError('Invalid URL'); return; }
    try { JSON.parse(formHeaders); } catch { setFormError('Headers must be valid JSON'); return; }

    try {
      const body = { name: formName, url: formUrl, method: formMethod, headers: formHeaders, description: formDescription };
      const url = editingId ? `/api/webhooks/${editingId}` : '/api/webhooks';
      const method = editingId ? 'PUT' : 'POST';
      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'Failed to save');
        return;
      }
      resetForm();
      fetchWebhooks();
      onWebhooksChange?.();
    } catch {
      setFormError('Network error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await authenticatedFetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      fetchWebhooks();
      onWebhooksChange?.();
    } catch { /* ignore */ }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await authenticatedFetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult({ id, result: data.result, success: data.success });
    } catch {
      setTestResult({ id, result: { error: 'Network error' }, success: false });
    }
    setTestingId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground/40">Loading webhooks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground tracking-tight">Webhooks</h3>
          <p className="text-xs text-muted-foreground/50 mt-0.5">HTTP endpoints that workflows can call during execution</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Webhook
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card/50 border border-border/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-foreground">{editingId ? 'Edit Webhook' : 'New Webhook'}</span>
            <button onClick={resetForm} className="p-1.5 text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground/70 mb-1.5 block">Name</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="My Webhook"
                className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/40 rounded-xl text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground/70 mb-1.5 block">Method</label>
              <select
                value={formMethod}
                onChange={e => setFormMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/40 rounded-xl text-foreground focus:outline-none focus:border-primary/40 transition-colors"
              >
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground/70 mb-1.5 block">URL</label>
            <input
              value={formUrl}
              onChange={e => setFormUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/40 rounded-xl text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground/70 mb-1.5 block">Headers (JSON)</label>
            <textarea
              value={formHeaders}
              onChange={e => setFormHeaders(e.target.value)}
              placeholder='{"Authorization": "Bearer ..."}'
              rows={2}
              className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/40 rounded-xl text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 font-mono resize-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground/70 mb-1.5 block">Description</label>
            <input
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/40 rounded-xl text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 bg-red-500/[0.03] border border-red-500/15 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={resetForm} className="px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
            >
              <Check className="w-3.5 h-3.5" />
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Webhook List */}
      {webhooks.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
            <Link2 className="w-7 h-7 text-muted-foreground/25" />
          </div>
          <h4 className="text-sm font-semibold text-foreground tracking-tight mb-1">No webhooks yet</h4>
          <p className="text-xs text-muted-foreground/50 max-w-xs leading-relaxed">
            Create a webhook endpoint to use in your workflow steps.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh, index) => (
            <div
              key={wh.id}
              className="bg-card/50 border border-border/30 rounded-2xl p-4 hover:border-border/50 transition-all duration-200"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground tracking-tight">{wh.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                      METHOD_COLORS[wh.method] || 'bg-muted text-muted-foreground'
                    }`}>
                      {wh.method}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/50 font-mono truncate">{wh.url}</p>
                  {wh.description && <p className="text-[11px] text-muted-foreground/40 mt-1">{wh.description}</p>}
                  {wh.last_triggered && (
                    <p className="text-[10px] text-muted-foreground/30 mt-1.5">Last triggered: {new Date(wh.last_triggered).toLocaleString()}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleTest(wh.id)}
                    disabled={testingId === wh.id}
                    className="p-2 text-muted-foreground/40 hover:text-green-400 hover:bg-green-500/5 rounded-lg transition-colors disabled:opacity-50"
                    title="Test webhook"
                  >
                    {testingId === wh.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => openEditForm(wh)}
                    className="p-2 text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="p-2 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Test result */}
              {testResult?.id === wh.id && (
                <div className={`mt-3 p-3 rounded-xl text-xs ${testResult.success ? 'bg-green-500/[0.03] border border-green-500/15' : 'bg-red-500/[0.03] border border-red-500/15'}`}>
                  {testResult.result.error ? (
                    <span className="text-red-400">{testResult.result.error}</span>
                  ) : (
                    <div>
                      <span className={testResult.result.status && testResult.result.status < 400 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                        {testResult.result.status} {testResult.result.statusText}
                      </span>
                      {testResult.result.body && (
                        <pre className="mt-2 text-[10px] text-muted-foreground/50 font-mono overflow-x-auto max-h-24 overflow-y-auto p-2 bg-background/50 rounded-lg">
                          {typeof testResult.result.body === 'string' ? testResult.result.body : JSON.stringify(testResult.result.body, null, 2)}
                        </pre>
                      )}
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
