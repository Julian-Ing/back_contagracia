/**
 * Calcula el dígito de verificación (DV) para un NIT colombiano
 * Algoritmo oficial de la DIAN
 */
const DV_FACTORS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export function calculateDV(nit: string): string {
  if (!nit || !/^\d+$/.test(nit)) return '';

  let sum = 0;
  const digits = nit.split('').reverse();

  for (let i = 0; i < digits.length && i < DV_FACTORS.length; i++) {
    sum += parseInt(digits[i], 10) * DV_FACTORS[i];
  }

  const remainder = sum % 11;
  return remainder > 1 ? String(11 - remainder) : String(remainder);
}

/**
 * Separa un nombre completo en sus partes (para persona natural)
 * @param fullName Nombre completo separado por espacios o guiones
 * @param fromDian Si viene de consulta DIAN (formato: apellido1 apellido2 nombre1 nombre2)
 */
export function splitNaturalName(
  fullName: string,
  fromDian = false
): { first: string; second: string; firstSurname: string; secondSurname: string } {
  const clean = fullName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = clean ? clean.split(' ') : [];

  if (fromDian) {
    // DIAN devuelve: apellido1 apellido2 nombre1 nombre2
    return {
      first: parts[2] || '',
      second: parts[3] || '',
      firstSurname: parts[0] || '',
      secondSurname: parts[1] || '',
    };
  }

  // Formato normal: nombre1 nombre2 apellido1 apellido2
  return {
    first: parts[0] || '',
    second: parts[1] || '',
    firstSurname: parts[2] || '',
    secondSurname: parts[3] || '',
  };
}

/**
 * Une las partes del nombre en un nombre completo
 */
export function joinNaturalName(parts: {
  first: string;
  second: string;
  firstSurname: string;
  secondSurname: string;
}): string {
  return [parts.first, parts.second, parts.firstSurname, parts.secondSurname]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida número de teléfono colombiano
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  // Acepta 10 dígitos (celular) o 7 dígitos (fijo)
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 7;
}

/**
 * Formatea número de teléfono
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return phone;
}

/**
 * Determina si un tipo de documento es para persona jurídica
 * NIT (6) y NIT de otro país (9) son para jurídica
 */
export function isJuridicaDocument(docTypeId: string): boolean {
  return ['6', '9'].includes(docTypeId);
}

/**
 * Filtra tipos de documento según tipo de organización
 * @param docTypes Lista de tipos de documento
 * @param orgTypeId ID del tipo de organización (1=Jurídica, 2=Natural)
 */
export function filterDocumentTypes<T extends { id: string }>(
  docTypes: T[],
  orgTypeId: string
): T[] {
  if (orgTypeId === '1') {
    // Jurídica: solo NIT y NIT extranjero
    return docTypes.filter((d) => isJuridicaDocument(d.id));
  }
  if (orgTypeId === '2') {
    // Natural: todos excepto NIT
    return docTypes.filter((d) => !isJuridicaDocument(d.id));
  }
  return docTypes;
}

/**
 * Valores por defecto para Colombia (Bogotá D.C.)
 * Tomados del formulario anterior TerceroForm.jsx
 */
export const DEFAULTS = {
  DEPARTMENT_ID: '5', // Bogotá D.C.
  MUNICIPALITY_ID: '149', // Bogotá
  REGIME_ID: '2', // No responsable de IVA
  LIABILITY_ID: '117', // No aplica
};
