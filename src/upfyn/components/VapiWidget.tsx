import { useState, useEffect, useRef, useCallback } from 'react';
import { IS_PLATFORM } from '../constants/config';

// Stub Vapi class for desktop builds where @vapi-ai/web is not available
class Vapi {
  constructor(_publicKey: string) {}
  on(_event: string, _handler: (...args: any[]) => void) {}
  start(_assistantId: string, _overrides?: any): Promise<void> { return Promise.resolve(); }
  stop() {}
}

/**
 * VAPI "Talk to Upfyn" widget — platform-only (app shell).
 * Custom implementation using @vapi-ai/web SDK so we can pass user metadata
 * for personalized conversations. The official <vapi-widget> embed has no way
 * to pass metadata, so every user was treated as a guest.
 */

const VAPI_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPI_PUBLIC_KEY || '';
const VAPI_ASSISTANT_ID = (import.meta as any).env?.VITE_VAPI_ASSISTANT_ID || '';

type CallStatus = 'idle' | 'connecting' | 'active';

function extractErrorMsg(err: unknown, fallback = 'Call error'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  const e = err as any;
  const tryStr = (v: unknown) => typeof v === 'string' ? v : null;
  return tryStr(e.message)
    || tryStr(e.error?.message)
    || tryStr(e.error?.error?.message)
    || tryStr(e.errorMsg)
    || (() => { try { return JSON.stringify(err); } catch { return fallback; } })();
}

