import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const STORAGE_KEY = 'upfyn-tour-complete';

type TourStep = {
  target: string;       // data-tour attribute value
  title: string;
  description: string;
};

const STEPS: TourStep[] = [
  {
    target: 'chat',
    title: 'Chat',
    description: 'Talk to AI agents — Claude, Cursor, or Codex. Stream responses, run tools, and see every action live.',
  },
  {
    target: 'canvas',
    title: 'Canvas',
    description: 'A visual whiteboard for code blocks, diagrams, notes, and web previews. Drag, connect, and organize.',
  },
  {
    target: 'files',
    title: 'Files',
    description: 'Browse your project tree, open files in the built-in editor, and make quick edits.',
  },
  {
    target: 'shell',
    title: 'Shell',
    description: 'A full terminal — run commands, install packages, or manage processes. Supports multiple tabs.',
  },
  {
    target: 'git',
    title: 'Git',
    description: 'Stage, commit, push, and view diffs — all from the browser. No terminal needed.',
  },
];

export default function AppTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Delay slightly so tabs are rendered
    const timer = setTimeout(() => setActive(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const measureTarget = useCallback(() => {
    if (!active) return;
    const el = document.querySelector(`[data-tour="${STEPS[step].target}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [active, step]);

  useEffect(() => {
    measureTarget();
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, [measureTarget]);

  const dismiss = useCallback(() => {
    setActive(false);
    localStorage.setItem(STORAGE_KEY, '1');
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  }, [step, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  // Keyboard nav
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, next, prev, dismiss]);

  if (!active || !targetRect) return null;

  const pad = 6;
  const spotlightStyle = {
    top: targetRect.top - pad,
    left: targetRect.left - pad,
    width: targetRect.width + pad * 2,
    height: targetRect.height + pad * 2,
  };

  // Tooltip positioning — below the spotlight, centered
  const tooltipTop = spotlightStyle.top + spotlightStyle.height + 12;
  const tooltipLeft = Math.max(12, Math.min(
    spotlightStyle.left + spotlightStyle.width / 2 - 160,
    window.innerWidth - 332,
  ));

  const currentStep = STEPS[step];

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-label="Feature tour">
      {/* Dimmed overlay with spotlight cutout */}
      <div className="absolute inset-0 bg-black/50" onClick={dismiss} />

      {/* Spotlight ring */}
      <div
        className="absolute rounded-lg ring-2 ring-primary/60 bg-transparent pointer-events-none"
        style={{
          ...spotlightStyle,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
        }}
      />

      {/* Tooltip card */}
      <div
        className="absolute w-[320px] bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">{currentStep.title}</h3>
            <button
              onClick={dismiss}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Skip tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/20">
          <span className="text-xs text-muted-foreground/60">
            {step + 1} / {STEPS.length}
          </span>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              {step < STEPS.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              ) : (
                'Done'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
