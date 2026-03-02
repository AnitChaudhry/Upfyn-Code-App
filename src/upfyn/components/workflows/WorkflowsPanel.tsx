import { useState, useCallback } from 'react';
import { Zap, Link, Plug } from 'lucide-react';
import WorkflowList from './WorkflowList';
import WorkflowEditor from './WorkflowEditor';
import WebhookManager from './WebhookManager';
import ConnectedAppsManager from './ConnectedAppsManager';
import type { Project } from '../../types/app';

type SubView = 'list' | 'editor' | 'webhooks';

interface WorkflowsProps {
  selectedProject?: Project;
}

const SUB_TABS = [
  { id: 'workflows' as const, label: 'Workflows', icon: Zap },
  { id: 'webhooks' as const, label: 'Webhooks', icon: Link },
  { id: 'integrations' as const, label: 'Integrations', icon: Plug },
] as const;

export default function WorkflowsPanel({ selectedProject }: WorkflowsProps) {
  const [subView, setSubView] = useState<SubView>('list');
  const [activeSubTab, setActiveSubTab] = useState<'workflows' | 'webhooks' | 'integrations'>('workflows');
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEditWorkflow = useCallback((workflow: any) => {
    setEditingWorkflow(workflow);
    setSubView('editor');
  }, []);

  const handleCreateWorkflow = useCallback(() => {
    setEditingWorkflow(null);
    setSubView('editor');
  }, []);

  const handleSave = useCallback(() => {
    setSubView('list');
    setActiveSubTab('workflows');
    setEditingWorkflow(null);
    setRefreshKey(k => k + 1);
  }, []);

  const handleCancel = useCallback(() => {
    setSubView('list');
    setEditingWorkflow(null);
  }, []);

  // If we're in the editor, show it full-screen
  if (subView === 'editor') {
    return (
      <div className="h-full">
        <WorkflowEditor
          workflow={editingWorkflow}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0">
        <div className="flex sm:inline-flex items-center bg-muted/30 rounded-xl p-1 gap-0.5">
          {SUB_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSubTab === 'workflows' && (
          <WorkflowList
            onEdit={handleEditWorkflow}
            onCreate={handleCreateWorkflow}
            refreshKey={refreshKey}
          />
        )}
        {activeSubTab === 'webhooks' && (
          <WebhookManager
            onWebhooksChange={() => setRefreshKey(k => k + 1)}
          />
        )}
        {activeSubTab === 'integrations' && (
          <ConnectedAppsManager />
        )}
      </div>
    </div>
  );
}
