// AI Response Parser — parses AI markdown into React Flow node definitions
import type { Node, Edge } from '@xyflow/react';

type ParsedSection = {
  type: 'response' | 'research' | 'suggestion' | 'webpage';
  heading: string;
  content: string;
};

function parseSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = text.split('\n');
  let currentType: ParsedSection['type'] = 'response';
  let currentHeading = '';
  let currentContent: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';

  // Track HTML code blocks separately — they become webpage nodes
  const htmlBlocks: { heading: string; html: string }[] = [];
  let currentHtmlBlock: string[] | null = null;
  let htmlBlockHeading = '';

  const flushCurrent = () => {
    const content = currentContent.join('\n').trim();
    if (content) {
      sections.push({ type: currentType, heading: currentHeading, content });
    }
    currentContent = [];
  };

  for (const line of lines) {
    // Track code blocks to avoid parsing headings inside them
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        // Opening fence
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim().toLowerCase();

        // If this is an HTML block, start collecting it
        if (codeBlockLang === 'html' || codeBlockLang === 'htm') {
          currentHtmlBlock = [];
          htmlBlockHeading = currentHeading || `Page ${htmlBlocks.length + 1}`;
          continue;
        }
      } else {
        // Closing fence
        if (currentHtmlBlock !== null) {
          // End of HTML block — store it
          htmlBlocks.push({
            heading: htmlBlockHeading,
            html: currentHtmlBlock.join('\n'),
          });
          currentHtmlBlock = null;
          inCodeBlock = false;
          codeBlockLang = '';
          continue;
        }
        inCodeBlock = false;
        codeBlockLang = '';
      }
      currentContent.push(line);
      continue;
    }

    if (currentHtmlBlock !== null) {
      currentHtmlBlock.push(line);
      continue;
    }

    if (inCodeBlock) {
      currentContent.push(line);
      continue;
    }

    // Heading detection — determines block type
    if (line.startsWith('## ') || line.startsWith('### ')) {
      flushCurrent();
      const heading = line.replace(/^#{2,3}\s+/, '').trim();
      currentHeading = heading;
      const lower = heading.toLowerCase();

      if (lower.includes('research') || lower.includes('analysis') || lower.includes('finding')) {
        currentType = 'research';
      } else if (lower.includes('suggestion') || lower.includes('idea') || lower.includes('recommendation')) {
        currentType = 'suggestion';
      } else {
        currentType = 'response';
      }
      continue;
    }

    // Quote blocks → suggestion
    if (line.startsWith('> ')) {
      if (currentType !== 'suggestion') {
        flushCurrent();
        currentType = 'suggestion';
        currentHeading = currentHeading || 'Suggestion';
      }
      currentContent.push(line.slice(2));
      continue;
    }

    currentContent.push(line);
  }

  flushCurrent();

  // Add webpage sections for HTML blocks
  for (const block of htmlBlocks) {
    sections.push({
      type: 'webpage',
      heading: block.heading,
      content: block.html,
    });
  }

  return sections;
}

let _idCounter = 0;
function genId(): string {
  return `canvas_${Date.now()}_${++_idCounter}`;
}

export type ParsedCanvasNodes = {
  nodes: Node[];
  edges: Edge[];
};

/**
 * Parse an AI markdown response into React Flow nodes + edges.
 * AI response nodes (response, research, suggestion) are compact by default.
 * HTML code blocks become webpage nodes with full HTML content.
 */
export function parseResponseToNodes(
  responseText: string,
  startX: number,
  startY: number,
  promptNodeId?: string,
): ParsedCanvasNodes {
  const sections = parseSections(responseText);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Separate text sections and webpage sections
  const textSections = sections.filter(s => s.type !== 'webpage');
  const webpageSections = sections.filter(s => s.type === 'webpage');

  // Layout text sections vertically (compact cards)
  let currentY = startY;
  const COMPACT_GAP = 15;
  const FULL_GAP = 30;

  for (const section of textSections) {
    const nodeId = genId();
    const summary = section.content.split('\n')[0].slice(0, 60);

    nodes.push({
      id: nodeId,
      type: section.type,
      position: { x: startX, y: currentY },
      data: {
        label: section.heading || section.type,
        content: section.content.length > 800
          ? section.content.slice(0, 800) + '\n...'
          : section.content,
        fullContent: section.content,
        summary,
        compact: true,
        status: 'completed' as const,
      },
    });

    currentY += 100 + COMPACT_GAP; // ~80px card + gap
  }

  // Layout webpage sections horizontally (left to right)
  if (webpageSections.length > 0) {
    let webX = startX;
    const webY = textSections.length > 0 ? currentY + 60 : startY;
    const WEB_H_GAP = 40;
    let prevWebId: string | null = null;

    for (let i = 0; i < webpageSections.length; i++) {
      const section = webpageSections[i];
      const nodeId = genId();

      // Try to extract <title> for page name
      const titleMatch = section.content.match(/<title[^>]*>([^<]+)<\/title>/i);
      const pageName = titleMatch ? titleMatch[1] : section.heading;

      nodes.push({
        id: nodeId,
        type: 'webpage',
        position: { x: webX, y: webY },
        data: {
          label: pageName,
          content: section.content,
          html: section.content,
          pageName,
          pageIndex: i + 1,
        },
      });

      // Sequential edges between pages
      if (prevWebId) {
        edges.push({
          id: `e_${prevWebId}_${nodeId}`,
          source: prevWebId,
          target: nodeId,
          type: 'smoothstep',
          style: { strokeDasharray: '5,5' },
        });
      }

      prevWebId = nodeId;
      webX += 280 + WEB_H_GAP;
    }
  }

  // Connect prompt to first response node
  if (promptNodeId && nodes.length > 0) {
    edges.push({
      id: `e_${promptNodeId}_${nodes[0].id}`,
      source: promptNodeId,
      target: nodes[0].id,
      animated: true,
    });
  }

  // Connect consecutive text nodes
  const textNodes = nodes.filter(n => n.type !== 'webpage');
  for (let i = 0; i < textNodes.length - 1; i++) {
    edges.push({
      id: `e_${textNodes[i].id}_${textNodes[i + 1].id}`,
      source: textNodes[i].id,
      target: textNodes[i + 1].id,
    });
  }

  // Connect last text node to first webpage node if both exist
  if (textNodes.length > 0 && webpageSections.length > 0) {
    const webNodes = nodes.filter(n => n.type === 'webpage');
    if (webNodes.length > 0) {
      edges.push({
        id: `e_${textNodes[textNodes.length - 1].id}_${webNodes[0].id}`,
        source: textNodes[textNodes.length - 1].id,
        target: webNodes[0].id,
        style: { strokeDasharray: '5,5' },
      });
    }
  }

  return { nodes, edges };
}
