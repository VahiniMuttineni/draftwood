import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { Underline } from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import ImageResize from "tiptap-extension-resize-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";
import { EditorToolbar } from "./EditorToolbar";
import { useEffect, useMemo } from "react";
import { FontSize } from "./extensions/FontSize";

interface RichTextEditorProps {
  content: string | object;
  onChange?: (content: string | object) => void;
  editable?: boolean;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, editable = true, placeholder = "Start writing here..." }: RichTextEditorProps) {
  const extensions = useMemo(() => [
    StarterKit.configure({
      // StarterKit v3 bundles link and underline — disable them here since
      // we register them manually below with custom config.
      link: false,
      underline: false,
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Underline,
    TextStyle,
    FontSize,
    Color,
    Highlight,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    // Note: Link is NOT part of StarterKit — the warning comes from ImageResize or another ext
    Link.configure({ openOnClick: false }),
    ImageResize.configure({ inline: true, allowBase64: true }),
    Placeholder.configure({ placeholder }),
    CharacterCount,
  ], [placeholder]);

  const editor = useEditor({
    extensions,
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        // Tiptap outputs JSON natively which maps perfectly to Drizzle's jsonb
        onChange(editor.getJSON());
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-6 bg-card text-card-foreground flow-root",
      },
    },
  });

  // Update editor content if prop changes externally (e.g., loaded from API)
  useEffect(() => {
    if (editor && content && !editor.isDestroyed) {
      // Only update if the content has changed significantly to avoid cursor jumping
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content) && typeof content !== 'string') {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const words = editor.storage.characterCount.words();
  const chars = editor.storage.characterCount.characters();
  const readingTime = Math.ceil(words / 200);

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-md border border-border shadow-sm">
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className="flex-1" />
      <div className="flex items-center justify-end gap-4 border-t border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        <span>{words} words</span>
        <span>{chars} characters</span>
        <span>~{readingTime} min read</span>
      </div>
    </div>
  );
}
