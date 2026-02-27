/**
 * Template para Nota de Ajuste de Nómina (Anulación) - Test Set DIAN
 *
 * Este JSON se envía a POST /api/ubl2.1/payroll-adjust-note/{testSetId}
 * Se envían 8 notas de ajuste consecutivas (consecutive 1-8) para anular
 * las nóminas de prueba enviadas previamente.
 *
 * Cada nota referencia una nómina previa usando su CUNE.
 */

export interface PayrollAdjustNoteTemplateParams {
  // DATOS DE LA COMPAÑÍA EMISORA - De Master DB
  // Tabla: companies (Master)
  establishment_name: string;           // companies.company_name
  establishment_address: string;        // companies.address
  establishment_phone: string;          // companies.phone
  establishment_municipality: number;   // companies.municipality_id
  establishment_email: string;          // companies.email

  // DATOS DINÁMICOS
  consecutive: number;                  // 1 a 8 (se envían 8 notas)
  prefix: string;                       // "TNA" (prueba) o "NA" (producción)
  currentDate: string;                  // Formato: YYYY-MM-DD (Colombia timezone)

  // REFERENCIA A NÓMINA PREVIA
  // Estos datos vienen de la respuesta de las nóminas enviadas previamente
  predecessor_number: string;           // Ej: "TNI1" (prefix + consecutive de la nómina)
  predecessor_cune: string;             // CUNE retornado por DIAN al enviar la nómina
  predecessor_issue_date: string;       // Fecha de emisión de la nómina (YYYY-MM-DD)
}

export function buildPayrollAdjustNoteTemplate(params: PayrollAdjustNoteTemplateParams) {
  return {
    // ==========================================
    // TIPO DE DOCUMENTO
    // ==========================================
    type_document_id: 10,                        // Hardcoded: 10 = Nota de Ajuste de Nómina
    type_note: 2,                                // Hardcoded: 2 = Anulación (1 = Normal)

    // ==========================================
    // DATOS DEL ESTABLECIMIENTO EMISOR
    // Fuente: Master DB - companies
    // ==========================================
    establishment_name: params.establishment_name,           // companies.company_name
    establishment_address: params.establishment_address,     // companies.address
    establishment_phone: params.establishment_phone,         // companies.phone
    establishment_municipality: params.establishment_municipality, // companies.municipality_id
    establishment_email: params.establishment_email,         // companies.email

    // ==========================================
    // CABECERA DEL DOCUMENTO
    // ==========================================
    head_note: "REPRESENTACION GRAFICA DE NOTA DE AJUSTE",   // Hardcoded
    foot_note: "PIE DE PAGINA NOTA DE AJUSTE",               // Hardcoded

    // ==========================================
    // NUMERACIÓN
    // ==========================================
    prefix: params.prefix,                       // "TNA" (prueba) o "NA" (producción)
    consecutive: params.consecutive,             // 1 a 8 (dinámico)
    resolution_number: "18760000001",            // Hardcoded: Número de resolución de prueba

    // ==========================================
    // REFERENCIA A NÓMINA PREVIA (ANULACIÓN)
    // Fuente: Respuesta de nóminas enviadas previamente
    // ==========================================
    predecessor: {
      predecessor_number: params.predecessor_number,         // Ej: "TNI1"
      predecessor_cune: params.predecessor_cune,             // CUNE de la nómina a anular
      predecessor_issue_date: params.predecessor_issue_date, // Fecha de la nómina original
    },

    // ==========================================
    // PERIODO (mismo de la nómina original)
    // ==========================================
    period: {
      admision_date: "2025-01-01",               // Hardcoded: Fecha de admisión de prueba
      settlement_start_date: "2025-09-01",       // Hardcoded: Inicio del periodo
      settlement_end_date: "2025-09-17",         // Hardcoded: Fin del periodo
      worked_time: "15.00",                      // Hardcoded: 15 días trabajados
      issue_date: params.currentDate,            // Generado: Fecha actual (Colombia)
    },

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    payroll_period_id: 5,                        // Hardcoded: 5 = Quincenal
    sendmail: false,                             // Hardcoded: No enviar email en notas
    sendmailtome: false,                         // Hardcoded: false
  };
}

/**
 * NOTAS DE IMPLEMENTACIÓN:
 *
 * 1. Este template es para ANULAR nóminas de prueba enviadas previamente.
 * 2. Se envían 8 notas de ajuste con consecutive 1 a 8.
 * 3. Cada nota debe referenciar una nómina previa con su CUNE.
 * 4. Los datos del establecimiento vienen de Master DB (companies).
 * 5. El prefix cambia según ambiente: "TNA" (prueba) o "NA" (producción).
 * 6. type_note: 2 indica que es una ANULACIÓN.
 *
 * ENDPOINT: POST /api/ubl2.1/payroll-adjust-note/{testSetId}
 * RESPUESTA ESPERADA: { CUNE: string, message: "generada con éxito" }
 *
 * ORIGEN DE DATOS:
 * - Master DB (companies): establishment_name, establishment_address, establishment_phone,
 *                          establishment_municipality, establishment_email
 * - Parámetros: consecutive (1-8), prefix (TNA/NA), currentDate
 * - Predecessor: predecessor_number, predecessor_cune, predecessor_issue_date
 *                (obtenidos de las respuestas de las nóminas enviadas previamente)
 * - Hardcoded: period, payroll_period_id, type_note, resolution_number
 *
 * FLUJO COMPLETO DE VALIDACIÓN DE NÓMINA:
 * 1. Enviar 10 nóminas de prueba → Obtener 10 CUNEs
 * 2. Enviar 8 notas de ajuste (anulaciones) → Referenciar 8 de los 10 CUNEs
 * 3. DIAN valida que las notas referencien correctamente las nóminas
 * 4. Si todo es válido, habilita el paso a producción
 *
 * VALIDACIÓN IMPORTANTE:
 * - El predecessor_cune DEBE ser exactamente el CUNE retornado por DIAN
 * - El predecessor_number debe coincidir con el formato: prefix + consecutive
 * - El predecessor_issue_date debe ser la fecha de la nómina original
 */
