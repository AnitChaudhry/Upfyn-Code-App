import React, { memo, useMemo, useCallback } from 'react';
import { getToolConfig } from './configs/toolConfigs';
import { OneLineDisplay, CollapsibleDisplay, DiffViewer, MarkdownContent, FileListContent, TodoListContent, TaskListContent, TextContent, QuestionAnswerContent, SubagentContainer } from './components';
import type { Project } from '../../../types/app';
import type { SubagentChildTool } from '../types/types';

type DiffLine = {
  type: string;
  content: string;
  lineNum: number;
};

interface ToolRendererProps {
  toolName: string;
  toolInput: any;
  toolResult?: any;
  toolId?: string;
  mode: 'input' | 'result';
  onFileOpen?: (filePath: string, diffInfo?: any) => void;
  createDiff?: (oldStr: string, newStr: string) => DiffLine[];
  selectedProject?: Project | null;
  autoExpandTools?: boolean;
  showRawParameters?: boolean;
  rawToolInput?: string;
  isSubagentContainer?: boolean;
  subagentState?: {
    childTools: SubagentChildTool[];
    currentToolIndex: number;
    isComplete: boolean;
  };
  onArtifactOpen?: (artifact: any) => void;
}

/**
 * Creates an artifact object from tool data for the side panel
 */
function createArtifactFromTool(toolName: string, toolId: string | undefined, toolInput: any, toolResult: any, mode: 'input' | 'result'): { id: string; type: string; title: string; data: Record<string, any> } | null {
  const id = `${toolName}-${toolId || Date.now()}`;

  if (toolName === 'Edit' || toolName === 'Write' || toolName === 'ApplyPatch') {
    const input = typeof toolInput === 'string' ? (() => { try { return JSON.parse(toolInput); } catch { return toolInput; } })() : toolInput;
    const filePath = input?.file_path || 'file';
    const filename = filePath.split('/').pop() || filePath;
    return {
      id: `diff-${id}`,
      type: 'diff',
      title: filename,
      data: {
        filePath,
        oldContent: input?.old_string || '',
        newContent: toolName === 'Write' ? (input?.content || '') : (input?.new_string || ''),
        badge: toolName === 'Write' ? 'New' : toolName === 'ApplyPatch' ? 'Patch' : 'Edit',
      },
    };
  }

  if (toolName === 'Bash' && toolResult && !toolResult.isError) {
    const input = typeof toolInput === 'string' ? (() => { try { return JSON.parse(toolInput); } catch { return toolInput; } })() : toolInput;
    return {
      id: `terminal-${id}`,
      type: 'terminal',
      title: (input?.command || 'terminal').substring(0, 40),
      data: {
        command: input?.command || '',
        output: String(toolResult?.content || ''),
      },
    };
  }

  if ((toolName === 'Grep' || toolName === 'Glob') && toolResult) {
    const input = typeof toolInput === 'string' ? (() => { try { return JSON.parse(toolInput); } catch { return toolInput; } })() : toolInput;
    const result = typeof toolResult === 'string' ? (() => { try { return JSON.parse(toolResult); } catch { return toolResult; } })() : toolResult;
    const toolData = result?.toolUseResult || {};
    const files = toolData.filenames || [];
    return {
      id: `search-${id}`,
      type: 'search',
      title: `${toolName}: ${input?.pattern || 'search'}`,
      data: {
        pattern: input?.pattern || '',
        files,
      },
    };
  }

  if (toolName === 'Read' && toolResult && !toolResult.isError) {
    const input = typeof toolInput === 'string' ? (() => { try { return JSON.parse(toolInput); } catch { return toolInput; } })() : toolInput;
    const filePath = input?.file_path || 'file';
    const filename = filePath.split('/').pop() || filePath;
    return {
      id: `code-${id}`,
      type: 'code',
      title: filename,
      data: {
        filePath,
        content: String(toolResult?.content || ''),
      },
    };
  }

  return null;
}

function getToolCategory(toolName: string): string {
  if (['Edit', 'Write', 'ApplyPatch'].includes(toolName)) return 'edit';
  if (['Grep', 'Glob'].includes(toolName)) return 'search';
  if (toolName === 'Bash') return 'bash';
  if (['TodoWrite', 'TodoRead'].includes(toolName)) return 'todo';
  if (['TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet'].includes(toolName)) return 'task';
  if (toolName === 'Task') return 'agent';  // Subagent task
  if (toolName === 'exit_plan_mode' || toolName === 'ExitPlanMode') return 'plan';
  if (toolName === 'AskUserQuestion') return 'question';
  return 'default';
}

/**
 * Main tool renderer router
 * Routes to OneLineDisplay or CollapsibleDisplay based on tool config
 */
