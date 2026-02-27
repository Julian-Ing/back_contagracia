export interface VariableMapping {
  source: 'contact_field' | 'context' | 'fixed' | 'manual';
  field?: string;
  value?: string;
}

/**
 * Extrae el primer nombre del nombre completo
 */
function extractFirstName(fullName: string | null): string {
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

/**
 * Resuelve el valor de una variable según su mapeo
 */
function resolveVariableValue(
  mapping: VariableMapping,
  contact: any,
  context: Record<string, string>,
): string {
  if (!mapping) return '';

  const { source, field, value } = mapping;

  switch (source) {
    case 'contact_field':
      if (field === 'first_name') {
        return extractFirstName(contact?.name);
      }
      return contact?.[field as string] || '';

    case 'context':
      if (field === 'current_date') {
        return new Date().toLocaleDateString('es-CO');
      }
      if (field === 'current_time') {
        return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      }
      return context?.[field as string] || '';

    case 'fixed':
      return value || '';

    case 'manual':
      return ''; // Se proporciona manualmente

    default:
      return '';
  }
}

/**
 * Aplica el mapeo de variables y retorna las variables resueltas
 */
export function resolveVariables(
  mapping: Record<string, VariableMapping>,
  contact: any,
  context: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [varNum, varMapping] of Object.entries(mapping)) {
    result[varNum] = resolveVariableValue(varMapping, contact, context);
  }

  return result;
}
