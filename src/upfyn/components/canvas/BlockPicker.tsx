// BlockPicker — floating menu shown on double-click to create new blocks (Spine AI pattern)
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { NODE_STYLES } from './nodes/BaseNode';

export interface BlockPickerProps {
  position: { x: number; y: number };
  onSelect: (blockType: string, screenPos: { x: number; y: number }) => void;
  onClose: () => void;
}

interface BlockOption {
  type: string;
  label: string;
  description: string;
  category: 'ai' | 'content';
}

const BLOCK_OPTIONS: BlockOption[] = [
  // AI Blocks
  { type: 'chat', label: 'Chat', description: 'Multi-turn conversation', category: 'ai' },
  { type: 'prompt', label: 'Prompt', description: 'Single AI transformation', category: 'ai' },
  { type: 'deepresearch', label: 'Deep Research', description: 'Web + doc research report', category: 'ai' },
  { type: 'image', label: 'Image', description: 'AI image generation', category: 'ai' },
  { type: 'table', label: 'Table', description: 'Structured data table', category: 'ai' },
  { type: 'list', label: 'List', description: 'Bulk parallel operations', category: 'ai' },
  { type: 'comparison', label: 'Compare', description: 'Multi-model side-by-side', category: 'ai' },
  // Content Blocks
  { type: 'note', label: 'Note', description: 'Text note', category: 'content' },
  { type: 'pdf', label: 'PDF', description: 'Upload document', category: 'content' },
  { type: 'inputs', label: 'Inputs', description: 'Variables & parameters', category: 'content' },
];

function BlockPicker({ position, onSelect, onClose }: BlockPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
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

  const aiBlocks = BLOCK_OPTIONS.filter(b => b.category === 'ai');
  const contentBlocks = BLOCK_OPTIONS.filter(b => b.category === 'content');

  const handleSelect = useCallback((type: string) => {
    onSelect(type, position);
    onClose();
  }, [onSelect, position, onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -50%)' }}
    >
      <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl p-3 w-[320px]">
        {/* Header */}
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
          Add Block
        </div>

        {/* AI Blocks */}
        <div className="mb-2">
          <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest px-1 mb-1">AI Blocks</div>
          <div className="grid grid-cols-2 gap-1">
            {aiBlocks.map(block => {
              const style = NODE_STYLES[block.type] || NODE_STYLES.note;
              return (
                <button
                  key={block.type}
                  onClick={() => handleSelect(block.type)}
                  className={`
                    flex items-center gap-2 px-2.5 py-2 rounded-lg text-left
                    transition-all hover:scale-[1.02] active:scale-[0.98]
                    ${style.bg} border ${style.border}/50 hover:${style.border}
                  `}
                >
                  <span className="text-base shrink-0">{style.icon}</span>
                  <div className="min-w-0">
                    <div className={`text-[11px] font-semibold ${style.accent} truncate`}>{block.label}</div>
                    <div className="text-[9px] text-gray-400 truncate">{block.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-1 my-2" />

        {/* Content Blocks */}
        <div>
          <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest px-1 mb-1">Content Blocks</div>
          <div className="grid grid-cols-3 gap-1">
            {contentBlocks.map(block => {
              const style = NODE_STYLES[block.type] || NODE_STYLES.note;
              return (
                <button
                  key={block.type}
                  onClick={() => handleSelect(block.type)}
                  className={`
                    flex flex-col items-center gap-1 px-2 py-2 rounded-lg
                    transition-all hover:scale-[1.02] active:scale-[0.98]
                    ${style.bg} border ${style.border}/50 hover:${style.border}
                  `}
                >
                  <span className="text-base">{style.icon}</span>
                  <div className={`text-[10px] font-medium ${style.accent}`}>{block.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hint */}
        <div className="text-[9px] text-gray-300 text-center mt-2">
          Double-click canvas or press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400">Space</kbd> to open
        </div>
      </div>
    </div>
  );
}

export default memo(BlockPicker);
