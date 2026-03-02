// AI Response Parser — parses AI markdown response into visual canvas blocks

import {
  createResponseBlock,
  createResearchBlock,
  createSuggestionBlock,
  createContextLink,
  BLOCK_WIDTH,
} from './blockFactory';

type ParsedSection = {
  type: 'response' | 'research' | 'suggestion' | 'mermaid';
  heading: string;
  content: string;
};

const RESPONSE_BLOCK_WIDTH = 320;
const VERTICAL_GAP = 20;

function parseSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = text.split('\n');
  let currentType: ParsedSection['type'] = 'response';
  let currentHeading = '';
  let currentContent: string[] = [];
  let inMermaid = false;
  let mermaidContent: string[] = [];

  const flushCurrent = () => {
    const content = currentContent.join('\n').trim();
    if (content) {
      sections.push({ type: currentType, heading: currentHeading, content });
    }
    currentContent = [];
  };

  for (const line of lines) {
    // Mermaid code block detection
    if (line.trim().startsWith('```mermaid')) {
      flushCurrent();
      inMermaid = true;
      mermaidContent = [];
      continue;
    }
    if (inMermaid) {
      if (line.trim() === '```') {
        inMermaid = false;
        const mermaidCode = mermaidContent.join('\n').trim();
        if (mermaidCode) {
          sections.push({ type: 'mermaid', heading: 'Flow Diagram', content: mermaidCode });
        }
      } else {
        mermaidContent.push(line);
      }
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

  // Flush remaining
  flushCurrent();

  return sections;
}

function wrapText(text: string, maxCharsPerLine: number): string {
  const lines = text.split('\n');
  const wrapped: string[] = [];
  for (const line of lines) {
    if (line.length <= maxCharsPerLine) {
      wrapped.push(line);
    } else {
      const words = line.split(' ');
      let current = '';
      for (const word of words) {
        if (current.length + word.length + 1 > maxCharsPerLine) {
          if (current) wrapped.push(current);
          current = word;
        } else {
          current = current ? current + ' ' + word : word;
        }
      }
      if (current) wrapped.push(current);
    }
  }
  return wrapped.join('\n');
}

export type PlacedBlock = {
  blockId: string;
  groupId: string;
  elements: any[];
  totalHeight: number;
};

export function parseAndPlaceResponse(
  responseText: string,
  startX: number,
  startY: number,
  promptBlockId?: string,
): { blocks: PlacedBlock[]; mermaidSections: { content: string; x: number; y: number }[] } {
  const sections = parseSections(responseText);
  const blocks: PlacedBlock[] = [];
  const mermaidSections: { content: string; x: number; y: number }[] = [];
  let currentY = startY;

  for (const section of sections) {
    if (section.type === 'mermaid') {
      mermaidSections.push({ content: section.content, x: startX, y: currentY });
      currentY += 200 + VERTICAL_GAP; // Reserve space for mermaid diagram
      continue;
    }

    // Wrap long content to fit block width
    const wrapped = wrapText(section.content, 42);
    // Truncate very long content
    const displayContent = wrapped.length > 600 ? wrapped.slice(0, 600) + '\n...' : wrapped;

    let result;
    switch (section.type) {
      case 'research':
        result = createResearchBlock(startX, currentY, displayContent, RESPONSE_BLOCK_WIDTH);
        break;
      case 'suggestion':
        result = createSuggestionBlock(startX, currentY, displayContent, RESPONSE_BLOCK_WIDTH);
        break;
      default:
        result = createResponseBlock(startX, currentY, displayContent, RESPONSE_BLOCK_WIDTH);
        break;
    }

    blocks.push({
      blockId: result.blockId,
      groupId: result.groupId,
      elements: result.elements,
      totalHeight: result.totalHeight,
    });

    currentY += result.totalHeight + VERTICAL_GAP;
  }

  // If we have a prompt block, connect it to the first response block
  if (promptBlockId && blocks.length > 0) {
    const link = createContextLink(promptBlockId, blocks[0].blockId);
    blocks[0].elements.push(link.element);
  }

  // Connect consecutive blocks
  for (let i = 0; i < blocks.length - 1; i++) {
    const link = createContextLink(blocks[i].blockId, blocks[i + 1].blockId);
    blocks[i + 1].elements.push(link.element);
  }

  return { blocks, mermaidSections };
}