export default function VapiWidget() {
  const [open, setOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const greetingFetched = useRef(false);

  const [mode, setMode] = useState<'chat' | 'voice'>('chat');

  if (!IS_PLATFORM || !VAPI_PUBLIC_KEY || !VAPI_ASSISTANT_ID) {
    return null;
  }

  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch greeting on first open
  useEffect(() => {
    if (!open || mode !== 'chat' || greetingFetched.current) return;
    greetingFetched.current = true;
    setLoading(true);
    fetch('/api/vapi/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
      .then(r => r.json())
      .then(data => {
        if (data.reply) {
          setMessages([{ role: 'assistant', text: data.reply }]);
          if (data.chatId) setChatId(data.chatId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, mode]);

  const sendChat = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/vapi/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: msg, chatId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
        if (data.chatId) setChatId(data.chatId);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.error || 'Something went wrong' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Failed to reach server' }]);
    }
    setLoading(false);
  }, [input, loading, chatId]);

  const toggleCall = useCallback(async () => {
    setVoiceError(null);
    if (callStatus === 'active') {
      vapiRef.current?.stop();
      vapiRef.current = null;
      setCallStatus('idle');
      return;
    }

    setCallStatus('connecting');
    try {
      // Fetch call context with sessionId for webhook user identification
      let callCtx: any = null;
      try {
        const ctxRes = await fetch('/api/vapi/call-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (ctxRes.ok) callCtx = await ctxRes.json();
      } catch { /* use defaults */ }

      const vapi = new Vapi(VAPI_PUBLIC_KEY);

      vapi.on('call-start', () => {
        setVoiceError(null);
        setCallStatus('active');
      });

      vapi.on('call-end', () => {
        setCallStatus('idle');
        vapiRef.current = null;
      });

      vapi.on('error', (err: unknown) => {
        setVoiceError(extractErrorMsg(err));
        setCallStatus('idle');
        vapiRef.current = null;
      });

      const overrides: any = {};
      if (callCtx) {
        if (callCtx.metadata && Object.keys(callCtx.metadata).length > 0) {
          overrides.metadata = callCtx.metadata;
        }
        if (callCtx.variableValues) {
          overrides.variableValues = callCtx.variableValues;
        }
        if (callCtx.firstMessage) {
          overrides.firstMessage = callCtx.firstMessage;
        }
      }

      await vapi.start(VAPI_ASSISTANT_ID, overrides);
      vapiRef.current = vapi;
    } catch (err) {
      setVoiceError(extractErrorMsg(err, 'Failed to start call'));
      setCallStatus('idle');
    }
  }, [callStatus]);

  const callLabel = callStatus === 'idle' ? 'Start Call' : callStatus === 'connecting' ? 'Connecting...' : 'End Call';

  return (
    <>
      {open && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <span style={styles.title}>Upfyn</span>
            <div style={styles.tabs}>
              <button
                style={{ ...styles.tab, ...(mode === 'chat' ? styles.tabActive : {}) }}
                onClick={() => setMode('chat')}
              >Chat</button>
              <button
                style={{ ...styles.tab, ...(mode === 'voice' ? styles.tabActive : {}) }}
                onClick={() => setMode('voice')}
              >Voice</button>
            </div>
            <button onClick={() => setOpen(false)} style={styles.close}>&times;</button>
          </div>

          {mode === 'chat' ? (
            <>
              <div style={styles.messages}>
                {messages.map((m, i) => (
                  <div key={i} style={m.role === 'user' ? styles.msgUser : styles.msgAssistant}>
                    {m.text}
                  </div>
                ))}
                {loading && <div style={styles.msgAssistant}>Typing...</div>}
                <div ref={endRef} />
              </div>
              <div style={styles.inputRow}>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Type a message..."
                  style={styles.input}
                />
                <button onClick={sendChat} disabled={loading || !input.trim()} style={styles.send}>
                  Send
                </button>
              </div>
            </>
          ) : (
            <div style={styles.voicePane}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {callStatus === 'active' ? '\uD83D\uDD0A' : '\uD83C\uDF99\uFE0F'}
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.5rem 0' }}>
                {callStatus === 'idle' && 'Tap below to start a voice call'}
                {callStatus === 'connecting' && 'Connecting...'}
                {callStatus === 'active' && 'Listening \u2014 tap to end'}
              </p>
              {voiceError && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.5rem 0' }}>
                  {voiceError}
                </p>
              )}
              <button onClick={toggleCall} style={styles.voiceBtn}>
                {callLabel}
              </button>
            </div>
          )}
        </div>
      )}

      <button onClick={() => setOpen(o => !o)} style={styles.fab}>
        {open ? '\u2715' : '\uD83D\uDCAC'}
      </button>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed', bottom: '5rem', right: '1rem', width: '340px', maxHeight: '480px',
    background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px',
    display: 'flex', flexDirection: 'column', zIndex: 9999, overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
    borderBottom: '1px solid #1e293b', background: '#0a0f1e',
  },
  title: { fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' },
  tabs: { display: 'flex', gap: '0.25rem', marginLeft: 'auto' },
  tab: {
    background: 'transparent', border: '1px solid #334155', color: '#94a3b8',
    padding: '0.2rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem',
  },
  tabActive: { background: '#3B82F6', color: '#fff', borderColor: '#3B82F6' },
  close: {
    background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem',
    cursor: 'pointer', marginLeft: '0.5rem',
  },
  messages: {
    flex: 1, overflowY: 'auto' as const, padding: '0.75rem', display: 'flex',
    flexDirection: 'column', gap: '0.5rem', minHeight: '200px', maxHeight: '320px',
  },
  msgUser: {
    alignSelf: 'flex-end', background: '#3B82F6', color: '#fff', padding: '0.5rem 0.75rem',
    borderRadius: '12px 12px 2px 12px', maxWidth: '80%', fontSize: '0.85rem',
  },
  msgAssistant: {
    alignSelf: 'flex-start', background: '#1e293b', color: '#e2e8f0', padding: '0.5rem 0.75rem',
    borderRadius: '12px 12px 12px 2px', maxWidth: '80%', fontSize: '0.85rem',
  },
  inputRow: {
    display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem',
    borderTop: '1px solid #1e293b', background: '#0a0f1e',
  },
  input: {
    flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
    padding: '0.5rem 0.75rem', color: '#f8fafc', fontSize: '0.85rem', outline: 'none',
  },
  send: {
    background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '8px',
    padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
  },
  voicePane: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '2rem 1rem', minHeight: '200px',
  },
  voiceBtn: {
    background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '999px',
    padding: '0.6rem 2rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
    marginTop: '0.5rem',
  },
  fab: {
    position: 'fixed', bottom: '1rem', right: '1rem', width: '48px', height: '48px',
    borderRadius: '50%', background: '#3B82F6', color: '#fff', border: 'none',
    fontSize: '1.3rem', cursor: 'pointer', zIndex: 9999,
    boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
