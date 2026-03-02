interface ClaudeLogoProps {
  className?: string;
}

export default function ClaudeLogo({ className = 'w-5 h-5' }: ClaudeLogoProps) {
  return (
    <div
      className={`${className} flex items-center justify-center rounded bg-orange-500/15 text-orange-400 font-bold text-xs select-none`}
    >
      C
    </div>
  );
}
