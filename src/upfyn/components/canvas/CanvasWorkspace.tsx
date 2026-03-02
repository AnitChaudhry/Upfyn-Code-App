import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CanvasToolbar from './CanvasToolbar';
import BlockPicker from './BlockPicker';
import NodeContextMenu, { type ContextMenuAction } from './NodeContextMenu';
import NodeDetailDrawer from './NodeDetailDrawer';
import WebPageEditor from './WebPageEditor';
import ExportModal from './ExportModal';
import TemplateManager from './templates/TemplateManager';
import SwarmOrchestrator from './swarm/SwarmOrchestrator';
import NoteNode from './nodes/NoteNode';
import PromptNode from './nodes/PromptNode';
import ResponseNode from './nodes/ResponseNode';
import PdfNode from './nodes/PdfNode';
import WebPageNode from './nodes/WebPageNode';
import ChatNode from './nodes/ChatNode';
import DeepResearchNode from './nodes/DeepResearchNode';
import ImageNode from './nodes/ImageNode';
import TableNode from './nodes/TableNode';
import ListNode from './nodes/ListNode';
import InputsNode from './nodes/InputsNode';
import ComparisonNode from './nodes/ComparisonNode';
import BaseNode from './nodes/BaseNode';
import { layoutWithDagre } from './layout/autoLayout';
import { getPlacementPosition } from './layout/autoLayout';
import { readCanvasContext, readSelectedContext } from './utils/canvasContextReader';
import { parseResponseToNodes } from './utils/aiResponseParser';
import { api } from '../../utils/api';
import { useWebSocket } from '../../contexts/WebSocketContext';

interface CanvasWorkspaceProps {
  projectName: string;
  sendMessage?: (msg: any) => void;
  latestMessage?: any;
  isFullScreen?: boolean;
}

const CANVAS_SYSTEM_PROMPT = `You are a visual AI assistant working on an infinite canvas. The user has drawn elements on the canvas and is asking you to analyze and respond.

IMPORTANT: Structure your response using markdown headings so it can be rendered as visual blocks:
- Use ## headings to separate major sections
- Use ### Research: or ### Analysis: for research/analysis sections
- Use ### Suggestions: or ### Ideas: for suggestion sections
- Use > blockquotes for key insights or recommendations
- Keep each section concise (2-4 sentences or bullet points)
- Be visual and structured — your response will appear as blocks on the canvas
- If asked to create web pages/websites, output each page as a separate \`\`\`html code block with a heading for the page name

Here is the current canvas context:

`;

const SAVE_DEBOUNCE_MS = 2000;

// Research/Suggestion nodes reuse BaseNode with compact support
function ResearchNode(props: any) {
  return <BaseNode id={props.id} nodeType="research" data={props.data} selected={props.selected} />;
}
function SuggestionNode(props: any) {
  return <BaseNode id={props.id} nodeType="suggestion" data={props.data} selected={props.selected} />;
}
function SummaryNode(props: any) {
  return <BaseNode id={props.id} nodeType="summary" data={props.data} selected={props.selected} />;
}

const nodeTypes: NodeTypes = {
  note: NoteNode,
  prompt: PromptNode,
  response: ResponseNode,
  research: ResearchNode,
  suggestion: SuggestionNode,
  pdf: PdfNode,
  summary: SummaryNode,
  webpage: WebPageNode,
  // New Spine AI-style block types
  chat: ChatNode,
  deepresearch: DeepResearchNode,
  image: ImageNode,
  table: TableNode,
  list: ListNode,
  inputs: InputsNode,
  comparison: ComparisonNode,
};

let _idCounter = 0;
function genId(): string {
  return `n_${Date.now()}_${++_idCounter}`;
}

