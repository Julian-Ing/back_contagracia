import { ActionDef } from '../types';

// ===== MÓDULO 31: COMMUNICATION_TEMPLATES (10 permisos) =====
export const communication_templatesActions: ActionDef[] = [
    { action_key: 'templates.email.view', action_name: 'Ver Plantillas Email', description: 'Ver plantillas email' },
    { action_key: 'templates.email.create', action_name: 'Crear Plantilla Email', description: 'Crear plantilla email' },
    { action_key: 'templates.email.edit', action_name: 'Editar Plantilla Email', description: 'Editar plantilla email' },
    { action_key: 'templates.email.delete', action_name: 'Eliminar Plantilla Email', description: 'Eliminar plantilla email' },
    { action_key: 'templates.email.preview', action_name: 'Previsualizar Email', description: 'Previsualizar email' },
    { action_key: 'templates.whatsapp.view', action_name: 'Ver Plantillas WhatsApp', description: 'Ver plantillas WhatsApp' },
    { action_key: 'templates.whatsapp.create', action_name: 'Crear Plantilla WA', description: 'Crear plantilla WhatsApp' },
    { action_key: 'templates.whatsapp.edit', action_name: 'Editar Plantilla WA', description: 'Editar plantilla WhatsApp' },
    { action_key: 'templates.whatsapp.delete', action_name: 'Eliminar Plantilla WA', description: 'Eliminar plantilla WhatsApp' },
    { action_key: 'templates.whatsapp.preview', action_name: 'Previsualizar WA', description: 'Previsualizar WhatsApp' },
  ];
