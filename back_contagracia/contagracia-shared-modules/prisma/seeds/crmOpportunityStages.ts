/**
 * Etapas por defecto del pipeline de oportunidades CRM
 */
export const crmOpportunityStages = [
  { name: 'Prospección', position: 1, color: '#3B82F6', is_won: false, is_lost: false },
  { name: 'Negociación', position: 2, color: '#8B5CF6', is_won: false, is_lost: false },
  { name: 'Cotizando', position: 3, color: '#F59E0B', is_won: false, is_lost: false },
  { name: 'Ganada', position: 4, color: '#10B981', is_won: true, is_lost: false },
  { name: 'Perdida', position: 5, color: '#6B7280', is_won: false, is_lost: true },
];
