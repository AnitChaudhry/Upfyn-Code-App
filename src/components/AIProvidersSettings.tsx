import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Check, X, Loader2, ExternalLink, Eye, EyeOff, Trash2, RefreshCw, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, type ProviderInfo } from '@/lib/api';

interface AIProvidersSettingsProps {
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

const PROVIDER_DOCS: Record<string, { url: string; getKeyUrl: string }> = {
  anthropic: { url: 'https://docs.anthropic.com', getKeyUrl: 'https://console.anthropic.com/settings/keys' },
  openai: { url: 'https://platform.openai.com/docs', getKeyUrl: 'https://platform.openai.com/api-keys' },
  openrouter: { url: 'https://openrouter.ai/docs', getKeyUrl: 'https://openrouter.ai/keys' },
  google: { url: 'https://ai.google.dev/docs', getKeyUrl: 'https://aistudio.google.com/apikey' },
  groq: { url: 'https://console.groq.com/docs', getKeyUrl: 'https://console.groq.com/keys' },
  mistral: { url: 'https://docs.mistral.ai', getKeyUrl: 'https://console.mistral.ai/api-keys' },
  together: { url: 'https://docs.together.ai', getKeyUrl: 'https://api.together.xyz/settings/api-keys' },
  deepseek: { url: 'https://platform.deepseek.com/docs', getKeyUrl: 'https://platform.deepseek.com/api_keys' },
};

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  anthropic: 'Claude models — best for coding, analysis, and creative tasks',
  openai: 'GPT-4o, O3 — strong general-purpose models',
  openrouter: 'Access 200+ models from all providers through a single API key',
  google: 'Gemini models — large context windows, fast responses',
  groq: 'Ultra-fast inference for Llama, Mixtral, and other open models',
  mistral: 'Mistral Large, Codestral — excellent coding and reasoning',
  together: 'Open-source models at scale — Llama, Qwen, and more',
  deepseek: 'DeepSeek V3 and R1 — powerful reasoning models',
};

export const AIProvidersSettings: React.FC<AIProvidersSettingsProps> = ({ setToast }) => {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<Record<string, boolean | null>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listProviders();
      setProviders(data);
    } catch (err) {
      console.error('Failed to load providers:', err);
      setToast({ message: 'Failed to load providers', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setToast]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleSaveKey = async (providerId: string) => {
    const key = keyInputs[providerId]?.trim();
    if (!key || key.length < 10) {
      setToast({ message: 'API key must be at least 10 characters', type: 'error' });
      return;
    }

    setSaving(prev => ({ ...prev, [providerId]: true }));
    try {
      await api.saveApiKey(providerId, key);
      setToast({ message: `${providerId} API key saved`, type: 'success' });
      setKeyInputs(prev => ({ ...prev, [providerId]: '' }));
      setExpandedProvider(null);
      await loadProviders();
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to save key', type: 'error' });
    } finally {
      setSaving(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleDeleteKey = async (providerId: string) => {
    try {
      await api.deleteApiKey(providerId);
      setToast({ message: `${providerId} API key removed`, type: 'success' });
      setTestResult(prev => ({ ...prev, [providerId]: null }));
      await loadProviders();
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to delete key', type: 'error' });
    }
  };

  const handleTestKey = async (providerId: string) => {
    // Use stored key or input key
    const inputKey = keyInputs[providerId]?.trim();
    let keyToTest = inputKey;

    if (!keyToTest) {
      // Get stored key
      try {
        keyToTest = await api.getApiKey(providerId) || '';
      } catch {
        setToast({ message: 'No key to test', type: 'error' });
        return;
      }
    }

    if (!keyToTest) {
      setToast({ message: 'Enter or save an API key first', type: 'error' });
      return;
    }

    setTesting(prev => ({ ...prev, [providerId]: true }));
    setTestResult(prev => ({ ...prev, [providerId]: null }));

    try {
      const valid = await api.testApiKey(providerId, keyToTest);
      setTestResult(prev => ({ ...prev, [providerId]: valid }));
      if (valid) {
        setToast({ message: `${providerId} key is valid`, type: 'success' });
      } else {
        setToast({ message: `${providerId} key is invalid`, type: 'error' });
      }
    } catch (err: any) {
      setTestResult(prev => ({ ...prev, [providerId]: false }));
      setToast({ message: err?.message || 'Connection test failed', type: 'error' });
    } finally {
      setTesting(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const openExternal = async (url: string) => {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const configuredCount = providers.filter(p => p.configured).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Key className="h-4 w-4" />
          AI Providers (BYOK)
        </h3>
        <p className="text-xs text-muted-foreground">
          Add your own API keys to use AI models directly. Keys are stored locally and never sent to our servers.
          {configuredCount > 0 && (
            <span className="ml-2">
              <Badge variant="outline" className="text-[10px]">{configuredCount} configured</Badge>
            </span>
          )}
        </p>
      </div>

      {/* Provider Cards */}
      <div className="space-y-3">
        {providers.map((provider) => {
          const isExpanded = expandedProvider === provider.id;
          const docs = PROVIDER_DOCS[provider.id];
          const desc = PROVIDER_DESCRIPTIONS[provider.id];
          const isTestingThis = testing[provider.id];
          const result = testResult[provider.id];
          const isSaving = saving[provider.id];

          return (
            <Card
              key={provider.id}
              className={`p-4 transition-all ${provider.configured ? 'border-green-500/30 bg-green-500/5' : ''}`}
            >
              {/* Provider header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${provider.configured ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{provider.label}</span>
                      {provider.configured && (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/30">
                          Active
                        </Badge>
                      )}
                      {result === true && (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      )}
                      {result === false && (
                        <X className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {provider.configured && (
                    <>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {provider.masked_key}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestKey(provider.id)}
                        disabled={isTestingThis}
                        className="h-7 px-2"
                        title="Test connection"
                      >
                        {isTestingThis ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Zap className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKey(provider.id)}
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        title="Remove key"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant={isExpanded ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                    className="h-7 px-3 text-xs"
                  >
                    {provider.configured ? 'Update' : 'Configure'}
                  </Button>
                </div>
              </div>

              {/* Expanded configuration */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type={showKey[provider.id] ? 'text' : 'password'}
                        value={keyInputs[provider.id] || ''}
                        onChange={(e) => setKeyInputs(prev => ({ ...prev, [provider.id]: e.target.value }))}
                        placeholder={provider.placeholder}
                        className="pr-8 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey[provider.id] ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleTestKey(provider.id)}
                      disabled={isTestingThis || !keyInputs[provider.id]?.trim()}
                      variant="outline"
                      className="h-9"
                    >
                      {isTestingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveKey(provider.id)}
                      disabled={isSaving || !keyInputs[provider.id]?.trim()}
                      className="h-9"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>

                  {/* Quick links */}
                  {docs && (
                    <div className="flex items-center gap-3 text-[11px]">
                      <button
                        onClick={() => openExternal(docs.getKeyUrl)}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Get API Key
                      </button>
                      <button
                        onClick={() => openExternal(docs.url)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Documentation
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Info note */}
      <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
        <p><strong>How it works:</strong> Your API keys are stored securely in the local database. When you chat, requests go directly from your machine to the provider — not through our servers.</p>
        <p><strong>OpenRouter</strong> is recommended if you want access to 200+ models with a single key.</p>
      </div>
    </div>
  );
};

export default AIProvidersSettings;
