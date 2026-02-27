/**
 * Formatea una fecha ISO string a formato legible en español (Colombia)
 * Evita el desfase de timezone al parsear la fecha como local
 *
 * @param dateStr - Fecha en formato ISO (ej: "2026-02-07" o "2026-02-07T00:00:00.000Z")
 * @returns Fecha formateada (ej: "07 de feb de 2026")
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  // Parsear como fecha local para evitar desfase de timezone
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formatea una fecha y hora ISO string a formato legible en español (Colombia)
 *
 * @param dateStr - Fecha en formato ISO con hora
 * @returns Fecha y hora formateada (ej: "07 de feb de 2026, 14:30")
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea una fecha ISO string a formato corto
 *
 * @param dateStr - Fecha en formato ISO
 * @returns Fecha formateada (ej: "07/02/2026")
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatea una fecha ISO string para encabezados de reportes
 * Formato largo en español: "1 de enero de 2026"
 *
 * @param dateStr - Fecha en formato ISO (ej: "2026-01-01")
 * @returns Fecha formateada (ej: "1 de enero de 2026")
 */
export function formatDateLong(dateStr: string): string {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
