// ExportModal — export canvas nodes as website project or markdown files
import React, { memo, useCallback, useState } from 'react';
import type { Node } from '@xyflow/react';
import { api } from '../../utils/api';

interface ExportModalProps {
  nodes: Node[];
  projectName: string;
  onClose: () => void;
}

type ExportFormat = 'website' | 'markdown';

function ExportModal({ nodes, projectName, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('website');
  const [targetFolder, setTargetFolder] = useState('exported-site');
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [exportSelected, setExportSelected] = useState(false);

  const selectedNodes = nodes.filter(n => n.selected);
  const webpageNodes = (exportSelected && selectedNodes.length > 0 ? selectedNodes : nodes)
    .filter(n => n.type === 'webpage');
  const textNodes = (exportSelected && selectedNodes.length > 0 ? selectedNodes : nodes)
    .filter(n => n.type && ['response', 'research', 'suggestion', 'note', 'summary'].includes(n.type));

  const exportCount = format === 'website' ? webpageNodes.length : textNodes.length;

  const handleExport = useCallback(async () => {
    setExporting(true);
    setResult(null);

    try {
      if (format === 'website') {
        // Export webpage nodes as HTML files
        const files: { name: string; content: string }[] = [];

        for (let i = 0; i < webpageNodes.length; i++) {
          const node = webpageNodes[i];
          const pageName = String(node.data?.pageName || node.data?.label || `page-${i + 1}`);
          const fileName = pageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.html';
          const html = String(node.data?.html || node.data?.content || '');
          files.push({ name: fileName, content: html });
        }

        // Write each file via the relay
        let succeeded = 0;
        for (const file of files) {
          try {
            const filePath = `${targetFolder}/${file.name}`;
            await api.saveFile(projectName, filePath, file.content);
            succeeded++;
          } catch {
            // Continue with other files
          }
        }

        // Create a basic index if we have multiple pages and no explicit index
        if (files.length > 1 && !files.some(f => f.name === 'index.html')) {
          const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Index</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #1f2937; }
    ul { list-style: none; padding: 0; }
    li { margin: 8px 0; }
    a { color: #4f46e5; text-decoration: none; padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 8px; display: inline-block; }
    a:hover { background: #eef2ff; }
  </style>
</head>
<body>
  <h1>Pages</h1>
  <ul>
    ${files.map(f => `<li><a href="${f.name}">${f.name.replace('.html', '')}</a></li>`).join('\n    ')}
  </ul>
</body>
</html>`;
          try {
            await api.saveFile(projectName, `${targetFolder}/index.html`, indexHtml);
            succeeded++;
          } catch { /* optional */ }
        }

        setResult({
          ok: succeeded > 0,
          message: succeeded > 0
            ? `Exported ${succeeded} file(s) to ${targetFolder}/`
            : 'Export failed — make sure a machine is connected',
        });
      } else {
        // Export text nodes as markdown
        let succeeded = 0;
        for (let i = 0; i < textNodes.length; i++) {
          const node = textNodes[i];
          const label = String(node.data?.label || node.type || `note-${i + 1}`);
          const fileName = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.md';
          const content = String(node.data?.fullContent || node.data?.content || '');

          try {
            await api.saveFile(projectName, `${targetFolder}/${fileName}`, `# ${label}\n\n${content}`);
            succeeded++;
          } catch { /* continue */ }
        }

        setResult({
          ok: succeeded > 0,
          message: succeeded > 0
            ? `Exported ${succeeded} file(s) to ${targetFolder}/`
            : 'Export failed — make sure a machine is connected',
        });
      }
    } catch (err) {
      setResult({ ok: false, message: 'Export failed — check your connection' });
    } finally {
      setExporting(false);
    }
  }, [format, webpageNodes, textNodes, targetFolder, projectName]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-gray-800">Export Canvas</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Scope */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Scope</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportSelected(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  !exportSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                All nodes
              </button>
              <button
                onClick={() => setExportSelected(true)}
                disabled={selectedNodes.length === 0}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                  exportSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Selected ({selectedNodes.length})
              </button>
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('website')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  format === 'website' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Website ({webpageNodes.length} pages)
              </button>
              <button
                onClick={() => setFormat('markdown')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  format === 'markdown' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Markdown ({textNodes.length} notes)
              </button>
            </div>
          </div>

          {/* Target folder */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Target folder</label>
            <input
              type="text"
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400"
              placeholder="exported-site"
            />
            <p className="text-[10px] text-gray-400 mt-1">Relative to project root on connected machine</p>
          </div>

          {/* Result */}
          {result && (
            <div className={`px-3 py-2 rounded-lg text-xs ${result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {result.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{exportCount} item(s) will be exported</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || exportCount === 0}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {exporting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(ExportModal);
