// SwarmOrchestrator — breaks a goal into sub-tasks and auto-creates connected blocks
// Integrates with existing agent registry (packages/shared/agents/) for execution:
//   - Task planning via claude-query (streaming)
//   - Block execution maps to executeAction() dispatch pattern
//   - Supports parallel task execution with dependency tracking
import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { NODE_STYLES } from '../nodes/BaseNode';

// Map block types to agent actions for execution via the existing agent registry
const BLOCK_TO_AGENT_ACTION: Record<string, string> = {
  chat: 'claude-query',
  deepresearch: 'claude-query',
  prompt: 'claude-query',
  comparison: 'claude-query',
  table: 'claude-query',
  list: 'claude-query',
  image: 'claude-query',
  note: '',          // No agent action — user-created content
  inputs: '',        // No agent action — parameter block
};

interface SwarmTask {
  id: string;
  title: string;
  blockType: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  dependsOn: string[];
  agentAction?: string;  // Maps to executeAction() in packages/shared/agents/
  result?: string;
}

interface SwarmOrchestratorProps {
  onCreateBlocks: (nodes: Node[], edges: Edge[]) => void;
  sendMessage?: (msg: any) => void;
  latestMessage?: any;
  onClose: () => void;
}

// Parse AI response into structured task plan
function parseTaskPlan(text: string): SwarmTask[] {
  const tasks: SwarmTask[] = [];
  const lines = text.split('\n').filter(l => l.trim());

  // Look for structured task format: "1. [type] Title: Description"
  const taskPattern = /^\d+\.\s*\[(\w+)\]\s*(.+?)(?::\s*(.+))?$/;
  const depPattern = /depends?\s*on\s*#?(\d+)/i;

  for (const line of lines) {
    const match = line.trim().match(taskPattern);
    if (match) {
      const [, blockType, title, description = ''] = match;
      const deps: string[] = [];
      const depMatch = description.match(depPattern);
      if (depMatch) deps.push(`swarm_${depMatch[1]}`);

      const validTypes = ['chat', 'deepresearch', 'note', 'table', 'list', 'prompt', 'image', 'comparison'];
      const type = validTypes.includes(blockType.toLowerCase()) ? blockType.toLowerCase() : 'prompt';

      tasks.push({
        id: `swarm_${tasks.length + 1}`,
        title: title.trim(),
        blockType: type,
        description: description.trim(),
        status: 'pending',
        dependsOn: deps,
        agentAction: BLOCK_TO_AGENT_ACTION[type] || '',
      });
    }
  }

  // If no structured tasks found, create basic research + summarize pipeline
  if (tasks.length === 0 && text.length > 20) {
    tasks.push(
      { id: 'swarm_1', title: 'Research', blockType: 'deepresearch', description: 'Research the topic', status: 'pending', dependsOn: [], agentAction: 'claude-query' },
      { id: 'swarm_2', title: 'Analyze', blockType: 'chat', description: 'Analyze research findings', status: 'pending', dependsOn: ['swarm_1'], agentAction: 'claude-query' },
      { id: 'swarm_3', title: 'Summary', blockType: 'table', description: 'Create structured summary', status: 'pending', dependsOn: ['swarm_2'], agentAction: 'claude-query' },
    );
  }

  return tasks;
}

