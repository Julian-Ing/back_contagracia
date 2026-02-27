import { ActionDef } from '../types';

// ===== MÓDULO 6: QUOTES - Cotizaciones (11 permisos) =====
export const quotesActions: ActionDef[] = [
    { action_key: 'quotes.view', action_name: 'Ver Cotizaciones', description: 'Ver listado de cotizaciones' },
    { action_key: 'quotes.create', action_name: 'Crear Cotización', description: 'Crear nueva cotización' },
    { action_key: 'quotes.edit', action_name: 'Editar Cotización', description: 'Editar cotización' },
    { action_key: 'quotes.delete', action_name: 'Eliminar Cotización', description: 'Eliminar cotización en borrador' },
    { action_key: 'quotes.duplicate', action_name: 'Duplicar Cotización', description: 'Duplicar cotización' },
    { action_key: 'quotes.send', action_name: 'Enviar Cotización', description: 'Enviar cotización al cliente' },
    { action_key: 'quotes.approve', action_name: 'Aprobar Cotización', description: 'Aprobar cotización' },
    { action_key: 'quotes.reject', action_name: 'Rechazar Cotización', description: 'Rechazar cotización' },
    { action_key: 'quotes.convert_to_invoice', action_name: 'Convertir a Factura', description: 'Convertir cotización a factura' },
    { action_key: 'quotes.print', action_name: 'Imprimir Cotización', description: 'Imprimir cotización' },
    { action_key: 'quotes.export', action_name: 'Exportar Cotizaciones', description: 'Exportar cotizaciones' },
  ];
