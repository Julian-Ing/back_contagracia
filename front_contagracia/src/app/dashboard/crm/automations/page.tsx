'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import {
  Zap,
  Mail,
  MessageCircle,
  FileText,
  Bell,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  CalendarPlus,
  Loader2,
  Power,
  CheckSquare,
  Clock,
  User,
  Users,
  Cake,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  useAutomations,
  OpportunityAutomation,
  ActivityAutomation,
  CreateOpportunityAutomationDto,
  CreateActivityAutomationDto,
} from '@/modules/crm/hooks/useAutomations';
import { useStages } from '@/modules/crm/hooks/useStages';
import { useForms } from '@/modules/crm/hooks/useForms';
import { useEmail } from '@/modules/crm/hooks/useEmail';
import toast from 'react-hot-toast';

// WhatsApp templates (TODO: conectar con backend cuando esté disponible)
const MOCK_WHATSAPP_TEMPLATES: { id: string; name: string }[] = [];

// ── Activity Types ──────────────────────────────────────────────────────────
const ACTIVITY_TYPES = [
  { value: 'CALL', label: 'Llamada' },
  { value: 'MEETING', label: 'Reunion' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'TASK', label: 'Tarea' },
  { value: 'NOTE', label: 'Nota' },
];

// ── Helper Components ──────────────────────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="mb-4 h-16 w-16 text-slate-300 dark:text-slate-600" />
      <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CrmAutomationsPage() {
  const [activeTab, setActiveTab] = useState('all');

  // Hooks
  const {
    opportunityAutomations,
    activityAutomations,
    formAutomations,
    loading,
    createOpportunityAutomation,
    updateOpportunityAutomation,
    toggleOpportunityAutomation,
    deleteOpportunityAutomation,
    createActivityAutomation,
    updateActivityAutomation,
    toggleActivityAutomation,
    deleteActivityAutomation,
    toggleFormAutomation,
    deleteFormAutomation,
  } = useAutomations();

  const { stages } = useStages();
  const { forms } = useForms();
  const { templates: _allEmailTemplates } = useEmail();
  const emailTemplates = _allEmailTemplates.filter((t) => t.type?.module_key === 'crm');

  // WhatsApp templates (TODO: implementar endpoint)
  const whatsappTemplates = MOCK_WHATSAPP_TEMPLATES;

  // ── Message automation form state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [msgForm, setMsgForm] = useState<CreateOpportunityAutomationDto>({
    trigger_stage_from: null,
    trigger_stage_to: '',
    action_type: 'email',
    email_template_id: '',
  });

  // ── Activity automation form state
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [actForm, setActForm] = useState<CreateActivityAutomationDto>({
    trigger_stage_from: null,
    trigger_stage_to: '',
    activity_type: 'TASK',
    activity_subject: '',
    activity_description: '',
    days_offset: 0,
    assigned_to_rule: 'same_as_owner',
  });

  // ── Helpers ─────────────────────────────────────────────────────────────
  const getStageName = (id: string | null) => {
    if (!id) return 'Cualquiera';
    return stages.find((s) => s.id === id)?.name ?? id;
  };

  const getFormName = (id: string) => forms.find((f) => f.id === id)?.name ?? id;

  const getActivityTypeLabel = (type: string) => {
    return ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;
  };

  // ── Message automation handlers ─────────────────────────────────────────
  const handleCreateMessage = async () => {
    if (!msgForm.trigger_stage_to) {
      toast.error('Selecciona una etapa de destino');
      return;
    }
    if (!msgForm.action_type) {
      toast.error('Selecciona un tipo de accion');
      return;
    }
    try {
      if (editingMessageId) {
        await updateOpportunityAutomation(editingMessageId, msgForm);
        setEditingMessageId(null);
      } else {
        await createOpportunityAutomation(msgForm);
      }
      setMsgForm({ trigger_stage_from: null, trigger_stage_to: '', action_type: 'email', email_template_id: '' });
    } catch {
      // Error handled in hook
    }
  };

  const handleEditMessage = (auto: OpportunityAutomation) => {
    setEditingMessageId(auto.id);
    setMsgForm({
      trigger_stage_from: auto.trigger_stage_from,
      trigger_stage_to: auto.trigger_stage_to,
      action_type: auto.action_type,
      email_template_id: auto.email_template_id ?? '',
      whatsapp_template_id: auto.whatsapp_template_id ?? undefined,
    });
    setActiveTab('messages');
  };

  const handleCancelEditMessage = () => {
    setEditingMessageId(null);
    setMsgForm({ trigger_stage_from: null, trigger_stage_to: '', action_type: 'email', email_template_id: '' });
  };

  // ── Activity automation handlers ────────────────────────────────────────
  const handleCreateActivity = async () => {
    if (!actForm.trigger_stage_to) {
      toast.error('Selecciona una etapa de destino');
      return;
    }
    if (!actForm.activity_subject) {
      toast.error('Ingresa un asunto para la actividad');
      return;
    }
    try {
      if (editingActivityId) {
        await updateActivityAutomation(editingActivityId, actForm);
        setEditingActivityId(null);
      } else {
        await createActivityAutomation(actForm);
      }
      setActForm({
        trigger_stage_from: null,
        trigger_stage_to: '',
        activity_type: 'TASK',
        activity_subject: '',
        activity_description: '',
        days_offset: 0,
        assigned_to_rule: 'same_as_owner',
      });
    } catch {
      // Error handled in hook
    }
  };

  const handleEditActivity = (auto: ActivityAutomation) => {
    setEditingActivityId(auto.id);
    setActForm({
      trigger_stage_from: auto.trigger_stage_from,
      trigger_stage_to: auto.trigger_stage_to,
      activity_type: auto.activity_type,
      activity_subject: auto.activity_subject,
      activity_description: auto.activity_description ?? '',
      days_offset: auto.days_offset,
      assigned_to_rule: auto.assigned_to_rule,
      assigned_to_user_id: auto.assigned_to_user_id ?? undefined,
    });
    setActiveTab('activities');
  };

  const handleCancelEditActivity = () => {
    setEditingActivityId(null);
    setActForm({
      trigger_stage_from: null,
      trigger_stage_to: '',
      activity_type: 'TASK',
      activity_subject: '',
      activity_description: '',
      days_offset: 0,
      assigned_to_rule: 'same_as_owner',
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Automatizaciones CRM
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Configura acciones automaticas para tus oportunidades
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="messages">Mensajes</TabsTrigger>
          <TabsTrigger value="activities">Actividades</TabsTrigger>
          <TabsTrigger value="forms">Formularios</TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Cake className="h-4 w-4" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="reminders">Recordatorios</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: TODAS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Todas las Automatizaciones
              </CardTitle>
              <CardDescription>
                Gestiona todas tus automatizaciones configuradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState />
              ) : opportunityAutomations.length === 0 &&
                activityAutomations.length === 0 &&
                formAutomations.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="Sin automatizaciones"
                  description="Crea tu primera automatizacion para mensajes, actividades o formularios"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Accion</TableHead>
                      <TableHead>Detalles</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Automatizaciones de Mensajes */}
                    {opportunityAutomations.map((auto) => (
                      <TableRow key={`msg-${auto.id}`}>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            <Mail className="mr-1 h-3 w-3" />
                            Mensaje
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getStageName(auto.trigger_stage_from)}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <Badge variant="outline" className="text-xs">
                              {getStageName(auto.trigger_stage_to)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {auto.action_type === 'email' ? (
                              <Mail className="h-4 w-4 text-blue-600" />
                            ) : (
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            )}
                            <span>{auto.action_type === 'email' ? 'Email' : 'WhatsApp'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {auto.email_template?.name ?? auto.whatsapp_template?.name ?? 'Sin plantilla'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleOpportunityAutomation(auto.id)}
                            className="flex items-center gap-2"
                          >
                            <Power className={cn('h-4 w-4', auto.is_active ? 'text-green-600' : 'text-slate-400')} />
                            {auto.is_active ? 'Activa' : 'Inactiva'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditMessage(auto)}>
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteOpportunityAutomation(auto.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Automatizaciones de Actividades */}
                    {activityAutomations.map((auto) => (
                      <TableRow key={`act-${auto.id}`}>
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            <CheckSquare className="mr-1 h-3 w-3" />
                            Actividad
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getStageName(auto.trigger_stage_from)}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <Badge variant="outline" className="text-xs">
                              {getStageName(auto.trigger_stage_to)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarPlus className="h-4 w-4 text-purple-600" />
                            <span>{getActivityTypeLabel(auto.activity_type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{auto.activity_subject}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              {auto.days_offset === 0 ? 'Inmediato' : `+${auto.days_offset}d`}
                              <span>·</span>
                              <User className="h-3 w-3" />
                              {auto.assigned_to_rule === 'same_as_owner' ? 'Propietario' : 'Usuario especifico'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActivityAutomation(auto.id)}
                            className="flex items-center gap-2"
                          >
                            <Power className={cn('h-4 w-4', auto.is_active ? 'text-green-600' : 'text-slate-400')} />
                            {auto.is_active ? 'Activa' : 'Inactiva'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditActivity(auto)}>
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteActivityAutomation(auto.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Automatizaciones de Formularios */}
                    {formAutomations.map((auto) => (
                      <TableRow key={`form-${auto.id}`}>
                        <TableCell>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                            <FileText className="mr-1 h-3 w-3" />
                            Formulario
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{auto.form?.name ?? getFormName(auto.form_id)}</span>
                            <div className="text-xs text-slate-500">Al enviar formulario</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            {auto.create_lead && <div>Crear Lead</div>}
                            {auto.create_opportunity && <div>Crear Oportunidad</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {auto.assignment_type === 'round_robin'
                              ? `${auto.round_robin_users?.length ?? 0} usuarios`
                              : 'Usuario especifico'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFormAutomation(auto.id)}
                            className="flex items-center gap-2"
                          >
                            <Power className={cn('h-4 w-4', auto.is_active ? 'text-green-600' : 'text-slate-400')} />
                            {auto.is_active ? 'Activa' : 'Inactiva'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => deleteFormAutomation(auto.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: MENSAJES
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="messages" className="space-y-6">
          {/* Formulario de creacion/edicion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {editingMessageId ? 'Editar Automatizacion de Mensaje' : 'Automatizaciones de Mensajes'}
              </CardTitle>
              <CardDescription>
                Envia emails o WhatsApp automaticos cuando una oportunidad cambie de etapa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Select
                    options={[
                      { value: '', label: 'Cualquier etapa' },
                      ...stages.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                    value={msgForm.trigger_stage_from ?? ''}
                    onChange={(v) => setMsgForm((p) => ({ ...p, trigger_stage_from: v || null }))}
                    placeholder="Etapa origen"
                  />
                </div>

                <div className="flex items-end justify-center pb-2">
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </div>

                <div className="space-y-2">
                  <Label>Hasta *</Label>
                  <Select
                    options={stages.map((s) => ({ value: s.id, label: s.name }))}
                    value={msgForm.trigger_stage_to}
                    onChange={(v) => setMsgForm((p) => ({ ...p, trigger_stage_to: v }))}
                    placeholder="Etapa destino"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Enviar</Label>
                  <Select
                    options={[
                      { value: 'email', label: 'Email' },
                      { value: 'whatsapp', label: 'WhatsApp' },
                    ]}
                    value={msgForm.action_type}
                    onChange={(v) =>
                      setMsgForm((p) => ({
                        ...p,
                        action_type: v as 'email' | 'whatsapp',
                        email_template_id: '',
                        whatsapp_template_id: undefined,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Plantilla (opcional)</Label>
                  <Select
                    options={[
                      { value: '', label: 'Sin plantilla' },
                      ...(msgForm.action_type === 'email' ? emailTemplates : whatsappTemplates).map((t) => ({ value: t.id, label: t.name })),
                    ]}
                    value={msgForm.action_type === 'email' ? msgForm.email_template_id ?? '' : msgForm.whatsapp_template_id ?? ''}
                    onChange={(v) =>
                      setMsgForm((p) =>
                        msgForm.action_type === 'email'
                          ? { ...p, email_template_id: v || undefined }
                          : { ...p, whatsapp_template_id: v || undefined }
                      )
                    }
                    placeholder="Seleccionar"
                  />
                  <p className="text-xs text-slate-500">Las plantillas se configuran desde el perfil de empresa</p>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                {editingMessageId && (
                  <Button variant="outline" onClick={handleCancelEditMessage}>
                    Cancelar
                  </Button>
                )}
                <Button onClick={handleCreateMessage}>
                  {editingMessageId ? 'Actualizar' : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Automatizacion
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de automatizaciones */}
          <Card>
            <CardHeader>
              <CardTitle>Automatizaciones de Mensajes Activas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState />
              ) : opportunityAutomations.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title="Sin automatizaciones de mensajes"
                  description="Crea una automatizacion para enviar emails o WhatsApp"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Plantilla</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunityAutomations.map((auto) => (
                      <TableRow key={auto.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getStageName(auto.trigger_stage_from)}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <Badge variant="outline" className="text-xs">
                              {getStageName(auto.trigger_stage_to)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {auto.action_type === 'email' ? (
                              <Mail className="h-4 w-4 text-blue-600" />
                            ) : (
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            )}
                            <span>{auto.action_type === 'email' ? 'Email' : 'WhatsApp'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {auto.email_template?.name ?? auto.whatsapp_template?.name ?? 'Sin plantilla'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleOpportunityAutomation(auto.id)}
                            className="flex items-center gap-2"
                          >
                            <Power className={cn('h-4 w-4', auto.is_active ? 'text-green-600' : 'text-slate-400')} />
                            {auto.is_active ? 'Activa' : 'Inactiva'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditMessage(auto)}>
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteOpportunityAutomation(auto.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: ACTIVIDADES
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="activities" className="space-y-6">
          {/* Formulario de creacion/edicion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                {editingActivityId ? 'Editar Automatizacion de Actividad' : 'Automatizaciones de Actividades'}
              </CardTitle>
              <CardDescription>
                Crea actividades automaticamente cuando una oportunidad cambie de etapa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Desde Etapa</Label>
                  <Select
                    options={[
                      { value: '', label: 'Cualquier etapa' },
                      ...stages.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                    value={actForm.trigger_stage_from ?? ''}
                    onChange={(v) => setActForm((p) => ({ ...p, trigger_stage_from: v || null }))}
                    placeholder="Etapa origen"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hasta Etapa *</Label>
                  <Select
                    options={stages.map((s) => ({ value: s.id, label: s.name }))}
                    value={actForm.trigger_stage_to}
                    onChange={(v) => setActForm((p) => ({ ...p, trigger_stage_to: v }))}
                    placeholder="Etapa destino"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Actividad</Label>
                  <Select
                    options={ACTIVITY_TYPES}
                    value={actForm.activity_type}
                    onChange={(v) => setActForm((p) => ({ ...p, activity_type: v }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dias despues</Label>
                  <Input
                    type="number"
                    min={0}
                    value={actForm.days_offset}
                    onChange={(e) => setActForm((p) => ({ ...p, days_offset: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Asunto de la actividad *</Label>
                  <Input
                    value={actForm.activity_subject}
                    onChange={(e) => setActForm((p) => ({ ...p, activity_subject: e.target.value }))}
                    placeholder="Ej: Llamada de seguimiento"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Asignar a</Label>
                  <Select
                    options={[
                      { value: 'same_as_owner', label: 'Propietario de la oportunidad' },
                      { value: 'specific_user', label: 'Usuario especifico' },
                    ]}
                    value={actForm.assigned_to_rule ?? 'same_as_owner'}
                    onChange={(v) => setActForm((p) => ({ ...p, assigned_to_rule: v as 'same_as_owner' | 'specific_user' }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripcion (opcional)</Label>
                <Textarea
                  value={actForm.activity_description ?? ''}
                  onChange={(e) => setActForm((p) => ({ ...p, activity_description: e.target.value }))}
                  placeholder="Descripcion de la actividad..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                {editingActivityId && (
                  <Button variant="outline" onClick={handleCancelEditActivity}>
                    Cancelar
                  </Button>
                )}
                <Button onClick={handleCreateActivity}>
                  {editingActivityId ? 'Actualizar' : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Automatizacion
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de automatizaciones */}
          <Card>
            <CardHeader>
              <CardTitle>Automatizaciones de Actividades Activas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState />
              ) : activityAutomations.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="Sin automatizaciones de actividades"
                  description="Crea una regla para generar actividades automaticamente"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Asunto</TableHead>
                      <TableHead>Asignacion</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityAutomations.map((auto) => (
                      <TableRow key={auto.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getStageName(auto.trigger_stage_from)}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <Badge variant="outline" className="text-xs">
                              {getStageName(auto.trigger_stage_to)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarPlus className="h-4 w-4 text-purple-600" />
                            <span>{getActivityTypeLabel(auto.activity_type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{auto.activity_subject}</div>
                            <div className="text-xs text-slate-500">
                              {auto.days_offset === 0 ? 'Inmediato' : `+${auto.days_offset} dias`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {auto.assigned_to_rule === 'same_as_owner' ? 'Propietario' : 'Usuario especifico'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActivityAutomation(auto.id)}
                            className="flex items-center gap-2"
                          >
                            <Power className={cn('h-4 w-4', auto.is_active ? 'text-green-600' : 'text-slate-400')} />
                            {auto.is_active ? 'Activa' : 'Inactiva'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditActivity(auto)}>
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteActivityAutomation(auto.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: FORMULARIOS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Automatizaciones de Formularios
              </CardTitle>
              <CardDescription>
                Configura acciones automaticas al recibir envios de formularios.
                Las automatizaciones se configuran directamente en cada formulario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState />
              ) : formAutomations.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Sin automatizaciones de formularios"
                  description="Las automatizaciones se crean desde la configuracion de cada formulario"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Formulario</TableHead>
                      <TableHead>Crear Lead</TableHead>
                      <TableHead>Crear Oportunidad</TableHead>
                      <TableHead>Asignacion</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formAutomations.map((auto) => (
                      <TableRow key={auto.id}>
                        <TableCell>
                          <span className="font-medium">{auto.form?.name ?? getFormName(auto.form_id)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={auto.create_lead ? 'default' : 'secondary'}>
                            {auto.create_lead ? 'Si' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={auto.create_opportunity ? 'default' : 'secondary'}>
                            {auto.create_opportunity ? 'Si' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            {auto.assignment_type === 'round_robin' ? (
                              <>
                                <Users className="h-4 w-4" />
                                Round Robin
                              </>
                            ) : (
                              <>
                                <User className="h-4 w-4" />
                                Usuario especifico
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFormAutomation(auto.id)}
                            className="flex items-center gap-2"
                          >
                            <Power className={cn('h-4 w-4', auto.is_active ? 'text-green-600' : 'text-slate-400')} />
                            {auto.is_active ? 'Activa' : 'Inactiva'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => deleteFormAutomation(auto.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: EVENTOS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-500" />
                Automatizaciones de Eventos
              </CardTitle>
              <CardDescription>
                Envia mensajes automaticos basados en eventos como cumpleanos, oportunidades ganadas/perdidas, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Cake}
                title="Proximamente"
                description="Las automatizaciones de eventos estaran disponibles pronto. Podras configurar mensajes para cumpleanos, fin de ano, oportunidades ganadas y mas."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: RECORDATORIOS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="reminders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                Recordatorios de Reuniones
              </CardTitle>
              <CardDescription>
                Sistema automatico de recordatorios por email antes de las reuniones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div>
                    <div className="font-medium">Sistema Activo</div>
                    <div className="text-sm text-slate-500">
                      Los recordatorios se envian automaticamente segun la configuracion
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
                  <User className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium">Enviar a asesor</div>
                    <div className="text-xs text-slate-500">Habilitado</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
                  <Users className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">Enviar a contacto</div>
                    <div className="text-xs text-slate-500">Habilitado</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
                  <Clock className="mt-0.5 h-5 w-5 text-purple-600" />
                  <div>
                    <div className="text-sm font-medium">Tiempo por defecto</div>
                    <div className="text-xs text-slate-500">1 hora antes</div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-500">
                Cuando se crea una actividad de tipo "Reunion" con fecha programada, el sistema
                enviara recordatorios por email al usuario asignado y al contacto (si tiene email).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
