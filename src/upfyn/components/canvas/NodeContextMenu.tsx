// NodeContextMenu — right-click context menu for canvas nodes (Spine AI pattern)
import React, { memo, useEffect, useRef } from 'react';

export interface ContextMenuAction {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface NodeContextMenuProps {
  position: { x: number; y: number };
  actions: ContextMenuAction[];
  onClose: () => void;
}

function NodeContextMenu({ position, actions, onClose }: NodeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: position.x, top: position.y }}
    >
      <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl py-1 min-w-[180px]">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => {
              if (!action.disabled) {
                action.onClick();
                onClose();
              }
            }}
            disabled={action.disabled}
            className={`
              w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[11px] transition-colors
              ${action.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}
              ${action.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-600'}
            `}
          >
            <span className="text-sm w-5 text-center">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(NodeContextMenu);
