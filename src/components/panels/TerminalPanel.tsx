import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface TerminalPanelProps {
  projectPath: string;
}

interface TerminalLine {
  type: 'input' | 'stdout' | 'stderr' | 'info';
  content: string;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ projectPath }) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'info', content: `Terminal — ${projectPath}` },
  ]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isRunning]);

  const runCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;

    setHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setLines(prev => [...prev, { type: 'input', content: `$ ${cmd}` }]);
    setIsRunning(true);

    try {
      const result = await api.runShellCommand(cmd, projectPath);
      if (result.stdout) {
        setLines(prev => [...prev, { type: 'stdout', content: result.stdout }]);
      }
      if (result.stderr) {
        setLines(prev => [...prev, { type: 'stderr', content: result.stderr }]);
      }
      if (!result.success) {
        setLines(prev => [...prev, { type: 'info', content: `Exit code: ${result.exit_code}` }]);
      }
    } catch (err: any) {
      setLines(prev => [...prev, { type: 'stderr', content: err.message || 'Command failed' }]);
    } finally {
      setIsRunning(false);
    }
  }, [projectPath]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isRunning) {
      runCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([{ type: 'info', content: `Terminal — ${projectPath}` }]);
    }
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return 'text-blue-400';
      case 'stdout': return 'text-foreground';
      case 'stderr': return 'text-red-400';
      case 'info': return 'text-muted-foreground';
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-[#0d1117] text-sm font-mono"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output */}
      <div className="flex-1 overflow-y-auto p-3">
        {lines.map((line, i) => (
          <div key={i} className={`${getLineColor(line.type)} whitespace-pre-wrap break-all leading-5`}>
            {line.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center px-3 py-2 border-t border-border/30">
        <span className="text-green-400 mr-2 select-none">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder={isRunning ? 'Running...' : 'Type a command...'}
          className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/40 font-mono text-sm"
          autoFocus
        />
      </div>
    </div>
  );
};

export default TerminalPanel;