// Migrate legacy Excalidraw data to React Flow format
function migrateExcalidrawData(elements: any[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!Array.isArray(elements) || elements.length === 0) return { nodes, edges };

  // Check if already React Flow format (has position.x property)
  if (elements[0]?.position?.x !== undefined) {
    return {
      nodes: elements.filter((e: any) => !e.source),
      edges: elements.filter((e: any) => e.source),
    };
  }

  // Check if this is serialized { nodes, edges } format
  if (elements.length === 1 && elements[0]?.nodes && elements[0]?.edges) {
    return { nodes: elements[0].nodes, edges: elements[0].edges };
  }

  // Legacy Excalidraw format — extract blocks with customData
  for (const el of elements) {
    if (el.customData?.blockType === 'context-link') {
      edges.push({
        id: `e_${el.customData.sourceId}_${el.customData.targetId}`,
        source: el.customData.sourceId,
        target: el.customData.targetId,
      });
    } else if (el.customData?.blockType && el.type === 'rectangle') {
      const blockType = el.customData.blockType;
      const validTypes = ['note', 'prompt', 'response', 'research', 'suggestion', 'pdf', 'summary', 'webpage', 'chat', 'deepresearch', 'image', 'table', 'list', 'inputs', 'comparison'];
      nodes.push({
        id: el.id,
        type: validTypes.includes(blockType) ? blockType : 'note',
        position: { x: el.x || 0, y: el.y || 0 },
        data: {
          label: el.customData.fileName || blockType,
          content: el.customData.content || el.customData.extractedText || el.customData.generatedContent || '',
          ...(el.customData.fileName && { fileName: el.customData.fileName }),
          ...(el.customData.pageCount && { pageCount: el.customData.pageCount }),
          ...(el.customData.extractedText && { extractedText: el.customData.extractedText }),
          ...(el.customData.thumbnail && { thumbnail: el.customData.thumbnail }),
        },
      });
    }
  }

  return { nodes, edges };
}

