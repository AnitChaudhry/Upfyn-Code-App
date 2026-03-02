import React, { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { IS_LOCAL } from '../../../constants/config';

import ChatInterface from '../../chat/view/ChatInterface';
import ErrorBoundary from '../../ErrorBoundary';
const FileTree = lazy(() => import('../../FileTree')) as React.LazyExoticComponent<React.ComponentType<any>>;
const StandaloneShell = lazy(() => import('../../StandaloneShell')) as React.LazyExoticComponent<React.ComponentType<any>>;
const GitPanel = lazy(() => import('../../GitPanel')) as React.LazyExoticComponent<React.ComponentType<any>>;
const WorkflowsPanel = lazy(() => import('../../workflows/WorkflowsPanel'));
const DashboardPanel = lazy(() => import('../../dashboard/DashboardPanel'));
const CanvasWorkspace = lazy(() => import('../../canvas/CanvasWorkspace'));
const PreviewPanel = lazy(() => import('../../preview/PreviewPanel'));
const BrowserPanel = lazy(() => import('../../browser/BrowserPanel'));

import MainContentHeader from './subcomponents/MainContentHeader';
import MainContentStateView from './subcomponents/MainContentStateView';
import EditorSidebar from './subcomponents/EditorSidebar';
import ArtifactPanel from './subcomponents/ArtifactPanel';
import TaskMasterPanel from './subcomponents/TaskMasterPanel';
import ConnectionBanner from '../../connection/ConnectionBanner';
import WebSocketReconnectBanner from '../../connection/WebSocketReconnectBanner';
import RelayGate from '../../connection/RelayGate';
import { ChatSkeleton, ShellSkeleton, FilesSkeleton, GitSkeleton } from '../../connection/skeletons';
import type { MainContentProps } from '../types/types';

import { api } from '../../../utils/api';
import { useTaskMaster } from '../../../contexts/TaskMasterContext';
import { useTasksSettings } from '../../../contexts/TasksSettingsContext';
import { useUiPreferences } from '../../../hooks/useUiPreferences';
import { useEditorSidebar } from '../hooks/useEditorSidebar';
import { useArtifactPanel } from '../hooks/useArtifactPanel';
import type { Artifact } from '../hooks/useArtifactPanel';
import type { Project } from '../../../types/app';

type TaskMasterContextValue = {
  currentProject?: Project | null;
  setCurrentProject?: ((project: Project) => void) | null;
};

type TasksSettingsContextValue = {
  tasksEnabled: boolean;
  isTaskMasterInstalled: boolean | null;
  isTaskMasterReady: boolean | null;
};

function MainContent({
  selectedProject,
  selectedSession,
  activeTab,
  setActiveTab,
  ws,
  sendMessage,
  latestMessage,
  isMobile,
  onMenuClick,
  isLoading,
  onInputFocusChange,
  onSessionActive,
  onSessionInactive,
  onSessionProcessing,
  onSessionNotProcessing,
  processingSessions,
  onReplaceTemporarySession,
  onNavigateToSession,
  onShowSettings,
  externalMessageUpdate,
}: MainContentProps) {
  const navigate = useNavigate();
  const { preferences } = useUiPreferences();
  const { autoExpandTools, showRawParameters, showThinking, autoScrollToBottom, sendByCtrlEnter } = preferences;

  const { currentProject, setCurrentProject } = useTaskMaster() as TaskMasterContextValue;
  const { tasksEnabled, isTaskMasterInstalled } = useTasksSettings() as TasksSettingsContextValue;

  const shouldShowTasksTab = tasksEnabled !== false;

  const {
    editingFile,
    editorWidth,
    editorExpanded,
    resizeHandleRef,
    handleFileOpen,
    handleCloseEditor,
    handleToggleEditorExpand,
    handleResizeStart,
    fileTreeWidth,
    fileTreeResizeRef,
    handleFileTreeResizeStart,
  } = useEditorSidebar({
    selectedProject,
    isMobile,
  });

  const {
    artifacts,
    recentArtifacts,
    activeArtifactId,
    setActiveArtifactId,
    panelWidth: artifactPanelWidth,
    panelExpanded: artifactPanelExpanded,
    isOpen: isArtifactPanelOpen,
    resizeHandleRef: artifactResizeRef,
    openArtifact,
    closeArtifact,
    reopenArtifact,
    clearHistory: clearArtifactHistory,
    closeAll: closeAllArtifacts,
    toggleExpand: toggleArtifactExpand,
    handleResizeStart: handleArtifactResizeStart,
  } = useArtifactPanel({ isMobile });

  const handleArtifactOpen = React.useCallback((artifact: Artifact) => {
    openArtifact(artifact);
  }, [openArtifact]);

  const handlePinToCanvas = React.useCallback(async (artifact: Artifact) => {
    if (!selectedProject?.name) return;
    try {
      const res = await api.canvas.load(selectedProject.name);
      const data = await res.json();
      const rawElements = data.elements || [];

      // Parse existing canvas data
      let existingNodes: any[] = [];
      let existingEdges: any[] = [];
      if (rawElements.length === 1 && rawElements[0]?.nodes) {
        existingNodes = rawElements[0].nodes;
        existingEdges = rawElements[0].edges || [];
      } else if (rawElements.length > 0 && rawElements[0]?.position) {
        existingNodes = rawElements.filter((e: any) => !e.source);
        existingEdges = rawElements.filter((e: any) => e.source);
      }

      // Determine node type and content based on artifact type
      const typeMap: Record<string, string> = { code: 'response', diff: 'response', terminal: 'response', search: 'response', html: 'webpage', markdown: 'note' };
      const nodeType = typeMap[artifact.type] || 'note';

      let content = '';
      if (artifact.type === 'code') content = String(artifact.data.content || '');
      else if (artifact.type === 'diff') content = `Diff: ${artifact.data.filePath || 'file'}\n+${String(artifact.data.newContent || '').split('\n').length} lines`;
      else if (artifact.type === 'terminal') content = String(artifact.data.output || '');
      else if (artifact.type === 'search') content = (artifact.data.files || []).join('\n');
      else if (artifact.type === 'html') content = String(artifact.data.html || '');
      else content = String(artifact.data.content || '');

      // Position: offset from last node or default
      const lastNode = existingNodes[existingNodes.length - 1];
      const x = lastNode ? (lastNode.position?.x || 0) + 300 : 100;
      const y = lastNode ? lastNode.position?.y || 0 : 100;

      const newNode = {
        id: `pinned_${Date.now()}`,
        type: nodeType,
        position: { x, y },
        data: {
          label: artifact.title,
          content: content.slice(0, 2000),
          ...(artifact.type === 'html' && { html: content, pageName: artifact.title }),
        },
      };

      existingNodes.push(newNode);
      await api.canvas.save(selectedProject.name, [{ nodes: existingNodes, edges: existingEdges }], data.appState || {});
    } catch {
      // silently fail
    }
  }, [selectedProject?.name]);

  useEffect(() => {
    if (selectedProject && selectedProject !== currentProject) {
      setCurrentProject?.(selectedProject);
    }
  }, [selectedProject, currentProject, setCurrentProject]);

  useEffect(() => {
    if (!shouldShowTasksTab && activeTab === 'tasks') {
      setActiveTab('chat');
    }
  }, [shouldShowTasksTab, activeTab, setActiveTab]);

  if (isLoading) {
    return <MainContentStateView mode="loading" isMobile={isMobile} onMenuClick={onMenuClick} />;
  }

  if (!selectedProject) {
    return <MainContentStateView mode="empty" isMobile={isMobile} onMenuClick={onMenuClick} />;
  }

  return (
    <div className="h-full flex flex-col">
      <MainContentHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedProject={selectedProject}
        selectedSession={selectedSession}
        shouldShowTasksTab={shouldShowTasksTab}
        isMobile={isMobile}
        onMenuClick={onMenuClick}
      />
      <WebSocketReconnectBanner />
      <ConnectionBanner />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div
          className={`flex flex-col min-h-0 overflow-hidden ${editorExpanded ? 'hidden' : ''} ${activeTab === 'files' && editingFile ? 'flex-shrink-0' : 'flex-1'}`}
          style={activeTab === 'files' && editingFile ? { width: `${fileTreeWidth}px` } : undefined}
        >
          {activeTab === 'dashboard' && (
            <div className="h-full overflow-hidden">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Loading dashboard...
                </div>
              }>
                <DashboardPanel selectedProject={selectedProject} />
              </Suspense>
            </div>
          )}

          <div className={`h-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
            <RelayGate fallback={<ChatSkeleton />}>
              <ErrorBoundary showDetails>
                <ChatInterface
                  selectedProject={selectedProject}
                  selectedSession={selectedSession}
                  ws={ws}
                  sendMessage={sendMessage}
                  latestMessage={latestMessage}
                  onFileOpen={handleFileOpen}
                  onInputFocusChange={onInputFocusChange}
                  onSessionActive={onSessionActive}
                  onSessionInactive={onSessionInactive}
                  onSessionProcessing={onSessionProcessing}
                  onSessionNotProcessing={onSessionNotProcessing}
                  processingSessions={processingSessions}
                  onReplaceTemporarySession={onReplaceTemporarySession}
                  onNavigateToSession={onNavigateToSession}
                  onShowSettings={onShowSettings}
                  autoExpandTools={autoExpandTools}
                  showRawParameters={showRawParameters}
                  showThinking={showThinking}
                  autoScrollToBottom={autoScrollToBottom}
                  sendByCtrlEnter={sendByCtrlEnter}
                  externalMessageUpdate={externalMessageUpdate}
                  onShowAllTasks={tasksEnabled ? () => setActiveTab('tasks') : null}
                  setActiveTab={setActiveTab}
                  onArtifactOpen={handleArtifactOpen}
                />
              </ErrorBoundary>
            </RelayGate>
          </div>

          {activeTab === 'canvas' && !IS_LOCAL && (
            <div className="h-full overflow-hidden relative">
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Loading canvas...
                    </div>
                  </div>
                }>
                  {selectedProject?.name && (
                    <CanvasWorkspace
                      projectName={selectedProject.name}
                      sendMessage={sendMessage}
                      latestMessage={latestMessage}
                      isFullScreen={false}
                    />
                  )}
                </Suspense>
              </ErrorBoundary>
              {/* Fullscreen expand button */}
              {selectedProject?.name && (
                <button
                  onClick={() => navigate(`/canvas/${encodeURIComponent(selectedProject.name)}`)}
                  className="absolute top-3 right-32 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/90 border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-card transition-colors backdrop-blur-sm shadow-sm"
                  title="Open in fullscreen"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Fullscreen
                </button>
              )}
            </div>
          )}

          <div className={`h-full overflow-hidden ${activeTab === 'files' ? 'block' : 'hidden'}`}>
            <RelayGate fallback={<FilesSkeleton />}>
              <Suspense fallback={<FilesSkeleton />}>
                <FileTree selectedProject={selectedProject} onFileOpen={handleFileOpen} activeFilePath={(editingFile?.path || null) as any} />
              </Suspense>
            </RelayGate>
          </div>

          <div className={`h-full w-full overflow-hidden ${activeTab === 'shell' ? 'block' : 'hidden'}`}>
            <RelayGate fallback={<ShellSkeleton />}>
              <ErrorBoundary>
                <Suspense fallback={<ShellSkeleton />}>
                  <StandaloneShell project={selectedProject} session={selectedSession} showHeader={false} multiTab={true} />
                </Suspense>
              </ErrorBoundary>
            </RelayGate>
          </div>

          <div className={`h-full overflow-hidden ${activeTab === 'git' ? 'block' : 'hidden'}`}>
            <RelayGate fallback={<GitSkeleton />}>
              <ErrorBoundary>
                <Suspense fallback={<GitSkeleton />}>
                  <GitPanel selectedProject={selectedProject} isMobile={isMobile} onFileOpen={handleFileOpen} />
                </Suspense>
              </ErrorBoundary>
            </RelayGate>
          </div>

          {activeTab === 'workflows' && !IS_LOCAL && (
            <div className="h-full overflow-hidden">
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Loading workflows...
                  </div>
                }>
                  <WorkflowsPanel selectedProject={selectedProject} />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          {shouldShowTasksTab && <TaskMasterPanel isVisible={activeTab === 'tasks'} />}

          {activeTab === 'preview' && (
            <div className="h-full overflow-hidden">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Loading preview...
                </div>
              }>
                <PreviewPanel
                  initialHtml={artifacts.find((a) => a.type === 'html')?.data?.html}
                />
              </Suspense>
            </div>
          )}

          {activeTab === 'browser' && !IS_LOCAL && (
            <div className="h-full overflow-hidden">
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Loading browser...
                  </div>
                }>
                  <BrowserPanel selectedProject={selectedProject} />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}
        </div>

        {/* File tree resize handle — only visible when files tab + editor is open */}
        {activeTab === 'files' && editingFile && !editorExpanded && (
          <div
            ref={fileTreeResizeRef}
            onMouseDown={handleFileTreeResizeStart}
            className="w-1 flex-shrink-0 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors relative group"
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>
        )}

        <EditorSidebar
          editingFile={editingFile}
          isMobile={isMobile}
          editorExpanded={editorExpanded}
          editorWidth={editorWidth}
          resizeHandleRef={resizeHandleRef}
          onResizeStart={handleResizeStart}
          onCloseEditor={handleCloseEditor}
          onToggleEditorExpand={handleToggleEditorExpand}
          projectPath={selectedProject.path}
          fillSpace={activeTab === 'files'}
        />

        {/* Artifact side panel — opens when clicking tool results in chat */}
        {isArtifactPanelOpen && !editingFile && (
          isMobile ? (
            <div className="fixed inset-0 z-40 bg-gray-900 flex flex-col">
              <ArtifactPanel
                artifacts={artifacts}
                recentArtifacts={recentArtifacts}
                activeArtifactId={activeArtifactId}
                panelWidth={artifactPanelWidth}
                panelExpanded={artifactPanelExpanded}
                resizeHandleRef={artifactResizeRef}
                onResizeStart={handleArtifactResizeStart}
                onSetActive={setActiveArtifactId}
                onClose={closeArtifact}
                onReopenArtifact={reopenArtifact}
                onClearHistory={clearArtifactHistory}
                onCloseAll={closeAllArtifacts}
                onToggleExpand={toggleArtifactExpand}
                onPinToCanvas={handlePinToCanvas}
                onFileOpen={handleFileOpen}
              />
            </div>
          ) : (
            <ArtifactPanel
              artifacts={artifacts}
              recentArtifacts={recentArtifacts}
              activeArtifactId={activeArtifactId}
              panelWidth={artifactPanelWidth}
              panelExpanded={artifactPanelExpanded}
              resizeHandleRef={artifactResizeRef}
              onResizeStart={handleArtifactResizeStart}
              onSetActive={setActiveArtifactId}
              onClose={closeArtifact}
              onReopenArtifact={reopenArtifact}
              onClearHistory={clearArtifactHistory}
              onCloseAll={closeAllArtifacts}
              onToggleExpand={toggleArtifactExpand}
              onPinToCanvas={handlePinToCanvas}
              onFileOpen={handleFileOpen}
            />
          )
        )}
      </div>
    </div>
  );
}

export default React.memo(MainContent);
