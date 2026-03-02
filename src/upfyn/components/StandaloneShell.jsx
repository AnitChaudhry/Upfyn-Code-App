import React, { useState, useCallback, useRef } from 'react';
import Shell from './Shell.jsx';

let tabIdCounter = 0;

const SHELL_TYPES = [
  { value: 'powershell', label: 'PowerShell', icon: 'PS' },
  { value: 'cmd', label: 'CMD', icon: '>' },
  { value: 'bash', label: 'Bash', icon: '$' },
];

/**
 * Generic Shell wrapper that can be used in tabs, modals, and other contexts.
 * Supports multi-tab mode with PowerShell/cmd/bash shell type picker.
 *
 * @param {Object} project - Project object with name, fullPath/path, displayName
 * @param {Object} session - Session object (optional, for tab usage)
 * @param {string} command - Initial command to run (optional)
 * @param {boolean} isPlainShell - Use plain shell mode vs Claude CLI (default: auto-detect)
 * @param {boolean} autoConnect - Whether to auto-connect when mounted (default: true)
 * @param {function} onComplete - Callback when process completes (receives exitCode)
 * @param {function} onClose - Callback for close button (optional)
 * @param {string} title - Custom header title (optional)
 * @param {string} className - Additional CSS classes
 * @param {boolean} showHeader - Whether to show custom header (default: true)
 * @param {boolean} compact - Use compact layout (default: false)
 * @param {boolean} minimal - Use minimal mode: no header, no overlays, auto-connect (default: false)
 * @param {boolean} multiTab - Enable multi-tab mode with shell type picker (default: false)
 */
function StandaloneShell({
  project,
  session = null,
  command = null,
  isPlainShell = null,
  autoConnect = true,
  onComplete = null,
  onClose = null,
  title = null,
  className = "",
  showHeader = true,
  compact = false,
  minimal = false,
  multiTab = false
}) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [tabs, setTabs] = useState(() => {
    const id = ++tabIdCounter;
    return [{ id, shellType: 'powershell', label: 'PowerShell' }];
  });
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id);
  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const newTabBtnRef = useRef(null);

  const shouldUsePlainShell = isPlainShell !== null ? isPlainShell : (command !== null);

  const handleProcessComplete = useCallback((exitCode) => {
    setIsCompleted(true);
    if (onComplete) {
      onComplete(exitCode);
    }
  }, [onComplete]);

  const addTab = useCallback((shellType) => {
    const shellInfo = SHELL_TYPES.find(s => s.value === shellType) || SHELL_TYPES[0];
    const id = ++tabIdCounter;
    setTabs(prev => [...prev, { id, shellType: shellInfo.value, label: shellInfo.label }]);
    setActiveTabId(id);
    setShowNewTabMenu(false);
  }, []);

  const closeTab = useCallback((tabId) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (next.length === 0) {
        // Always keep at least one tab
        const id = ++tabIdCounter;
        return [{ id, shellType: 'powershell', label: 'PowerShell' }];
      }
      return next;
    });
    setActiveTabId(prev => {
      if (prev === tabId) {
        // Switch to the nearest remaining tab
        const idx = tabs.findIndex(t => t.id === tabId);
        const remaining = tabs.filter(t => t.id !== tabId);
        if (remaining.length === 0) return null;
        const newIdx = Math.min(idx, remaining.length - 1);
        return remaining[newIdx].id;
      }
      return prev;
    });
  }, [tabs]);

  if (!project) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No Project Selected</h3>
          <p>A project is required to open a shell</p>
        </div>
      </div>
    );
  }

  // Multi-tab mode: shows a tab bar with shell type picker
  if (multiTab && !minimal && !session && !command) {
    return (
      <div className={`h-full w-full flex flex-col ${className}`}>
        {/* Tab bar */}
        <div className="flex-shrink-0 flex items-center bg-[#1e1e1e] border-b border-gray-700 px-1 min-h-[36px]">
          <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors shrink-0 ${
                  activeTabId === tab.id
                    ? 'bg-gray-800 text-gray-100 border-t-2 border-t-blue-500'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span className="text-[10px] font-mono opacity-60">
                  {SHELL_TYPES.find(s => s.value === tab.shellType)?.icon || '>'}
                </span>
                <span>{tab.label}</span>
                {tabs.length > 1 && (
                  <span
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity cursor-pointer"
                    title="Close tab"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* New tab button */}
          <div className="relative ml-1 shrink-0">
            <button
              ref={newTabBtnRef}
              onClick={() => setShowNewTabMenu(!showNewTabMenu)}
              className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-100 hover:bg-gray-700 rounded transition-colors text-lg"
              title="New terminal"
            >
              +
            </button>
            {showNewTabMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[140px]">
                {SHELL_TYPES.map(st => (
                  <button
                    key={st.value}
                    onClick={() => addTab(st.value)}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <span className="font-mono text-[10px] opacity-60 w-4">{st.icon}</span>
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shell panels — keep all alive, show only the active one */}
        <div className="flex-1 w-full min-h-0 relative">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
            >
              <Shell
                selectedProject={project}
                isPlainShell={true}
                shellType={tab.shellType}
                autoConnect={true}
                minimal={false}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Original single-shell mode
  return (
    <div className={`h-full w-full flex flex-col ${className}`}>
      {/* Optional custom header */}
      {!minimal && showHeader && title && (
        <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-gray-200">{title}</h3>
              {isCompleted && (
                <span className="text-xs text-green-400">(Completed)</span>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Shell component wrapper */}
      <div className="flex-1 w-full min-h-0">
        <Shell
          selectedProject={project}
          selectedSession={session}
          initialCommand={command}
          isPlainShell={shouldUsePlainShell}
          onProcessComplete={handleProcessComplete}
          minimal={minimal}
          autoConnect={minimal ? true : autoConnect}
        />
      </div>
    </div>
  );
}

export default StandaloneShell;
