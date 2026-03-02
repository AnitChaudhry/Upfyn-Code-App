// ChatNode — multi-turn conversational block (Spine AI Chat Block pattern)
import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_STYLES, type BaseNodeData } from './BaseNode';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface ChatNodeData extends BaseNodeData {
  messages?: ChatMessage[];
  sendMessage?: (msg: any) => void;
  latestMessage?: any;
  isCanvasRunning?: boolean;
}

function ChatNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ChatNodeData;
  const style = NODE_STYLES.chat;

  const [messages, setMessages] = useState<ChatMessage[]>(nodeData.messages || []);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const newMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamContent('');

    // Send via canvas WebSocket with chat block context
    if (nodeData.sendMessage) {
      const context = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const fullPrompt = `You are a helpful AI assistant in a chat block on a visual canvas. Here is the conversation so far:\n\n${context}\n\nuser: ${text}\n\nRespond concisely and helpfully.`;
      nodeData.sendMessage({
        type: 'claude-command',
        command: fullPrompt,
        options: { canvasMode: true, blockId: id, chatBlock: true },
      });
    } else {
      // Simulate response if no WebSocket
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Chat requires a connected AI session.', timestamp: Date.now() }]);
        setIsStreaming(false);
      }, 500);
    }
  }, [input, isStreaming, messages, nodeData.sendMessage, id]);

  // Listen for streaming responses targeted at this block
  useEffect(() => {
    if (!nodeData.latestMessage || !isStreaming) return;
    const msg = nodeData.latestMessage;

    if ((msg.type === 'claude-response' || msg.type === 'assistant') && msg.blockId === id) {
      const chunk = msg.content || msg.text || msg.message || '';
      if (chunk) setStreamContent(prev => prev + chunk);
    }

    if ((msg.type === 'claude-complete' || msg.type === 'message_stop') && msg.blockId === id) {
      if (streamContent || (msg.content || msg.text)) {
        const finalContent = streamContent || msg.content || msg.text || '';
        setMessages(prev => [...prev, { role: 'assistant', content: finalContent, timestamp: Date.now() }]);
      }
      setStreamContent('');
      setIsStreaming(false);
    }
  }, [nodeData.latestMessage, isStreaming, id, streamContent]);

  return (
    <div
      className={`
        rounded-xl border-2 shadow-sm w-[320px] transition-shadow flex flex-col
        ${style.bg} ${style.border}
        ${selected ? 'ring-2 ring-primary/40 shadow-md' : 'hover:shadow-md'}
      `}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />

      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${style.border}/30 shrink-0`}>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{style.icon}</span>
          <span className={`text-xs font-semibold ${style.accent} uppercase tracking-wide`}>
            {nodeData.label || 'Chat'}
          </span>
          <span className="text-[9px] text-gray-400">({messages.length} msgs)</span>
        </div>
        <div className="flex items-center gap-1">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-h-[250px] min-h-[80px] px-2 py-2 space-y-1.5">
        {messages.length === 0 && !isStreaming && (
          <p className="text-[10px] text-gray-400 text-center py-3">Start a conversation...</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-[11px] px-2 py-1.5 rounded-lg leading-relaxed ${
              msg.role === 'user'
                ? 'bg-sky-100/80 text-sky-900 ml-4'
                : 'bg-white/60 text-gray-700 mr-4'
            }`}
          >
            <span className="text-[9px] font-semibold text-gray-400 block mb-0.5">
              {msg.role === 'user' ? 'You' : 'AI'}
            </span>
            <span className="whitespace-pre-wrap break-words">{msg.content}</span>
          </div>
        ))}
        {isStreaming && streamContent && (
          <div className="text-[11px] px-2 py-1.5 rounded-lg bg-white/60 text-gray-700 mr-4">
            <span className="text-[9px] font-semibold text-gray-400 block mb-0.5">AI</span>
            <span className="whitespace-pre-wrap break-words">{streamContent}</span>
            <span className="inline-block w-1.5 h-3 bg-sky-400 animate-pulse ml-0.5" />
          </div>
        )}
        {isStreaming && !streamContent && (
          <div className="text-[10px] text-gray-400 flex items-center gap-1 px-2">
            <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-1.5 border-t border-sky-200/50 shrink-0">
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-white/60 text-gray-700 text-[11px] placeholder-gray-400 resize-none outline-none px-2 py-1.5 rounded-lg border border-sky-200/50 focus:border-sky-400/50 max-h-[60px] overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-sky-600 transition-colors"
          >
            {isStreaming ? (
              <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
    </div>
  );
}

export default memo(ChatNode);
