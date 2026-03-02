// ImageNode — AI image generation block (Spine AI Image Block pattern)
import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_STYLES, type BaseNodeData } from './BaseNode';

interface ImageNodeData extends BaseNodeData {
  imageUrl?: string;
  imageUrls?: string[];
  prompt?: string;
  sendMessage?: (msg: any) => void;
}

function ImageNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ImageNodeData;
  const style = NODE_STYLES.image;

  const [prompt, setPrompt] = useState(String(nodeData.prompt || nodeData.content || ''));
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(nodeData.imageUrl || '');
  const [error, setError] = useState('');

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError('');

    if (nodeData.sendMessage) {
      nodeData.sendMessage({
        type: 'claude-command',
        command: `Generate an image based on this description: ${prompt}`,
        options: { canvasMode: true, blockId: id, imageGeneration: true },
      });
      // In production, image URL would come back via streaming response
      setTimeout(() => {
        setIsGenerating(false);
        setError('Image generation requires an image API (DALL-E, Flux, etc.) connected via BYOK settings.');
      }, 2000);
    } else {
      setIsGenerating(false);
      setError('Requires a connected AI session with image generation capability.');
    }
  }, [prompt, isGenerating, nodeData.sendMessage, id]);

  return (
    <div
      className={`
        rounded-xl border-2 shadow-sm w-[280px] transition-shadow
        ${style.bg} ${style.border}
        ${selected ? 'ring-2 ring-primary/40 shadow-md' : 'hover:shadow-md'}
      `}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />

      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${style.border}/30`}>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{style.icon}</span>
          <span className={`text-xs font-semibold ${style.accent} uppercase tracking-wide`}>
            {nodeData.label || 'Image'}
          </span>
        </div>
        {nodeData.onDelete && (
          <button
            onClick={() => nodeData.onDelete!(id)}
            className="p-0.5 rounded hover:bg-red-100 text-red-400 transition-colors"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Image Preview */}
      <div className="px-3 py-2">
        {imageUrl ? (
          <div className="relative rounded-lg overflow-hidden bg-gray-100">
            <img src={imageUrl} alt="Generated" className="w-full h-auto rounded-lg" />
            <button
              onClick={() => window.open(imageUrl, '_blank')}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white hover:bg-black/70 transition-colors"
              title="Open full size"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="w-full h-32 rounded-lg bg-pink-100/50 border border-pink-200/50 border-dashed flex flex-col items-center justify-center gap-1">
            {isGenerating ? (
              <>
                <div className="w-6 h-6 border-2 border-pink-300/50 border-t-pink-500 rounded-full animate-spin" />
                <span className="text-[10px] text-pink-400">Generating...</span>
              </>
            ) : (
              <>
                <span className="text-2xl opacity-30">🖼️</span>
                <span className="text-[10px] text-gray-400">No image yet</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <div className="px-3 pb-2">
        {error && (
          <p className="text-[9px] text-red-400 mb-1">{error}</p>
        )}
        <div className="flex items-end gap-1.5">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the image..."
            rows={2}
            className="flex-1 bg-white/60 text-gray-700 text-[11px] placeholder-gray-400 resize-none outline-none px-2 py-1.5 rounded-lg border border-pink-200/50 focus:border-pink-400/50"
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="shrink-0 px-2.5 py-1.5 bg-pink-500 text-white rounded-md text-[10px] font-medium hover:bg-pink-600 disabled:opacity-40 transition-colors"
          >
            Generate
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
    </div>
  );
}

export default memo(ImageNode);
