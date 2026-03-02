import React from 'react';
import { MessageSquare, Folder, Terminal, GitBranch, ClipboardCheck, Zap, LayoutDashboard, PenTool, Eye, Globe } from 'lucide-react';
import { useTasksSettings } from '../contexts/TasksSettingsContext';

function MobileNav({ activeTab, setActiveTab, isInputFocused }) {
  const { tasksEnabled, isTaskMasterInstalled } = useTasksSettings();
  const shouldShowTasksTab = Boolean(tasksEnabled && isTaskMasterInstalled);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'shell', icon: Terminal, label: 'Shell' },
    { id: 'files', icon: Folder, label: 'Files' },
    { id: 'canvas', icon: PenTool, label: 'Canvas' },
    { id: 'preview', icon: Eye, label: 'Preview' },
    { id: 'git', icon: GitBranch, label: 'Git' },
    { id: 'workflows', icon: Zap, label: 'Auto' },
    { id: 'browser', icon: Globe, label: 'Browser' },
    ...(shouldShowTasksTab ? [{ id: 'tasks', icon: ClipboardCheck, label: 'Tasks' }] : [])
  ];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 px-2 pb-[max(6px,env(safe-area-inset-bottom))] transform transition-transform duration-300 ease-in-out ${
        isInputFocused ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="nav-glass mobile-nav-float rounded-2xl border border-border/30">
        <div className="flex items-center justify-around px-0.5 py-1 gap-0 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  setActiveTab(item.id);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-xl flex-shrink-0 min-w-[42px] relative touch-manipulation transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary/8 dark:bg-primary/12 rounded-xl" />
                )}
                <Icon
                  className={`relative z-10 transition-all duration-200 ${isActive ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                <span className={`relative z-10 text-[9px] leading-tight font-medium truncate w-full text-center transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MobileNav;
