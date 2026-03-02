/**
 * BYOK Chat Component
 * Provides a standalone chat experience using user's own API keys.
 * Supports streaming from Anthropic, OpenAI, OpenRouter, Google, Groq, Mistral, Together, DeepSeek.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2, Send, Trash2, Settings2, ChevronDown, Bot, User, Copy, Check,
  Zap, Brain, Sparkles, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, type ProviderInfo, type ModelInfo, type ChatMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

import { listen } from '@tauri-apps/api/event';

interface BYOKChatProps {
  projectPath?: string;
  className?: string;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  provider?: string;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  anthropic: <Brain className="h-3.5 w-3.5" />,
  openai: <Sparkles className="h-3.5 w-3.5" />,
  openrouter: <Globe className="h-3.5 w-3.5" />,
  google: <Zap className="h-3.5 w-3.5" />,
  groq: <Zap className="h-3.5 w-3.5" />,
  mistral: <Bot className="h-3.5 w-3.5" />,
  together: <Bot className="h-3.5 w-3.5" />,
  deepseek: <Brain className="h-3.5 w-3.5" />,
};

export const BYOKChat: React.FC<BYOKChatProps> = ({ projectPath, className }) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provider/model selection
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'You are a helpful AI coding assistant. You help with programming questions, code review, debugging, and software architecture. Be concise and provide code examples when helpful.'
  );

  // Streaming accumulator
  const streamContentRef = useRef('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const unlistenRefs = useRef<Array<() => void>>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load providers and models
  useEffect(() => {
    const loadData = async () => {
      try {
        const [providerList, modelList] = await Promise.all([
          api.listProviders(),
          api.listModels(),
        ]);
        setProviders(providerList);
        setModels(modelList);

        // Auto-select first configured provider and its first model
        const configured = providerList.filter(p => p.configured);
        if (configured.length > 0) {
          const firstProvider = configured[0].id;
          setSelectedProvider(firstProvider);

          const providerModels = modelList.filter(m => m.provider === firstProvider);
          if (providerModels.length > 0) {
            setSelectedModel(providerModels[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load BYOK data:', err);
      }
    };
    loadData();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup listeners
  useEffect(() => {
    return () => {
      unlistenRefs.current.forEach(fn => fn());
      unlistenRefs.current = [];
    };
  }, []);

  const handleSend = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || isStreaming || !selectedProvider || !selectedModel) return;

    setInput('');
    setError(null);

    // Add user message
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Prepare assistant placeholder
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: DisplayMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: selectedModel,
      provider: selectedProvider,
    };
    setMessages(prev => [...prev, assistantMsg]);
    setIsStreaming(true);
    streamContentRef.current = '';

    try {
      // Build message history for the API (last N messages as context)
      const chatHistory: ChatMessage[] = messages
        .filter(m => m.role !== 'system')
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }));
      chatHistory.push({ role: 'user', content: prompt });

      // Start streaming chat
      const sessionId = await api.byokChat(
        selectedProvider,
        selectedModel,
        chatHistory,
        systemPrompt || undefined,
      );

      // Listen for stream events
      const cleanups: Array<() => void> = [];

      const unlistenStream = await listen(`byok-stream-${sessionId}`, (event: any) => {
        const content = event.payload?.content || '';
        streamContentRef.current += content;
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: streamContentRef.current }
              : m
          )
        );
      });
      cleanups.push(unlistenStream);

      const unlistenError = await listen(`byok-error-${sessionId}`, (event: any) => {
        const errMsg = event.payload?.error || 'Unknown error';
        setError(errMsg);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: streamContentRef.current || `Error: ${errMsg}` }
              : m
          )
        );
      });
      cleanups.push(unlistenError);

      const unlistenComplete = await listen(`byok-complete-${sessionId}`, () => {
        setIsStreaming(false);
        // Cleanup listeners after completion
        cleanups.forEach(fn => fn());
      });
      cleanups.push(unlistenComplete);

      unlistenRefs.current = cleanups;
    } catch (err: any) {
      setError(err?.message || 'Failed to send message');
      setIsStreaming(false);
      // Remove empty assistant message on error
      setMessages(prev => prev.filter(m => m.id !== assistantId || m.content));
    }
  }, [input, isStreaming, selectedProvider, selectedModel, messages, systemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
    streamContentRef.current = '';
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const configuredProviders = providers.filter(p => p.configured);
  const providerModels = models.filter(m => m.provider === selectedProvider);
  const selectedModelInfo = models.find(m => m.id === selectedModel);
  const selectedProviderInfo = providers.find(p => p.id === selectedProvider);

  // No configured providers — show setup prompt
  if (providers.length > 0 && configuredProviders.length === 0) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="text-center max-w-md px-6">
          <Settings2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <h3 className="text-lg font-medium mb-2">Set Up AI Providers</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your API keys in Settings &gt; AI Providers to start chatting with any AI model.
            Supports Anthropic, OpenAI, Google, Groq, Mistral, and more.
          </p>
          <p className="text-xs text-muted-foreground">
            Your keys stay local — never sent to our servers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Provider selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/50 hover:bg-accent text-xs font-medium transition-colors"
            >
              {PROVIDER_ICONS[selectedProvider]}
              <span>{selectedProviderInfo?.label || 'Select Provider'}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {showModelPicker && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                {/* Providers */}
                <div className="p-2 border-b border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 mb-1">Provider</p>
                  <div className="flex flex-wrap gap-1">
                    {configuredProviders.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProvider(p.id);
                          const pm = models.filter(m => m.provider === p.id);
                          if (pm.length > 0) setSelectedModel(pm[0].id);
                        }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                          selectedProvider === p.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-accent"
                        )}
                      >
                        {PROVIDER_ICONS[p.id]}
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Models for selected provider */}
                <div className="p-2 max-h-60 overflow-y-auto">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 mb-1">Model</p>
                  <div className="space-y-0.5">
                    {providerModels.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setShowModelPicker(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-colors",
                          selectedModel === m.id
                            ? "bg-accent"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {m.context_window >= 1000000
                            ? `${(m.context_window / 1000000).toFixed(1)}M ctx`
                            : `${(m.context_window / 1000).toFixed(0)}K ctx`}
                        </span>
                      </button>
                    ))}
                    {providerModels.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-2">No models available</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Model badge */}
          {selectedModelInfo && (
            <Badge variant="outline" className="text-[10px]">
              {selectedModelInfo.name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2 text-xs">
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Click outside to close model picker */}
      {showModelPicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowModelPicker(false)} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">BYOK Chat</p>
              <p className="text-xs mt-1 opacity-60">
                Using {selectedProviderInfo?.label || 'your'} API key — direct from your machine
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "justify-end" : "")}>
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}

            <div className={cn(
              "max-w-[80%] rounded-lg px-4 py-3",
              msg.role === 'user'
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50"
            )}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <ReactMarkdown>{msg.content || (isStreaming && msg === messages[messages.length - 1] ? '...' : '')}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}

              {msg.role === 'assistant' && msg.content && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {copiedId === msg.id ? (
                      <><Check className="h-3 w-3" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copy</>
                    )}
                  </button>
                  {msg.model && (
                    <span className="text-[10px] text-muted-foreground">{msg.model}</span>
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}

        {/* Error display */}
        {error && (
          <div className="mx-auto max-w-md px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive">
            {error}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${selectedProviderInfo?.label || 'AI'}...`}
            className="min-h-[44px] max-h-32 resize-none text-sm"
            rows={1}
            disabled={isStreaming || !selectedProvider}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || !selectedProvider || !selectedModel}
            size="icon"
            className="h-10 w-10 flex-shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BYOKChat;
