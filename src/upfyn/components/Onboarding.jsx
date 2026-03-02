import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Check, GitBranch, User, Mail, Loader2, Terminal, Layers, Zap, ArrowRight, Sparkles, FolderPlus, Github, Plus, X, Folder } from 'lucide-react';
import ClaudeLogo from './ClaudeLogo';
import CursorLogo from './CursorLogo';
import CodexLogo from './CodexLogo';
import LoginModal from './LoginModal';
import { authenticatedFetch, api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useRelay } from '../contexts/RelayContext';
import { IS_PLATFORM, IS_LOCAL } from '../constants/config';

const Onboarding = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [gitName, setGitName] = useState('');
  const [gitEmail, setGitEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);
  const [slideDir, setSlideDir] = useState('right');

  const [activeLoginProvider, setActiveLoginProvider] = useState(null);
  const [selectedProject] = useState({ name: 'default', fullPath: IS_PLATFORM ? '/workspace' : '' });

  // Project selection state
  const [addedProjects, setAddedProjects] = useState([]);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [browserPath, setBrowserPath] = useState('');
  const [browserFolders, setBrowserFolders] = useState([]);
  const [browserDrives, setBrowserDrives] = useState([]);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubTokens, setGithubTokens] = useState([]);
  const [selectedGithubToken, setSelectedGithubToken] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [cloneProgress, setCloneProgress] = useState('');

  const [claudeAuthStatus, setClaudeAuthStatus] = useState({
    authenticated: false, email: null, loading: true, error: null
  });
  const [cursorAuthStatus, setCursorAuthStatus] = useState({
    authenticated: false, email: null, loading: true, error: null
  });
  const [codexAuthStatus, setCodexAuthStatus] = useState({
    authenticated: false, email: null, loading: true, error: null
  });

  const { user } = useAuth();
  const { isRelayConnected, relayCwd, relayPlatform } = useRelay();
  const prevActiveLoginProviderRef = useRef(undefined);

  useEffect(() => { loadGitConfig(); }, []);

  const loadGitConfig = async () => {
    try {
      const response = await authenticatedFetch('/api/user/git-config');
      if (response.ok) {
        const data = await response.json();
        if (data.gitName) setGitName(data.gitName);
        if (data.gitEmail) setGitEmail(data.gitEmail);
      }
    } catch {
      // Git config is pre-populated if available
    }
  };

  // --- Project browsing helpers ---
  const loadBrowserFolders = useCallback(async (path) => {
    setBrowserLoading(true);
    try {
      const response = await api.browseFilesystem(path || null);
      const data = await response.json();
      setBrowserPath(data.path || path || '');
      setBrowserFolders(data.suggestions || []);
      if (data.drives) setBrowserDrives(data.drives);
    } catch {
      setBrowserFolders([]);
    } finally {
      setBrowserLoading(false);
    }
  }, []);

  const openFolderBrowser = useCallback(async () => {
    setShowFolderBrowser(true);
    await loadBrowserFolders(relayCwd || '~');
  }, [relayCwd, loadBrowserFolders]);

  const navigateToFolder = useCallback(async (path) => {
    await loadBrowserFolders(path);
  }, [loadBrowserFolders]);

  const navigateUp = useCallback(async () => {
    if (!browserPath) return;
    const sep = relayPlatform === 'win32' ? '\\' : '/';
    const lastSlash = browserPath.lastIndexOf(sep);
    if (lastSlash <= 0 && sep === '/') {
      await loadBrowserFolders('/');
    } else if (lastSlash >= 0) {
      const parent = browserPath.substring(0, lastSlash) || (sep === '/' ? '/' : '');
      await loadBrowserFolders(parent);
    }
  }, [browserPath, relayPlatform, loadBrowserFolders]);

  const addLocalProject = useCallback(async (path) => {
    if (addedProjects.some(p => p.path === path)) return;
    setIsAddingProject(true);
    try {
      const response = await api.createWorkspace({ workspaceType: 'existing', path });
      if (response.ok) {
        const data = await response.json();
        const name = path.split(/[/\\]/).filter(Boolean).pop() || 'project';
        setAddedProjects(prev => [...prev, { path, name: data.project?.displayName || name, type: 'local' }]);
        setShowFolderBrowser(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add project');
      }
    } catch (err) {
      setError(err.message || 'Failed to add project');
    } finally {
      setIsAddingProject(false);
    }
  }, [addedProjects]);

  const addGithubProject = useCallback(async () => {
    if (!githubUrl.trim()) return;
    setIsAddingProject(true);
    setCloneProgress('Starting clone...');
    setError('');

    const repoName = githubUrl.trim().replace(/\.git$/, '').split('/').pop() || 'repo';
    const clonePath = IS_LOCAL ? '' : `/workspace/${repoName}`;

    try {
      const params = new URLSearchParams({ path: clonePath, githubUrl: githubUrl.trim() });
      if (selectedGithubToken) params.set('githubTokenId', selectedGithubToken);

      await new Promise((resolve, reject) => {
        const eventSource = new EventSource(`/api/projects/clone-progress?${params}`);
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'progress') {
            setCloneProgress(data.message);
          } else if (data.type === 'complete') {
            eventSource.close();
            setAddedProjects(prev => [...prev, {
              path: data.project?.originalPath || clonePath,
              name: data.project?.displayName || repoName,
              type: 'github',
              url: githubUrl.trim()
            }]);
            setGithubUrl('');
            setCloneProgress('');
            resolve();
          } else if (data.type === 'error') {
            eventSource.close();
            reject(new Error(data.message));
          }
        };
        eventSource.onerror = () => {
          eventSource.close();
          reject(new Error('Connection lost during clone'));
        };
      });
    } catch (err) {
      setError(err.message || 'Failed to clone repository');
      setCloneProgress('');
    } finally {
      setIsAddingProject(false);
    }
  }, [githubUrl, selectedGithubToken]);

  const removeProject = useCallback((index) => {
    setAddedProjects(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Load GitHub tokens when reaching project step
  const loadGithubTokens = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/settings/credentials?type=github_token');
      if (response.ok) {
        const data = await response.json();
        setGithubTokens(data.credentials || []);
        const active = (data.credentials || []).find(c => c.is_active);
        if (active) setSelectedGithubToken(active.id);
      }
    } catch { /* optional */ }
  }, []);

  useEffect(() => {
    const prevProvider = prevActiveLoginProviderRef.current;
    prevActiveLoginProviderRef.current = activeLoginProvider;
    const isInitialMount = prevProvider === undefined;
    const isModalClosing = prevProvider !== null && activeLoginProvider === null;
    if (isInitialMount || isModalClosing) {
      checkClaudeAuthStatus();
      checkCursorAuthStatus();
      checkCodexAuthStatus();
    }
  }, [activeLoginProvider]);

  const checkClaudeAuthStatus = async () => {
    try {
      const response = await authenticatedFetch('/api/cli/claude/status');
      if (response.ok) {
        const data = await response.json();
        setClaudeAuthStatus({ authenticated: data.authenticated, email: data.email, loading: false, error: data.error || null });
      } else {
        setClaudeAuthStatus({ authenticated: false, email: null, loading: false, error: 'Failed to check status' });
      }
    } catch (err) {
      setClaudeAuthStatus({ authenticated: false, email: null, loading: false, error: err.message });
    }
  };

  const checkCursorAuthStatus = async () => {
    try {
      const response = await authenticatedFetch('/api/cli/cursor/status');
      if (response.ok) {
        const data = await response.json();
        setCursorAuthStatus({ authenticated: data.authenticated, email: data.email, loading: false, error: data.error || null });
      } else {
        setCursorAuthStatus({ authenticated: false, email: null, loading: false, error: 'Failed to check status' });
      }
    } catch (err) {
      setCursorAuthStatus({ authenticated: false, email: null, loading: false, error: err.message });
    }
  };

  const checkCodexAuthStatus = async () => {
    try {
      const response = await authenticatedFetch('/api/cli/codex/status');
      if (response.ok) {
        const data = await response.json();
        setCodexAuthStatus({ authenticated: data.authenticated, email: data.email, loading: false, error: data.error || null });
      } else {
        setCodexAuthStatus({ authenticated: false, email: null, loading: false, error: 'Failed to check status' });
      }
    } catch (err) {
      setCodexAuthStatus({ authenticated: false, email: null, loading: false, error: err.message });
    }
  };

  const handleClaudeLogin = () => setActiveLoginProvider('claude');
  const handleCursorLogin = () => setActiveLoginProvider('cursor');
  const handleCodexLogin = () => setActiveLoginProvider('codex');

  const handleLoginComplete = (exitCode) => {
    if (exitCode === 0) {
      if (activeLoginProvider === 'claude') checkClaudeAuthStatus();
      else if (activeLoginProvider === 'cursor') checkCursorAuthStatus();
      else if (activeLoginProvider === 'codex') checkCodexAuthStatus();
    }
  };

  const goToStep = (next, dir = 'right') => {
    setSlideDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(next);
      setAnimating(false);
    }, 200);
  };

  const handleNextStep = async () => {
    setError('');

    if (currentStep === 0) {
      goToStep(1, 'right');
      return;
    }

    if (currentStep === 1) {
      if (!gitName.trim() || !gitEmail.trim()) {
        setError('Both git name and email are required');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(gitEmail)) {
        setError('Please enter a valid email address');
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await authenticatedFetch('/api/user/git-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gitName, gitEmail })
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save git configuration');
        }
        // Load GitHub tokens before entering projects step
        loadGithubTokens();
        goToStep(2, 'right');
      } catch (err) {
        setError(err.message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (currentStep === 2) {
      // Projects step — just advance (adding projects is optional)
      goToStep(3, 'right');
      return;
    }

    goToStep(currentStep + 1, 'right');
  };

  const handlePrevStep = () => {
    setError('');
    goToStep(currentStep - 1, 'left');
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await authenticatedFetch('/api/user/complete-onboarding', {
        method: 'POST'
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete onboarding');
      }
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { title: 'Welcome', required: false },
    { title: 'Git Identity', required: true },
    { title: 'Projects', required: false },
    { title: 'Agents', required: false }
  ];

  const isStepValid = () => {
    if (currentStep === 0) return true;
    if (currentStep === 1) return gitName.trim() && gitEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gitEmail);
    if (currentStep === 2) return true; // Projects step is optional
    return true;
  };

  const connectedCount = [claudeAuthStatus, cursorAuthStatus, codexAuthStatus].filter(s => s.authenticated).length;

  // --- Feature cards for welcome step ---
  const features = [
    {
      icon: Terminal,
      title: 'AI Agents',
      desc: 'Claude, Cursor & Codex — unified in one interface',
      gradient: 'from-blue-500/10 to-blue-600/5',
      iconColor: 'text-blue-500',
    },
    {
      icon: Layers,
      title: 'Canvas',
      desc: 'Visual workspace with code blocks, diagrams & notes',
      gradient: 'from-violet-500/10 to-violet-600/5',
      iconColor: 'text-violet-500',
    },
    {
      icon: Zap,
      title: 'Relay',
      desc: 'Bridge your local machine to the web UI seamlessly',
      gradient: 'from-amber-500/10 to-amber-600/5',
      iconColor: 'text-amber-500',
    },
  ];

  // --- Agent cards config ---
  const agents = [
    {
      name: 'Claude Code',
      status: claudeAuthStatus,
      onLogin: handleClaudeLogin,
      logo: <ClaudeLogo size={22} />,
      accent: 'blue',
    },
    {
      name: 'Cursor',
      status: cursorAuthStatus,
      onLogin: handleCursorLogin,
      logo: <CursorLogo size={22} />,
      accent: 'violet',
    },
    {
      name: 'OpenAI Codex',
      status: codexAuthStatus,
      onLogin: handleCodexLogin,
      logo: <CodexLogo className="w-5 h-5" />,
      accent: 'neutral',
    },
  ];

  const slideClass = animating
    ? `opacity-0 ${slideDir === 'right' ? 'translate-x-4' : '-translate-x-4'}`
    : 'opacity-100 translate-x-0';

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl">

          {/* --- Minimal progress bar --- */}
          <div className="mb-10">
            {/* Step labels */}
            <div className="flex items-center justify-between mb-3 px-1">
              {steps.map((step, i) => (
                <button
                  key={i}
                  onClick={() => { if (i < currentStep) goToStep(i, 'left'); }}
                  disabled={i > currentStep}
                  className={`text-xs font-medium tracking-wide uppercase transition-colors duration-300 ${
                    i === currentStep
                      ? 'text-foreground'
                      : i < currentStep
                        ? 'text-primary cursor-pointer hover:text-primary/80'
                        : 'text-muted-foreground/50'
                  }`}
                >
                  {step.title}
                  {step.required && i === currentStep && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </button>
              ))}
            </div>

            {/* Track */}
            <div className="h-1 bg-muted/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* --- Main Card --- */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-xl shadow-black/[0.04] dark:shadow-black/[0.2] overflow-hidden">
            <div className={`p-8 sm:p-10 transition-all duration-200 ease-out ${slideClass}`}>

              {/* Step 0: Welcome */}
              {currentStep === 0 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
                      <Sparkles className="w-3.5 h-3.5" />
                      Quick setup — under a minute
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                      Welcome to Upfyn
                      {user?.first_name ? (
                        <span className="text-primary">, {user.first_name}</span>
                      ) : null}
                    </h1>
                    <p className="text-muted-foreground mt-3 text-base max-w-md mx-auto leading-relaxed">
                      Your visual AI coding interface. Connect your favorite agents, manage projects, and build faster.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {features.map((f, i) => (
                      <div
                        key={i}
                        className={`group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r ${f.gradient} border border-border/40 hover:border-border/80 transition-all duration-200`}
                      >
                        <div className={`mt-0.5 p-2 rounded-lg bg-background/80 ${f.iconColor} flex-shrink-0`}>
                          <f.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{f.title}</p>
                          <p className="text-muted-foreground text-sm mt-0.5">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: Git Config */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                      <GitBranch className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                      Git Identity
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
                      Set your name and email for commit attribution
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label htmlFor="gitName" className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        Name
                      </label>
                      <input
                        type="text"
                        id="gitName"
                        value={gitName}
                        onChange={(e) => setGitName(e.target.value)}
                        className="w-full px-4 py-3 border border-border/60 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                        placeholder="John Doe"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label htmlFor="gitEmail" className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        Email
                      </label>
                      <input
                        type="email"
                        id="gitEmail"
                        value={gitEmail}
                        onChange={(e) => setGitEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-border/60 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                        placeholder="john@example.com"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground/70 text-center">
                      Applied as <code className="px-1 py-0.5 rounded bg-muted/60 text-xs">git config --global</code> on your machine
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Projects */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                      <FolderPlus className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                      Add Projects
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
                      {IS_LOCAL
                        ? 'Select folders from your machine to work with'
                        : 'Add GitHub repos or local folders as projects'}
                    </p>
                  </div>

                  {/* Added projects list */}
                  {addedProjects.length > 0 && (
                    <div className="space-y-2">
                      {addedProjects.map((project, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {project.type === 'github' ? (
                                <Github className="w-4 h-4 text-primary" />
                              ) : (
                                <Folder className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{project.url || project.path}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeProject(i)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add project actions */}
                  <div className="space-y-3">
                    {/* Local folder option */}
                    {(IS_LOCAL || isRelayConnected) && !showFolderBrowser && (
                      <button
                        onClick={openFolderBrowser}
                        disabled={isAddingProject}
                        className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center flex-shrink-0 transition-colors">
                          <FolderPlus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Add Local Folder</p>
                          <p className="text-xs text-muted-foreground">
                            {relayCwd ? `Current: ${relayCwd}` : 'Browse your filesystem'}
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Folder browser */}
                    {showFolderBrowser && (
                      <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
                        {/* Browser header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/40">
                          <button
                            onClick={navigateUp}
                            disabled={browserLoading}
                            className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                            title="Go up"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-mono text-muted-foreground truncate flex-1">{browserPath}</span>
                          <button
                            onClick={() => addLocalProject(browserPath)}
                            disabled={isAddingProject || !browserPath}
                            className="px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                          >
                            {isAddingProject ? 'Adding...' : 'Select This'}
                          </button>
                          <button
                            onClick={() => setShowFolderBrowser(false)}
                            className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Drive selector (Windows) */}
                        {browserDrives.length > 0 && (
                          <div className="flex gap-1 px-3 py-1.5 border-b border-border/30 bg-muted/10">
                            {browserDrives.map(drive => (
                              <button
                                key={drive}
                                onClick={() => navigateToFolder(drive + '\\')}
                                className="px-2 py-0.5 text-[11px] font-mono rounded bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {drive}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Folder list */}
                        <div className="max-h-48 overflow-y-auto">
                          {browserLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : browserFolders.length === 0 ? (
                            <p className="text-center text-xs text-muted-foreground py-6">No folders found</p>
                          ) : (
                            browserFolders.map((folder, i) => (
                              <button
                                key={i}
                                onClick={() => navigateToFolder(folder.path)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
                              >
                                <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <span className="text-sm text-foreground truncate">{folder.name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* GitHub repo option (web mode or if relay connected) */}
                    {!IS_LOCAL && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card">
                          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
                            <Github className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground mb-2">Clone GitHub Repo</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                placeholder="https://github.com/user/repo"
                                className="flex-1 px-3 py-1.5 text-sm border border-border/60 rounded-lg bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                                disabled={isAddingProject}
                              />
                              <button
                                onClick={addGithubProject}
                                disabled={isAddingProject || !githubUrl.trim()}
                                className="px-3 py-1.5 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0"
                              >
                                {isAddingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                              </button>
                            </div>
                            {githubTokens.length > 0 && (
                              <select
                                value={selectedGithubToken}
                                onChange={(e) => setSelectedGithubToken(e.target.value)}
                                className="mt-2 w-full px-2 py-1 text-xs border border-border/40 rounded-lg bg-background text-muted-foreground"
                              >
                                <option value="">No token (public repos only)</option>
                                {githubTokens.map(t => (
                                  <option key={t.id} value={t.id}>{t.credential_name}</option>
                                ))}
                              </select>
                            )}
                            {cloneProgress && (
                              <p className="mt-2 text-xs text-primary animate-pulse">{cloneProgress}</p>
                            )}
                          </div>
                        </div>

                        {/* Hint for relay */}
                        {!isRelayConnected && (
                          <p className="text-xs text-muted-foreground/60 text-center">
                            Connect your machine with <code className="px-1 py-0.5 rounded bg-muted/60 text-[11px]">uc web connect</code> to add local folders
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground/60 text-center">
                    {addedProjects.length === 0 ? 'You can skip this and add projects later.' : `${addedProjects.length} project${addedProjects.length > 1 ? 's' : ''} added`}
                  </p>
                </div>
              )}

              {/* Step 3: Connect Agents */}
              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                      Connect Your Agents
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
                      Optional — login to one or more AI assistants.
                      {connectedCount > 0 && (
                        <span className="text-primary font-medium"> {connectedCount} connected</span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {agents.map((agent, i) => {
                      const isAuth = agent.status.authenticated;
                      const isLoading = agent.status.loading;
                      return (
                        <div
                          key={i}
                          className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                            isAuth
                              ? 'bg-primary/5 border-primary/20'
                              : 'bg-card border-border/50 hover:border-border'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isAuth ? 'bg-primary/10' : 'bg-muted/60'
                            }`}>
                              {agent.logo}
                            </div>
                            <div>
                              <div className="font-medium text-sm text-foreground flex items-center gap-2">
                                {agent.name}
                                {isAuth && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-semibold uppercase tracking-wider">
                                    <Check className="w-3 h-3" />
                                    Connected
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {isLoading ? 'Checking...' : isAuth ? (agent.status.email || 'Ready to use') : 'Not connected'}
                              </p>
                            </div>
                          </div>
                          {!isAuth && !isLoading && (
                            <button
                              onClick={agent.onLogin}
                              className="px-4 py-2 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity flex-shrink-0"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground/60 text-center">
                    You can always add or change these in Settings later.
                  </p>
                </div>
              )}
            </div>

            {/* --- Error --- */}
            {error && (
              <div className="mx-8 sm:mx-10 mb-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* --- Footer / Navigation --- */}
            <div className="flex items-center justify-between px-8 sm:px-10 py-5 border-t border-border/40 bg-muted/20">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 0 || isSubmitting}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-0 disabled:pointer-events-none transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNextStep}
                  disabled={!isStepValid() || isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : currentStep === 0 ? (
                    <>
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Finishing...
                    </>
                  ) : (
                    <>
                      Start Building
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* --- Footer note --- */}
          <p className="text-center text-xs text-muted-foreground/50 mt-6">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
      </div>

      {activeLoginProvider && (
        <LoginModal
          isOpen={!!activeLoginProvider}
          onClose={() => setActiveLoginProvider(null)}
          provider={activeLoginProvider}
          project={selectedProject}
          onComplete={handleLoginComplete}
          isOnboarding={true}
        />
      )}
    </>
  );
};

export default Onboarding;
