/**
 * Environment configuration
 * Centraliza todas las variables de entorno
 */

export const env = {
  // API URLs (sincronizado con api.config.ts SERVICE_PORTS)
  authServiceUrl: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001',
  adminServiceUrl: process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || 'http://localhost:3002',
  companyServiceUrl: process.env.NEXT_PUBLIC_COMPANY_SERVICE_URL || 'http://localhost:3003',
  usersServiceUrl: process.env.NEXT_PUBLIC_USERS_SERVICE_URL || 'http://localhost:3004',
  invoicingServiceUrl: process.env.NEXT_PUBLIC_INVOICING_SERVICE_URL || 'http://localhost:3005',
  inventoryServiceUrl: process.env.NEXT_PUBLIC_INVENTORY_SERVICE_URL || 'http://localhost:3006',
  salesServiceUrl: process.env.NEXT_PUBLIC_SALES_SERVICE_URL || 'http://localhost:3007',
  purchasesServiceUrl: process.env.NEXT_PUBLIC_PURCHASES_SERVICE_URL || 'http://localhost:3008',
  accountingServiceUrl: process.env.NEXT_PUBLIC_ACCOUNTING_SERVICE_URL || 'http://localhost:3009',
  taxServiceUrl: process.env.NEXT_PUBLIC_TAX_SERVICE_URL || 'http://localhost:3010',

  // App config
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Contagracia',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3020',

  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;
