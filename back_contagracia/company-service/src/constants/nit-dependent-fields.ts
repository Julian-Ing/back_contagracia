/**
 * IMPORTANTE: Campos que contienen rutas con NIT en su valor
 *
 * Si agregas un nuevo campo que guarda rutas de uploads con NIT en el path,
 * DEBES agregarlo aquí para que se actualice automáticamente cuando cambie el NIT.
 *
 * Ejemplo de ruta con NIT: /uploads/logos/123456789/logo.png
 *                          /uploads/signatures/123456789/firma.png
 *
 * Cuando el NIT cambia de 123456789 a 987654321:
 * - Se renombran las carpetas físicas
 * - Se actualizan automáticamente todos los campos listados aquí
 */

export interface NitDependentField {
  table: string;
  field: string;
  where?: Record<string, any>;
}

export const NIT_DEPENDENT_FIELDS = {
  /**
   * Campos en la tabla Company (master DB)
   * Solo logo_url se mantiene como copia sync en master
   */
  master: [
    { table: 'Company', field: 'logo_url' },
  ] as NitDependentField[],

  /**
   * Campos en tablas del tenant DB
   * Usar 'where' para filtrar registros específicos si es necesario
   */
  tenant: [
    {
      table: 'CompanySetting',
      field: 'value',
      where: { category: 'brand', key: 'logo_url' },
    },
    {
      table: 'CompanySetting',
      field: 'value',
      where: { category: 'legal_representative', key: 'signature_url' },
    },
    {
      table: 'CompanySetting',
      field: 'value',
      where: { category: 'accountant', key: 'signature_url' },
    },
    {
      table: 'CompanySetting',
      field: 'value',
      where: { category: 'tax_auditor', key: 'signature_url' },
    },
    {
      table: 'CompanySetting',
      field: 'value',
      where: { category: 'dian', key: 'certificate_path' },
    },
  ] as NitDependentField[],
};
