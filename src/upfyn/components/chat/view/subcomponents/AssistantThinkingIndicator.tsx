import { SessionProvider } from '../../../../types/app';
import SessionProviderLogo from '../../../SessionProviderLogo';
import type { Provider } from '../../types/types';

type AssistantThinkingIndicatorProps = {
  selectedProvider: SessionProvider;
}


export default function AssistantThinkingIndicator({ selectedProvider }: AssistantThinkingIndicatorProps) {
  return (
    <div className="chat-message assistant">
      <div className="w-full">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 p-1 bg-transparent">
            <SessionProviderLogo provider={selectedProvider} className="w-full h-full" />
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {selectedProvider === 'cursor' ? 'Cursor' : selectedProvider === 'codex' ? 'Codex' : 'Claude'}
          </div>
        </div>
        <div className="w-full pl-3 sm:pl-0">
          <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg border border-purple-500/20 dark:border-purple-400/15 bg-purple-50/30 dark:bg-purple-950/10">
            <svg className="w-4 h-4 text-purple-500 dark:text-purple-400 animate-pulse flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Thinking</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
