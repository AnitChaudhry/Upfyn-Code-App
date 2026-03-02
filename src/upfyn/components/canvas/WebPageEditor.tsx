// WebPageEditor — full-screen HTML page editor with element selection + AI prompts
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';

interface WebPageEditorProps {
  html: string;
  pageName: string;
  nodeId: string;
  onClose: () => void;
  onHtmlChange: (nodeId: string, newHtml: string) => void;
  sendMessage?: (msg: any) => void;
  latestMessage?: any;
}

// Script injected into the iframe for element selection
const INJECT_SCRIPT = `
(function() {
  let selectedEl = null;
  let hoverEl = null;

  const highlight = document.createElement('style');
  highlight.textContent = \`
    .__upfyn-hover { outline: 2px dashed #6366f1 !important; outline-offset: 2px; cursor: pointer; }
    .__upfyn-selected { outline: 2px solid #6366f1 !important; outline-offset: 2px; }
  \`;
  document.head.appendChild(highlight);

  document.addEventListener('mouseover', function(e) {
    if (hoverEl && hoverEl !== selectedEl) hoverEl.classList.remove('__upfyn-hover');
    if (e.target === document.body || e.target === document.documentElement) return;
    hoverEl = e.target;
    if (hoverEl !== selectedEl) hoverEl.classList.add('__upfyn-hover');
  }, true);

  document.addEventListener('mouseout', function(e) {
    if (hoverEl && hoverEl !== selectedEl) hoverEl.classList.remove('__upfyn-hover');
  }, true);

  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    if (selectedEl) selectedEl.classList.remove('__upfyn-selected');
    selectedEl = e.target;
    selectedEl.classList.add('__upfyn-selected');

    // Build CSS selector path
    function getSelector(el) {
      if (el.id) return '#' + el.id;
      let path = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => !c.startsWith('__upfyn')).slice(0, 2).join('.');
        if (classes) path += '.' + classes;
      }
      return path;
    }

    const rect = selectedEl.getBoundingClientRect();
    window.parent.postMessage({
      type: 'upfyn-element-selected',
      outerHTML: selectedEl.outerHTML,
      tagName: selectedEl.tagName,
      selector: getSelector(selectedEl),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    }, '*');
  }, true);

  // Listen for HTML replacement from parent
  window.addEventListener('message', function(e) {
    if (e.data?.type === 'upfyn-replace-element' && selectedEl) {
      const temp = document.createElement('div');
      temp.innerHTML = e.data.newHTML;
      const newEl = temp.firstElementChild || temp.firstChild;
      if (newEl) {
        selectedEl.classList.remove('__upfyn-selected');
        selectedEl.replaceWith(newEl);
        selectedEl = newEl;
        selectedEl.classList.add('__upfyn-selected');

        // Send updated full HTML back
        window.parent.postMessage({
          type: 'upfyn-html-updated',
          fullHTML: document.documentElement.outerHTML
        }, '*');
      }
    }

    if (e.data?.type === 'upfyn-deselect' && selectedEl) {
      selectedEl.classList.remove('__upfyn-selected');
      selectedEl = null;
    }
  });
})();
`;

