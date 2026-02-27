'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/modules/auth';
import { useEmail } from '@/modules/crm/hooks/useEmail';
import { integrationsClient } from '@/shared/services/api/apiClient';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Mail,
  MessageSquare,
  CreditCard,
  Calendar,
  Bell,
  ShoppingCart,
  Shield,
  ChevronDown,
  ChevronUp,
  Save,
  Plus,
  Pencil,
  Trash2,
  Send,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { EmailTemplate, EmailTemplateType } from '@/modules/crm/types';
import { CRM_VARIABLE_GROUPS, PH_VARIABLE_GROUPS } from '@/shared/components/editors/EmailTemplateEditor';

const EmailTemplateEditor = dynamic(
  () => import('@/shared/components/editors/EmailTemplateEditor'),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-gray-400">Cargando editor...</div> }
);

// ============================================
// ExpandableSection
// ============================================

interface ExpandableSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function ExpandableSection({
  title,
  description,
  icon: Icon,
  iconBg,
  expanded,
  onToggle,
  badge,
  children,
}: ExpandableSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 ${iconBg} rounded-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
              {badge}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// Tipos
// ============================================

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_name: string;
}

// ============================================
// IntegrationsTab
// ============================================

export function IntegrationsTab() {
  const { company: authCompany } = useAuth();

  // Secciones expandibles
  const [pilaExpanded, setPilaExpanded] = useState(false);
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [twilioExpanded, setTwilioExpanded] = useState(false);
  const [epaycoExpanded, setEpaycoExpanded] = useState(false);
  const [boldExpanded, setBoldExpanded] = useState(false);
  const [wompiExpanded, setWompiExpanded] = useState(false);
  const [calExpanded, setCalExpanded] = useState(false);
  const [ecommerceExpanded, setEcommerceExpanded] = useState(false);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);

  // Config de Email
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_name: '',
  });
  const [emailConfigLoading, setEmailConfigLoading] = useState(false);
  const [customSmtpHost, setCustomSmtpHost] = useState(false);
  const [customSmtpPort, setCustomSmtpPort] = useState(false);
  const [hasPasswordConfigured, setHasPasswordConfigured] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Plantillas de Email
  const {
    templates, types, loading: templatesLoading,
    createTemplate, updateTemplate, removeTemplate,
    createType, updateType, removeType,
  } = useEmail();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body_html: '',
    type_id: '' as string,
  });

  // Tipos de Plantilla
  const [typesExpanded, setTypesExpanded] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<EmailTemplateType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', module_key: '', description: '' });

  // ============================================
  // Cargar config de email
  // ============================================

  useEffect(() => {
    if (authCompany?.id) {
      loadEmailConfig();
    }
  }, [authCompany?.id]);

  const loadEmailConfig = async () => {
    if (!authCompany?.id) return;
    try {
      const response = await integrationsClient.get('/email-config');
      if (response.data) {
        setEmailConfig({
          smtp_host: response.data.smtp_host || '',
          smtp_port: response.data.smtp_port || 587,
          smtp_user: response.data.smtp_user || '',
          smtp_password: '',
          from_name: response.data.from_name || '',
        });
        const isConfigured = !!(response.data.smtp_host && response.data.smtp_user && response.data.from_name);
        setHasPasswordConfigured(isConfigured);

        const knownHosts = ['smtp.gmail.com', 'smtp.office365.com', 'smtp-mail.outlook.com', 'smtp.mail.yahoo.com'];
        setCustomSmtpHost(response.data.smtp_host && !knownHosts.includes(response.data.smtp_host));
        const knownPorts = [587, 465, 25, 2525];
        setCustomSmtpPort(response.data.smtp_port && !knownPorts.includes(response.data.smtp_port));
      }
    } catch (error) {
      console.log('No email config found, using defaults');
    }
  };

  // ============================================
  // Email Config Handlers
  // ============================================

  const getEmailConfigErrors = (requirePassword = false): string[] => {
    const errors: string[] = [];
    if (!emailConfig.smtp_host) errors.push('Servidor SMTP');
    if (!emailConfig.smtp_user) errors.push('Usuario SMTP');
    if (!emailConfig.from_name) errors.push('Nombre del Remitente');
    if (requirePassword && !emailConfig.smtp_password && !hasPasswordConfigured) {
      errors.push('Contraseña de Aplicación');
    }
    return errors;
  };

  const isEmailConfigComplete = emailConfig.smtp_host && emailConfig.smtp_user && emailConfig.from_name && (emailConfig.smtp_password || hasPasswordConfigured);

  const handleSaveEmailConfig = async () => {
    if (!authCompany?.id) return;
    const errors = getEmailConfigErrors(true);
    if (errors.length > 0) {
      toast.error(`Completa los campos: ${errors.join(', ')}`);
      return;
    }
    setEmailConfigLoading(true);
    try {
      await integrationsClient.put('/email-config', emailConfig);
      toast.success('Configuración de email guardada');
      if (emailConfig.smtp_password) {
        setHasPasswordConfigured(true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar configuración');
    } finally {
      setEmailConfigLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!authCompany?.id) return;
    const errors = getEmailConfigErrors(false);
    if (errors.length > 0) {
      toast.error(`Configuración incompleta. Faltan: ${errors.join(', ')}`);
      return;
    }
    if (!hasPasswordConfigured && !emailConfig.smtp_password) {
      toast.error('Debes guardar una contraseña primero antes de enviar un email de prueba');
      return;
    }
    setEmailConfigLoading(true);
    try {
      const response = await integrationsClient.post('/email-config/test');
      if (response.data?.success) {
        toast.success('Email de prueba enviado. Revisa tu bandeja de entrada');
      } else {
        const errorMsg = response.data?.error || 'Error desconocido';
        if (errorMsg.includes('Username and Password not accepted')) {
          toast.error('Credenciales rechazadas por Gmail. Verifica que la contraseña de aplicación sea correcta.');
        } else if (errorMsg.includes('ECONNREFUSED')) {
          toast.error('No se pudo conectar al servidor SMTP. Verifica el host y puerto.');
        } else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ESOCKET')) {
          toast.error('Tiempo de espera agotado. Verifica el servidor SMTP y el puerto.');
        } else {
          toast.error(`Error SMTP: ${errorMsg}`);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al enviar email de prueba');
    } finally {
      setEmailConfigLoading(false);
    }
  };

  // ============================================
  // Template Handlers
  // ============================================

  const handleOpenTemplateModal = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        subject: template.subject,
        body_html: template.body_html,
        type_id: template.type_id || '',
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: '', subject: '', body_html: '', type_id: '' });
    }
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body_html) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    try {
      const payload = {
        ...templateForm,
        type_id: templateForm.type_id || null,
      };
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, payload);
      } else {
        await createTemplate(payload);
      }
      setShowTemplateModal(false);
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;
    await removeTemplate(id);
  };

  // ============================================
  // Type Handlers
  // ============================================

  const MODULE_OPTIONS = [
    { value: '', label: 'Sin asignar' },
    { value: 'ph', label: 'Propiedad Horizontal (PH)' },
    { value: 'crm', label: 'CRM' },
    { value: 'hr', label: 'Recursos Humanos' },
    { value: 'inventory', label: 'Inventarios' },
  ];

  const usedModuleKeys = types.map((t) => t.module_key).filter(Boolean);

  const handleOpenTypeModal = (type?: EmailTemplateType) => {
    if (type) {
      setEditingType(type);
      setTypeForm({ name: type.name, module_key: type.module_key || '', description: type.description || '' });
    } else {
      setEditingType(null);
      setTypeForm({ name: '', module_key: '', description: '' });
    }
    setShowTypeModal(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.name) {
      toast.error('El nombre es requerido');
      return;
    }
    try {
      if (editingType) {
        await updateType(editingType.id, typeForm);
      } else {
        await createType(typeForm);
      }
      setShowTypeModal(false);
    } catch {
      // Error ya manejado en el hook
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('¿Eliminar este tipo? Las plantillas asignadas quedarán sin tipo.')) return;
    await removeType(id);
  };

  // ============================================
  // Render
  // ============================================

  return (
    <>
      <div className="space-y-4">
        {/* Credenciales PILA */}
        <ExpandableSection
          title="Credenciales PILA (Su Aporte)"
          description="Configuración para validación automática de planillas en Su Aporte."
          icon={Shield}
          iconBg="bg-orange-500"
          expanded={pilaExpanded}
          onToggle={() => setPilaExpanded(!pilaExpanded)}
        >
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Próximamente</p>
          </div>
        </ExpandableSection>

        {/* Configuración de Email */}
        <ExpandableSection
          title="Configuración de Email"
          description="SMTP para envío de emails (campañas, OTP, notificaciones)."
          icon={Mail}
          iconBg="bg-green-500"
          expanded={emailExpanded}
          onToggle={() => setEmailExpanded(!emailExpanded)}
          badge={isEmailConfigComplete ? <CheckCircle className="w-4 h-4 text-green-500" /> : null}
        >
          {/* Banner Gmail */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">¿Usar Gmail para envíos?</p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  Debes generar una &quot;Contraseña de Aplicación&quot; en tu cuenta Gmail.
                </p>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-2"
                >
                  Crear contraseña de aplicación <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Servidor SMTP */}
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Servidor SMTP</Label>
              {!customSmtpHost ? (
                <Select
                  value={emailConfig.smtp_host}
                  onChange={(value) => {
                    if (value === 'custom') {
                      setCustomSmtpHost(true);
                      setEmailConfig(prev => ({ ...prev, smtp_host: '' }));
                    } else {
                      setEmailConfig(prev => ({ ...prev, smtp_host: value }));
                    }
                  }}
                  placeholder="Selecciona un servidor SMTP"
                  options={[
                    { value: 'smtp.gmail.com', label: 'Gmail (smtp.gmail.com)' },
                    { value: 'smtp.office365.com', label: 'Outlook (smtp.office365.com)' },
                    { value: 'smtp-mail.outlook.com', label: 'Outlook Legacy' },
                    { value: 'smtp.mail.yahoo.com', label: 'Yahoo (smtp.mail.yahoo.com)' },
                    { value: 'custom', label: 'Otro (personalizado)' },
                  ]}
                  className="mt-1.5"
                />
              ) : (
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={emailConfig.smtp_host}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_host: e.target.value }))}
                    placeholder="smtp.tuservidor.com"
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setCustomSmtpHost(false)}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Puerto SMTP */}
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Puerto SMTP</Label>
              {!customSmtpPort ? (
                <Select
                  value={String(emailConfig.smtp_port)}
                  onChange={(value) => {
                    if (value === 'custom') {
                      setCustomSmtpPort(true);
                      setEmailConfig(prev => ({ ...prev, smtp_port: 587 }));
                    } else {
                      setEmailConfig(prev => ({ ...prev, smtp_port: parseInt(value) }));
                    }
                  }}
                  placeholder="Selecciona puerto"
                  options={[
                    { value: '587', label: '587 (TLS - Recomendado)' },
                    { value: '465', label: '465 (SSL)' },
                    { value: '25', label: '25 (Sin encriptación)' },
                    { value: '2525', label: '2525 (Alternativo TLS)' },
                    { value: 'custom', label: 'Otro (personalizado)' },
                  ]}
                  className="mt-1.5"
                />
              ) : (
                <div className="flex gap-2 mt-1.5">
                  <Input
                    type="number"
                    value={emailConfig.smtp_port}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
                    placeholder="Puerto"
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setCustomSmtpPort(false)}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Usuario SMTP */}
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Usuario SMTP (Email)</Label>
              <Input
                type="email"
                value={emailConfig.smtp_user}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_user: e.target.value }))}
                placeholder="tu@email.com"
                className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Contraseña SMTP */}
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Contraseña de Aplicación</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={emailConfig.smtp_password}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_password: e.target.value }))}
                  placeholder={hasPasswordConfigured ? '••••••• (guardada)' : 'Ingresa tu contraseña'}
                  className="pr-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {hasPasswordConfigured && !emailConfig.smtp_password && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Deja vacío para mantener la contraseña actual
                </p>
              )}
            </div>

            {/* Nombre Remitente */}
            <div className="md:col-span-2">
              <Label className="text-gray-700 dark:text-gray-300">Nombre del Remitente</Label>
              <Input
                value={emailConfig.from_name}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, from_name: e.target.value }))}
                placeholder="Mi Empresa"
                className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Estado */}
          {(() => {
            const missing = getEmailConfigErrors(true);
            if (missing.length === 0) {
              return (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Configuración completa</span>
                  </div>
                </div>
              );
            }
            return (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <AlertCircle className="w-5 h-5" />
                  <div>
                    <span className="font-medium">Configuración incompleta</span>
                    <p className="text-sm mt-1 opacity-80">Faltan: {missing.join(', ')}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={handleTestEmail} disabled={emailConfigLoading}>
              {emailConfigLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar Email de Prueba
            </Button>
            <Button onClick={handleSaveEmailConfig} disabled={emailConfigLoading} className="bg-emerald-600 hover:bg-emerald-700">
              {emailConfigLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Configuración
            </Button>
          </div>
        </ExpandableSection>

        {/* Tipos de Plantilla */}
        <ExpandableSection
          title="Tipos de Plantilla"
          description={`Categorías para organizar plantillas por módulo (${types.length})`}
          icon={Tag}
          iconBg="bg-blue-500"
          expanded={typesExpanded}
          onToggle={() => setTypesExpanded(!typesExpanded)}
        >
          <div className="flex justify-end mb-4">
            <Button onClick={() => handleOpenTypeModal()} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Tipo
            </Button>
          </div>

          {types.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay tipos de plantilla</p>
              <p className="text-sm">Crea tipos para clasificar tus plantillas por módulo</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Plantillas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      {type.module_key ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {MODULE_OPTIONS.find((m) => m.value === type.module_key)?.label || type.module_key}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm">{type.description || '—'}</TableCell>
                    <TableCell className="text-center">{type._count?.templates ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenTypeModal(type)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteType(type.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ExpandableSection>

        {/* Plantillas de Email */}
        <ExpandableSection
          title="Plantillas de Email"
          description={`Gestiona las plantillas para automatizaciones y campañas (${templates.length})`}
          icon={Mail}
          iconBg="bg-purple-500"
          expanded={templatesExpanded}
          onToggle={() => setTemplatesExpanded(!templatesExpanded)}
        >
          <div className="flex justify-end mb-4">
            <Button onClick={() => handleOpenTemplateModal()} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Plantilla
            </Button>
          </div>

          {templatesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay plantillas de email</p>
              <p className="text-sm">Crea tu primera plantilla para usar en automatizaciones</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400">{template.subject}</TableCell>
                    <TableCell>
                      {template.type ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          {template.type.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenTemplateModal(template)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ExpandableSection>

        {/* WhatsApp Twilio */}
        <ExpandableSection
          title="Configuración de WhatsApp Business (Twilio)"
          description="Configura tus credenciales de Twilio para enviar y recibir mensajes de WhatsApp"
          icon={MessageSquare}
          iconBg="bg-emerald-500"
          expanded={twilioExpanded}
          onToggle={() => setTwilioExpanded(!twilioExpanded)}
        >
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Implementación pendiente</p>
          </div>
        </ExpandableSection>

        {/* ePayco */}
        <ExpandableSection
          title="Configuración de Pagos con ePayco"
          description="Configura tu token de ePayco para pagos con tarjeta de crédito, débito y otros medios"
          icon={CreditCard}
          iconBg="bg-pink-500"
          expanded={epaycoExpanded}
          onToggle={() => setEpaycoExpanded(!epaycoExpanded)}
        >
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Próximamente</p>
          </div>
        </ExpandableSection>

        {/* Bold */}
        <ExpandableSection
          title="Configuración de Pagos con Bold"
          description="Configura tus credenciales de Bold para pagos con tarjeta, PSE, Nequi y Bancolombia"
          icon={CreditCard}
          iconBg="bg-indigo-500"
          expanded={boldExpanded}
          onToggle={() => setBoldExpanded(!boldExpanded)}
        >
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Próximamente</p>
          </div>
        </ExpandableSection>

        {/* Wompi */}
        <ExpandableSection
          title="Configuración de Pagos con Wompi"
          description="Configura tus credenciales de Wompi para pagos con tarjeta, PSE, Nequi, Daviplata y efectivo"
          icon={CreditCard}
          iconBg="bg-cyan-500"
          expanded={wompiExpanded}
          onToggle={() => setWompiExpanded(!wompiExpanded)}
        >
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Próximamente</p>
          </div>
        </ExpandableSection>

        {/* Cal.com */}
        <ExpandableSection
          title="Configuración de Cal.com"
          description="Configura tu API Key de Cal.com para crear reuniones automáticas"
          icon={Calendar}
          iconBg="bg-amber-500"
          expanded={calExpanded}
          onToggle={() => setCalExpanded(!calExpanded)}
        >
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Próximamente</p>
          </div>
        </ExpandableSection>

        {/* Ecommerce */}
        <ExpandableSection
          title="Integración Ecommerce"
          description="Conecta tu inventario con WooCommerce o Tienda Nube"
          icon={ShoppingCart}
          iconBg="bg-violet-500"
          expanded={ecommerceExpanded}
          onToggle={() => setEcommerceExpanded(!ecommerceExpanded)}
        >
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Próximamente</p>
          </div>
        </ExpandableSection>

        {/* Notificaciones */}
        <ExpandableSection
          title="Configuración de Notificaciones"
          description="Gestión automática de notificaciones del sistema"
          icon={Bell}
          iconBg="bg-gray-500"
          expanded={notificationsExpanded}
          onToggle={() => setNotificationsExpanded(!notificationsExpanded)}
        >
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Próximamente</p>
          </div>
        </ExpandableSection>
      </div>

      {/* Modal Editor de Plantilla */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Modifica los campos de la plantilla' : 'Crea una nueva plantilla de email para usar en automatizaciones'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Nombre de la Plantilla *</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Bienvenida nuevo cliente"
                className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300">Asunto del Email *</Label>
              <Input
                value={templateForm.subject}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Ej: ¡Bienvenido a {{company_name}}!"
                className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300">Tipo de Plantilla</Label>
              <Select
                value={templateForm.type_id}
                onChange={(value) => setTemplateForm(prev => ({ ...prev, type_id: value }))}
                placeholder="Sin tipo (general)"
                options={[
                  { value: '', label: 'Sin tipo (general)' },
                  ...types.map((t) => ({ value: t.id, label: t.name })),
                ]}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300 mb-1.5 block">Contenido del Email *</Label>
              <EmailTemplateEditor
                content={templateForm.body_html}
                onChange={(html) => setTemplateForm(prev => ({ ...prev, body_html: html }))}
                variableGroups={
                  (() => {
                    const mk = types.find(t => t.id === templateForm.type_id)?.module_key;
                    if (mk === 'ph') return PH_VARIABLE_GROUPS;
                    if (mk === 'crm') return CRM_VARIABLE_GROUPS;
                    return [];
                  })()
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-2" />
              {editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tipo de Plantilla */}
      <Dialog open={showTypeModal} onOpenChange={setShowTypeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Editar Tipo' : 'Nuevo Tipo de Plantilla'}</DialogTitle>
            <DialogDescription>
              {editingType ? 'Modifica el tipo de plantilla' : 'Crea un tipo para clasificar plantillas por módulo'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Nombre *</Label>
              <Input
                value={typeForm.name}
                onChange={(e) => setTypeForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Plantillas PH"
                className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300">Módulo Asociado</Label>
              <Select
                value={typeForm.module_key}
                onChange={(value) => setTypeForm(prev => ({ ...prev, module_key: value }))}
                placeholder="Sin módulo"
                options={MODULE_OPTIONS.filter(
                  (opt) => !opt.value || !usedModuleKeys.includes(opt.value) || opt.value === editingType?.module_key
                )}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Solo un tipo por módulo. Los módulos ya asignados no aparecen.
              </p>
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300">Descripción</Label>
              <Input
                value={typeForm.description}
                onChange={(e) => setTypeForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Plantillas usadas en el módulo de Propiedad Horizontal"
                className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypeModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveType} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-2" />
              {editingType ? 'Guardar Cambios' : 'Crear Tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
