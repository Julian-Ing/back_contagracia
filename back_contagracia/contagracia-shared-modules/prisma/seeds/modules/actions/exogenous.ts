import { ActionDef } from '../types';

// ===== MÓDULO 22: EXOGENOUS - Información Exógena (7 permisos) =====
export const exogenousActions: ActionDef[] = [
    { action_key: 'exogenous.view', action_name: 'Ver Información Exógena', description: 'Ver información exógena' },
    { action_key: 'exogenous.generate', action_name: 'Generar Archivos', description: 'Generar archivos exógena' },
    { action_key: 'exogenous.validate', action_name: 'Validar Información', description: 'Validar información' },
    { action_key: 'exogenous.download', action_name: 'Descargar Archivos', description: 'Descargar archivos' },
    { action_key: 'exogenous.concepts.view', action_name: 'Ver Conceptos', description: 'Ver conceptos' },
    { action_key: 'exogenous.concepts.configure', action_name: 'Configurar Conceptos', description: 'Configurar conceptos' },
    { action_key: 'exogenous.history.view', action_name: 'Ver Historial', description: 'Ver historial' },
  ];
