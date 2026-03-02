interface CodexLogoProps {
  className?: string;
}

export default function CodexLogo({ className = 'w-5 h-5' }: CodexLogoProps) {
  return (
    <div
      className={`${className} flex items-center justify-center rounded bg-green-500/15 text-green-400 font-bold text-xs select-none`}
    >
      X
    </div>
  );
}
