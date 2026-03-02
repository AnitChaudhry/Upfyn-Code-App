interface CursorLogoProps {
  className?: string;
}

export default function CursorLogo({ className = 'w-5 h-5' }: CursorLogoProps) {
  return (
    <div
      className={`${className} flex items-center justify-center rounded bg-blue-500/15 text-blue-400 font-bold text-xs select-none`}
    >
      &gt;
    </div>
  );
}