export const ToolRenderer: React.FC<ToolRendererProps> = memo(({
  toolName,
  toolInput,
  toolResult,
  toolId,
  mode,
  onFileOpen,
  createDiff,
  selectedProject,
  autoExpandTools = false,
  showRawParameters = false,
  rawToolInput,
  isSubagentContainer,
  subagentState,
  onArtifactOpen,
}) => {
  // Route subagent containers to dedicated component
  if (isSubagentContainer && subagentState) {
    if (mode === 'result') {
      return null;
    }
    return (
      <SubagentContainer
        toolInput={toolInput}
        toolResult={toolResult}
        subagentState={subagentState}
      />
    );
  }

  const config = getToolConfig(toolName);
  const displayConfig: any = mode === 'input' ? config.input : config.result;

  const parsedData = useMemo(() => {
    try {
      const rawData = mode === 'input' ? toolInput : toolResult;
      return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch {
      return mode === 'input' ? toolInput : toolResult;
    }
  }, [mode, toolInput, toolResult]);

  const handleAction = useCallback(() => {
    if (displayConfig?.action === 'open-file' && onFileOpen) {
      const value = displayConfig.getValue?.(parsedData) || '';
      onFileOpen(value);
    }
  }, [displayConfig, parsedData, onFileOpen]);

  const handleOpenInPanel = useCallback(() => {
    if (!onArtifactOpen) return;
    const artifact = createArtifactFromTool(toolName, toolId, toolInput, toolResult, mode);
    if (artifact) {
      onArtifactOpen(artifact);
    }
  }, [onArtifactOpen, toolName, toolId, toolInput, toolResult, mode]);

  // Keep hooks above this guard so hook call order stays stable across renders.
  if (!displayConfig) return null;

  if (displayConfig.type === 'one-line') {
    const value = displayConfig.getValue?.(parsedData) || '';
    const secondary = displayConfig.getSecondary?.(parsedData);
    const canOpenOneLineInPanel = onArtifactOpen && createArtifactFromTool(toolName, toolId, toolInput, toolResult, mode) !== null;

    return (
      <div className="group/oneline relative">
        <OneLineDisplay
          toolName={toolName}
          toolResult={toolResult}
          toolId={toolId}
          icon={displayConfig.icon}
          label={displayConfig.label}
          value={value}
          secondary={secondary}
          action={displayConfig.action}
          onAction={handleAction}
          style={displayConfig.style}
          wrapText={displayConfig.wrapText}
          colorScheme={displayConfig.colorScheme}
          resultId={mode === 'input' ? `tool-result-${toolId}` : undefined}
        />
        {canOpenOneLineInPanel && (
          <button
            onClick={handleOpenInPanel}
            className="absolute top-0.5 right-0 opacity-0 group-hover/oneline:opacity-100 transition-opacity text-[10px] px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-900 z-10"
            title="Open in side panel"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  if (displayConfig.type === 'collapsible') {
    const title = typeof displayConfig.title === 'function'
      ? displayConfig.title(parsedData)
      : displayConfig.title || 'Details';

    const defaultOpen = displayConfig.defaultOpen !== undefined
      ? displayConfig.defaultOpen
      : autoExpandTools;

    const contentProps = displayConfig.getContentProps?.(parsedData, {
      selectedProject,
      createDiff,
      onFileOpen
    }) || {};

    // Build the content component based on contentType
    let contentComponent: React.ReactNode = null;

    switch (displayConfig.contentType) {
      case 'diff':
        if (createDiff) {
          contentComponent = (
            <DiffViewer
              {...contentProps}
              createDiff={createDiff}
              onFileClick={() => onFileOpen?.(contentProps.filePath)}
            />
          );
        }
        break;

      case 'markdown':
        contentComponent = <MarkdownContent content={contentProps.content || ''} />;
        break;

      case 'file-list':
        contentComponent = (
          <FileListContent
            files={contentProps.files || []}
            onFileClick={onFileOpen}
            title={contentProps.title}
          />
        );
        break;

      case 'todo-list':
        if (contentProps.todos?.length > 0) {
          contentComponent = (
            <TodoListContent
              todos={contentProps.todos}
              isResult={contentProps.isResult}
            />
          );
        }
        break;

      case 'task':
        contentComponent = <TaskListContent content={contentProps.content || ''} />;
        break;

      case 'question-answer':
        contentComponent = (
          <QuestionAnswerContent
            questions={contentProps.questions || []}
            answers={contentProps.answers || {}}
          />
        );
        break;

      case 'text':
        contentComponent = (
          <TextContent
            content={contentProps.content || ''}
            format={contentProps.format || 'plain'}
          />
        );
        break;

      case 'success-message': {
        const msg = displayConfig.getMessage?.(parsedData) || 'Success';
        contentComponent = (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {msg}
          </div>
        );
        break;
      }
    }

    // For edit tools, make the title (filename) clickable to open the file
    const handleTitleClick = (toolName === 'Edit' || toolName === 'Write' || toolName === 'ApplyPatch') && contentProps.filePath && onFileOpen
      ? () => onFileOpen(contentProps.filePath, {
          old_string: contentProps.oldContent,
          new_string: contentProps.newContent
        })
      : undefined;

    // "Open in panel" button for tools that can create artifacts
    const canOpenInPanel = onArtifactOpen && createArtifactFromTool(toolName, toolId, toolInput, toolResult, mode) !== null;
    const panelAction = canOpenInPanel ? (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenInPanel(); }}
        className="opacity-0 group-hover/details:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Open in side panel"
      >
        <svg className="w-3 h-3 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>
    ) : undefined;

    return (
      <CollapsibleDisplay
        toolName={toolName}
        toolId={toolId}
        title={title}
        defaultOpen={defaultOpen}
        action={panelAction}
        onTitleClick={handleTitleClick}
        showRawParameters={mode === 'input' && showRawParameters}
        rawContent={rawToolInput}
        toolCategory={getToolCategory(toolName)}
      >
        {contentComponent}
      </CollapsibleDisplay>
    );
  }

  return null;
});

ToolRenderer.displayName = 'ToolRenderer';
