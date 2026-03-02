import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../contexts/WebSocketContext';
import CanvasWorkspace from './CanvasWorkspace';

export default function CanvasFullScreen() {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const { sendMessage, latestMessage, connectionState } = useWebSocket();

  // Escape key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (e.key === 'Escape' && tag !== 'input' && tag !== 'textarea') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (!projectName) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
        No project selected
      </div>
    );
  }

  const decodedName = decodeURIComponent(projectName);

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-4 w-px bg-border/50" />
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <span className="text-sm font-medium text-foreground">{decodedName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              Canvas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connectionState !== 'connected' && (
            <div className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
            </div>
          )}
          <span className="text-[10px] text-muted-foreground">
            Press Esc to exit
          </span>
        </div>
      </div>

      {/* Canvas workspace fills remaining space */}
      <div className="flex-1 min-h-0">
        <CanvasWorkspace
          projectName={decodedName}
          sendMessage={sendMessage}
          latestMessage={latestMessage}
          isFullScreen={true}
        />
      </div>
    </div>
  );
}
