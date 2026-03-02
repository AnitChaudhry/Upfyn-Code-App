import { MessageSquare, Terminal, FolderTree, GitBranch } from 'lucide-react';

function SkeletonBase({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground" role="status" aria-label={`${label} loading`}>
      <Icon className="w-10 h-10 opacity-40" />
      <p className="text-sm font-medium">{label} requires a connected machine</p>
      <p className="text-xs opacity-60">Connect your machine to get started</p>
    </div>
  );
}

export function ChatSkeleton() {
  return <SkeletonBase icon={MessageSquare} label="Chat" />;
}

export function ShellSkeleton() {
  return <SkeletonBase icon={Terminal} label="Shell" />;
}

export function FilesSkeleton() {
  return <SkeletonBase icon={FolderTree} label="Files" />;
}

export function GitSkeleton() {
  return <SkeletonBase icon={GitBranch} label="Git" />;
}
