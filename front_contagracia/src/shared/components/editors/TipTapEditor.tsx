'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Code2,
  RemoveFormatting,
  Lightbulb,
  Type,
  TextQuote,
  ListChecks,
  FileCode,
  Columns,
  AlertTriangle,
  Film,
  Youtube,
  FileImage,
  Table,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

const CONTENT_TEMPLATES = [
  {
    label: 'Artículo básico',
    icon: Type,
    html: `<h2>Título del artículo</h2><p>Escribe aquí la introducción de tu artículo. Explica de qué trata y por qué es relevante para el lector.</p><h3>Sección principal</h3><p>Desarrolla el contenido principal aquí. Puedes usar <strong>negrita</strong> para resaltar conceptos clave y <em>cursiva</em> para términos especiales.</p><h3>Conclusión</h3><p>Resume los puntos clave y ofrece una reflexión final.</p>`,
  },
  {
    label: 'Lista de pasos',
    icon: ListChecks,
    html: `<h2>Cómo hacer algo paso a paso</h2><p>Sigue estos pasos para completar el proceso:</p><ol><li><strong>Paso 1:</strong> Descripción del primer paso.</li><li><strong>Paso 2:</strong> Descripción del segundo paso.</li><li><strong>Paso 3:</strong> Descripción del tercer paso.</li></ol><blockquote><p>💡 <strong>Tip:</strong> Agrega aquí un consejo útil relacionado.</p></blockquote>`,
  },
  {
    label: 'Pros y contras',
    icon: Columns,
    html: `<h2>Comparativa: Ventajas y desventajas</h2><h3>✅ Ventajas</h3><ul><li>Primera ventaja importante</li><li>Segunda ventaja importante</li><li>Tercera ventaja importante</li></ul><h3>❌ Desventajas</h3><ul><li>Primera desventaja a considerar</li><li>Segunda desventaja a considerar</li></ul><h3>Veredicto</h3><p>Escribe tu conclusión aquí.</p>`,
  },
  {
    label: 'Nota informativa',
    icon: AlertTriangle,
    html: `<blockquote><p>⚠️ <strong>Importante:</strong> Escribe aquí una nota o advertencia relevante para el lector.</p></blockquote>`,
  },
  {
    label: 'Cita destacada',
    icon: TextQuote,
    html: `<blockquote><p>"Escribe aquí una cita inspiradora o relevante para tu artículo."</p><p>— <em>Autor de la cita</em></p></blockquote>`,
  },
  {
    label: 'Bloque de código',
    icon: FileCode,
    html: `<p>Ejemplo de código:</p><pre><code>// Tu código aquí\nconst ejemplo = "Hola mundo";\nconsole.log(ejemplo);</code></pre>`,
  },
];

function GuidesDropdown({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const insertTemplate = (html: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(html).run();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10 font-medium text-xs gap-1"
        onClick={() => setOpen(!open)}
        title="Insertar plantilla de contenido"
      >
        <Lightbulb className="h-4 w-4" />
        Guías
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
          <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Insertar plantilla</p>
          {CONTENT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              onClick={() => insertTemplate(tpl.html)}
            >
              <tpl.icon className="h-4 w-4 text-purple-500 shrink-0" />
              {tpl.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultimediaDropdown({ editor, onImageUpload }: { editor: any; onImageUpload?: (file: File) => Promise<string> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const insertVideo = () => {
    if (!editor) return;
    const url = window.prompt('URL del video (YouTube, Vimeo, etc.):');
    if (!url) return;
    // Insert as responsive iframe embed
    let embedUrl = url;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    editor.chain().focus().insertContent(
      `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:8px;margin:1rem 0"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`
    ).run();
    setOpen(false);
  };

  const insertImage = async () => {
    if (!editor) return;
    if (onImageUpload) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const url = await onImageUpload(file);
          editor.chain().focus().setImage({ src: url }).run();
        } catch {
          const url = window.prompt('URL de la imagen:');
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }
      };
      input.click();
    } else {
      const url = window.prompt('URL de la imagen:');
      if (url) editor.chain().focus().setImage({ src: url }).run();
    }
    setOpen(false);
  };

  const insertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertContent(
      `<table><thead><tr><th>Columna 1</th><th>Columna 2</th><th>Columna 3</th></tr></thead><tbody><tr><td>Dato 1</td><td>Dato 2</td><td>Dato 3</td></tr><tr><td>Dato 4</td><td>Dato 5</td><td>Dato 6</td></tr></tbody></table>`
    ).run();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Film className="h-4 w-4" />
        Multimedia
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
          <button type="button" className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700" onClick={insertImage}>
            <FileImage className="h-4 w-4 text-blue-500" />
            Insertar imagen
          </button>
          <button type="button" className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700" onClick={insertVideo}>
            <Youtube className="h-4 w-4 text-red-500" />
            Insertar video
          </button>
          <button type="button" className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700" onClick={insertTable}>
            <Table className="h-4 w-4 text-emerald-500" />
            Insertar tabla
          </button>
        </div>
      )}
    </div>
  );
}

