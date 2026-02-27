/**
 * Tipos para el Parser de PDFs del Calendario DIAN
 */

/**
 * Resultado del parseo de una fecha individual
 */
export interface ParsedDate {
  taxObligationTypeCode: string;
  year: number;
  periodName: string; // "mensual", "bimestral", "anual", etc.
  periodStartMonth?: number;
  periodEndMonth?: number;
  installmentNumber: number;
  installmentDescription?: string;
  nitLastDigits?: string; // "0"-"9" o null
  dueDate: Date;
  dueMonthName: string;
  dueDay: number;
  isDeclaration: boolean;
  isPayment: boolean;
}

/**
 * Resultado completo del parseo de un PDF
 */
export interface PdfParseResult {
  year: number;
  sourceUrl?: string;
  dates: ParsedDate[];
  totalDates: number;
  taxTypesDetected: string[];
  parseErrors: string[];
  parseWarnings: string[];
}

/**
 * Tipo de obligación detectado en el PDF
 */
export interface DetectedTaxType {
  code: string;
  keywords: string[];
  periodicity: string;
  nitDigitType: string;
}

/**
 * Configuración de patrones de búsqueda
 */
export interface ParserPatterns {
  taxTypePatterns: Record<string, RegExp[]>;
  datePatterns: RegExp[];
  nitPatterns: RegExp[];
  monthNames: Record<string, number>;
}