// Arrange tasks into a visual layout
function layoutTasks(tasks: SwarmTask[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const baseX = 100;
  const baseY = 100;
  const colWidth = 380;
  const rowHeight = 200;

  // Group by dependency depth (BFS)
  const depthMap = new Map<string, number>();
  const queue = tasks.filter(t => t.dependsOn.length === 0);
  queue.forEach(t => depthMap.set(t.id, 0));

  let i = 0;
  while (i < queue.length) {
    const current = queue[i++];
    const currentDepth = depthMap.get(current.id) || 0;
    const dependents = tasks.filter(t => t.dependsOn.includes(current.id));
    for (const dep of dependents) {
      if (!depthMap.has(dep.id)) {
        depthMap.set(dep.id, currentDepth + 1);
        queue.push(dep);
      }
    }
  }
  // Assign depth 0 to any remaining
  tasks.forEach(t => { if (!depthMap.has(t.id)) depthMap.set(t.id, 0); });

  // Group by depth
  const byDepth = new Map<number, SwarmTask[]>();
  for (const task of tasks) {
    const depth = depthMap.get(task.id) || 0;
    if (!byDepth.has(depth)) byDepth.set(depth, []);
    byDepth.get(depth)!.push(task);
  }

  // Create nodes
  for (const [depth, depthTasks] of byDepth) {
    depthTasks.forEach((task, idx) => {
      nodes.push({
        id: task.id,
        type: task.blockType,
        position: { x: baseX + depth * colWidth, y: baseY + idx * rowHeight },
        data: {
          label: task.title,
          content: task.description,
          status: 'pending',
        },
      });
    });
  }

  // Create edges from dependencies
  for (const task of tasks) {
    for (const depId of task.dependsOn) {
      edges.push({
        id: `e_${depId}_${task.id}`,
        source: depId,
        target: task.id,
        animated: true,
      });
    }
  }

  // Connect parallel tasks at same depth
  for (const [, depthTasks] of byDepth) {
    if (depthTasks.length <= 1) continue;
    // Don't connect parallel tasks — they run independently
  }

  return { nodes, edges };
}

function SwarmOrchestrator({ onCreateBlocks, sendMessage, latestMessage, onClose }: SwarmOrchestratorProps) {
  const [goal, setGoal] = useState('');
  const [phase, setPhase] = useState<'input' | 'planning' | 'ready' | 'executing' | 'done'>('input');
  const [tasks, setTasks] = useState<SwarmTask[]>([]);
  const [planText, setPlanText] = useState('');
  const planAccumulatorRef = useRef('');

  // Generate task plan from goal
  const handlePlan = useCallback(() => {
    if (!goal.trim()) return;
    setPhase('planning');
    setPlanText('');
    planAccumulatorRef.current = '';

    const planPrompt = `You are a task decomposition AI. Break down the following goal into a structured plan of 3-6 sub-tasks.

Goal: ${goal}

For each task, use this exact format:
1. [blockType] Task Title: Brief description

Available block types: chat, deepresearch, note, table, list, prompt, image, comparison

Example:
1. [deepresearch] Market Analysis: Research current market trends and competitors
2. [table] Data Summary: Compile findings into structured comparison table (depends on #1)
3. [chat] Strategy Discussion: Analyze findings and recommend strategy (depends on #2)

Rules:
- Use the most appropriate block type for each task
- Mark dependencies with "depends on #N"
- Tasks without dependencies can run in parallel
- Keep each task focused and actionable`;

    if (sendMessage) {
      sendMessage({
        type: 'claude-command',
        command: planPrompt,
        options: { canvasMode: true, blockId: 'swarm_planner', swarmMode: true },
      });
    } else {
      // Fallback: create a default plan
      const defaultPlan = `1. [deepresearch] Research: Research "${goal.slice(0, 50)}"
2. [chat] Analysis: Analyze research findings (depends on #1)
3. [table] Summary: Create structured summary (depends on #2)`;
      setPlanText(defaultPlan);
      setTasks(parseTaskPlan(defaultPlan));
      setPhase('ready');
    }
  }, [goal, sendMessage]);

  // Listen for streaming plan response
  useEffect(() => {
    if (!latestMessage || phase !== 'planning') return;
    const msg = latestMessage;

    if ((msg.type === 'claude-response' || msg.type === 'assistant') &&
        (msg.blockId === 'swarm_planner' || !msg.blockId)) {
      const chunk = msg.content || msg.text || msg.message || '';
      if (chunk) {
        planAccumulatorRef.current += chunk;
        setPlanText(planAccumulatorRef.current);
      }
    }

    if (msg.type === 'claude-complete' || msg.type === 'message_stop') {
      const finalPlan = planAccumulatorRef.current.trim();
      if (finalPlan) {
        setPlanText(finalPlan);
        const parsed = parseTaskPlan(finalPlan);
        setTasks(parsed);
        setPhase('ready');
      }
    }
  }, [latestMessage, phase]);

  // Execute the plan — create blocks on canvas and optionally auto-run AI blocks
  // Uses existing agent infrastructure: sendMessage → WebSocket → backend → executeAction()
  const handleExecute = useCallback((autoRun = false) => {
    if (tasks.length === 0) return;
    setPhase('executing');

    const { nodes, edges } = layoutTasks(tasks);
    onCreateBlocks(nodes, edges);

    // Auto-run: send each AI block's content through the existing canvas AI pipeline
    // This goes through WebSocket → backend → packages/shared/agents/ → executeAction()
    if (autoRun && sendMessage) {
      const aiTasks = tasks.filter(t => t.agentAction);
      // Execute independent tasks (no deps) first, then dependents after a delay
      const byDepth = new Map<number, SwarmTask[]>();
      for (const task of aiTasks) {
        const depth = task.dependsOn.length === 0 ? 0 : 1;
        if (!byDepth.has(depth)) byDepth.set(depth, []);
        byDepth.get(depth)!.push(task);
      }

      let delay = 500;
      for (const [, depthTasks] of byDepth) {
        for (const task of depthTasks) {
          setTimeout(() => {
            sendMessage({
              type: 'claude-command',
              command: `${task.title}: ${task.description}`,
              options: { canvasMode: true, blockId: task.id, swarmMode: true },
            });
          }, delay);
          delay += 200;
        }
      }
    }

    setPhase('done');
    setTimeout(onClose, 800);
  }, [tasks, onCreateBlocks, onClose, sendMessage]);

  // Edit a task
  const handleEditTask = useCallback((taskId: string, field: keyof SwarmTask, value: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, [field]: value } : t
    ));
  }, []);

  // Remove a task
  const handleRemoveTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  // Add a manual task
  const handleAddTask = useCallback(() => {
    setTasks(prev => [...prev, {
      id: `swarm_${prev.length + 1}`,
      title: 'New Task',
      blockType: 'prompt',
      description: '',
      status: 'pending',
      dependsOn: [],
    }]);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[560px] max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white text-sm">🐝</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Swarm Orchestrator</h3>
              <p className="text-[10px] text-gray-400">
                {phase === 'input' ? 'Describe your goal — AI will decompose it into tasks' :
                 phase === 'planning' ? 'AI is planning the task breakdown...' :
                 phase === 'ready' ? 'Review and edit the plan, then execute' :
                 phase === 'executing' ? 'Creating blocks on canvas...' :
                 'Done!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Goal Input */}
        {(phase === 'input' || phase === 'planning') && (
          <div className="px-5 py-3 border-b border-gray-100">
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="What do you want to accomplish? e.g., 'Research AI trends and create a comparison of top 5 tools with pricing data'"
              rows={3}
              disabled={phase === 'planning'}
              className="w-full text-xs text-gray-700 placeholder-gray-400 resize-none outline-none px-3 py-2 rounded-lg border border-gray-200 focus:border-violet-300 bg-gray-50/50 disabled:opacity-60"
            />
            {phase === 'input' && (
              <button
                onClick={handlePlan}
                disabled={!goal.trim()}
                className="mt-2 w-full py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg text-xs font-medium hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-40 transition-all"
              >
                Plan Tasks with AI
              </button>
            )}
            {phase === 'planning' && (
              <div className="mt-2 flex items-center gap-2 text-xs text-violet-500">
                <div className="w-3 h-3 border-2 border-violet-300 border-t-violet-500 rounded-full animate-spin" />
                AI is decomposing your goal into tasks...
              </div>
            )}
          </div>
        )}

        {/* Planning output (streaming) */}
        {phase === 'planning' && planText && (
          <div className="px-5 py-3 max-h-40 overflow-y-auto">
            <pre className="text-[10px] text-gray-500 whitespace-pre-wrap font-mono">{planText}</pre>
          </div>
        )}

        {/* Task List (editable) */}
        {(phase === 'ready' || phase === 'executing' || phase === 'done') && (
          <div className="flex-1 overflow-y-auto px-5 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Task Plan ({tasks.length} tasks)
              </span>
              {phase === 'ready' && (
                <button
                  onClick={handleAddTask}
                  className="text-[10px] text-violet-500 hover:text-violet-600 font-medium"
                >
                  + Add Task
                </button>
              )}
            </div>

            <div className="space-y-2">
              {tasks.map((task, i) => {
                const style = NODE_STYLES[task.blockType] || NODE_STYLES.note;
                const isParallel = task.dependsOn.length === 0 && i > 0;

                return (
                  <div key={task.id} className="group">
                    {/* Dependency indicator */}
                    {task.dependsOn.length > 0 && (
                      <div className="flex items-center gap-1.5 ml-4 mb-0.5">
                        <div className="w-px h-3 bg-gray-200" />
                        <span className="text-[8px] text-gray-300">depends on #{task.dependsOn.map(d => d.replace('swarm_', '')).join(', #')}</span>
                      </div>
                    )}
                    {isParallel && (
                      <div className="flex items-center gap-1.5 ml-4 mb-0.5">
                        <span className="text-[8px] text-violet-300 font-medium">⚡ parallel</span>
                      </div>
                    )}

                    <div className={`
                      flex items-start gap-2.5 p-2.5 rounded-xl border transition-all
                      ${phase === 'executing' || phase === 'done'
                        ? `${style.bg} ${style.border}/50`
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }
                    `}>
                      {/* Block type badge */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.bg} border ${style.border}/30`}>
                        <span className="text-sm">{style.icon}</span>
                      </div>

                      {/* Task content */}
                      <div className="flex-1 min-w-0">
                        {phase === 'ready' ? (
                          <>
                            <input
                              value={task.title}
                              onChange={e => handleEditTask(task.id, 'title', e.target.value)}
                              className="text-[11px] font-semibold text-gray-700 bg-transparent outline-none w-full"
                            />
                            <input
                              value={task.description}
                              onChange={e => handleEditTask(task.id, 'description', e.target.value)}
                              placeholder="Description..."
                              className="text-[10px] text-gray-400 bg-transparent outline-none w-full mt-0.5"
                            />
                            {/* Block type selector */}
                            <select
                              value={task.blockType}
                              onChange={e => handleEditTask(task.id, 'blockType', e.target.value)}
                              className="text-[9px] text-gray-400 bg-transparent outline-none mt-0.5 cursor-pointer"
                            >
                              <option value="chat">Chat</option>
                              <option value="deepresearch">Deep Research</option>
                              <option value="prompt">Prompt</option>
                              <option value="table">Table</option>
                              <option value="list">List</option>
                              <option value="note">Note</option>
                              <option value="image">Image</option>
                              <option value="comparison">Compare</option>
                            </select>
                          </>
                        ) : (
                          <>
                            <div className="text-[11px] font-semibold text-gray-700">{task.title}</div>
                            <div className="text-[10px] text-gray-400">{task.description}</div>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      {phase === 'ready' && (
                        <button
                          onClick={() => handleRemoveTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-300 transition-all shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      {/* Status indicator for execution */}
                      {(phase === 'executing' || phase === 'done') && (
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                          task.status === 'completed' ? 'bg-emerald-400' :
                          task.status === 'running' ? 'bg-violet-400 animate-pulse' :
                          task.status === 'failed' ? 'bg-red-400' :
                          'bg-gray-300'
                        }`} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer actions */}
        {phase === 'ready' && tasks.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => { setPhase('input'); setTasks([]); setPlanText(''); }}
              className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              Start Over
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExecute(false)}
                className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-all"
              >
                Create Only
              </button>
              <button
                onClick={() => handleExecute(true)}
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg text-xs font-medium hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-sm"
              >
                Create & Run {tasks.length} Blocks
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="px-5 py-3 border-t border-gray-100 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-500 font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Blocks created on canvas!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(SwarmOrchestrator);