function QuickBar({ editor, onImageUpload }: { editor: any; onImageUpload?: (file: File) => Promise<string> }) {
  if (!editor) return null;

  const qBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${active ? 'bg-purple-600 text-white' : 'bg-gray-800 dark:bg-slate-700 text-gray-200 hover:bg-gray-700 dark:hover:bg-slate-600'}`;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del enlace:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900/50">
      <div className="flex items-center gap-1.5">
        <button type="button" className={qBtn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita">
          B
        </button>
        <button type="button" className={`${qBtn(editor.isActive('italic'))} italic`} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva">
          I
        </button>
        <button type="button" className={qBtn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título">
          H2
        </button>
        <button type="button" className={qBtn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
          •
        </button>
        <button type="button" className={qBtn(editor.isActive('link'))} onClick={setLink} title="Enlace">
          <LinkIcon className="h-4 w-4" />
        </button>
      </div>
      <MultimediaDropdown editor={editor} onImageUpload={onImageUpload} />
    </div>
  );
}

function MenuBar({ editor, onImageUpload }: { editor: any; onImageUpload?: (file: File) => Promise<string> }) {
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del enlace:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(async () => {
    if (!editor) return;

    if (onImageUpload) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const url = await onImageUpload(file);
          editor.chain().focus().setImage({ src: url }).run();
        } catch {
          // fallback to URL prompt
          const url = window.prompt('URL de la imagen:');
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }
      };
      input.click();
    } else {
      const url = window.prompt('URL de la imagen:');
      if (url) editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor, onImageUpload]);

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `h-8 w-8 p-0 ${active ? 'bg-purple-600/20 text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('heading', { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título 1">
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título 2">
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Título 3">
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 self-center mx-1" />

      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita">
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva">
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('code'))} onClick={() => editor.chain().focus().toggleCode().run()} title="Código inline">
        <Code className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 self-center mx-1" />

      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Cita">
        <Quote className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('codeBlock'))} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Bloque de código">
        <Code2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Línea horizontal">
        <Minus className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 self-center mx-1" />

      <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive('link'))} onClick={setLink} title="Enlace">
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(false)} onClick={addImage} title="Imagen">
        <ImageIcon className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 self-center mx-1" />

      <Button type="button" variant="ghost" size="sm" className={btnClass(false)} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpiar formato">
        <RemoveFormatting className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(false)} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer">
        <Undo className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btnClass(false)} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer">
        <Redo className="h-4 w-4" />
      </Button>

      <div className="flex-1" />
      <GuidesDropdown editor={editor} />
    </div>
  );
}

export default function TipTapEditor({ content, onChange, placeholder = 'Escribe tu contenido aquí...', onImageUpload }: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[300px] p-4 focus:outline-none',
      },
    },
  });

  return (
    <div className="rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800">
      <QuickBar editor={editor} onImageUpload={onImageUpload} />
      <MenuBar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent editor={editor} />
    </div>
  );
}