function WebPageEditor({ html, pageName, nodeId, onClose, onHtmlChange, sendMessage, latestMessage }: WebPageEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showCode, setShowCode] = useState(false);
  const [codeHtml, setCodeHtml] = useState(html);
  const [selectedElement, setSelectedElement] = useState<{
    outerHTML: string;
    tagName: string;
    selector: string;
    rect: { top: number; left: number; width: number; height: number };
  } | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const promptRef = useRef<HTMLInputElement>(null);
  const responseAccRef = useRef('');

  // Write HTML + injection script into iframe
  const writeToIframe = useCallback((htmlContent: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    // Inject the selection script before </body>
    const injected = htmlContent.replace(
      '</body>',
      `<script>${INJECT_SCRIPT}</script></body>`
    );

    doc.open();
    doc.write(injected);
    doc.close();
    setCodeHtml(htmlContent);
  }, []);

  useEffect(() => {
    // Small delay for iframe to be ready
    const timer = setTimeout(() => writeToIframe(html), 100);
    return () => clearTimeout(timer);
  }, [html]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'upfyn-element-selected') {
        setSelectedElement({
          outerHTML: e.data.outerHTML,
          tagName: e.data.tagName,
          selector: e.data.selector,
          rect: e.data.rect,
        });
        setPromptInput('');
        setTimeout(() => promptRef.current?.focus(), 100);
      }

      if (e.data?.type === 'upfyn-html-updated') {
        // Remove injected styles/scripts before storing
        let cleanHtml = e.data.fullHTML;
        cleanHtml = cleanHtml.replace(/<style>[^<]*__upfyn[^<]*<\/style>/g, '');
        cleanHtml = cleanHtml.replace(/<script>[^]*?<\/script>\s*<\/body>/, '</body>');
        cleanHtml = cleanHtml.replace(/ class="__upfyn-[^"]*"/g, '');
        cleanHtml = cleanHtml.replace(/ class=""/g, '');
        setCodeHtml(cleanHtml);
        onHtmlChange(nodeId, cleanHtml);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [nodeId, onHtmlChange]);

  // Listen for AI responses during editing
  useEffect(() => {
    if (!latestMessage || !isEditing) return;

    if (latestMessage.type === 'claude-response' || latestMessage.type === 'assistant') {
      const chunk = latestMessage.content || latestMessage.text || latestMessage.message || '';
      if (chunk) responseAccRef.current += chunk;
    }

    if (latestMessage.type === 'claude-complete' || latestMessage.type === 'message_stop') {
      const fullResponse = responseAccRef.current.trim();
      if (fullResponse) {
        // Extract HTML from response (may be wrapped in ```html blocks)
        let newHTML = fullResponse;
        const htmlMatch = fullResponse.match(/```html?\s*\n([\s\S]*?)```/);
        if (htmlMatch) {
          newHTML = htmlMatch[1].trim();
        }

        // Send the replacement to the iframe
        iframeRef.current?.contentWindow?.postMessage({
          type: 'upfyn-replace-element',
          newHTML,
        }, '*');
      }
      setIsEditing(false);
      responseAccRef.current = '';
    }
  }, [latestMessage, isEditing]);

  // Handle prompt submit — send to AI
  const handlePromptSubmit = useCallback(() => {
    const text = promptInput.trim();
    if (!text || !sendMessage || !selectedElement || isEditing) return;

    const aiPrompt = `You are editing an HTML element inline on a web page. Return ONLY the updated HTML element — no explanation, no markdown, just the raw HTML.

Current element (${selectedElement.tagName}):
\`\`\`html
${selectedElement.outerHTML}
\`\`\`

User instruction: ${text}

Return the updated HTML element:`;

    responseAccRef.current = '';
    setIsEditing(true);
    sendMessage({ type: 'claude-command', command: aiPrompt, options: { canvasMode: true } });
  }, [promptInput, sendMessage, selectedElement, isEditing]);

  // Keyboard: Escape to close, Enter to submit prompt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedElement) {
          iframeRef.current?.contentWindow?.postMessage({ type: 'upfyn-deselect' }, '*');
          setSelectedElement(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, onClose]);

  // Apply code edits when toggling from code view
  const handleApplyCode = useCallback(() => {
    writeToIframe(codeHtml);
    onHtmlChange(nodeId, codeHtml);
    setShowCode(false);
  }, [codeHtml, nodeId, onHtmlChange, writeToIframe]);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-200 text-sm text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Canvas
          </button>
          <span className="text-sm font-medium text-gray-800">{pageName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showCode ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showCode ? '</> Code' : '</> View Code'}
          </button>
          {selectedElement && (
            <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded">
              Selected: &lt;{selectedElement.tagName.toLowerCase()}&gt;
            </span>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Live iframe preview */}
        <div className={`relative ${showCode ? 'w-1/2' : 'w-full'}`}>
          <iframe
            ref={iframeRef}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
            title={pageName}
          />

          {/* Floating prompt input near selected element */}
          {selectedElement && (
            <div
              className="absolute z-30 animate-in fade-in duration-150"
              style={{
                top: Math.min(selectedElement.rect.top + selectedElement.rect.height + 8, window.innerHeight - 120),
                left: Math.max(8, Math.min(selectedElement.rect.left, window.innerWidth - 360)),
              }}
            >
              <div className="bg-white rounded-xl shadow-2xl border border-indigo-200 p-2 w-[340px]">
                <div className="flex items-center gap-2">
                  <input
                    ref={promptRef}
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePromptSubmit();
                      }
                    }}
                    placeholder={`Change this ${selectedElement.tagName.toLowerCase()}...`}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
                    disabled={isEditing}
                  />
                  <button
                    onClick={handlePromptSubmit}
                    disabled={!promptInput.trim() || isEditing}
                    className="shrink-0 w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-indigo-600 transition-colors"
                  >
                    {isEditing ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    )}
                  </button>
                </div>
                {isEditing && (
                  <p className="text-[10px] text-indigo-400 mt-1 px-1">AI is editing this element...</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Code panel */}
        {showCode && (
          <div className="w-1/2 border-l flex flex-col">
            <div className="px-3 py-2 border-b bg-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-300 font-mono">HTML Source</span>
              <button
                onClick={handleApplyCode}
                className="px-3 py-1 rounded text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
              >
                Apply Changes
              </button>
            </div>
            <textarea
              value={codeHtml}
              onChange={(e) => setCodeHtml(e.target.value)}
              className="flex-1 bg-gray-900 text-green-300 font-mono text-xs p-4 resize-none outline-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* Bottom hint bar */}
      <div className="px-4 py-1.5 border-t bg-gray-50 text-[10px] text-gray-400">
        Click any element to select it, then type your change. Press Esc to deselect or close.
      </div>
    </div>
  );
}

export default memo(WebPageEditor);
