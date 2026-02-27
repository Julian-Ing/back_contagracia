'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Minus,
  Undo,
  Redo,
  RemoveFormatting,
  Eye,
  Code2,
  Pencil,
  ChevronDown,
  ChevronRight,
  User,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  UserCheck,
  Home,
  Key,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

// ============================================
// Tipos
// ============================================

export interface VariableGroup {
  label: string;
  icon: React.ElementType;
  color: string;
  variables: { key: string; label: string }[];
}

interface EmailTemplateEditorProps {
  content: string;
  onChange: (html: string) => void;
  variableGroups?: VariableGroup[];
  placeholder?: string;
}

type EditorMode = 'visual' | 'html' | 'preview';

// ============================================
// Variables por defecto del CRM (basado en TemplateVariablesService)
// ============================================

export const CRM_VARIABLE_GROUPS: VariableGroup[] = [
  {
    label: 'Contacto',
    icon: User,
    color: 'bg-blue-500',
    variables: [
      { key: 'contact_name', label: 'Nombre completo' },
      { key: 'contact_first_name', label: 'Primer nombre' },
      { key: 'contact_email', label: 'Email' },
      { key: 'contact_phone', label: 'Teléfono' },
      { key: 'contact_whatsapp', label: 'WhatsApp' },
      { key: 'contact_company', label: 'Empresa del contacto' },
    ],
  },
  {
    label: 'Oportunidad',
    icon: Briefcase,
    color: 'bg-amber-500',
    variables: [
      { key: 'opportunity_name', label: 'Nombre' },
      { key: 'opportunity_value', label: 'Valor (formateado COP)' },
      { key: 'opportunity_value_raw', label: 'Valor (número)' },
      { key: 'opportunity_stage', label: 'Etapa actual' },
      { key: 'expected_close_date', label: 'Fecha cierre esperado' },
    ],
  },
  {
    label: 'Empresa',
    icon: Building2,
    color: 'bg-emerald-500',
    variables: [
      { key: 'company_name', label: 'Nombre' },
      { key: 'company_email', label: 'Email' },
      { key: 'company_phone', label: 'Teléfono' },
      { key: 'company_address', label: 'Dirección' },
      { key: 'company_website', label: 'Sitio web' },
    ],
  },
  {
    label: 'Fecha / Hora',
    icon: Calendar,
    color: 'bg-purple-500',
    variables: [
      { key: 'current_date', label: 'Fecha actual' },
      { key: 'current_time', label: 'Hora actual' },
      { key: 'current_year', label: 'Año' },
      { key: 'current_month', label: 'Mes (nombre)' },
      { key: 'current_day', label: 'Día (nombre)' },
    ],
  },
  {
    label: 'Reunión / Actividad',
    icon: CalendarClock,
    color: 'bg-rose-500',
    variables: [
      { key: 'meeting_subject', label: 'Asunto' },
      { key: 'meeting_description', label: 'Descripción' },
      { key: 'meeting_date', label: 'Fecha' },
      { key: 'meeting_time', label: 'Hora' },
      { key: 'reminder_time', label: 'Tiempo restante' },
    ],
  },
  {
    label: 'Asesor / Usuario',
    icon: UserCheck,
    color: 'bg-indigo-500',
    variables: [
      { key: 'owner_name', label: 'Nombre del asesor' },
      { key: 'assigned_user', label: 'Usuario asignado' },
    ],
  },
];

// ============================================
// Variables de PH (Propiedad Horizontal)
// ============================================

export const PH_VARIABLE_GROUPS: VariableGroup[] = [
  {
    label: 'Residente',
    icon: User,
    color: 'bg-teal-500',
    variables: [
      { key: 'recipient_name', label: 'Nombre completo' },
      { key: 'recipient_email', label: 'Email' },
      { key: 'recipient_role', label: 'Rol (Propietario / Arrendatario)' },
    ],
  },
  {
    label: 'Copropiedad',
    icon: Home,
    color: 'bg-orange-500',
    variables: [
      { key: 'condominium_name', label: 'Nombre de la copropiedad' },
    ],
  },
  {
    label: 'Unidad',
    icon: Key,
    color: 'bg-yellow-500',
    variables: [
      { key: 'unit_name', label: 'Nombre / número de unidad' },
    ],
  },
  {
    label: 'Empresa',
    icon: Building2,
    color: 'bg-emerald-500',
    variables: [
      { key: 'company_name', label: 'Nombre' },
      { key: 'company_email', label: 'Email' },
      { key: 'company_phone', label: 'Teléfono' },
      { key: 'company_address', label: 'Dirección' },
    ],
  },
  {
    label: 'Fecha / Hora',
    icon: Calendar,
    color: 'bg-purple-500',
    variables: [
      { key: 'current_date', label: 'Fecha actual' },
      { key: 'current_time', label: 'Hora actual' },
      { key: 'current_year', label: 'Año' },
      { key: 'current_month', label: 'Mes (nombre)' },
      { key: 'current_day', label: 'Día (nombre)' },
    ],
  },
];

