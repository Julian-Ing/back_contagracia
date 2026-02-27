/**
 * Convierte un Buffer de archivo a string base64
 * Usado para enviar el certificado .p12 al API DIAN
 */
export function fileToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}
