/**
 * Tasks Panel - Local task management using todo.md files
 * Reads and manages tasks from the project's task files.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare, Square, Plus, Trash2, Loader2, RefreshCw,
  ChevronDown, ChevronRight, Circle, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface TasksPanelProps {
  projectPath: string;
}

const TASKS_FILE = 'tasks.md';
const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-green-400',
};

function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];
  let category = 'General';
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Category header
    if (trimmed.startsWith('## ')) {
      category = trimmed.slice(3).trim();
      continue;
    }

    // Task line: - [ ] or - [x]
    const match = trimmed.match(/^- \[([ xX])\] (.+)$/);
    if (match) {
      const completed = match[1].toLowerCase() === 'x';
      let text = match[2];
      let priority: 'high' | 'medium' | 'low' = 'medium';

      // Extract priority
      if (text.includes('🔴') || text.toLowerCase().includes('[high]')) {
        priority = 'high';
        text = text.replace(/🔴|\[high\]/gi, '').trim();
      } else if (text.includes('🟡') || text.toLowerCase().includes('[medium]')) {
        priority = 'medium';
        text = text.replace(/🟡|\[medium\]/gi, '').trim();
      } else if (text.includes('🟢') || text.toLowerCase().includes('[low]')) {
        priority = 'low';
        text = text.replace(/🟢|\[low\]/gi, '').trim();
      }

      tasks.push({
        id: `task-${tasks.length}`,
        text,
        completed,
        priority,
        category,
      });
    }
  }

  return tasks;
}

function serializeTasks(tasks: Task[]): string {
  const categories = new Map<string, Task[]>();
  for (const task of tasks) {
    const cat = task.category || 'General';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(task);
  }

  let content = '# Tasks\n\n';
  for (const [category, catTasks] of categories) {
    content += `## ${category}\n\n`;
    for (const task of catTasks) {
      const checkbox = task.completed ? '[x]' : '[ ]';
      const priorityTag = task.priority === 'high' ? ' [high]' : task.priority === 'low' ? ' [low]' : '';
      content += `- ${checkbox} ${task.text}${priorityTag}\n`;
    }
    content += '\n';
  }

  return content;
}

const TasksPanel: React.FC<TasksPanelProps> = ({ projectPath }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const tasksFilePath = `${projectPath.replace(/\\/g, '/')}/${TASKS_FILE}`;

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const content = await api.readFileContent(tasksFilePath);
      const parsed = parseTasks(content);
      setTasks(parsed);
      // Expand all categories by default
      setExpandedCategories(new Set(parsed.map(t => t.category)));
    } catch {
      // File doesn't exist yet — empty tasks
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [tasksFilePath]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const saveTasks = useCallback(async (updatedTasks: Task[]) => {
    const content = serializeTasks(updatedTasks);
    await api.writeFileContent(tasksFilePath, content);
  }, [tasksFilePath]);

  const toggleTask = async (id: string) => {
    const updated = tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    await saveTasks(updated);
  };

  const addTask = async () => {
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      text: newTaskText.trim(),
      completed: false,
      priority: 'medium',
      category: 'General',
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    setNewTaskText('');
    await saveTasks(updated);
  };

  const deleteTask = async (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    await saveTasks(updated);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const categories = [...new Set(filteredTasks.map(t => t.category))];
  const completedCount = tasks.filter(t => t.completed).length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Tasks</span>
            <span className="text-[10px] text-muted-foreground">
              {completedCount}/{tasks.length}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={loadTasks} className="h-7 px-2">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* Add task input */}
        <div className="flex items-center gap-2">
          <Input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a task..."
            className="text-xs h-8"
          />
          <Button size="sm" onClick={addTask} disabled={!newTaskText.trim()} className="h-8 px-2">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 mt-2">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded text-[10px] transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-accent text-muted-foreground'
              }`}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Done'}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">
                {tasks.length === 0 ? 'No tasks yet. Add one above.' : 'No matching tasks.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map(cat => {
              const catTasks = filteredTasks.filter(t => t.category === cat);
              const isExpanded = expandedCategories.has(cat);

              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground mb-1 w-full text-left"
                  >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {cat} ({catTasks.length})
                  </button>

                  {isExpanded && (
                    <div className="space-y-1 ml-1">
                      {catTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 group px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                        >
                          <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                            {task.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className={`h-4 w-4 ${PRIORITY_COLORS[task.priority]}`} />
                            )}
                          </button>
                          <span className={`text-xs flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.text}
                          </span>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPanel;