function CanvasWorkspaceInner({ projectName, sendMessage, latestMessage, isFullScreen }: CanvasWorkspaceProps) {
  const { connectionState } = useWebSocket();
  const { fitView, getViewport, setViewport } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [isRunning, setIsRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isLoading, setIsLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);

  // Drawer state for compact node detail view
  const [drawerNodeId, setDrawerNodeId] = useState<string | null>(null);

  // Web page editor state
  const [editingWebPageId, setEditingWebPageId] = useState<string | null>(null);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

  // Block picker state (double-click to create)
  const [blockPickerPos, setBlockPickerPos] = useState<{ x: number; y: number } | null>(null);

  // Context menu state (right-click on node)
  const [contextMenu, setContextMenu] = useState<{ pos: { x: number; y: number }; nodeId: string } | null>(null);

  // Template manager state
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Swarm orchestrator state
  const [showSwarmOrchestrator, setShowSwarmOrchestrator] = useState(false);

  // Refs
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const pendingSaveRef = useRef<{ nodes: Node[]; edges: Edge[]; viewport: any } | null>(null);
  const projectNameRef = useRef(projectName);
  projectNameRef.current = projectName;
  const responseAccumulatorRef = useRef('');
  const promptNodeIdRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Get the drawer node from current nodes
  const drawerNode = useMemo(() => {
    if (!drawerNodeId) return null;
    return nodesRef.current.find(n => n.id === drawerNodeId) || null;
  }, [drawerNodeId, nodes]);

  // Handle compact node click — open drawer
  const handleNodeClick = useCallback((nodeId: string) => {
    setDrawerNodeId(nodeId);
  }, []);

  // Handle webpage node click — open web page editor
  const handleWebPageClick = useCallback((nodeId: string) => {
    setEditingWebPageId(nodeId);
  }, []);

  // Handle double-click on canvas to show block picker
  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent) => {
    // Only trigger on canvas background (not on nodes)
    const target = event.target as HTMLElement;
    if (target.closest('.react-flow__node')) return;
    setBlockPickerPos({ x: event.clientX, y: event.clientY });
  }, []);

  // Handle block creation from BlockPicker
  const handleBlockPickerSelect = useCallback((blockType: string, screenPos: { x: number; y: number }) => {
    const pos = getPlacementPosition(nodesRef.current);
    const newNode: Node = {
      id: genId(),
      type: blockType,
      position: pos,
      data: {
        label: blockType.charAt(0).toUpperCase() + blockType.slice(1),
        content: '',
        ...(blockType === 'inputs' && { variables: {} }),
        ...(blockType === 'chat' && { messages: [] }),
        ...(blockType === 'deepresearch' && { plannerModel: '', writerModel: '', searchEnabled: { web: true, documents: false } }),
        ...(blockType === 'table' && { rows: [], columns: [] }),
        ...(blockType === 'list' && { items: [] }),
        ...(blockType === 'comparison' && { models: [], results: [] }),
      },
    };
    setNodes(nds => [...nds, newNode]);
    setBlockPickerPos(null);
  }, [setNodes]);

  // Handle per-block model change
  const handleModelChange = useCallback((nodeId: string, modelId: string, provider: string) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, modelId, modelProvider: provider } }
        : n
    ));
  }, [setNodes]);

  // Duplicate & Re-run — clone a node and optionally re-execute AI
  const handleDuplicate = useCallback((nodeId: string, rerun?: boolean) => {
    const sourceNode = nodesRef.current.find(n => n.id === nodeId);
    if (!sourceNode) return;

    const cloneId = genId();
    const cloneNode: Node = {
      id: cloneId,
      type: sourceNode.type || 'note',
      position: {
        x: (sourceNode.position?.x || 0) + 40,
        y: (sourceNode.position?.y || 0) + 40,
      },
      data: {
        ...sourceNode.data,
        label: `${sourceNode.data?.label || sourceNode.type} (copy)`,
        // Clear callbacks — they'll be re-injected by nodesWithCallbacks
        onDelete: undefined,
        onRun: undefined,
        onRerun: undefined,
        onBranch: undefined,
        onNodeClick: undefined,
        onWebPageClick: undefined,
        onModelChange: undefined,
        sendMessage: undefined,
        latestMessage: undefined,
      },
    };

    // Connect clone to the same parent as the original
    const parentEdge = edgesRef.current.find(e => e.target === nodeId);
    const newEdges: Edge[] = [];
    if (parentEdge) {
      newEdges.push({
        id: `e_${parentEdge.source}_${cloneId}`,
        source: parentEdge.source,
        target: cloneId,
      });
    }

    setNodes(nds => [...nds, cloneNode]);
    setEdges(eds => [...eds, ...newEdges]);

    // If re-run requested and it's a prompt-type node, trigger AI
    if (rerun && sourceNode.type === 'prompt' && sendMessage) {
      const content = String(sourceNode.data?.content || '');
      if (content) {
        setTimeout(() => handlePromptRun(content, parentEdge?.source), 200);
      }
    }
  }, [setNodes, setEdges, sendMessage]);

  // Delete node (defined before getContextMenuActions which references it)
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  // Right-click context menu handler
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, nodeId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ pos: { x: event.clientX, y: event.clientY }, nodeId });
  }, []);

  // Build context menu actions for a specific node
  const getContextMenuActions = useCallback((nodeId: string): ContextMenuAction[] => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return [];

    const actions: ContextMenuAction[] = [
      {
        label: 'Duplicate',
        icon: '📋',
        onClick: () => handleDuplicate(nodeId),
      },
    ];

    // Re-run option for prompt nodes
    if (node.type === 'prompt') {
      actions.push({
        label: 'Duplicate & Re-run',
        icon: '🔄',
        onClick: () => handleDuplicate(nodeId, true),
      });
    }

    // Branch option for response nodes
    if (node.type === 'response' || node.type === 'research' || node.type === 'suggestion') {
      actions.push({
        label: 'Branch from here',
        icon: '🌿',
        onClick: () => {
          const content = String(node.data?.content || '').slice(0, 100);
          handlePromptRun(`Continue from: "${content}"\n\nProvide more detail.`, nodeId);
        },
      });
    }

    // Copy content
    actions.push({
      label: 'Copy Content',
      icon: '📄',
      onClick: () => {
        const text = String(node.data?.fullContent || node.data?.content || '');
        navigator.clipboard.writeText(text).catch(() => {});
      },
    });

    // Delete
    actions.push({
      label: 'Delete',
      icon: '🗑️',
      onClick: () => handleDeleteNode(nodeId),
      danger: true,
    });

    return actions;
  }, [handleDuplicate, handleDeleteNode]);

  // Load template — replace or append nodes
  const handleLoadTemplate = useCallback((templateNodes: Node[], templateEdges: Edge[]) => {
    setNodes(nds => [...nds, ...templateNodes]);
    setEdges(eds => [...eds, ...templateEdges]);
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 100);
  }, [setNodes, setEdges, fitView]);

  // Handle HTML changes from WebPageEditor
  const handleWebPageHtmlChange = useCallback((nodeId: string, newHtml: string) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, html: newHtml, content: newHtml } }
        : n
    ));
  }, [setNodes]);

  // Get the webpage node being edited
  const editingWebPage = useMemo(() => {
    if (!editingWebPageId) return null;
    return nodesRef.current.find(n => n.id === editingWebPageId) || null;
  }, [editingWebPageId, nodes]);

  // Pin to canvas — creates a full-content node + dashed wire from compact card
  const handlePinNode = useCallback((nodeId: string) => {
    const sourceNode = nodesRef.current.find(n => n.id === nodeId);
    if (!sourceNode) return;

    const pinId = genId();
    const pinNode: Node = {
      id: pinId,
      type: sourceNode.type || 'response',
      position: {
        x: (sourceNode.position?.x || 0) + 260,
        y: sourceNode.position?.y || 0,
      },
      data: {
        ...sourceNode.data,
        label: `${sourceNode.data?.label || 'Response'} (pinned)`,
        content: String(sourceNode.data?.fullContent || sourceNode.data?.content || ''),
        compact: false,
        summary: undefined,
        fullContent: undefined,
      },
    };

    const pinEdge: Edge = {
      id: `e_pin_${nodeId}_${pinId}`,
      source: nodeId,
      target: pinId,
      style: { strokeDasharray: '5,5', stroke: '#a78bfa' },
      type: 'smoothstep',
    };

    setNodes(nds => [...nds, pinNode]);
    setEdges(eds => [...eds, pinEdge]);
  }, [setNodes, setEdges]);

  // Rerun — re-sends the same prompt from an existing prompt node without creating a new one
  const handleRerun = useCallback((promptNodeId: string, text: string) => {
    if (!sendMessage || isRunning) return;

    // Clear any previous AI child nodes connected to this prompt
    const childEdges = edgesRef.current.filter(e => e.source === promptNodeId);
    const childIds = new Set(childEdges.map(e => e.target));

    setNodes(nds => nds.filter(n => !childIds.has(n.id)));
    setEdges(eds => eds.filter(e => e.source !== promptNodeId || !childIds.has(e.target)));

    promptNodeIdRef.current = promptNodeId;
    const context = readCanvasContext(nodesRef.current, edgesRef.current);
    const fullPrompt = CANVAS_SYSTEM_PROMPT + context + '\n\nUser prompt: ' + text;

    responseAccumulatorRef.current = '';
    setIsRunning(true);
    setChatHistory(prev => [...prev, { role: 'user', text: `(rerun) ${text}` }]);
    sendMessage({ type: 'claude-command', command: fullPrompt, options: { canvasMode: true, blockId: promptNodeId } });
  }, [sendMessage, isRunning, setNodes, setEdges]);

  // Inject callbacks into node data so nodes can trigger actions
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onDelete: (id: string) => setNodes((nds) => nds.filter((n) => n.id !== id)),
        onRun: (id: string, text: string) => handlePromptRun(text, id),
        onRerun: (id: string, text: string) => handleRerun(id, text),
        onBranch: (id: string) => handleBranch(id),
        onNodeClick: handleNodeClick,
        onWebPageClick: handleWebPageClick,
        onModelChange: handleModelChange,
        onEdit: (id: string) => {
          // Note edits are handled inline by NoteNode
        },
        // Pass sendMessage and latestMessage for interactive blocks (chat, research, etc.)
        sendMessage,
        latestMessage,
        isCanvasRunning: isRunning,
      },
    }));
  }, [nodes, handleNodeClick, handleWebPageClick, handleRerun, handleModelChange, sendMessage, latestMessage, isRunning]);

  // Load canvas from database
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    api.canvas.load(projectName).then(async (res: Response) => {
      if (cancelled) return;
      try {
        const data = await res.json();
        const rawElements = data.elements || [];
        const savedAppState = data.appState || {};

        const { nodes: loadedNodes, edges: loadedEdges } = migrateExcalidrawData(rawElements);
        setNodes(loadedNodes);
        setEdges(loadedEdges);

        if (savedAppState.x !== undefined) {
          setViewport({ x: savedAppState.x, y: savedAppState.y, zoom: savedAppState.zoom || 1 });
        } else if (savedAppState.scrollX !== undefined) {
          setViewport({ x: savedAppState.scrollX || 0, y: savedAppState.scrollY || 0, zoom: savedAppState.zoom?.value || 1 });
        }

        lastSavedRef.current = JSON.stringify({ nodes: loadedNodes, edges: loadedEdges });
      } catch {
        setNodes([]);
        setEdges([]);
      }
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setNodes([]);
        setEdges([]);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [projectName]);

  // Save canvas (debounced)
  const saveCanvas = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('unsaved');

    saveTimerRef.current = setTimeout(() => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const dataJson = JSON.stringify({ nodes: currentNodes, edges: currentEdges });

      if (dataJson === lastSavedRef.current) {
        setSaveStatus('saved');
        return;
      }

      if (!navigator.onLine) {
        pendingSaveRef.current = { nodes: currentNodes, edges: currentEdges, viewport: getViewport() };
        setSaveStatus('unsaved');
        return;
      }

      setSaveStatus('saving');
      const viewport = getViewport();
      api.canvas.save(projectNameRef.current, [{ nodes: currentNodes, edges: currentEdges }], viewport)
        .then(() => {
          lastSavedRef.current = dataJson;
          pendingSaveRef.current = null;
          setSaveStatus('saved');
        })
        .catch(() => {
          pendingSaveRef.current = { nodes: currentNodes, edges: currentEdges, viewport };
          setSaveStatus('unsaved');
        });
    }, SAVE_DEBOUNCE_MS);
  }, [getViewport]);

  // Trigger save on node/edge changes
  useEffect(() => { saveCanvas(); }, [nodes, edges]);

  // Flush pending save on reconnect
  useEffect(() => {
    if (connectionState !== 'connected') return;
    const pending = pendingSaveRef.current;
    if (!pending) return;

    setSaveStatus('saving');
    api.canvas.save(projectNameRef.current, [{ nodes: pending.nodes, edges: pending.edges }], pending.viewport)
      .then(() => {
        lastSavedRef.current = JSON.stringify({ nodes: pending.nodes, edges: pending.edges });
        pendingSaveRef.current = null;
        setSaveStatus('saved');
      })
      .catch(() => setSaveStatus('unsaved'));
  }, [connectionState]);

  // Cleanup
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // Edge connections
  const onConnect: OnConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // ── AI streaming with live node updates ─────────────────────────────────────

  const streamingNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!latestMessage || !isRunning) return;

    if (latestMessage.type === 'claude-response' || latestMessage.type === 'assistant') {
      const chunk = latestMessage.content || latestMessage.text || latestMessage.message || '';
      if (chunk) {
        responseAccumulatorRef.current += chunk;

        // Create or update the live streaming node
        const currentText = responseAccumulatorRef.current;
        const truncated = currentText.length > 600 ? '...\n' + currentText.slice(-500) : currentText;

        if (!streamingNodeIdRef.current) {
          // Create the streaming preview node
          const streamId = genId();
          streamingNodeIdRef.current = streamId;
          const pos = getPlacementPosition(nodesRef.current, promptNodeIdRef.current || undefined);

          const streamNode: Node = {
            id: streamId,
            type: 'response',
            position: pos,
            data: {
              label: 'AI Streaming...',
              content: truncated,
              compact: false,
              status: 'running',
            },
          };

          const streamEdges: Edge[] = [];
          if (promptNodeIdRef.current) {
            streamEdges.push({
              id: `e_${promptNodeIdRef.current}_${streamId}`,
              source: promptNodeIdRef.current,
              target: streamId,
              animated: true,
            });
          }

          setNodes(nds => [...nds, streamNode]);
          setEdges(eds => [...eds, ...streamEdges]);
        } else {
          // Update the existing streaming node content in-place
          setNodes(nds => nds.map(n =>
            n.id === streamingNodeIdRef.current
              ? { ...n, data: { ...n.data, content: truncated, label: 'AI Streaming...' } }
              : n
          ));
        }
      }
    }

    if (latestMessage.type === 'claude-complete' || latestMessage.type === 'message_stop') {
      const fullResponse = responseAccumulatorRef.current.trim();
      const streamId = streamingNodeIdRef.current;

      if (fullResponse) {
        // Remove the streaming preview node
        if (streamId) {
          setNodes(nds => nds.filter(n => n.id !== streamId));
          setEdges(eds => eds.filter(e => e.source !== streamId && e.target !== streamId));
        }

        // Place the final parsed nodes (compact task cards + webpage nodes)
        placeResponseNodes(fullResponse);
        setChatHistory(prev => [...prev, { role: 'ai', text: fullResponse.slice(0, 200) + (fullResponse.length > 200 ? '...' : '') }]);
      }

      setIsRunning(false);
      responseAccumulatorRef.current = '';
      streamingNodeIdRef.current = null;
    }
  }, [latestMessage, isRunning]);

  const placeResponseNodes = useCallback((responseText: string) => {
    const pos = getPlacementPosition(nodesRef.current, promptNodeIdRef.current || undefined);
    const { nodes: newNodes, edges: newEdges } = parseResponseToNodes(
      responseText,
      pos.x,
      pos.y,
      promptNodeIdRef.current || undefined,
    );

    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);

    // Fit view to show new content
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 100);
  }, [fitView, setNodes, setEdges]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAddNote = useCallback(() => {
    const pos = getPlacementPosition(nodesRef.current);
    const newNode: Node = {
      id: genId(),
      type: 'note',
      position: pos,
      data: { label: 'Note', content: '' },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const handleAddPdf = useCallback(async (file: File) => {
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const maxPages = Math.min(pdf.numPages, 10);

      let extractedText = '';
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => item.str).join(' ');
        extractedText += `[Page ${i}]\n${text}\n\n`;
      }

      // Generate thumbnail from first page
      let thumbnail = '';
      try {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          thumbnail = canvas.toDataURL('image/jpeg', 0.6);
        }
      } catch { /* thumbnail is optional */ }

      const pos = getPlacementPosition(nodesRef.current);
      const newNode: Node = {
        id: genId(),
        type: 'pdf',
        position: pos,
        data: {
          label: file.name,
          content: extractedText.slice(0, 500),
          fileName: file.name,
          pageCount: pdf.numPages,
          extractedText,
          thumbnail,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    } catch {
      const pos = getPlacementPosition(nodesRef.current);
      setNodes((nds) => [...nds, {
        id: genId(),
        type: 'note',
        position: pos,
        data: { label: file.name, content: `Failed to process PDF: ${file.name}` },
      }]);
    }
  }, [setNodes]);

  const handleRun = useCallback(() => {
    if (!sendMessage || isRunning) return;

    const selectedIds = new Set(nodesRef.current.filter((n) => n.selected).map((n) => n.id));
    const selectedCtx = readSelectedContext(nodesRef.current, selectedIds, edgesRef.current);
    const context = selectedCtx || readCanvasContext(nodesRef.current, edgesRef.current);
    const isSelectedMode = !!selectedCtx;

    const promptText = isSelectedMode ? 'Analyzing selected elements...' : 'Analyzing canvas...';
    const pos = getPlacementPosition(nodesRef.current);
    const promptId = genId();

    const promptNode: Node = {
      id: promptId,
      type: 'prompt',
      position: pos,
      data: { label: 'Prompt', content: promptText },
    };
    setNodes((nds) => [...nds, promptNode]);
    promptNodeIdRef.current = promptId;

    const contextLabel = isSelectedMode ? 'Selected items context' : 'Full canvas context';
    const fullPrompt = CANVAS_SYSTEM_PROMPT + `[${contextLabel}]\n` + context + '\n\nAnalyze the canvas and provide a structured visual response.';

    responseAccumulatorRef.current = '';
    setIsRunning(true);
    setChatHistory((prev) => [...prev, { role: 'user', text: promptText }]);
    sendMessage({ type: 'claude-command', command: fullPrompt, options: { canvasMode: true, blockId: promptId } });
  }, [sendMessage, isRunning, setNodes]);

  const handleStop = useCallback(() => {
    if (sendMessage) sendMessage({ type: 'cancel-command' });
    setIsRunning(false);
    responseAccumulatorRef.current = '';
  }, [sendMessage]);

  const handleClearAi = useCallback(() => {
    const aiTypes = new Set(['response', 'research', 'suggestion', 'prompt', 'webpage', 'summary', 'deepresearch', 'image', 'table', 'list', 'comparison']);
    setNodes((nds) => nds.filter((n) => !aiTypes.has(n.type || '')));
    setEdges((eds) => {
      const remainingIds = new Set(nodesRef.current.filter((n) => !aiTypes.has(n.type || '')).map((n) => n.id));
      return eds.filter((e) => remainingIds.has(e.source) && remainingIds.has(e.target));
    });
    setChatHistory([]);
  }, [setNodes, setEdges]);

  const handleAutoLayout = useCallback(async () => {
    const layouted = await layoutWithDagre(nodesRef.current, edgesRef.current);
    setNodes(layouted);
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
  }, [setNodes, fitView]);

  const handlePromptRun = useCallback((text: string, parentNodeId?: string) => {
    if (!sendMessage || isRunning) return;

    const pos = getPlacementPosition(nodesRef.current, parentNodeId);
    const promptId = genId();
    const promptNode: Node = {
      id: promptId,
      type: 'prompt',
      position: pos,
      data: { label: 'Prompt', content: text },
    };
    const newEdges: Edge[] = [];
    if (parentNodeId) {
      newEdges.push({ id: `e_${parentNodeId}_${promptId}`, source: parentNodeId, target: promptId });
    }

    setNodes((nds) => [...nds, promptNode]);
    setEdges((eds) => [...eds, ...newEdges]);
    promptNodeIdRef.current = promptId;

    const context = readCanvasContext(nodesRef.current, edgesRef.current);
    const fullPrompt = CANVAS_SYSTEM_PROMPT + context + '\n\nUser prompt: ' + text;

    responseAccumulatorRef.current = '';
    setIsRunning(true);
    setChatHistory((prev) => [...prev, { role: 'user', text }]);
    sendMessage({ type: 'claude-command', command: fullPrompt, options: { canvasMode: true, blockId: promptId } });
  }, [sendMessage, isRunning, setNodes, setEdges]);

  const handleBranch = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    const content = String(node.data?.content || '').slice(0, 100);
    const branchPrompt = `Continue from: "${content}"\n\nProvide more detail or explore a different angle.`;
    handlePromptRun(branchPrompt, nodeId);
  }, [handlePromptRun]);

  const handleChatSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text || !sendMessage || isRunning) return;

    const selectedIds = new Set(nodesRef.current.filter((n) => n.selected).map((n) => n.id));
    const selectedCtx = readSelectedContext(nodesRef.current, selectedIds, edgesRef.current);
    const context = selectedCtx || readCanvasContext(nodesRef.current, edgesRef.current);
    const contextLabel = selectedCtx ? 'Selected items context' : 'Full canvas context';

    const pos = getPlacementPosition(nodesRef.current);
    const promptId = genId();
    const promptNode: Node = {
      id: promptId,
      type: 'prompt',
      position: pos,
      data: { label: 'Prompt', content: text },
    };
    setNodes((nds) => [...nds, promptNode]);
    promptNodeIdRef.current = promptId;

    const fullPrompt = CANVAS_SYSTEM_PROMPT + `[${contextLabel}]\n` + context + '\n\nUser message: ' + text;

    responseAccumulatorRef.current = '';
    setIsRunning(true);
    setChatHistory((prev) => [...prev, { role: 'user', text }]);
    setChatInput('');
    sendMessage({ type: 'claude-command', command: fullPrompt, options: { canvasMode: true, blockId: promptId } });
  }, [chatInput, sendMessage, isRunning, setNodes]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatPanelRef.current) chatPanelRef.current.scrollTop = chatPanelRef.current.scrollHeight;
  }, [chatHistory]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          Loading canvas...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* Toolbar */}
      <CanvasToolbar
        onAddNote={handleAddNote}
        onAddPdf={handleAddPdf}
        onRun={handleRun}
        onStop={handleStop}
        onClearAi={handleClearAi}
        onAutoLayout={handleAutoLayout}
        onExport={() => setShowExportModal(true)}
        onTemplates={() => setShowTemplateManager(true)}
        onSwarm={() => setShowSwarmOrchestrator(true)}
        isRunning={isRunning}
      />

      {/* React Flow Canvas */}
      <div onDoubleClick={handleCanvasDoubleClick} className="h-full w-full">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeContextMenu={(event: React.MouseEvent, node: Node) => handleNodeContextMenu(event, node.id)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={3}
          defaultEdgeOptions={{ type: 'smoothstep', animated: false }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            position="bottom-right"
            style={{ marginBottom: 50 }}
            nodeStrokeWidth={3}
            pannable
            zoomable
          />
        </ReactFlow>
      </div>

      {/* Block Picker (double-click to create) */}
      {blockPickerPos && (
        <BlockPicker
          position={blockPickerPos}
          onSelect={handleBlockPickerSelect}
          onClose={() => setBlockPickerPos(null)}
        />
      )}

      {/* Node Context Menu (right-click) */}
      {contextMenu && (
        <NodeContextMenu
          position={contextMenu.pos}
          actions={getContextMenuActions(contextMenu.nodeId)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Template Manager */}
      {showTemplateManager && (
        <TemplateManager
          onLoadTemplate={handleLoadTemplate}
          currentNodes={nodes}
          currentEdges={edges}
          onClose={() => setShowTemplateManager(false)}
        />
      )}

      {/* Swarm Orchestrator */}
      {showSwarmOrchestrator && (
        <SwarmOrchestrator
          onCreateBlocks={handleLoadTemplate}
          sendMessage={sendMessage}
          latestMessage={latestMessage}
          onClose={() => setShowSwarmOrchestrator(false)}
        />
      )}

      {/* Node Detail Drawer (for compact nodes) */}
      <NodeDetailDrawer
        node={drawerNode}
        onClose={() => setDrawerNodeId(null)}
        onPin={handlePinNode}
        onDelete={handleDeleteNode}
      />

      {/* Web Page Editor (full-screen, for webpage nodes) */}
      {editingWebPage && (
        <WebPageEditor
          html={String(editingWebPage.data?.html || editingWebPage.data?.content || '')}
          pageName={String(editingWebPage.data?.pageName || editingWebPage.data?.label || 'Page')}
          nodeId={editingWebPage.id}
          onClose={() => setEditingWebPageId(null)}
          onHtmlChange={handleWebPageHtmlChange}
          sendMessage={sendMessage}
          latestMessage={latestMessage}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          nodes={nodes}
          projectName={projectName}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Top-right status bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {connectionState !== 'connected' && (
          <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400">
            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
          </div>
        )}
        <div className={`text-[10px] px-2 py-1 rounded-full border ${
          saveStatus === 'saved' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
          saveStatus === 'saving' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' :
          'text-muted-foreground border-border/50 bg-muted/50'
        }`}>
          {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
        </div>
      </div>

      {/* Running indicator */}
      {isRunning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            AI is analyzing canvas...
          </div>
        </div>
      )}

      {/* Chat toggle */}
      <button
        onClick={() => {
          setChatOpen(!chatOpen);
          if (!chatOpen) setTimeout(() => textareaRef.current?.focus(), 100);
        }}
        className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        title={chatOpen ? 'Hide chat' : 'Chat with canvas'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {chatOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          )}
        </svg>
      </button>

      {/* Chat panel */}
      {chatOpen && (
        <div className="absolute bottom-16 right-4 z-20 w-80 max-h-[50vh]">
          <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Canvas Chat</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground bg-muted/50">
                {nodes.filter((n) => n.selected).length > 0
                  ? `${nodes.filter((n) => n.selected).length} selected`
                  : 'full canvas'}
              </span>
            </div>

            <div ref={chatPanelRef} className="flex-1 overflow-y-auto max-h-48 px-3 py-2 space-y-2">
              {chatHistory.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-4">
                  Ask AI about your canvas. Context is auto-attached.
                </p>
              )}
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs px-2 py-1.5 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary/10 text-foreground ml-6'
                      : 'bg-muted/50 text-foreground mr-6'
                  }`}
                >
                  <span className="font-medium text-[10px] text-muted-foreground block mb-0.5">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </span>
                  {msg.text}
                </div>
              ))}
              {isRunning && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 px-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  Thinking...
                </div>
              )}
            </div>

            <div className="p-2 border-t border-border/30">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                  placeholder="Ask about your canvas..."
                  rows={1}
                  className="flex-1 bg-muted/30 text-foreground text-xs placeholder-muted-foreground/50 resize-none outline-none px-3 py-2 rounded-lg max-h-16 overflow-y-auto border border-border/30 focus:border-primary/30"
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || isRunning}
                  className="shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  {isRunning ? (
                    <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap with ReactFlowProvider
function CanvasWorkspace(props: CanvasWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <CanvasWorkspaceInner {...props} />
    </ReactFlowProvider>
  );
}

export default React.memo(CanvasWorkspace);
