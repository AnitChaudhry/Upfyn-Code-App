import type { ReactNode } from 'react';
import { useRelay } from '../../contexts/RelayContext';
import { IS_PLATFORM } from '../../constants/config';

type RelayGateProps = {
  children: ReactNode;
  fallback?: ReactNode;
  bypass?: boolean;
};

export default function RelayGate({ children, fallback, bypass }: RelayGateProps) {
  const { isRelayConnected } = useRelay();

  // In local/platform mode, relay is not used — always show content
  if (bypass || IS_PLATFORM || isRelayConnected) {
    return <>{children}</>;
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        {fallback || (
          <div className="text-center space-y-2 px-4">
            <p className="text-sm text-muted-foreground">Machine not connected</p>
            <p className="text-xs text-muted-foreground/70">Go to Settings &gt; Connection to connect your machine</p>
          </div>
        )}
      </div>
      <div className="h-full w-full opacity-30 pointer-events-none select-none" aria-hidden>
        {children}
      </div>
    </div>
  );
}
