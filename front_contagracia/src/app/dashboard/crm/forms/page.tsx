'use client';

import { useState, useMemo, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Plus,
  MoreVertical,
  GripVertical,
  Trash2,
  Pencil,
  Eye,
  Code,
  Search,
  FileText,
  Send,
  Users,
  TrendingUp,
  FileEdit,
  UserCheck,
  ExternalLink,
  Copy,
  Link as LinkIcon,
  Check,
  QrCode,
  Download,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { CrmLeadForm } from '@/modules/crm/types';
import { useForms } from '@/modules/crm/hooks/useForms';
import { useCampaigns } from '@/modules/crm/hooks/useCampaigns';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';

// ---------- Types ----------

interface LocalField {
  id: string;
  field_name: string;
  field_type: string;
  is_required: boolean;
  position: number;
  options: string[];
  isBasic: boolean;
  label: string;        // display label
  placeholder: string;
}

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Teléfono' },
  { value: 'number', label: 'Número' },
  { value: 'textarea', label: 'Área de texto' },
  { value: 'select', label: 'Selección' },
  { value: 'checkbox', label: 'Casilla' },
];

const BASIC_FIELDS: Record<string, Omit<LocalField, 'id' | 'position'>> = {
  full_name: {
    field_name: 'full_name',
    field_type: 'text',
    label: 'Nombre completo',
    placeholder: 'Ej: Juan Pérez',
    is_required: true,
    isBasic: true,
    options: [],
  },
  email: {
    field_name: 'email',
    field_type: 'email',
    label: 'Correo electrónico',
    placeholder: 'correo@ejemplo.com',
    is_required: true,
    isBasic: true,
    options: [],
  },
  phone: {
    field_name: 'phone',
    field_type: 'tel',
    label: 'Teléfono',
    placeholder: '+57 300 123 4567',
    is_required: false,
    isBasic: true,
    options: [],
  },
  birth_date: {
    field_name: 'birth_date',
    field_type: 'date',
    label: 'Fecha de nacimiento',
    placeholder: '',
    is_required: false,
    isBasic: true,
    options: [],
  },
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------- Component ----------
export default function CrmFormsPage() {
  const { forms: apiForms, loading, create, update, remove, getOne, getSubmissions } = useForms();
  const { campaigns } = useCampaigns();
  const companyId = useAuthStore((s) => s.company?.id) || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSubmissions, setCurrentSubmissions] = useState<any[]>([]);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [subsDialogOpen, setSubsDialogOpen] = useState(false);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [formToToggle, setFormToToggle] = useState<CrmLeadForm | null>(null);
  const [formToEmbed, setFormToEmbed] = useState<CrmLeadForm | null>(null);
  const [editingForm, setEditingForm] = useState<CrmLeadForm | null>(null);
  const [saving, setSaving] = useState(false);

  // Embed modal state
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [iframeWidth, setIframeWidth] = useState('100%');
  const [iframeHeight, setIframeHeight] = useState('600');
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Form data
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCampaignId, setFormCampaignId] = useState('');
  const [formRedirectUrl, setFormRedirectUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formFields, setFormFields] = useState<LocalField[]>([]);

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const totalForms = apiForms.length;
    const activeForms = apiForms.filter((f) => f.is_active).length;
    const totalSubmissions = apiForms.reduce(
      (sum, f) => sum + (f._count?.submissions ?? f.submissions_count ?? 0),
      0,
    );
    // Use actual leads count from API (counts active leads only)
    const totalLeads = apiForms.reduce(
      (sum, f) => sum + (f.leads_count ?? 0),
      0,
    );
    const conversionRate = totalSubmissions > 0 ? (totalLeads / totalSubmissions) * 100 : 0;
    return { totalForms, activeForms, totalSubmissions, totalLeads, conversionRate };
  }, [apiForms]);

  // ---------- Filtered forms ----------
  const filteredForms = useMemo(() => {
    if (!searchQuery.trim()) return apiForms;
    const q = searchQuery.toLowerCase();
    return apiForms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.slug && f.slug.toLowerCase().includes(q)),
    );
  }, [apiForms, searchQuery]);

  // ---------- Dialog handlers ----------
  function resetFormData() {
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormCampaignId('');
    setFormRedirectUrl('');
    setFormIsActive(true);
    setFormFields([]);
  }

  function openCreate() {
    setEditingForm(null);
    resetFormData();
    setFormDialogOpen(true);
  }

  async function openEdit(formBasic: CrmLeadForm) {
    // Fetch full form with fields from API
    const form = await getOne(formBasic.id);
    if (!form) {
      toast.error('No se pudo cargar el formulario');
      return;
    }

    setEditingForm(form);
    setFormName(form.name);
    setFormSlug(form.slug || '');
    setFormDesc(form.description || '');
    setFormCampaignId(form.campaign_id || '');
    setFormRedirectUrl(form.redirect_url || '');
    setFormIsActive(form.is_active);
    setFormFields(
      (form.fields || []).map((f, idx) => {
        // options can be: { choices: [], label, placeholder } for selects
        // or: { label, placeholder } for other fields
        // or legacy: string[] for old selects
        const opts = f.options || {};
        const isSelectWithChoices = f.field_type === 'select' && opts.choices;
        const selectOptions = isSelectWithChoices
          ? opts.choices
          : Array.isArray(f.options)
            ? f.options
            : [];

        return {
          id: f.id || makeId(),
          field_name: f.field_name,
          field_type: f.field_type,
          is_required: f.is_required,
          position: f.position ?? idx,
          options: selectOptions,
          isBasic: ['full_name', 'email', 'phone', 'birth_date'].includes(f.field_name),
          label: opts.label || f.field_name,
          placeholder: opts.placeholder || '',
        };
      }),
    );
    setFormDialogOpen(true);
  }

  function handleNameChange(value: string) {
    setFormName(value);
    if (!editingForm) {
      setFormSlug(generateSlug(value));
    }
  }

  // ---------- Field management ----------
  function addBasicField(fieldType: string) {
    if (formFields.length >= 20) {
      toast.error('No puedes agregar más de 20 campos por formulario');
      return;
    }
    if (formFields.some((f) => f.field_name === fieldType)) {
      toast.error('Este campo básico ya fue agregado al formulario');
      return;
    }
    const basic = BASIC_FIELDS[fieldType];
    if (!basic) return;
    setFormFields((prev) => [
      ...prev,
      { ...basic, id: makeId(), position: prev.length },
    ]);
  }

  function addCustomField() {
    if (formFields.length >= 20) {
      toast.error('No puedes agregar más de 20 campos por formulario');
      return;
    }
    setFormFields((prev) => [
      ...prev,
      {
        id: makeId(),
        field_name: '',
        field_type: 'text',
        label: '',
        placeholder: '',
        is_required: false,
        isBasic: false,
        options: [],
        position: prev.length,
      },
    ]);
  }

  function updateField(id: string, patch: Partial<LocalField>) {
    setFormFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    setFormFields((prev) => prev.filter((f) => f.id !== id));
  }

  function addOption(fieldId: string) {
    setFormFields((prev) =>
      prev.map((f) =>
        f.id === fieldId ? { ...f, options: [...(f.options || []), ''] } : f,
      ),
    );
  }

  function updateOption(fieldId: string, optIdx: number, value: string) {
    setFormFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const newOpts = [...f.options];
        newOpts[optIdx] = value;
        return { ...f, options: newOpts };
      }),
    );
  }

  function removeOption(fieldId: string, optIdx: number) {
    setFormFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        return { ...f, options: f.options.filter((_, i) => i !== optIdx) };
      }),
    );
  }

  // ---------- Submit ----------
  async function saveForm() {
    if (!formName.trim() || !formSlug.trim()) {
      toast.error('El nombre y slug son requeridos');
      return;
    }
    if (formFields.length === 0) {
      toast.error('Debe agregar al menos un campo al formulario');
      return;
    }

    const invalidFields = formFields.filter((f) => !f.field_name.trim() || !f.label.trim());
    if (invalidFields.length > 0) {
      toast.error('Todos los campos deben tener nombre y etiqueta');
      return;
    }

    const selectsWithoutOptions = formFields.filter(
      (f) =>
        f.field_type === 'select' &&
        (!f.options || f.options.length < 2 || f.options.some((opt) => !opt.trim())),
    );
    if (selectsWithoutOptions.length > 0) {
      toast.error('Los campos tipo "Selección" deben tener al menos 2 opciones válidas');
      return;
    }

    const fieldNames = formFields.map((f) => f.field_name.trim().toLowerCase());
    const duplicates = fieldNames.filter((name, i) => fieldNames.indexOf(name) !== i);
    if (duplicates.length > 0) {
      toast.error(`Hay campos con nombres duplicados: ${[...new Set(duplicates)].join(', ')}`);
      return;
    }

    const hasBasic = formFields.some((f) =>
      ['full_name', 'email', 'phone', 'birth_date'].includes(f.field_name),
    );
    if (!hasBasic) {
      toast.error(
        'Debes agregar al menos un campo básico: Nombre Completo, Email, Teléfono o Fecha de Nacimiento',
      );
      return;
    }

    try {
      setSaving(true);
      // Backend only accepts: field_name, field_type, is_required, position, options
      // Store label/placeholder in options as metadata
      const apiFields = formFields.map((f, idx) => ({
        field_name: f.field_name,
        field_type: f.field_type,
        is_required: f.is_required,
        position: idx,
        options:
          f.field_type === 'select'
            ? { choices: f.options, label: f.label, placeholder: f.placeholder || null }
            : { label: f.label, placeholder: f.placeholder || null },
      }));

      const payload: any = {
        name: formName,
        slug: formSlug,
        description: formDesc || undefined,
        redirect_url: formRedirectUrl || undefined,
        campaign_id: formCampaignId || undefined,
        fields: apiFields,
      };

      if (editingForm) {
        // Only send is_active on update
        await update(editingForm.id, { ...payload, is_active: formIsActive });
      } else {
        await create(payload);
      }
      setFormDialogOpen(false);
    } catch {
      // Hook handles toasts
    } finally {
      setSaving(false);
    }
  }

  async function deleteForm(id: string) {
    try {
      await remove(id);
    } catch {
      // Hook handles toasts
    }
  }

  function openToggleConfirm(form: CrmLeadForm) {
    setFormToToggle(form);
    setToggleConfirmOpen(true);
  }

  async function confirmToggleActive() {
    if (!formToToggle) return;
    try {
      await update(formToToggle.id, { is_active: !formToToggle.is_active } as any);
      setToggleConfirmOpen(false);
      setFormToToggle(null);
    } catch {
      // Hook handles toasts
    }
  }

  // ---------- Embed/URL handlers ----------
  function getFormUrl(form: CrmLeadForm) {
    return `${window.location.origin}/forms/${companyId}/${form.slug || form.id}`;
  }

  function getEmbedUrl(form: CrmLeadForm) {
    return `${window.location.origin}/forms/${companyId}/${form.slug || form.id}/embed`;
  }

  function openFormInNewTab(form: CrmLeadForm) {
    window.open(getFormUrl(form), '_blank');
  }

  function copyFormUrl(form: CrmLeadForm) {
    navigator.clipboard.writeText(getFormUrl(form));
    toast.success('URL copiada al portapapeles');
  }

  function openEmbedModal(form: CrmLeadForm) {
    setFormToEmbed(form);
    setIframeWidth('100%');
    setIframeHeight('600');
    setShowQR(false);
    setCopiedTab(null);
    setEmbedDialogOpen(true);
  }

  function copyEmbedCode(code: string, tab: string) {
    navigator.clipboard.writeText(code);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
    toast.success('Código copiado al portapapeles');
  }

  function downloadQR() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas && formToEmbed) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qr-${formToEmbed.name.replace(/\s+/g, '-')}.png`;
      link.href = url;
      link.click();
      toast.success('Código QR descargado');
    }
  }

  async function copyQRToClipboard() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          const item = new ClipboardItem({ 'image/png': blob });
          navigator.clipboard.write([item]).then(() => {
            toast.success('Código QR copiado al portapapeles');
          });
        }
      });
    }
  }

  async function openSubmissions(formId: string) {
    setSubsDialogOpen(true);
    try {
      const subs = await getSubmissions(formId);
      setCurrentSubmissions(subs);
    } catch {
      setCurrentSubmissions([]);
    }
  }

  const subsColumns =
    currentSubmissions.length > 0 ? Object.keys(currentSubmissions[0].data || {}) : [];

  // Campaign options for select
  const campaignOptions = [
    { value: '', label: 'Sin campaña' },
    ...campaigns.map((c) => ({ value: c.id, label: c.name })),
  ];

  // ---------- Form Dialog ----------
  function renderFormDialog() {
    return (
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {editingForm ? 'Editar Formulario' : 'Nuevo Formulario'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {editingForm
                ? 'Modifica la configuración del formulario web.'
                : 'Crea un formulario público para capturar leads automáticamente.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Información básica
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    Nombre del Formulario *
                  </Label>
                  <Input
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ej: Formulario de Contacto"
                    className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">URL del formulario</Label>
                  <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-md">
                    <p className="text-sm font-mono text-gray-500 dark:text-gray-400 break-all">
                      {window.location.origin}/forms/{formSlug || '...'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    La URL se genera automáticamente desde el nombre del formulario
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Descripción</Label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Descripción interna del formulario..."
                  rows={2}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Campaña Asociada</Label>
                  <Select
                    options={campaignOptions}
                    value={formCampaignId}
                    onChange={(v) => setFormCampaignId(v)}
                    placeholder="Sin campaña"
                  />
                </div>

                <div className="space-y-2 flex items-end">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formIsActive}
                      onCheckedChange={(checked) => setFormIsActive(checked)}
                    />
                    <Label className="text-gray-700 dark:text-gray-300">Formulario activo</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Campos del formulario */}
            <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-gray-900 dark:text-white">
                      Campos del Formulario
                    </CardTitle>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formFields.length}/20 campos
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          disabled={formFields.length >= 20}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Agregar Campo Básico
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                      >
                        <DropdownMenuItem
                          onClick={() => addBasicField('full_name')}
                          disabled={formFields.some((f) => f.field_name === 'full_name')}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          Nombre Completo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => addBasicField('email')}
                          disabled={formFields.some((f) => f.field_name === 'email')}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          Email
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => addBasicField('phone')}
                          disabled={formFields.some((f) => f.field_name === 'phone')}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          Teléfono
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => addBasicField('birth_date')}
                          disabled={formFields.some((f) => f.field_name === 'birth_date')}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          Fecha de Nacimiento
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomField}
                      disabled={formFields.length >= 20}
                      className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Campo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {formFields.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
                      No hay campos agregados.
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Usa <strong>&quot;Agregar Campo Básico&quot;</strong> para agregar Nombre, Email
                      o Teléfono,
                      <br />o <strong>&quot;Agregar Campo&quot;</strong> para campos personalizados.
                    </p>
                  </div>
                ) : (
                  formFields.map((field) => (
                    <Card
                      key={field.id}
                      className="p-4 bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700"
                    >
                      <div className="flex items-start gap-4">
                        <GripVertical className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-2 cursor-grab" />

                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300">
                              Nombre del Campo *
                              {field.isBasic && (
                                <Badge
                                  className="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                >
                                  Básico
                                </Badge>
                              )}
                            </Label>
                            <Input
                              value={field.field_name}
                              onChange={(e) =>
                                updateField(field.id, { field_name: e.target.value })
                              }
                              placeholder="ej: nombre_empresa"
                              disabled={field.isBasic}
                              className={cn(
                                'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white',
                                field.isBasic && 'bg-gray-100 dark:bg-slate-800 cursor-not-allowed',
                              )}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300">Tipo *</Label>
                            <Select
                              options={FIELD_TYPE_OPTIONS}
                              value={field.field_type}
                              onChange={(v) => updateField(field.id, { field_type: v })}
                              disabled={field.isBasic}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300">Etiqueta</Label>
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                updateField(field.id, { label: e.target.value })
                              }
                              placeholder="Ej: Nombre de tu empresa"
                              className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300">Placeholder</Label>
                            <Input
                              value={field.placeholder || ''}
                              onChange={(e) =>
                                updateField(field.id, { placeholder: e.target.value })
                              }
                              placeholder="Texto de ejemplo..."
                              className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={field.is_required}
                              onCheckedChange={(checked) =>
                                updateField(field.id, { is_required: checked })
                              }
                            />
                            <Label className="text-gray-700 dark:text-gray-300">
                              Campo requerido
                            </Label>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(field.id)}
                          className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Options for select fields */}
                      {field.field_type === 'select' && (
                        <div className="mt-4 ml-9 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Opciones del Select
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(field.id)}
                              className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Agregar Opción
                            </Button>
                          </div>
                          {field.options && field.options.length > 0 ? (
                            <div className="space-y-2">
                              {field.options.map((option, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <Input
                                    value={option}
                                    onChange={(e) =>
                                      updateOption(field.id, optIdx, e.target.value)
                                    }
                                    placeholder={`Opción ${optIdx + 1}`}
                                    className="flex-1 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeOption(field.id, optIdx)}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              No hay opciones. Haz clic en &quot;Agregar Opción&quot; para comenzar.
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Después del envío */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Después del envío
              </h3>

              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">
                  URL de Redirección (Opcional)
                </Label>
                <Input
                  type="url"
                  value={formRedirectUrl}
                  onChange={(e) => setFormRedirectUrl(e.target.value)}
                  placeholder="https://ejemplo.com/gracias"
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Si se especifica, redirigirá a esta URL después del envío del formulario
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setFormDialogOpen(false)}
              disabled={saving}
              className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300"
            >
              Cancelar
            </Button>
            <Button onClick={saveForm} disabled={saving}>
              {saving
                ? editingForm
                  ? 'Guardando...'
                  : 'Creando...'
                : editingForm
                  ? 'Guardar Cambios'
                  : 'Crear Formulario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ---------- Main render ----------
  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Formularios Web</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">
          Crea formularios públicos para capturar leads automáticamente
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Formularios
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalForms}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {stats.activeForms} activos
                </p>
              </div>
              <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Envíos Totales
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalSubmissions}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Formularios enviados
                </p>
              </div>
              <Send className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Leads Creados
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalLeads}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Leads válidos generados
                </p>
              </div>
              <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tasa Conversión
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.conversionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Promedio general</p>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Button row */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Buscar formularios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
          />
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Formulario
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                    Nombre
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                    Campaña
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                    Envíos
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                    Leads
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                    Conversión
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                    Estado
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-12 text-gray-400 dark:text-gray-500"
                    >
                      <p className="font-medium">Cargando...</p>
                    </td>
                  </tr>
                ) : filteredForms.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-12 text-gray-400 dark:text-gray-500"
                    >
                      <FileEdit className="h-10 w-10 mx-auto mb-3" />
                      <p className="font-medium">No se encontraron formularios</p>
                    </td>
                  </tr>
                ) : (
                  filteredForms.map((form) => {
                    const subs = form._count?.submissions ?? form.submissions_count ?? 0;
                    // Use actual leads count from API (counts active leads only)
                    const leads = form.leads_count ?? 0;
                    const convRate = subs > 0 ? ((leads / subs) * 100).toFixed(1) : '0.0';
                    const campaignName = campaigns.find(
                      (c) => c.id === form.campaign_id,
                    )?.name;
                    return (
                      <tr
                        key={form.id}
                        className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                          {form.name}
                        </td>
                        <td className="py-3 px-4">
                          {campaignName ? (
                            <Badge className="text-xs bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                              {campaignName}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                          {subs}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                          {leads}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {convRate}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            className={cn(
                              'text-xs font-medium',
                              form.is_active
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                            )}
                          >
                            {form.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 dark:text-gray-400"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                            >
                              <DropdownMenuItem
                                onClick={() => openFormInNewTab(form)}
                                className="text-gray-700 dark:text-gray-300"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver formulario
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => copyFormUrl(form)}
                                className="text-gray-700 dark:text-gray-300"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar URL
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEmbedModal(form)}
                                className="text-gray-700 dark:text-gray-300"
                              >
                                <Code className="mr-2 h-4 w-4" />
                                Obtener código
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openSubmissions(form.id)}
                                className="text-gray-700 dark:text-gray-300"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver envíos
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEdit(form)}
                                className="text-gray-700 dark:text-gray-300"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openToggleConfirm(form)}
                                className="text-gray-700 dark:text-gray-300"
                              >
                                <Send className="mr-2 h-4 w-4" />
                                {form.is_active ? 'Desactivar' : 'Activar'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteForm(form.id)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {renderFormDialog()}

      {/* Submissions Dialog */}
      <Dialog open={subsDialogOpen} onOpenChange={setSubsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Envíos del formulario
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Historial de respuestas recibidas.
            </DialogDescription>
          </DialogHeader>

          {currentSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <FileEdit className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">Sin envíos todavía</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                      Fecha
                    </th>
                    {subsColumns.map((col) => (
                      <th
                        key={col}
                        className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentSubmissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-gray-100 dark:border-slate-800"
                    >
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                        {sub.created_at
                          ? new Date(sub.created_at).toLocaleDateString()
                          : '-'}
                      </td>
                      {subsColumns.map((col) => (
                        <td
                          key={col}
                          className="py-2 px-3 text-gray-900 dark:text-gray-200"
                        >
                          {sub.data[col] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Toggle Active Confirmation Dialog */}
      <Dialog open={toggleConfirmOpen} onOpenChange={setToggleConfirmOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {formToToggle?.is_active ? 'Desactivar formulario' : 'Activar formulario'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {formToToggle?.is_active
                ? `¿Estás seguro de que deseas desactivar el formulario "${formToToggle?.name}"? Los usuarios no podrán enviar respuestas mientras esté inactivo.`
                : `¿Estás seguro de que deseas activar el formulario "${formToToggle?.name}"? Los usuarios podrán enviar respuestas nuevamente.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setToggleConfirmOpen(false);
                setFormToToggle(null);
              }}
              className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmToggleActive}
              variant={formToToggle?.is_active ? 'destructive' : 'default'}
            >
              {formToToggle?.is_active ? 'Desactivar' : 'Activar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Código para Embeber Formulario
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Copia el código y pégalo en tu sitio web, landing page o aplicación
            </DialogDescription>
          </DialogHeader>

          {formToEmbed && (
            <Tabs defaultValue="iframe" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-slate-800">
                <TabsTrigger value="iframe" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <Code className="h-4 w-4 mr-2" />
                  Iframe
                </TabsTrigger>
                <TabsTrigger value="js" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <FileText className="h-4 w-4 mr-2" />
                  Popup JS
                </TabsTrigger>
                <TabsTrigger value="link" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link Directo
                </TabsTrigger>
              </TabsList>

              {/* Tab: Iframe */}
              <TabsContent value="iframe" className="space-y-4 mt-4">
                <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
                  <CardContent className="py-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>Iframe:</strong> Incrusta el formulario directamente en tu página. Ideal para landings y páginas informativas.
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Ancho</Label>
                    <Input
                      value={iframeWidth}
                      onChange={(e) => setIframeWidth(e.target.value)}
                      placeholder="100%"
                      className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600"
                    />
                    <p className="text-xs text-gray-400">Ej: 100%, 800px, 50vw</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Alto (px)</Label>
                    <Input
                      type="number"
                      value={iframeHeight}
                      onChange={(e) => setIframeHeight(e.target.value)}
                      placeholder="600"
                      className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600"
                    />
                    <p className="text-xs text-gray-400">Altura en píxeles</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">HTML</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyEmbedCode(
                        `<iframe\n  src="${getEmbedUrl(formToEmbed)}"\n  width="${iframeWidth}"\n  height="${iframeHeight}px"\n  frameborder="0"\n  style="border: none; border-radius: 8px;"\n  title="${formToEmbed.name}"\n></iframe>`,
                        'iframe'
                      )}
                      className="h-8 border-gray-200 dark:border-slate-600"
                    >
                      {copiedTab === 'iframe' ? (
                        <Check className="h-3 w-3 mr-1 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedTab === 'iframe' ? 'Copiado' : 'Copiar'}
                    </Button>
                  </div>
                  <pre className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-xs whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                    <code>{`<iframe
  src="${getEmbedUrl(formToEmbed)}"
  width="${iframeWidth}"
  height="${iframeHeight}px"
  frameborder="0"
  style="border: none; border-radius: 8px;"
  title="${formToEmbed.name}"
></iframe>`}</code>
                  </pre>
                </div>

              </TabsContent>

              {/* Tab: JavaScript Popup */}
              <TabsContent value="js" className="space-y-4 mt-4">
                <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/30">
                  <CardContent className="py-3">
                    <p className="text-xs text-purple-800 dark:text-purple-200">
                      <strong>Popup JS:</strong> Crea un botón que abre el formulario en un modal emergente. Mejor UX y no ocupa espacio permanente.
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">HTML + JavaScript</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyEmbedCode(
                        `<!-- Botón para abrir el formulario -->
<button id="contagracia-form-btn" style="
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
">
  ${formToEmbed.name}
</button>

<!-- Script del formulario -->
<script>
(function() {
  var btn = document.getElementById('contagracia-form-btn');
  var modal = null;

  btn.addEventListener('click', function() {
    if (!modal) {
      // Crear modal
      modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

      var iframe = document.createElement('iframe');
      iframe.src = '${getEmbedUrl(formToEmbed)}';
      iframe.style.cssText = 'width:90%;max-width:800px;height:90%;max-height:800px;border:none;border-radius:12px;background:white;';

      var closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;background:white;border:none;font-size:32px;width:40px;height:40px;border-radius:50%;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
      closeBtn.onclick = function() { modal.style.display = 'none'; };

      modal.appendChild(iframe);
      modal.appendChild(closeBtn);
      document.body.appendChild(modal);

      // Cerrar al hacer clic fuera
      modal.onclick = function(e) {
        if (e.target === modal) modal.style.display = 'none';
      };
    }

    modal.style.display = 'flex';
  });
})();
</script>`,
                        'js'
                      )}
                      className="h-8 border-gray-200 dark:border-slate-600"
                    >
                      {copiedTab === 'js' ? (
                        <Check className="h-3 w-3 mr-1 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedTab === 'js' ? 'Copiado' : 'Copiar'}
                    </Button>
                  </div>
                  <pre className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-xs whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 max-h-80 overflow-y-auto">
                    <code>{`<!-- Botón para abrir el formulario -->
<button id="contagracia-form-btn" style="
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
">
  ${formToEmbed.name}
</button>

<!-- Script del formulario -->
<script>
(function() {
  var btn = document.getElementById('contagracia-form-btn');
  var modal = null;

  btn.addEventListener('click', function() {
    if (!modal) {
      // Crear modal
      modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

      var iframe = document.createElement('iframe');
      iframe.src = '${getEmbedUrl(formToEmbed)}';
      iframe.style.cssText = 'width:90%;max-width:800px;height:90%;max-height:800px;border:none;border-radius:12px;background:white;';

      var closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;background:white;border:none;font-size:32px;width:40px;height:40px;border-radius:50%;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
      closeBtn.onclick = function() { modal.style.display = 'none'; };

      modal.appendChild(iframe);
      modal.appendChild(closeBtn);
      document.body.appendChild(modal);

      // Cerrar al hacer clic fuera
      modal.onclick = function(e) {
        if (e.target === modal) modal.style.display = 'none';
      };
    }

    modal.style.display = 'flex';
  });
})();
</script>`}</code>
                  </pre>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Personaliza el botón editando el estilo CSS en el código copiado
                  </p>
                </div>
              </TabsContent>

              {/* Tab: Link Directo */}
              <TabsContent value="link" className="space-y-4 mt-4">
                <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
                  <CardContent className="py-3">
                    <p className="text-xs text-green-800 dark:text-green-200">
                      <strong>Link Directo:</strong> URL pública del formulario. Úsalo en emails, redes sociales, QR codes, etc.
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">URL del Formulario</Label>
                  <div className="flex gap-2">
                    <Input
                      value={getFormUrl(formToEmbed)}
                      readOnly
                      className="font-mono text-sm bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600"
                    />
                    <Button
                      variant="outline"
                      onClick={() => copyEmbedCode(getFormUrl(formToEmbed), 'link')}
                      className="border-gray-200 dark:border-slate-600"
                    >
                      {copiedTab === 'link' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openFormInNewTab(formToEmbed)}
                      className="border-gray-200 dark:border-slate-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Usos recomendados:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                      <CardContent className="py-3 px-4">
                        <p className="text-xs font-medium mb-1 text-gray-900 dark:text-white">Emails</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Agrega como botón o link en campañas de email marketing
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                      <CardContent className="py-3 px-4">
                        <p className="text-xs font-medium mb-1 text-gray-900 dark:text-white">Redes Sociales</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Comparte en bio de Instagram, Twitter, LinkedIn, etc.
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                      <CardContent className="py-3 px-4">
                        <p className="text-xs font-medium mb-1 text-gray-900 dark:text-white">Código QR</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Genera QR code con esta URL para eventos físicos
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                      <CardContent className="py-3 px-4">
                        <p className="text-xs font-medium mb-1 text-gray-900 dark:text-white">WhatsApp</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Envía directamente en mensajes de WhatsApp Business
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* QR Code Section */}
                <Card className="bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Código QR
                      </Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowQR(!showQR)}
                        className="border-gray-200 dark:border-slate-600"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        {showQR ? 'Ocultar QR' : 'Generar QR'}
                      </Button>
                    </div>

                    {showQR && (
                      <div className="space-y-3">
                        <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                          <div ref={qrRef} className="bg-white p-4 rounded-lg">
                            <QRCodeCanvas
                              value={getFormUrl(formToEmbed)}
                              size={200}
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={copyQRToClipboard}
                              className="border-gray-200 dark:border-slate-600"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar QR
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={downloadQR}
                              className="border-gray-200 dark:border-slate-600"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Descargar QR
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          Escanea este código QR para acceder directamente al formulario
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEmbedDialogOpen(false);
                setFormToEmbed(null);
              }}
              className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
