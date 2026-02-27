import { ActionDef } from '../types';

// ===== MÓDULO 2: COMPANY_PROFILE (16 permisos) =====
export const company_profileActions: ActionDef[] = [
    { action_key: 'company.profile.view', action_name: 'Ver Perfil Empresa', description: 'Ver perfil de empresa' },
    { action_key: 'company.profile.edit', action_name: 'Editar Datos Generales', description: 'Editar datos generales' },
    { action_key: 'company.logo.upload', action_name: 'Subir Logo', description: 'Subir logo' },
    { action_key: 'company.logo.delete', action_name: 'Eliminar Logo', description: 'Eliminar logo' },
    { action_key: 'company.signature.upload', action_name: 'Subir Firma Digital', description: 'Subir firma digital' },
    { action_key: 'company.certificate.upload', action_name: 'Subir Certificado DIAN', description: 'Subir certificado DIAN' },
    { action_key: 'company.email.configure', action_name: 'Configurar SMTP/Email', description: 'Configurar SMTP/Email' },
    { action_key: 'company.twilio.configure', action_name: 'Configurar Twilio/WhatsApp', description: 'Configurar Twilio/WhatsApp' },
    { action_key: 'company.epayco.configure', action_name: 'Configurar Epayco', description: 'Configurar Epayco' },
    { action_key: 'company.wompi.configure', action_name: 'Configurar Wompi', description: 'Configurar Wompi' },
    { action_key: 'company.bold.configure', action_name: 'Configurar Bold', description: 'Configurar Bold' },
    { action_key: 'company.ecommerce.configure', action_name: 'Configurar eCommerce', description: 'Configurar eCommerce' },
    { action_key: 'company.payroll.configure', action_name: 'Configurar Nómina', description: 'Configurar nómina' },
    { action_key: 'company.pila.configure', action_name: 'Configurar PILA', description: 'Configurar PILA' },
  ];
