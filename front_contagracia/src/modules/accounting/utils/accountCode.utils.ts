import type { AccountType } from '../types';

/**
 * Mapa de tipos de cuenta según el primer dígito del código PUC colombiano
 * 1 = Activos, 2 = Pasivos, 3 = Patrimonio, 4 = Ingresos,
 * 5 = Gastos, 6 = Costos, 7 = Costos de Producción,
 * 8 = Cuentas Deudoras, 9 = Cuentas Acreedoras
 */
const ACCOUNT_TYPE_BY_FIRST_DIGIT: Record<string, AccountType> = {
  '1': 'ASSET',
  '2': 'LIABILITY',
  '3': 'EQUITY',
  '4': 'INCOME',
  '5': 'EXPENSE',
  '6': 'COST',
  '7': 'PRODUCTION_COST',
  '8': 'DEBTOR_ACCOUNTS',
  '9': 'CREDITOR_ACCOUNTS',
};

/**
 * Longitudes válidas para códigos PUC: 1, 2, 4, 6, 8, 10...
 */
const VALID_CODE_LENGTHS = [1, 2, 4, 6, 8, 10, 12, 14, 16];

/**
 * Detecta el tipo de cuenta basado en el primer dígito del código
 * @param code - Código de la cuenta (ej: "110505")
 * @returns El tipo de cuenta o null si no es válido
 */
export function detectAccountType(code: string): AccountType | null {
  if (!code || code.length === 0) return null;
  const firstDigit = code.charAt(0);
  return ACCOUNT_TYPE_BY_FIRST_DIGIT[firstDigit] || null;
}

/**
 * Obtiene el código del padre de una cuenta
 * Estructura PUC (solo longitudes 1, 2, 4, 6, 8...):
 * - 1 dígito = Clase (sin padre)
 * - 2 dígitos = Grupo (padre: 1 dígito)
 * - 4 dígitos = Cuenta (padre: 2 dígitos)
 * - 6 dígitos = Subcuenta (padre: 4 dígitos)
 * - 8 dígitos = Auxiliar (padre: 6 dígitos)
 * - 10+ dígitos = padre es código - 2 últimos dígitos
 *
 * @param code - Código de la cuenta
 * @returns Código del padre o null si es cuenta raíz
 */
export function getParentCode(code: string): string | null {
  if (!code || code.length <= 1) return null;
  if (code.length === 2) return code.charAt(0);
  return code.substring(0, code.length - 2);
}

/**
 * Obtiene el nivel jerárquico de una cuenta según su código
 * @param code - Código de la cuenta
 * @returns Nivel (1=Clase, 2=Grupo, 3=Cuenta, 4=Subcuenta, 5=Auxiliar)
 */
export function getAccountLevel(code: string): number {
  if (!code) return 0;
  const length = code.length;

  if (length === 1) return 1; // Clase
  if (length === 2) return 2; // Grupo
  if (length === 4) return 3; // Cuenta
  if (length === 6) return 4; // Subcuenta
  return 5; // Auxiliar (8, 10, 12...)
}

/**
 * Obtiene el nombre del nivel jerárquico
 */
export function getAccountLevelName(code: string): string {
  const level = getAccountLevel(code);
  const names: Record<number, string> = {
    1: 'Clase',
    2: 'Grupo',
    3: 'Cuenta',
    4: 'Subcuenta',
    5: 'Auxiliar',
  };
  return names[level] || 'Auxiliar';
}

/**
 * Verifica si la longitud del código es válida para PUC
 * Solo 1, 2, 4, 6, 8, 10... dígitos
 */
export function isValidCodeLength(length: number): boolean {
  if (length === 1 || length === 2) return true;
  if (length >= 4 && length % 2 === 0) return true;
  return false;
}

/**
 * Valida que un código de cuenta sea válido
 * @param code - Código a validar
 * @returns true si es válido
 */
export function isValidAccountCode(code: string): boolean {
  if (!code) return false;
  // Solo dígitos
  if (!/^\d+$/.test(code)) return false;
  // Primer dígito debe ser 1-9
  if (code.charAt(0) === '0') return false;
  // Longitud válida (1, 2, 4, 6, 8...)
  if (!isValidCodeLength(code.length)) return false;
  return true;
}

/**
 * Genera la cadena de códigos ancestros de una cuenta
 * @param code - Código de la cuenta
 * @returns Array de códigos desde la raíz hasta el padre directo
 */
export function getAncestorCodes(code: string): string[] {
  const ancestors: string[] = [];
  let currentCode = getParentCode(code);

  while (currentCode) {
    ancestors.unshift(currentCode);
    currentCode = getParentCode(currentCode);
  }

  return ancestors;
}
