import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, RefreshCw, FileText, Plus, Minus, Edit3 } from 'lucide-react';
import { api } from '@/lib/api';

interface GitPanelProps {
  projectPath: string;
}

interface GitStatus {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

const GitPanel: React.FC<GitPanelProps> = ({ projectPath }) => {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [log, setLog] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'status' | 'log'>('status');
  const [diff, setDiff] = useState<string>('');
  const [showDiff, setShowDiff] = useState(false);

  const loadGitStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if it's a git repo
      const checkResult = await api.runShellCommand('git rev-parse --is-inside-work-tree', projectPath);
      if (!checkResult.success) {
        setError('Not a git repository');
        setLoading(false);
        return;
      }

      // Get branch
      const branchResult = await api.runShellCommand('git branch --show-current', projectPath);
      const branch = branchResult.stdout.trim();

      // Get status --porcelain
      const statusResult = await api.runShellCommand('git status --porcelain', projectPath);
      const lines = statusResult.stdout.trim().split('\n').filter(Boolean);

      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];

      for (const line of lines) {
        const x = line[0]; // index status
        const y = line[1]; // worktree status
        const file = line.substring(3);

        if (x === '?' && y === '?') {
          untracked.push(file);
        } else {
          if (x !== ' ' && x !== '?') staged.push(file);
          if (y !== ' ' && y !== '?') modified.push(file);
        }
      }

      // Get ahead/behind
      let ahead = 0, behind = 0;
      try {
        const abResult = await api.runShellCommand('git rev-list --left-right --count HEAD...@{upstream}', projectPath);
        if (abResult.success) {
          const parts = abResult.stdout.trim().split(/\s+/);
          ahead = parseInt(parts[0]) || 0;
          behind = parseInt(parts[1]) || 0;
        }
      } catch { /* no upstream */ }

      setStatus({ branch, staged, modified, untracked, ahead, behind });
    } catch (err: any) {
      setError(err.message || 'Failed to get git status');
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const loadGitLog = useCallback(async () => {
    try {
      const result = await api.runShellCommand(
        'git log --oneline --graph --decorate -20',
        projectPath
      );
      setLog(result.stdout);
    } catch {
      setLog('Failed to load git log');
    }
  }, [projectPath]);

  const loadDiff = useCallback(async () => {
    try {
      const result = await api.runShellCommand('git diff', projectPath);
      const stagedResult = await api.runShellCommand('git diff --cached', projectPath);
      setDiff((stagedResult.stdout ? '=== Staged Changes ===\n' + stagedResult.stdout + '\n' : '') +
        (result.stdout ? '=== Unstaged Changes ===\n' + result.stdout : ''));
    } catch {
      setDiff('Failed to load diff');
    }
  }, [projectPath]);

  useEffect(() => {
    loadGitStatus();
  }, [loadGitStatus]);

  useEffect(() => {
    if (activeView === 'log') loadGitLog();
  }, [activeView, loadGitLog]);

  const stageFile = async (file: string) => {
    await api.runShellCommand(`git add "${file}"`, projectPath);
    loadGitStatus();
  };

  const unstageFile = async (file: string) => {
    await api.runShellCommand(`git reset HEAD "${file}"`, projectPath);
    loadGitStatus();
  };

  const stageAll = async () => {
    await api.runShellCommand('git add -A', projectPath);
    loadGitStatus();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-xs">{status?.branch || 'unknown'}</span>
        {status && (status.ahead > 0 || status.behind > 0) && (
          <span className="text-[10px] text-muted-foreground">
            {status.ahead > 0 && `↑${status.ahead}`}
            {status.behind > 0 && ` ↓${status.behind}`}
          </span>
        )}
        <div className="flex-1" />
        <div className="flex gap-1">
          <button
            onClick={() => setActiveView('status')}
            className={`px-2 py-0.5 rounded text-xs ${activeView === 'status' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}
          >
            Status
          </button>
          <button
            onClick={() => setActiveView('log')}
            className={`px-2 py-0.5 rounded text-xs ${activeView === 'log' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}
          >
            Log
          </button>
        </div>
        <button onClick={loadGitStatus} className="p-1 rounded hover:bg-accent" title="Refresh">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'status' && status && (
          <div className="p-2 space-y-3">
            {/* Staged */}
            {status.staged.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">
                    Staged ({status.staged.length})
                  </span>
                </div>
                {status.staged.map(file => (
                  <div key={`s-${file}`} className="flex items-center gap-1.5 py-0.5 px-1 hover:bg-accent/30 rounded text-xs group">
                    <FileText className="h-3 w-3 text-green-400 flex-shrink-0" />
                    <span className="truncate flex-1">{file}</span>
                    <button onClick={() => unstageFile(file)} className="opacity-0 group-hover:opacity-100 p-0.5" title="Unstage">
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Modified */}
            {status.modified.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider">
                    Modified ({status.modified.length})
                  </span>
                  <button onClick={stageAll} className="text-[10px] text-muted-foreground hover:text-foreground">
                    Stage All
                  </button>
                </div>
                {status.modified.map(file => (
                  <div key={`m-${file}`} className="flex items-center gap-1.5 py-0.5 px-1 hover:bg-accent/30 rounded text-xs group">
                    <Edit3 className="h-3 w-3 text-yellow-400 flex-shrink-0" />
                    <span className="truncate flex-1">{file}</span>
                    <button onClick={() => stageFile(file)} className="opacity-0 group-hover:opacity-100 p-0.5" title="Stage">
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Untracked */}
            {status.untracked.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Untracked ({status.untracked.length})
                  </span>
                </div>
                {status.untracked.map(file => (
                  <div key={`u-${file}`} className="flex items-center gap-1.5 py-0.5 px-1 hover:bg-accent/30 rounded text-xs group">
                    <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate flex-1 text-muted-foreground">{file}</span>
                    <button onClick={() => stageFile(file)} className="opacity-0 group-hover:opacity-100 p-0.5" title="Stage">
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {status.staged.length === 0 && status.modified.length === 0 && status.untracked.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-xs">
                Working tree clean
              </div>
            )}

            {/* Diff toggle */}
            <div className="pt-2 border-t border-border/50">
              <button
                onClick={() => { setShowDiff(!showDiff); if (!showDiff) loadDiff(); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showDiff ? 'Hide Diff' : 'Show Diff'}
              </button>
              {showDiff && diff && (
                <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto bg-muted/30 rounded p-2">
                  {diff.split('\n').map((line, i) => {
                    let color = '';
                    if (line.startsWith('+') && !line.startsWith('+++')) color = 'text-green-400';
                    else if (line.startsWith('-') && !line.startsWith('---')) color = 'text-red-400';
                    else if (line.startsWith('@@')) color = 'text-blue-400';
                    else if (line.startsWith('===')) color = 'text-yellow-400 font-bold';
                    return <div key={i} className={color}>{line}</div>;
                  })}
                </pre>
              )}
            </div>
          </div>
        )}

        {activeView === 'log' && (
          <pre className="p-3 text-xs font-mono whitespace-pre-wrap text-muted-foreground">
            {log || 'No commits yet'}
          </pre>
        )}
      </div>
    </div>
  );
};

export default GitPanel;
