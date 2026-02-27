/**
 * Normaliza un número de teléfono a formato +XXXXXXXXXXX
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Genera variantes de un número para búsqueda flexible
 * Soporta formato colombiano (+57, 57, 3XX)
 */
export function getNumberVariants(number: string): string[] {
  const variants: string[] = [number];

  if (number.startsWith('+')) {
    variants.push(number.substring(1));
  } else {
    variants.push('+' + number);
  }

  // Colombia: +57XXXXXXXXXX
  if (number.startsWith('+57')) {
    variants.push(number.substring(3)); // local sin código país
  } else if (number.startsWith('57') && number.length > 10) {
    variants.push(number.substring(2));
    variants.push('+' + number);
  }

  // Número local colombiano (empieza con 3, 10 dígitos)
  if (number.match(/^3\d{9}$/)) {
    variants.push('+57' + number);
    variants.push('57' + number);
  }

  return [...new Set(variants)];
}

/**
 * Convierte número a formato WhatsApp de Twilio: whatsapp:+XXXXXXXXXXX
 */
export function toWhatsAppFormat(phone: string): string {
  const normalized = normalizePhone(phone);
  return `whatsapp:${normalized}`;
}

/**
 * Extrae número limpio del formato WhatsApp de Twilio
 */
export function fromWhatsAppFormat(whatsappPhone: string): string {
  return whatsappPhone.replace('whatsapp:', '');
}
