/**
 * Converts TipTap JSON to a lightweight HTML string for previews.
 * It limits rendering to a maximum number of blocks to keep performance high.
 */
export function generateDocumentPreviewHTML(body: any, maxBlocks = 5): string {
  if (!body || typeof body !== "object" || !Array.isArray(body.content)) {
    return "";
  }

  const blocksToRender = body.content.slice(0, maxBlocks);
  let html = "";

  for (const block of blocksToRender) {
    html += renderBlock(block);
  }

  return html;
}

function renderBlock(block: any): string {
  if (!block || !block.type) return "";

  switch (block.type) {
    case "heading": {
      const level = block.attrs?.level || 1;
      const content = renderInlineContent(block.content);
      // Give headings some basic sizing
      const sizeClass = 
        level === 1 ? "text-xl font-bold mb-2" :
        level === 2 ? "text-lg font-semibold mb-2" :
        level === 3 ? "text-base font-semibold mb-1" : 
        "text-sm font-medium mb-1";
      return `<h${level} class="${sizeClass}">${content}</h${level}>`;
    }
    case "paragraph": {
      const content = renderInlineContent(block.content);
      if (!content.trim()) return ""; // Skip empty paragraphs
      return `<p class="text-xs mb-2 leading-relaxed">${content}</p>`;
    }
    case "bulletList":
    case "orderedList": {
      const isOrdered = block.type === "orderedList";
      const tag = isOrdered ? "ol" : "ul";
      const listClass = isOrdered ? "list-decimal ml-4 mb-2 text-xs" : "list-disc ml-4 mb-2 text-xs";
      let listHtml = `<${tag} class="${listClass}">`;
      
      if (Array.isArray(block.content)) {
        for (const item of block.content) {
          if (item.type === "listItem") {
            listHtml += `<li>${renderInlineContent(item.content)}</li>`;
          }
        }
      }
      listHtml += `</${tag}>`;
      return listHtml;
    }
    case "image": {
      const src = block.attrs?.src || "";
      if (!src) return "";
      return `<div class="mb-2 max-w-full overflow-hidden rounded border border-border bg-muted/20 flex justify-center"><img src="${src}" alt="preview" style="max-height: 80px; width: auto; object-fit: contain;" /></div>`;
    }
    case "table": {
      return `<div class="mb-2 text-[10px] italic border border-border p-2 bg-muted/10 rounded flex items-center justify-center">[Table content]</div>`;
    }
    case "blockquote": {
      return `<blockquote class="border-l-2 border-primary/50 pl-2 mb-2 italic text-xs">${renderInlineContent(block.content)}</blockquote>`;
    }
    default:
      // For any unknown block type, try to just extract text
      const content = renderInlineContent(block.content);
      if (content) {
        return `<div class="text-xs mb-2">${content}</div>`;
      }
      return "";
  }
}

function renderInlineContent(contentArray: any[]): string {
  if (!Array.isArray(contentArray)) return "";
  let html = "";

  for (const node of contentArray) {
    if (node.type === "text") {
      let text = escapeHtml(node.text || "");
      if (node.marks && Array.isArray(node.marks)) {
        for (const mark of node.marks) {
          if (mark.type === "bold") text = `<strong>${text}</strong>`;
          if (mark.type === "italic") text = `<em>${text}</em>`;
          if (mark.type === "underline") text = `<u>${text}</u>`;
          if (mark.type === "strike") text = `<s>${text}</s>`;
          if (mark.type === "textStyle" && mark.attrs?.color) {
            text = `<span style="color: ${mark.attrs.color}">${text}</span>`;
          }
        }
      }
      html += text;
    } else if (node.type === "hardBreak") {
      html += "<br />";
    } else if (node.content) {
      // Nested content like paragraphs inside list items
      html += renderInlineContent(node.content);
    }
  }

  return html;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Estimates word count from TipTap JSON
 */
export function estimateWordCount(body: any): number {
  if (!body || typeof body !== "object" || !Array.isArray(body.content)) {
    return 0;
  }
  
  let text = "";
  // Deep traverse for text nodes
  const traverse = (node: any) => {
    if (node.type === "text" && node.text) {
      text += node.text + " ";
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  };
  
  traverse(body);
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

export function estimateReadingTime(wordCount: number): string {
  const wpm = 200;
  const minutes = Math.ceil(wordCount / wpm);
  if (minutes < 1) return "< 1 min read";
  return `${minutes} min read`;
}