// ============================================
// Toolbar simplificada para emails
// ============================================

function EmailToolbar({ editor }: { editor: any }) {
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

  if (!editor) return null;

  const btn = (active: boolean) =>
    `h-8 w-8 p-0 ${active ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita">
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva">
        <Italic className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 self-center mx-0.5" />

      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título">
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Subtítulo">
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 self-center mx-0.5" />

      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 self-center mx-0.5" />

      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('link'))} onClick={setLink} title="Enlace">
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Línea horizontal">
        <Minus className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 self-center mx-0.5" />

      <Button type="button" variant="ghost" size="sm" className={btn(false)} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpiar formato">
        <RemoveFormatting className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(false)} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer">
        <Undo className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(false)} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer">
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================
// Panel de Variables agrupadas
// ============================================

function VariablesPanel({
  groups,
  onInsert,
}: {
  groups: VariableGroup[];
  onInsert: (variable: string) => void;
}) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(groups[0]?.label || null);

  return (
    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        Clic en una variable para insertarla en el contenido:
      </p>
      <div className="space-y-1">
        {groups.map(group => {
          const Icon = group.icon;
          const isExpanded = expandedGroup === group.label;
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className={`p-1 ${group.color} rounded`}>
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <span>{group.label}</span>
                <span className="text-gray-400 ml-auto text-[10px]">{group.variables.length}</span>
                {isExpanded
                  ? <ChevronDown className="w-3 h-3 text-gray-400" />
                  : <ChevronRight className="w-3 h-3 text-gray-400" />
                }
              </button>
              {isExpanded && (
                <div className="flex flex-wrap gap-1.5 pl-8 pb-2 pt-1">
                  {group.variables.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => onInsert(v.key)}
                      className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-[11px] font-mono hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                      title={v.label}
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Componente Principal
// ============================================

export default function EmailTemplateEditor({
  content,
  onChange,
  variableGroups = CRM_VARIABLE_GROUPS,
  placeholder = 'Escribe el contenido de tu email...',
}: EmailTemplateEditorProps) {
  const [mode, setMode] = useState<EditorMode>('visual');
  const [htmlContent, setHtmlContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlContent(html);
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[250px] p-4 focus:outline-none',
      },
    },
  });

  // Cambiar de modo sincronizando contenido
  const switchMode = (newMode: EditorMode) => {
    if (newMode === mode) return;

    if (mode === 'visual' && editor) {
      const html = editor.getHTML();
      setHtmlContent(html);
    } else if (mode === 'html' && newMode === 'visual' && editor) {
      editor.commands.setContent(htmlContent);
      onChange(htmlContent);
    } else if (mode === 'html' && newMode === 'preview') {
      onChange(htmlContent);
    }

    setMode(newMode);
  };

  // Insertar variable en el editor activo
  const insertVariable = (variable: string) => {
    const tag = `{{${variable}}}`;

    if (mode === 'visual' && editor) {
      editor.chain().focus().insertContent(tag).run();
    } else if (mode === 'html' && textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = htmlContent.slice(0, start);
      const after = htmlContent.slice(end);
      const newContent = before + tag + after;
      setHtmlContent(newContent);
      onChange(newContent);
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + tag.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    }
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setHtmlContent(value);
    onChange(value);
  };

  const modeBtn = (m: EditorMode, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => switchMode(m)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        mode === m
          ? 'bg-emerald-600 text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      {/* Selector de modo */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
        {modeBtn('visual', 'Visual', <Pencil className="w-3.5 h-3.5" />)}
        {modeBtn('html', 'HTML', <Code2 className="w-3.5 h-3.5" />)}
        {modeBtn('preview', 'Vista Previa', <Eye className="w-3.5 h-3.5" />)}
      </div>

      {/* Toolbar (solo en modo visual) */}
      {mode === 'visual' && <EmailToolbar editor={editor} />}

      {/* Contenido */}
      {mode === 'visual' && (
        <EditorContent editor={editor} />
      )}

      {mode === 'html' && (
        <textarea
          ref={textareaRef}
          value={htmlContent}
          onChange={handleHtmlChange}
          className="w-full min-h-[250px] p-4 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none resize-y"
          placeholder="<p>Hola {{contact_name}},</p>"
        />
      )}

      {mode === 'preview' && (
        <div
          className="min-h-[250px] p-4 prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-gray-900"
          dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-gray-400">Sin contenido</p>' }}
        />
      )}

      {/* Variables agrupadas por categoría */}
      {mode !== 'preview' && variableGroups.length > 0 && (
        <VariablesPanel groups={variableGroups} onInsert={insertVariable} />
      )}
      {mode !== 'preview' && variableGroups.length === 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Selecciona un <span className="font-medium text-gray-500 dark:text-gray-400">Tipo de Plantilla</span> para ver las variables disponibles.
          </p>
        </div>
      )}
    </div>
  );
}
