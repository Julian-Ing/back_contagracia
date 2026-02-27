import { ActionDef } from '../types';

// ===== MÓDULO 14: THIRD_PARTIES - Terceros =====
export const third_partiesActions: ActionDef[] = [
    { action_key: 'third_parties.view', action_name: 'Ver Terceros', description: 'Ver terceros' },
    { action_key: 'third_parties.create', action_name: 'Crear Tercero', description: 'Crear tercero' },
    { action_key: 'third_parties.edit', action_name: 'Editar Tercero', description: 'Editar tercero' },
    { action_key: 'third_parties.delete', action_name: 'Eliminar Tercero', description: 'Eliminar tercero' },
    { action_key: 'third_parties.import', action_name: 'Importar Terceros', description: 'Importar terceros' },
    { action_key: 'third_parties.export', action_name: 'Exportar Terceros', description: 'Exportar terceros' },
    { action_key: 'third_parties.view_detail', action_name: 'Ver Detalle Tercero', description: 'Ver detalle tercero' },
    { action_key: 'third_parties.portal.generate', action_name: 'Generar Acceso Portal', description: 'Generar acceso portal' },
    { action_key: 'third_parties.ledger.view', action_name: 'Ver Libro de Tercero', description: 'Ver libro de tercero' },
  ];
