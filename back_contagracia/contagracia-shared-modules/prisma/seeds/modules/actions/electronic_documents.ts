import { ActionDef } from '../types';

// ===== MÓDULO: ELECTRONIC_DOCUMENTS - Documentos Electrónicos DIAN =====
export const electronic_documentsActions: ActionDef[] = [
    // General
    { action_key: 'electronic_documents.view', action_name: 'Ver Documentos Electrónicos', description: 'Acceder al módulo de documentos electrónicos' },

    // Certificado
    { action_key: 'electronic_documents.certificate.load', action_name: 'Cargar Certificado', description: 'Cargar certificado digital para firma electrónica' },

    // Software y ambientes
    { action_key: 'electronic_documents.invoice_software.manage', action_name: 'Gestionar Software Facturación', description: 'Configurar software de facturación electrónica' },
    { action_key: 'electronic_documents.payroll_software.manage', action_name: 'Gestionar Software Nómina', description: 'Configurar software de nómina electrónica' },
    { action_key: 'electronic_documents.invoice_environment.manage', action_name: 'Gestionar Ambiente Facturación', description: 'Configurar ambiente de facturación (pruebas/producción)' },
    { action_key: 'electronic_documents.payroll_environment.manage', action_name: 'Gestionar Ambiente Nómina', description: 'Configurar ambiente de nómina (pruebas/producción)' },

    // Resoluciones
    { action_key: 'electronic_documents.resolutions.view', action_name: 'Ver Resoluciones', description: 'Ver resoluciones de facturación' },
    { action_key: 'electronic_documents.resolutions.create', action_name: 'Crear Resolución', description: 'Crear resolución' },
    { action_key: 'electronic_documents.resolutions.edit', action_name: 'Editar Resolución', description: 'Editar resolución' },
    { action_key: 'electronic_documents.resolutions.delete', action_name: 'Eliminar Resolución', description: 'Eliminar (desactivar) resolución' },

    // Envío de documentos
    { action_key: 'electronic_documents.invoices.send', action_name: 'Enviar Factura', description: 'Enviar factura electrónica a DIAN' },
    { action_key: 'electronic_documents.invoices.view_status', action_name: 'Ver Estado Factura', description: 'Ver estado de envío de factura' },
    { action_key: 'electronic_documents.credit_notes.send', action_name: 'Enviar Nota Crédito', description: 'Enviar nota crédito a DIAN' },
    { action_key: 'electronic_documents.debit_notes.send', action_name: 'Enviar Nota Débito', description: 'Enviar nota débito a DIAN' },
    { action_key: 'electronic_documents.support_docs.send', action_name: 'Enviar Doc Soporte', description: 'Enviar documento soporte a DIAN' },

    // RADIAN — Facturas recibidas electrónicas
    { action_key: 'electronic_documents.radian.view', action_name: 'Ver Facturas Recibidas', description: 'Ver facturas recibidas electrónicas' },
    { action_key: 'electronic_documents.radian.import', action_name: 'Importar de DIAN', description: 'Importar facturas recibidas de DIAN' },
    { action_key: 'electronic_documents.radian.accept', action_name: 'Aceptar Factura', description: 'Aceptar factura recibida' },
    { action_key: 'electronic_documents.radian.reject', action_name: 'Rechazar Factura', description: 'Rechazar factura recibida' },
    { action_key: 'electronic_documents.radian.events.send', action_name: 'Enviar Eventos RADIAN', description: 'Enviar eventos RADIAN a DIAN' },
    { action_key: 'electronic_documents.radian.events.view', action_name: 'Ver Eventos RADIAN', description: 'Ver eventos RADIAN enviados' },
    { action_key: 'electronic_documents.radian.export', action_name: 'Exportar Facturas Recibidas', description: 'Exportar facturas recibidas' },
  ];
