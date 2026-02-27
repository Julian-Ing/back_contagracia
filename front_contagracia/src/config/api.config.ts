/**
 * Configuración centralizada de URLs de microservicios
 */

export const API_CONFIG = {
  // ✅ Servicios core
  AUTH: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001/api',
  ADMIN: process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || 'http://localhost:3002/api',
  COMPANY: process.env.NEXT_PUBLIC_COMPANY_SERVICE_URL || 'http://localhost:3003/api',
  USERS: process.env.NEXT_PUBLIC_USERS_SERVICE_URL || 'http://localhost:3004/api',
  INVOICING: process.env.NEXT_PUBLIC_INVOICING_SERVICE_URL || 'http://localhost:3005/api',
  INVENTORY: process.env.NEXT_PUBLIC_INVENTORY_SERVICE_URL || 'http://localhost:3006/api',
  QUOTE: process.env.NEXT_PUBLIC_QUOTE_SERVICE_URL || 'http://localhost:3007/api',
  PURCHASES: process.env.NEXT_PUBLIC_PURCHASES_SERVICE_URL || 'http://localhost:3008/api',
  ACCOUNTING: process.env.NEXT_PUBLIC_ACCOUNTING_SERVICE_URL || 'http://localhost:3010/api',
  TAX: process.env.NEXT_PUBLIC_TAX_SERVICE_URL || 'http://localhost:3009/api',
  CRM: process.env.NEXT_PUBLIC_CRM_SERVICE_URL || 'http://localhost:3011/api',
  HR: process.env.NEXT_PUBLIC_HR_SERVICE_URL || 'http://localhost:3012/api',
  REPORTS: process.env.NEXT_PUBLIC_REPORTS_SERVICE_URL || 'http://localhost:3013/api',
  INTEGRATIONS: process.env.NEXT_PUBLIC_INTEGRATIONS_SERVICE_URL || 'http://localhost:3014/api',
  NOTIFICATIONS: process.env.NEXT_PUBLIC_NOTIFICATIONS_SERVICE_URL || 'http://localhost:3015/api',
  ELECTRONIC_DOCS: process.env.NEXT_PUBLIC_ELECTRONIC_DOCS_SERVICE_URL || 'http://localhost:3016/api',
  PH: process.env.NEXT_PUBLIC_PH_SERVICE_URL || 'http://localhost:3017/api',
  MEDIA: process.env.NEXT_PUBLIC_MEDIA_SERVICE_URL || 'http://localhost:3018/api',
} as const;

export const APP_CONFIG = {
  NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Contagracia',
  ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  ENABLE_DIAN_VALIDATION: process.env.NEXT_PUBLIC_ENABLE_DIAN_VALIDATION === 'true',
} as const;

/**
 * Base URL del company-service (sin /api) para archivos estáticos (uploads)
 * @deprecated Usar getMediaUrl() para archivos gestionados por media-service
 */
export const COMPANY_BASE_URL =
  (process.env.NEXT_PUBLIC_COMPANY_SERVICE_URL || 'http://localhost:3003/api').replace(/\/api$/, '');

/**
 * Convierte una URL relativa de uploads en URL absoluta.
 * Detecta URLs de media-service (/api/media/) y las enruta correctamente.
 * @deprecated Usar getMediaUrl() para archivos nuevos
 */
export function getUploadUrl(relativePath: string): string {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  if (relativePath.startsWith('/api/media/')) return getMediaUrl(relativePath);
  return `${COMPANY_BASE_URL}${relativePath}`;
}

/**
 * Base URL del media-service (sin /api) para archivos centralizados
 */
export const MEDIA_BASE_URL =
  (process.env.NEXT_PUBLIC_MEDIA_SERVICE_URL || 'http://localhost:3018/api').replace(/\/api$/, '');

/**
 * Convierte una URL de media (/api/media/{id}) en URL absoluta del media-service
 */
export function getMediaUrl(mediaPath: string): string {
  if (!mediaPath) return '';
  if (mediaPath.startsWith('http')) return mediaPath;
  return `${MEDIA_BASE_URL}${mediaPath}`;
}

// Mapa de puertos para referencia
export const SERVICE_PORTS = {
  AUTH: 3001,
  ADMIN: 3002,
  COMPANY: 3003,
  USERS: 3004,
  INVOICING: 3005,
  INVENTORY: 3006,
  QUOTE: 3007,
  PURCHASES: 3008,
  ACCOUNTING: 3010,
  TAX: 3009,
  CRM: 3011,
  HR: 3012,
  REPORTS: 3013,
  INTEGRATIONS: 3014,
  NOTIFICATIONS: 3015,
  ELECTRONIC_DOCS: 3016,
  PH: 3017,
  MEDIA: 3018,
} as const;
