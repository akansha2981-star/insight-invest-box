import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Youtube from "@tiptap/extension-youtube";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Link as LinkIcon, ImageIcon, Undo, Redo, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Palette, Table as TableIcon, Youtube as YoutubeIcon,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  Plus, Trash2, ChevronDown,
  TableProperties, Rows3, Columns3
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  onClick, active, title, children, className = "",
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors text-sm ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}

function ToolbarDropdown({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon: React.ElementType }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={label}
        className="flex items-center gap-0.5 p-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Icon className="h-4 w-4" />
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-border rounded-lg shadow-lg p-1.5 min-w-[140px]" onClick={() => setOpen(false)}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Green", value: "#16a34a" },
  { label: "Blue", value: "#2563eb" },
  { label: "Purple", value: "#9333ea" },
  { label: "Pink", value: "#db2777" },
  { label: "Gray", value: "#6b7280" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
];

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing your article here…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Youtube.configure({ inline: false, width: 640, height: 360 }),
      Superscript,
      Subscript,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px] text-foreground leading-relaxed px-1",
      },
    },
  });

  const uploadImage = useCallback(async (file: File) => {
    if (!editor) return;
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: true });
    if (error) { alert("Image upload failed: " + error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("blog-images").getPublicUrl(data.path);
    editor.chain().focus().setImage({ src: publicUrl }).run();
  }, [editor]);

  const handleImageFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    e.target.value = "";
  }, [uploadImage]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter YouTube URL");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white">
      {/* Toolbar Row 1 */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/30">
        {/* History */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="h-4 w-4" /></ToolbarButton>
        <Divider />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1"><Heading1 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2"><Heading2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3"><Heading3 className="h-4 w-4" /></ToolbarButton>
        <Divider />

        {/* Inline formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><Strikethrough className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code"><Code className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} title="Superscript"><SuperscriptIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} title="Subscript"><SubscriptIcon className="h-4 w-4" /></ToolbarButton>
        <Divider />

        {/* Text Color */}
        <ToolbarDropdown label="Text Color" icon={Palette}>
          {TEXT_COLORS.map(c => (
            <button key={c.label} type="button"
              onClick={() => c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run()}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted text-left">
              <span className="w-3.5 h-3.5 rounded-full border border-border shrink-0" style={{ backgroundColor: c.value || '#000' }} />
              {c.label}
            </button>
          ))}
        </ToolbarDropdown>

        {/* Highlight */}
        <ToolbarDropdown label="Highlight" icon={Highlighter}>
          <button type="button"
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted text-left">
            <span className="w-3.5 h-3.5 rounded-full border border-border bg-white shrink-0" />
            None
          </button>
          {HIGHLIGHT_COLORS.map(c => (
            <button key={c.label} type="button"
              onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted text-left">
              <span className="w-3.5 h-3.5 rounded-full border border-border shrink-0" style={{ backgroundColor: c.value }} />
              {c.label}
            </button>
          ))}
        </ToolbarDropdown>
        <Divider />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left"><AlignLeft className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center"><AlignCenter className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right"><AlignRight className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify"><AlignJustify className="h-4 w-4" /></ToolbarButton>
        <Divider />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List"><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List"><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote"><Quote className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="h-4 w-4" /></ToolbarButton>
        <Divider />

        {/* Table */}
        <ToolbarDropdown label="Table" icon={TableIcon}>
          <button type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted text-left">
            <Plus className="h-3 w-3" /> Insert 3×3 Table
          </button>
          {editor.isActive("table") && (
            <>
              <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted text-left">
                <Columns3 className="h-3 w-3" /> Add Column
              </button>
              <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted text-left">
                <Rows3 className="h-3 w-3" /> Add Row
              </button>
              <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted text-left text-red-600">
                <Trash2 className="h-3 w-3" /> Delete Column
              </button>
              <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted text-left text-red-600">
                <Trash2 className="h-3 w-3" /> Delete Row
              </button>
              <button type="button" onClick={() => editor.chain().focus().deleteTable().run()}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted text-left text-red-600">
                <Trash2 className="h-3 w-3" /> Delete Table
              </button>
            </>
          )}
        </ToolbarDropdown>
        <Divider />

        {/* Link, Image, YouTube */}
        <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Insert Link"><LinkIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload Image"><ImageIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={addYoutube} title="Embed YouTube Video"><YoutubeIcon className="h-4 w-4" /></ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      </div>

      {/* Editor */}
      <div className="p-5">
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground) / 0.4);
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 { font-size: 1.875rem; font-weight: 900; margin: 1.25rem 0 0.5rem; line-height: 1.2; }
        .ProseMirror h2 { font-size: 1.5rem; font-weight: 800; margin: 1rem 0 0.5rem; line-height: 1.3; }
        .ProseMirror h3 { font-size: 1.25rem; font-weight: 700; margin: 0.875rem 0 0.375rem; }
        .ProseMirror p { margin: 0.5rem 0; line-height: 1.85; }
        .ProseMirror ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .ProseMirror ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .ProseMirror li { margin: 0.25rem 0; }
        .ProseMirror blockquote { border-left: 4px solid hsl(var(--primary) / 0.4); padding-left: 1rem; margin: 1rem 0; color: hsl(var(--muted-foreground)); font-style: italic; }
        .ProseMirror code { background: hsl(var(--muted)); padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875em; font-family: 'JetBrains Mono', monospace; }
        .ProseMirror pre { background: hsl(var(--muted)); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 0.75rem 0; }
        .ProseMirror hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1.5rem 0; }
        .ProseMirror img { max-width: 100%; border-radius: 0.75rem; margin: 1rem 0; border: 1px solid hsl(var(--border)); }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em { font-style: italic; }
        .ProseMirror s { text-decoration: line-through; }
        .ProseMirror mark { padding: 0.125rem 0.25rem; border-radius: 0.15rem; }
        .ProseMirror sup { font-size: 0.75em; vertical-align: super; }
        .ProseMirror sub { font-size: 0.75em; vertical-align: sub; }
        /* Table styles */
        .ProseMirror table { border-collapse: collapse; margin: 1rem 0; width: 100%; table-layout: fixed; overflow: hidden; }
        .ProseMirror td, .ProseMirror th { border: 1px solid hsl(var(--border)); padding: 0.5rem 0.75rem; vertical-align: top; min-width: 80px; position: relative; }
        .ProseMirror th { background: hsl(var(--muted)); font-weight: 700; font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.025em; }
        .ProseMirror td { font-size: 0.875rem; }
        .ProseMirror .selectedCell { background: hsl(var(--primary) / 0.08); }
        /* YouTube */
        .ProseMirror iframe { border-radius: 0.75rem; margin: 1rem 0; max-width: 100%; }
        div[data-youtube-video] { cursor: move; }
        div[data-youtube-video] iframe { pointer-events: none; }
      `}</style>
    </div>
  );
}
