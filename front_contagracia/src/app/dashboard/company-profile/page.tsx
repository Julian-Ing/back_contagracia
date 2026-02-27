'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/modules/auth';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { useEmail } from '@/modules/crm/hooks/useEmail';
import { whatsappService } from '@/modules/crm/services/crm.service';
import { companyService } from '@/modules/company/services/company.service';
import { thirdPartiesService } from '@/modules/third-parties/services/thirdParties.service';
import { sendVerificationCode, verifyCode } from '@/modules/auth/services/authService';
import { useCompanySettings } from '@/shared/providers/CompanySettingsProvider';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { ProtectedRoute } from '@/shared/components/auth/ProtectedRoute';
import { companyClient, mediaClient, integrationsClient } from '@/shared/services/api/apiClient';
import { useAuthImage } from '@/shared/hooks/useAuthImage';
import { IntegrationsTab } from './components/IntegrationsTab';
import ElectronicTab from './components/ElectronicTab';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Building2,
  Mail,
  Save,
  Trash2,
  Loader2,
  CheckCircle,
  Info,
  FileText,
  Palette,
  Users,
  Upload,
  Image as ImageIcon,
  UserCheck,
  PenTool,
    Hash,
  Plug,
  Copy,
  Wifi,
  WifiOff,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Pencil,
  AlertCircle,
  Eye,
  EyeOff,
  CreditCard,
  Calendar,
  ShoppingCart,
  Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { EmailTemplate } from '@/modules/crm/types';
import { PayrollSettingsTab } from './components/PayrollSettingsTab';
import { PayrollConceptsTab } from './components/PayrollConceptsTab';
import { PayrollUvtTab } from './components/PayrollUvtTab';
import { NITInput, calcularDV } from '@/shared/components/ui/nit-input';

// ============================================
// ExpandableSection
// ============================================

