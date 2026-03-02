import { MessageSquare, Terminal, Folder, GitBranch, ClipboardCheck, Layout, Zap, BarChart3, Globe, type LucideIcon } from 'lucide-react';
import Tooltip from '../../../Tooltip';
import type { AppTab } from '../../../../types/app';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_LOCAL } from '../../../../constants/config';

type MainContentTabSwitcherProps = {
  activeTab: AppTab;
  setActiveTab: Dispatch<SetStateAction<AppTab>>;
  shouldShowTasksTab: boolean;
};

type TabDefinition = {
  id: AppTab;
  labelKey: string;
  icon: LucideIcon;
};

const BASE_TABS: TabDefinition[] = [
  { id: 'dashboard', labelKey: 'Dashboard', icon: BarChart3 },
  { id: 'chat', labelKey: 'tabs.chat', icon: MessageSquare },
  { id: 'canvas', labelKey: 'Canvas', icon: Layout },
  { id: 'shell', labelKey: 'tabs.shell', icon: Terminal },
  { id: 'files', labelKey: 'tabs.files', icon: Folder },
  { id: 'git', labelKey: 'tabs.git', icon: GitBranch },
  { id: 'workflows', labelKey: 'Workflows', icon: Zap },
  { id: 'browser', labelKey: 'Browser', icon: Globe },
];

const TASKS_TAB: TabDefinition = {
  id: 'tasks',
  labelKey: 'tabs.tasks',
  icon: ClipboardCheck,
};

export default function MainContentTabSwitcher({
  activeTab,
  setActiveTab,
  shouldShowTasksTab,
}: MainContentTabSwitcherProps) {
  const { t } = useTranslation();

  const CLOUD_ONLY_TABS = new Set<AppTab>(['canvas', 'workflows', 'browser']);
  const visibleBase = IS_LOCAL ? BASE_TABS.filter(t => !CLOUD_ONLY_TABS.has(t.id)) : BASE_TABS;
  const tabs = shouldShowTasksTab ? [...visibleBase, TASKS_TAB] : visibleBase;

  return (
    <div className="inline-flex items-center bg-muted/60 rounded-lg p-[3px] gap-[2px]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;

        return (
          <Tooltip key={tab.id} content={t(tab.labelKey)} position="bottom">
            <button
              data-tour={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-2.5 py-[5px] text-sm font-medium rounded-md transition-all duration-150 ${
                isActive
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="hidden lg:inline">{t(tab.labelKey)}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