function ExpandableSection({
  title,
  description,
  icon: Icon,
  iconBg,
  expanded,
  onToggle,
  badge,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
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

interface CompanyData {
  id: string;
  company_name: string;
  nit: string;
  dv: string;
  email: string;
  phone: string;
  address: string;
  logo_url: string | null;
  type_document_identification_id: string;
  type_organization_id: string;
  type_regime_id: string;
  type_liability_id: string;
  country_id: string;
  department_id: string;
  municipality_id: string;
  legal_rep_name?: string;
  legal_rep_identification?: string;
  legal_rep_phone?: string;
  legal_rep_email?: string;
  legal_rep_signature_url?: string | null;
  // Contador
  contador_name?: string;
  contador_identification?: string;
  contador_phone?: string;
  contador_email?: string;
  contador_signature_url?: string | null;
  // Revisor Fiscal
  revisor_fiscal_name?: string;
  revisor_fiscal_identification?: string;
  revisor_fiscal_phone?: string;
  revisor_fiscal_email?: string;
  revisor_fiscal_signature_url?: string | null;
}

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_name: string;
}

type TabKey = 'general' | 'representante' | 'facturacion' | 'marca' | 'nomina' | 'integraciones';

const TABS: { key: TabKey; label: string; icon: React.ElementType; description: string; color: string; iconBg: string }[] = [
  { key: 'general', label: 'General', icon: Building2, description: 'Datos básicos de la empresa', color: 'bg-blue-600', iconBg: 'bg-blue-500' },
  { key: 'representante', label: 'Representantes', icon: Users, description: 'Representante legal, contador y revisor fiscal', color: 'bg-purple-600', iconBg: 'bg-purple-500' },
  { key: 'facturacion', label: 'Fact / Nóm. Electrónica y Resoluciones', icon: FileText, description: 'DIAN, producción y resoluciones', color: 'bg-red-600', iconBg: 'bg-red-500' },
  { key: 'marca', label: 'Marca & Formato', icon: Palette, description: 'Logo y formato de impresión', color: 'bg-green-600', iconBg: 'bg-green-500' },
  { key: 'nomina', label: 'Nómina', icon: Users, description: 'Parametría de nómina', color: 'bg-indigo-600', iconBg: 'bg-indigo-500' },
  { key: 'integraciones', label: 'Integraciones', icon: Plug, description: 'Email, pagos, WhatsApp y más', color: 'bg-orange-600', iconBg: 'bg-orange-500' },
];

// ============================================
// Componente Principal
// ============================================

export default function CompanyProfilePage() {
  const { company: authCompany } = useAuth();
  const { displayDecimals, setDisplayDecimals } = useCompanySettings();
  const { canAny } = usePermissions();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [payrollTab, setPayrollTab] = useState<'empresa' | 'conceptos' | 'uvt'>('empresa');

  // Ubicación
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);

  // Verificación de email
  const [originalEmail, setOriginalEmail] = useState('');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeLoading, setEmailCodeLoading] = useState(false);
  const [emailVerificationError, setEmailVerificationError] = useState('');

  // Logo upload
  const { src: logoSrc } = useAuthImage(company?.logo_url);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const [showDeleteLogoConfirm, setShowDeleteLogoConfirm] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  // Firma Representante Legal
  const { src: signatureSrc } = useAuthImage(company?.legal_rep_signature_url);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signatureDeleting, setSignatureDeleting] = useState(false);
  const [showDeleteSignatureConfirm, setShowDeleteSignatureConfirm] = useState(false);
  const signatureFileRef = useRef<HTMLInputElement>(null);

  // Firma Contador
  const { src: contadorSrc } = useAuthImage(company?.contador_signature_url);
  const [contadorSigUploading, setContadorSigUploading] = useState(false);
  const [contadorSigDeleting, setContadorSigDeleting] = useState(false);
  const [showDeleteContadorSigConfirm, setShowDeleteContadorSigConfirm] = useState(false);
  const contadorSigFileRef = useRef<HTMLInputElement>(null);
  const [savingContador, setSavingContador] = useState(false);

  // Firma Revisor Fiscal
  const { src: revisorSrc } = useAuthImage(company?.revisor_fiscal_signature_url);
  const [revisorSigUploading, setRevisorSigUploading] = useState(false);
  const [revisorSigDeleting, setRevisorSigDeleting] = useState(false);
  const [showDeleteRevisorSigConfirm, setShowDeleteRevisorSigConfirm] = useState(false);
  const revisorSigFileRef = useRef<HTMLInputElement>(null);
  const [savingRevisorFiscal, setSavingRevisorFiscal] = useState(false);

  // Secciones desplegables de Representantes
  const [legalRepExpanded, setLegalRepExpanded] = useState(true);
  const [contadorExpanded, setContadorExpanded] = useState(false);
  const [revisorFiscalExpanded, setRevisorFiscalExpanded] = useState(false);

  // Catálogos tributarios
  const [regimes, setRegimes] = useState<{ id: string; name: string }[]>([]);
  const [liabilities, setLiabilities] = useState<{ id: string; name: string }[]>([]);
  const [typeOrganizations, setTypeOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [typeDocumentIdentifications, setTypeDocumentIdentifications] = useState<{ id: string; name: string }[]>([]);

  // Representante Legal save
  const [savingLegalRep, setSavingLegalRep] = useState(false);

  // Secciones expandibles
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [pilaExpanded, setPilaExpanded] = useState(false);
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
  const [showPassword, setShowPassword] = useState(false); // Si ya hay password guardado en BD

  // Config de Twilio/WhatsApp
  const [twilioConfig, setTwilioConfig] = useState({
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_whatsapp_number: '',
  });
  const [twilioConfigLoading, setTwilioConfigLoading] = useState(false);
  const [twilioTesting, setTwilioTesting] = useState(false);
  const [twilioConnected, setTwilioConnected] = useState<boolean | null>(null);
  const [hasTwilioTokenConfigured, setHasTwilioTokenConfigured] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);

  // Plantillas de Email
  const { templates, loading: templatesLoading, createTemplate, updateTemplate, removeTemplate } = useEmail();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body_html: '',
  });
  // ============================================
  // Funciones de Plantillas de Email
  // ============================================

  const handleOpenTemplateModal = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({ name: template.name, subject: template.subject, body_html: template.html_body });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: '', subject: '', body_html: '' });
    }
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await removeTemplate(templateId);
      toast.success('Plantilla eliminada');
    } catch {
      toast.error('Error al eliminar plantilla');
    }
  };

  // ============================================
  // Cargar datos
  // ============================================

  useEffect(() => {
    const loadData = async () => {
      if (!authCompany?.id) return;
      setLoading(true);
      let companyData: CompanyData | null = null;
      try {
        const data = await companyService.getCompany(authCompany.id);
        companyData = data as unknown as CompanyData;
        setCompany(companyData);
      } catch (error) {
        console.error('Error loading company from API, using auth data:', error);
        toast.error('No se pudo cargar datos de la empresa. Verifica que el servicio esté activo.');
        // El auth-store guarda "name" (no "company_name") — mapear correctamente
        const raw = authCompany as any;
        companyData = {
          ...raw,
          company_name: raw.company_name || raw.name || '',
        } as unknown as CompanyData;
        setCompany(companyData);
      }
      if (companyData?.email) setOriginalEmail(companyData.email);
      // Cargar departamentos
      try {
        const depts = await thirdPartiesService.getDepartments();
        setDepartments(depts);
        // Si la empresa ya tiene departamento, cargar sus municipios
        if (companyData?.department_id) {
          const munis = await thirdPartiesService.getMunicipalities(String(companyData.department_id));
          setMunicipalities(munis);
        }
      } catch { /* catalogs fail silently */ }

      // Cargar catálogos tributarios y de identificación
      try {
        const [regs, liabs, orgs, docTypes] = await Promise.all([
          thirdPartiesService.getTypeRegimes(),
          thirdPartiesService.getTypeLiabilities(),
          thirdPartiesService.getTypeOrganizations(),
          thirdPartiesService.getTypeDocumentIdentifications(),
        ]);
        setRegimes(regs);
        setLiabilities(liabs);
        setTypeOrganizations(orgs);
        setTypeDocumentIdentifications(docTypes);
      } catch { /* catalogs fail silently */ }

      // Cargar configs independientemente
      await Promise.all([loadEmailConfig(), loadTwilioConfig()]);
      setLoading(false);
    };
    loadData();
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
        // Si el backend tiene host, user y from_name configurados, el password también está guardado
        const isConfigured = !!(response.data.smtp_host && response.data.smtp_user && response.data.from_name);
        setHasPasswordConfigured(isConfigured);

        const knownHosts = ['smtp.gmail.com', 'smtp.office365.com', 'smtp-mail.outlook.com', 'smtp.mail.yahoo.com'];
        setCustomSmtpHost(response.data.smtp_host && !knownHosts.includes(response.data.smtp_host));
        const knownPorts = [587, 465, 25, 2525];
        setCustomSmtpPort(response.data.smtp_port && !knownPorts.includes(response.data.smtp_port));
      }
    } catch (error) {
      // No email config found, using defaults
    }
  };

  const loadTwilioConfig = async () => {
    if (!authCompany?.id) return;
    try {
      const data = await whatsappService.getTwilioConfig(authCompany.id);
      if (data) {
        setTwilioConfig({
          twilio_account_sid: data.twilio_account_sid || '',
          twilio_auth_token: '',
          twilio_whatsapp_number: data.twilio_whatsapp_number || '',
        });
        const isConfigured = !!(data.twilio_account_sid && data.twilio_whatsapp_number);
        setHasTwilioTokenConfigured(isConfigured);
        setTwilioConnected(isConfigured ? true : null);
      }
    } catch {
      console.log('No Twilio config found, using defaults');
    }
  };

  const handleSaveTwilioConfig = async () => {
    if (!authCompany?.id) return;
    if (!twilioConfig.twilio_account_sid) {
      toast.error('El Account SID es requerido');
      return;
    }
    if (!hasTwilioTokenConfigured && !twilioConfig.twilio_auth_token) {
      toast.error('El Auth Token es requerido');
      return;
    }
    if (!twilioConfig.twilio_whatsapp_number) {
      toast.error('El número de WhatsApp es requerido');
      return;
    }

    setTwilioConfigLoading(true);
    try {
      const payload: Record<string, string> = {
        twilio_account_sid: twilioConfig.twilio_account_sid,
        twilio_whatsapp_number: twilioConfig.twilio_whatsapp_number,
      };
      if (twilioConfig.twilio_auth_token) {
        payload.twilio_auth_token = twilioConfig.twilio_auth_token;
      }
      await whatsappService.saveTwilioConfig(authCompany.id, payload);
      toast.success('Configuración de Twilio guardada');
      setHasTwilioTokenConfigured(true);
      setTwilioConfig(prev => ({ ...prev, twilio_auth_token: '' }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar configuración');
    } finally {
      setTwilioConfigLoading(false);
    }
  };

  const handleTestTwilioConnection = async () => {
    if (!authCompany?.id) return;
    setTwilioTesting(true);
    setTwilioConnected(null);
    try {
      const result = await whatsappService.testTwilioConfig(authCompany.id);
      if (result.success) {
        setTwilioConnected(true);
        toast.success('Conexión exitosa con Twilio');
      } else {
        setTwilioConnected(false);
        toast.error(result.message || 'No se pudo conectar con Twilio');
      }
    } catch (err: any) {
      setTwilioConnected(false);
      toast.error(err?.response?.data?.message || 'Error al probar la conexión');
    } finally {
      setTwilioTesting(false);
    }
  };

  // ============================================
  // Guardar Info General
  // ============================================

  const handleSaveGeneral = async () => {
    if (!company || !authCompany?.id) return;

    // Si el email cambió, pedir verificación primero
    const emailChanged = company.email.toLowerCase().trim() !== originalEmail.toLowerCase().trim();
    if (emailChanged) {
      setShowEmailVerification(true);
      setEmailVerificationCode('');
      setEmailCodeSent(false);
      setEmailVerificationError('');
      return;
    }

    await performSaveGeneral();
  };

  const performSaveGeneral = async () => {
    if (!company || !authCompany?.id) return;
    setSaving(true);
    try {
      await companyService.updateCompanyInfo(authCompany.id, {
        nit: company.nit,
        dv: calcularDV(company.nit),
        type_document_identification_id: company.type_document_identification_id,
        type_organization_id: company.type_organization_id,
        company_name: company.company_name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        department_id: company.department_id,
        municipality_id: company.municipality_id,
        type_regime_id: company.type_regime_id,
        type_liability_id: company.type_liability_id,
      });

      // Refrescar la empresa desde el backend para obtener datos actualizados (ej: logo_url con nuevo NIT)
      const updatedCompany = await companyService.getCompany(authCompany.id);
      setCompany(updatedCompany as unknown as CompanyData);

      // Actualizar authStore para que el Header refleje los cambios
      const authState = useAuthStore.getState();
      if (authState.company) {
        authState.setCompany({
          ...authState.company,
          nit: updatedCompany.nit,
          dv: updatedCompany.dv,
          company_name: updatedCompany.company_name,
          email: updatedCompany.email,
          phone: updatedCompany.phone,
          address: updatedCompany.address,
          logo_url: updatedCompany.logo_url,
        });
      }

      setOriginalEmail(company.email);
      setShowEmailVerification(false);
      toast.success('Información actualizada correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  // --- Verificación de email ---

  const handleSendEmailCode = async () => {
    if (!company?.email) return;
    setEmailCodeLoading(true);
    setEmailVerificationError('');
    try {
      await sendVerificationCode({ email: company.email.trim(), purpose: 'company_email_change' });
      setEmailCodeSent(true);
    } catch (err: any) {
      setEmailVerificationError(err.message || 'Error al enviar el código');
    } finally {
      setEmailCodeLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!company?.email || emailVerificationCode.length !== 6) return;
    setEmailCodeLoading(true);
    setEmailVerificationError('');
    try {
      await verifyCode({ email: company.email.trim(), code: emailVerificationCode });
      await performSaveGeneral();
    } catch (err: any) {
      setEmailVerificationError(err.message || 'Código inválido o expirado');
    } finally {
      setEmailCodeLoading(false);
    }
  };

  const handleCancelEmailVerification = () => {
    setShowEmailVerification(false);
    setEmailVerificationCode('');
    setEmailCodeSent(false);
    setEmailVerificationError('');
    setCompany(prev => prev ? { ...prev, email: originalEmail } : null);
  };

  // ============================================
  // Logo Upload/Delete
  // ============================================

  const resizeImage = (file: File, maxW: number, maxH: number): Promise<File> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        if (img.width <= maxW && img.height <= maxH) {
          resolve(file);
          return;
        }
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type }));
          } else {
            resolve(file);
          }
        }, file.type, 0.9);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  /** Extrae el UUID del path /api/media/{uuid} para poder eliminarlo del media-service */
  const extractMediaId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const match = url.match(/\/media\/([0-9a-f-]{36})/i);
    return match?.[1] ?? null;
  };

  /** Elimina silenciosamente un archivo del media-service (no bloquea la operación principal) */
  const deleteMediaFile = async (url: string | null | undefined) => {
    const id = extractMediaId(url);
    if (!id) return;
    try {
      await mediaClient.delete(`/media/${id}`);
    } catch {
      // Silencioso: el archivo viejo no debe bloquear la subida nueva
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authCompany?.id) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Solo se permiten archivos JPG, PNG o WebP');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo no debe superar 2 MB');
      return;
    }

    const oldLogoUrl = company?.logo_url;
    setLogoUploading(true);
    try {
      const resized = await resizeImage(file, 800, 300);
      const fd = new FormData();
      fd.append('file', resized);
      fd.append('category', 'company_logo');

      const mediaRes = await mediaClient.post('/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const logoUrl = mediaRes.data.url;

      await companyClient.patch(`/companies/${authCompany.id}/brand`, { logo_url: logoUrl });

      setCompany(prev => prev ? { ...prev, logo_url: logoUrl } : null);
      const authState = useAuthStore.getState();
      if (authState.company) {
        authState.setCompany({ ...authState.company, logo_url: logoUrl });
      }
      toast.success('Logo actualizado');
      await deleteMediaFile(oldLogoUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al subir el logo');
    } finally {
      setLogoUploading(false);
      if (logoFileRef.current) logoFileRef.current.value = '';
    }
  };

  const handleLogoDelete = async () => {
    if (!authCompany?.id) return;
    const oldLogoUrl = company?.logo_url;
    setLogoDeleting(true);
    try {
      await companyClient.patch(`/companies/${authCompany.id}/brand`, { logo_url: null });
      setCompany(prev => prev ? { ...prev, logo_url: null } : null);
      const authState = useAuthStore.getState();
      if (authState.company) {
        authState.setCompany({ ...authState.company, logo_url: null });
      }
      toast.success('Logo eliminado');
      await deleteMediaFile(oldLogoUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar el logo');
    } finally {
      setLogoDeleting(false);
    }
  };

  // ============================================
  // Signature Upload/Delete
  // ============================================

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authCompany?.id) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Solo se permiten archivos JPG, PNG o WebP');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo no debe superar 2 MB');
      return;
    }

    const oldSignatureUrl = company?.legal_rep_signature_url;
    setSignatureUploading(true);
    try {
      const resized = await resizeImage(file, 400, 200);
      const fd = new FormData();
      fd.append('file', resized);
      fd.append('category', 'company_signature');

      const mediaRes = await mediaClient.post('/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const signatureUrl = mediaRes.data.url;

      await companyClient.patch(`/companies/${authCompany.id}/brand`, { legal_rep_signature_url: signatureUrl });

      setCompany(prev => prev ? { ...prev, legal_rep_signature_url: signatureUrl } : null);
      toast.success('Firma actualizada');
      await deleteMediaFile(oldSignatureUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al subir la firma');
    } finally {
      setSignatureUploading(false);
      if (signatureFileRef.current) signatureFileRef.current.value = '';
    }
  };

  const handleSignatureDelete = async () => {
    if (!authCompany?.id) return;
    const oldSignatureUrl = company?.legal_rep_signature_url;
    setSignatureDeleting(true);
    try {
      await companyClient.patch(`/companies/${authCompany.id}/brand`, { legal_rep_signature_url: null });
      setCompany(prev => prev ? { ...prev, legal_rep_signature_url: null } : null);
      toast.success('Firma eliminada');
      await deleteMediaFile(oldSignatureUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar la firma');
    } finally {
      setSignatureDeleting(false);
    }
  };

  // ============================================
  // Guardar Representante Legal
  // ============================================

  const handleSaveLegalRep = async () => {
    if (!company || !authCompany?.id) return;
    setSavingLegalRep(true);
    try {
      await companyService.updateLegalRep(authCompany.id, {
        legal_rep_name: company.legal_rep_name || '',
        legal_rep_identification: company.legal_rep_identification || '',
        legal_rep_phone: company.legal_rep_phone || '',
        legal_rep_email: company.legal_rep_email || '',
      });
      toast.success('Representante legal actualizado');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar');
    } finally {
      setSavingLegalRep(false);
    }
  };

  // ============================================
  // Guardar / Subir / Eliminar — Contador
  // ============================================

  const handleSaveContador = async () => {
    if (!company || !authCompany?.id) return;
    setSavingContador(true);
    try {
      await companyService.updateContador(authCompany.id, {
        contador_name: company.contador_name || '',
        contador_identification: company.contador_identification || '',
        contador_phone: company.contador_phone || '',
        contador_email: company.contador_email || '',
      });
      toast.success('Contador actualizado');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar');
    } finally {
      setSavingContador(false);
    }
  };

  const handleContadorSigUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authCompany?.id) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { toast.error('Solo JPG, PNG o WebP'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2 MB'); return; }
    const oldUrl = company?.contador_signature_url;
    setContadorSigUploading(true);
    try {
      const resized = await resizeImage(file, 400, 200);
      const fd = new FormData();
      fd.append('file', resized);
      fd.append('category', 'company_signature');
      const mediaRes = await mediaClient.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = mediaRes.data.url;
      await companyClient.patch(`/companies/${authCompany.id}/brand`, { contador_signature_url: url });
      setCompany(prev => prev ? { ...prev, contador_signature_url: url } : null);
      toast.success('Firma del contador actualizada');
      await deleteMediaFile(oldUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al subir la firma');
    } finally {
      setContadorSigUploading(false);
      if (contadorSigFileRef.current) contadorSigFileRef.current.value = '';
    }
  };

  const handleContadorSigDelete = async () => {
    if (!authCompany?.id) return;
    const oldUrl = company?.contador_signature_url;
    setContadorSigDeleting(true);
    try {
      await companyClient.patch(`/companies/${authCompany.id}/brand`, { contador_signature_url: null });
      setCompany(prev => prev ? { ...prev, contador_signature_url: null } : null);
      toast.success('Firma del contador eliminada');
      await deleteMediaFile(oldUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar la firma');
    } finally {
      setContadorSigDeleting(false);
    }
  };

  // ============================================
  // Guardar / Subir / Eliminar — Revisor Fiscal
  // ============================================

  const handleSaveRevisorFiscal = async () => {
    if (!company || !authCompany?.id) return;
    setSavingRevisorFiscal(true);
    try {
      await companyService.updateRevisorFiscal(authCompany.id, {
        revisor_fiscal_name: company.revisor_fiscal_name || '',
        revisor_fiscal_identification: company.revisor_fiscal_identification || '',
        revisor_fiscal_phone: company.revisor_fiscal_phone || '',
        revisor_fiscal_email: company.revisor_fiscal_email || '',
      });
      toast.success('Revisor fiscal actualizado');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar');
    } finally {
      setSavingRevisorFiscal(false);
    }
  };

  const handleRevisorSigUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authCompany?.id) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { toast.error('Solo JPG, PNG o WebP'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2 MB'); return; }
    const oldUrl = company?.revisor_fiscal_signature_url;
    setRevisorSigUploading(true);
    try {
      const resized = await resizeImage(file, 400, 200);
      const fd = new FormData();
      fd.append('file', resized);
      fd.append('category', 'company_signature');
      const mediaRes = await mediaClient.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = mediaRes.data.url;
      await companyClient.patch(`/companies/${authCompany.id}/brand`, { revisor_fiscal_signature_url: url });
      setCompany(prev => prev ? { ...prev, revisor_fiscal_signature_url: url } : null);
      toast.success('Firma del revisor fiscal actualizada');
      await deleteMediaFile(oldUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al subir la firma');
    } finally {
      setRevisorSigUploading(false);
      if (revisorSigFileRef.current) revisorSigFileRef.current.value = '';
    }
  };

  const handleRevisorSigDelete = async () => {
    if (!authCompany?.id) return;
    const oldUrl = company?.revisor_fiscal_signature_url;
    setRevisorSigDeleting(true);
    try {
      await companyClient.patch(`/companies/${authCompany.id}/brand`, { revisor_fiscal_signature_url: null });
      setCompany(prev => prev ? { ...prev, revisor_fiscal_signature_url: null } : null);
      toast.success('Firma del revisor fiscal eliminada');
      await deleteMediaFile(oldUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar la firma');
    } finally {
      setRevisorSigDeleting(false);
    }
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <ProtectedRoute permission="company.profile.view">
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Configuración de la compañía</h1>
      </div>

      {/* Tabs - Grid 3x2 */}
      <div className="px-6 py-4">
        <div className="flex flex-wrap justify-center gap-3">
          {TABS.filter((tab) => {
            if (tab.key === 'facturacion') {
              return canAny(['electronic_documents.view', 'electronic_documents.resolutions.view']);
            }
            return true;
          }).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)] p-4 rounded-xl text-left transition-all ${
                  isActive
                    ? `${tab.color} text-white shadow-lg shadow-${tab.color.replace('bg-', '')}/30`
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : tab.iconBg}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white'}`} />
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {tab.label}
                    </p>
                    <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                      {tab.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-8 space-y-4">
        {/* Tab: General */}
        {activeTab === 'general' && (
          <>
            {/* Información General */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Información General</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Datos básicos de tu empresa</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* NIT con DV (DV se calcula automáticamente) */}
                <div className="lg:col-span-2">
                  <Label className="text-gray-700 dark:text-gray-300">NIT</Label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="flex-1">
                      <NITInput
                        value={company?.nit || ''}
                        showDV={false}
                        onNITChange={(nit, dv) =>
                          setCompany(prev => prev ? { ...prev, nit, dv } : null)
                        }
                        placeholder="Ingresa el NIT"
                      />
                    </div>
                    <Input
                      value={company?.nit ? calcularDV(company.nit) : (company?.dv || '')}
                      disabled
                      className="w-16 text-center bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      title="DV calculado automáticamente"
                    />
                  </div>
                </div>

                {/* Razón Social */}
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Razón Social</Label>
                  <Input
                    value={company?.company_name || ''}
                    onChange={(e) => setCompany(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                    className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Razón social de la empresa"
                  />
                </div>

                {/* Tipo Documento */}
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Tipo Documento</Label>
                  <SearchableSelect
                    options={typeDocumentIdentifications.map(t => ({ value: t.id, label: t.name }))}
                    value={company?.type_document_identification_id ? String(company.type_document_identification_id) : ''}
                    onChange={(value) =>
                      setCompany(prev => prev ? { ...prev, type_document_identification_id: value } : null)
                    }
                    placeholder="Selecciona tipo de documento"
                    className="mt-1.5"
                  />
                </div>

                {/* Tipo de Persona */}
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Tipo de Persona</Label>
                  <SearchableSelect
                    options={typeOrganizations.map(t => ({ value: t.id, label: t.name }))}
                    value={company?.type_organization_id ? String(company.type_organization_id) : ''}
                    onChange={(value) =>
                      setCompany(prev => prev ? { ...prev, type_organization_id: value } : null)
                    }
                    placeholder="Selecciona tipo de persona"
                    className="mt-1.5"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Email</Label>
                  <Input
                    type="email"
                    value={company?.email || ''}
                    onChange={(e) => setCompany(prev => prev ? { ...prev, email: e.target.value } : null)}
                    className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Teléfono</Label>
                  <Input
                    value={company?.phone || ''}
                    onChange={(e) => setCompany(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Departamento */}
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Departamento</Label>
                  <SearchableSelect
                    options={departments.map(d => ({ value: String(d.id), label: d.name }))}
                    value={company?.department_id ? String(company.department_id) : ''}
                    onChange={async (value) => {
                      setCompany(prev => prev ? { ...prev, department_id: value, municipality_id: '' } : null);
                      setMunicipalities([]);
                      if (value) {
                        try {
                          const munis = await thirdPartiesService.getMunicipalities(value);
                          setMunicipalities(munis);
                        } catch { /* ignore */ }
                      }
                    }}
                    placeholder="Selecciona departamento"
                    className="mt-1.5"
                  />
                </div>

                {/* Municipio */}
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Municipio</Label>
                  <SearchableSelect
                    options={municipalities.map(m => ({ value: String(m.id), label: m.name }))}
                    value={company?.municipality_id ? String(company.municipality_id) : ''}
                    onChange={(value) => {
                      setCompany(prev => prev ? { ...prev, municipality_id: value } : null);
                    }}
                    placeholder={company?.department_id ? 'Selecciona municipio' : 'Selecciona primero el departamento'}
                    className="mt-1.5"
                  />
                </div>

                {/* Dirección */}
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Dirección</Label>
                  <Input
                    value={company?.address || ''}
                    onChange={(e) => setCompany(prev => prev ? { ...prev, address: e.target.value } : null)}
                    className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Régimen Tributario */}
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Régimen Tributario</Label>
                  <SearchableSelect
                    options={regimes.map(r => ({ value: String(r.id), label: r.name }))}
                    value={company?.type_regime_id ? String(company.type_regime_id) : ''}
                    onChange={(value) => {
                      setCompany(prev => prev ? { ...prev, type_regime_id: value } : null);
                    }}
                    placeholder="Selecciona régimen"
                    className="mt-1.5"
                  />
                </div>

                {/* Responsabilidad Fiscal */}
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Responsabilidad Fiscal</Label>
                  <SearchableSelect
                    options={liabilities.map(l => ({ value: String(l.id), label: l.name }))}
                    value={company?.type_liability_id ? String(company.type_liability_id) : ''}
                    onChange={(value) => {
                      setCompany(prev => prev ? { ...prev, type_liability_id: value } : null);
                    }}
                    placeholder="Selecciona responsabilidad"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSaveGeneral} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar Información General
                </Button>
              </div>
            </div>

            {/* Decimales en Pantalla */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-teal-500 rounded-lg">
                  <Hash className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Decimales en Pantalla</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cantidad de decimales a mostrar en campos numéricos. La base de datos siempre almacena 4 decimales.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setDisplayDecimals(n);
                      toast.success(`Decimales actualizados a ${n}`);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      displayDecimals === n
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                  Ejemplo: {(1234.5678).toLocaleString('es-CO', { minimumFractionDigits: displayDecimals, maximumFractionDigits: displayDecimals })}
                </span>
              </div>
            </div>

          </>
        )}

        {/* Tab: Integraciones */}
        {activeTab === 'integraciones' && <IntegrationsTab />}

        {/* Tab: Representantes */}
        {activeTab === 'representante' && (
          <div className="space-y-4">

            {/* ── REPRESENTANTE LEGAL ─────────────────────────── */}
            <ExpandableSection
              title="Representante Legal"
              description="Datos e información de firma del representante legal"
              icon={UserCheck}
              iconBg="bg-purple-500"
              expanded={legalRepExpanded}
              onToggle={() => setLegalRepExpanded(v => !v)}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Nombre completo</Label>
                    <Input value={company?.legal_rep_name || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, legal_rep_name: e.target.value } : null)} placeholder="Nombre del representante legal" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Número de identificación</Label>
                    <Input value={company?.legal_rep_identification || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, legal_rep_identification: e.target.value } : null)} placeholder="Cédula del representante" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Teléfono</Label>
                    <Input value={company?.legal_rep_phone || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, legal_rep_phone: e.target.value } : null)} placeholder="Teléfono del representante" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Email</Label>
                    <Input type="email" value={company?.legal_rep_email || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, legal_rep_email: e.target.value } : null)} placeholder="Email del representante" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveLegalRep} disabled={savingLegalRep} className="bg-emerald-600 hover:bg-emerald-700">
                    {savingLegalRep ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar Representante Legal
                  </Button>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-violet-500 rounded-lg"><PenTool className="w-5 h-5 text-white" /></div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Firma del Representante Legal</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Imagen de la firma para documentos del sistema.</p>
                    </div>
                  </div>
                  {signatureSrc ? (
                    <div className="mb-4"><Label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Firma actual</Label>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800/50 inline-block">
                        <img src={signatureSrc} alt="Firma del representante legal" className="max-h-[100px] max-w-[300px] object-contain" />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                      <PenTool className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" /><p className="text-sm text-gray-400">Sin firma cargada</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <input ref={signatureFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleSignatureUpload} className="hidden" />
                    <Button variant="outline" size="sm" disabled={signatureUploading} onClick={() => signatureFileRef.current?.click()}>
                      {signatureUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4 mr-2" /> Subir firma</>}
                    </Button>
                    {company?.legal_rep_signature_url && (
                      <Button variant="outline" size="sm" onClick={() => setShowDeleteSignatureConfirm(true)} className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400">
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar firma
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Recomendado: hasta 400x200 px, fondo transparente (PNG). Max 2 MB.</p>
                </div>
              </div>
            </ExpandableSection>

            {/* ── CONTADOR ────────────────────────────────────── */}
            <ExpandableSection
              title="Contador"
              description="Datos e información de firma del contador"
              icon={UserCheck}
              iconBg="bg-blue-500"
              expanded={contadorExpanded}
              onToggle={() => setContadorExpanded(v => !v)}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Nombre completo</Label>
                    <Input value={company?.contador_name || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, contador_name: e.target.value } : null)} placeholder="Nombre del contador" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Número de identificación</Label>
                    <Input value={company?.contador_identification || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, contador_identification: e.target.value } : null)} placeholder="Cédula del contador" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Teléfono</Label>
                    <Input value={company?.contador_phone || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, contador_phone: e.target.value } : null)} placeholder="Teléfono del contador" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Email</Label>
                    <Input type="email" value={company?.contador_email || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, contador_email: e.target.value } : null)} placeholder="Email del contador" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveContador} disabled={savingContador} className="bg-emerald-600 hover:bg-emerald-700">
                    {savingContador ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar Contador
                  </Button>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-400 rounded-lg"><PenTool className="w-5 h-5 text-white" /></div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Firma del Contador</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Imagen de la firma para documentos del sistema.</p>
                    </div>
                  </div>
                  {contadorSrc ? (
                    <div className="mb-4"><Label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Firma actual</Label>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800/50 inline-block">
                        <img src={contadorSrc} alt="Firma del contador" className="max-h-[100px] max-w-[300px] object-contain" />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                      <PenTool className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" /><p className="text-sm text-gray-400">Sin firma cargada</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <input ref={contadorSigFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleContadorSigUpload} className="hidden" />
                    <Button variant="outline" size="sm" disabled={contadorSigUploading} onClick={() => contadorSigFileRef.current?.click()}>
                      {contadorSigUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4 mr-2" /> Subir firma</>}
                    </Button>
                    {company?.contador_signature_url && (
                      <Button variant="outline" size="sm" onClick={() => setShowDeleteContadorSigConfirm(true)} className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400">
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar firma
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Recomendado: hasta 400x200 px, fondo transparente (PNG). Max 2 MB.</p>
                </div>
              </div>
            </ExpandableSection>

            {/* ── REVISOR FISCAL ──────────────────────────────── */}
            <ExpandableSection
              title="Revisor Fiscal"
              description="Datos e información de firma del revisor fiscal"
              icon={UserCheck}
              iconBg="bg-amber-500"
              expanded={revisorFiscalExpanded}
              onToggle={() => setRevisorFiscalExpanded(v => !v)}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Nombre completo</Label>
                    <Input value={company?.revisor_fiscal_name || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, revisor_fiscal_name: e.target.value } : null)} placeholder="Nombre del revisor fiscal" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Número de identificación</Label>
                    <Input value={company?.revisor_fiscal_identification || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, revisor_fiscal_identification: e.target.value } : null)} placeholder="Cédula del revisor fiscal" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Teléfono</Label>
                    <Input value={company?.revisor_fiscal_phone || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, revisor_fiscal_phone: e.target.value } : null)} placeholder="Teléfono del revisor fiscal" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Email</Label>
                    <Input type="email" value={company?.revisor_fiscal_email || ''} onChange={(e) => setCompany(prev => prev ? { ...prev, revisor_fiscal_email: e.target.value } : null)} placeholder="Email del revisor fiscal" className="mt-1.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveRevisorFiscal} disabled={savingRevisorFiscal} className="bg-emerald-600 hover:bg-emerald-700">
                    {savingRevisorFiscal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar Revisor Fiscal
                  </Button>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-400 rounded-lg"><PenTool className="w-5 h-5 text-white" /></div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Firma del Revisor Fiscal</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Imagen de la firma para documentos del sistema.</p>
                    </div>
                  </div>
                  {revisorSrc ? (
                    <div className="mb-4"><Label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Firma actual</Label>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800/50 inline-block">
                        <img src={revisorSrc} alt="Firma del revisor fiscal" className="max-h-[100px] max-w-[300px] object-contain" />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                      <PenTool className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" /><p className="text-sm text-gray-400">Sin firma cargada</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <input ref={revisorSigFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleRevisorSigUpload} className="hidden" />
                    <Button variant="outline" size="sm" disabled={revisorSigUploading} onClick={() => revisorSigFileRef.current?.click()}>
                      {revisorSigUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4 mr-2" /> Subir firma</>}
                    </Button>
                    {company?.revisor_fiscal_signature_url && (
                      <Button variant="outline" size="sm" onClick={() => setShowDeleteRevisorSigConfirm(true)} className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400">
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar firma
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Recomendado: hasta 400x200 px, fondo transparente (PNG). Max 2 MB.</p>
                </div>
              </div>
            </ExpandableSection>

          </div>
        )}

        {/* Tab: Facturación y Nómina Electrónica */}
        {activeTab === 'facturacion' && (
          <ElectronicTab />
        )}

        {/* Tab: Marca */}
        {activeTab === 'marca' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Marca & Formato</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Logo y formato de impresión</p>
                </div>
              </div>
            </div>

            {/* Logo Software Propio — FUNCIONAL */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Logo para impresión</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Recomendado: hasta 800×300 px.
                </p>
              </div>

              {/* Logo actual */}
              {logoSrc ? (
                <div className="mb-4">
                  <Label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Logo actual</Label>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 inline-block">
                    <img
                      src={logoSrc}
                      alt="Logo de la empresa"
                      className="max-h-[120px] max-w-[400px] object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-400">Sin logo cargado</p>
                </div>
              )}

              {/* Upload */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logoUploading}
                  onClick={() => logoFileRef.current?.click()}
                >
                  {logoUploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Subir nuevo logo</>
                  )}
                </Button>

                {company?.logo_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteLogoConfirm(true)}
                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar logo
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                Máximo 800×300 px, ≤ 2 MB. Formatos: JPG, PNG, WebP.
              </p>

              {/* Estado */}
              <div className="mt-4 flex items-center gap-2 text-sm">
                {company?.logo_url ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">Logo subido</span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Sin logo</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Nómina */}
        {activeTab === 'nomina' && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Parametría de Nómina</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configuración de nómina, conceptos y tabla UVT</p>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
              {[
                { key: 'empresa' as const, label: 'Empresa' },
                { key: 'conceptos' as const, label: 'Conceptos' },
                { key: 'uvt' as const, label: 'Tabla UVT' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPayrollTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    payrollTab === tab.key
                      ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500'
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {payrollTab === 'empresa' && <PayrollSettingsTab />}
            {payrollTab === 'conceptos' && <PayrollConceptsTab />}
            {payrollTab === 'uvt' && <PayrollUvtTab />}
          </div>
        )}
      </div>

      {/* Modal Confirmar Eliminar Logo */}
      <Dialog open={showDeleteLogoConfirm} onOpenChange={setShowDeleteLogoConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar logo</DialogTitle>
            <DialogDescription>
              Esta acción eliminará el logo de la empresa. Se dejará de mostrar en documentos y en el sidebar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteLogoConfirm(false)} disabled={logoDeleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={logoDeleting}
              onClick={async () => {
                await handleLogoDelete();
                setShowDeleteLogoConfirm(false);
              }}
            >
              {logoDeleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eliminando...</>
              ) : (
                'Sí, eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminar Firma */}
      <Dialog open={showDeleteSignatureConfirm} onOpenChange={setShowDeleteSignatureConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar firma</DialogTitle>
            <DialogDescription>
              Esta acción eliminará la firma del representante legal. Se dejará de mostrar en documentos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteSignatureConfirm(false)} disabled={signatureDeleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={signatureDeleting}
              onClick={async () => {
                await handleSignatureDelete();
                setShowDeleteSignatureConfirm(false);
              }}
            >
              {signatureDeleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eliminando...</>
              ) : (
                'Sí, eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminar Firma Contador */}
      <Dialog open={showDeleteContadorSigConfirm} onOpenChange={setShowDeleteContadorSigConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar firma del contador</DialogTitle>
            <DialogDescription>
              Esta acción eliminará la firma del contador. Se dejará de mostrar en documentos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteContadorSigConfirm(false)} disabled={contadorSigDeleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={contadorSigDeleting}
              onClick={async () => {
                await handleContadorSigDelete();
                setShowDeleteContadorSigConfirm(false);
              }}
            >
              {contadorSigDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminar Firma Revisor Fiscal */}
      <Dialog open={showDeleteRevisorSigConfirm} onOpenChange={setShowDeleteRevisorSigConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar firma del revisor fiscal</DialogTitle>
            <DialogDescription>
              Esta acción eliminará la firma del revisor fiscal. Se dejará de mostrar en documentos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteRevisorSigConfirm(false)} disabled={revisorSigDeleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={revisorSigDeleting}
              onClick={async () => {
                await handleRevisorSigDelete();
                setShowDeleteRevisorSigConfirm(false);
              }}
            >
              {revisorSigDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Verificación de Email */}
      <Dialog open={showEmailVerification} onOpenChange={(open) => { if (!open) handleCancelEmailVerification(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verificar nuevo email</DialogTitle>
            <DialogDescription>
              Para cambiar el email de la empresa a <strong>{company?.email}</strong>, necesitamos verificar que tienes acceso a ese correo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {emailVerificationError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {emailVerificationError}
              </div>
            )}

            {!emailCodeSent ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enviaremos un código de verificación de 6 dígitos a <strong>{company?.email}</strong>
                </p>
                <Button onClick={handleSendEmailCode} disabled={emailCodeLoading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {emailCodeLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                  {emailCodeLoading ? 'Enviando...' : 'Enviar código de verificación'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md text-sm">
                  Código enviado a {company?.email}. Revisa tu bandeja de entrada.
                </div>

                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Código de verificación (6 dígitos)</Label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={emailVerificationCode}
                    onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="mt-1.5 text-center text-2xl tracking-widest"
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setEmailCodeSent(false); setEmailVerificationCode(''); setEmailVerificationError(''); }}>
                    Cambiar email
                  </Button>
                  <Button onClick={handleVerifyEmailCode} disabled={emailCodeLoading || emailVerificationCode.length !== 6} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    {emailCodeLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    {emailCodeLoading ? 'Verificando...' : 'Verificar código'}
                  </Button>
                </div>

                <button type="button" onClick={handleSendEmailCode} disabled={emailCodeLoading} className="text-sm text-emerald-600 hover:text-emerald-700 underline underline-offset-4 w-full text-center">
                  Reenviar código
                </button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEmailVerification}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  );
}
