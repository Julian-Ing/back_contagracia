export interface CategoryRule {
  maxSize: number; // bytes
  allowedMimeTypes: string[];
  defaultVisibility: 'public' | 'company' | 'private';
  uploadPermission: string | null; // null = any authenticated user
  viewPermission: string | null; // null = no extra permission (visibility rules apply)
}

const MB = 1024 * 1024;

export const CATEGORY_CONFIG: Record<string, CategoryRule> = {
  company_logo: {
    maxSize: 2 * MB,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    defaultVisibility: 'company',
    uploadPermission: 'company.logo.upload',
    viewPermission: null,
  },
  company_signature: {
    maxSize: 2 * MB,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    defaultVisibility: 'company',
    uploadPermission: 'company.signature.upload',
    viewPermission: null,
  },
  employee_document: {
    maxSize: 5 * MB,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ],
    defaultVisibility: 'company',
    uploadPermission: 'employees.edit',
    viewPermission: 'employees.view',
  },
  cms_image: {
    maxSize: 5 * MB,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    defaultVisibility: 'public',
    uploadPermission: null,
    viewPermission: null,
  },
  blog_image: {
    maxSize: 5 * MB,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    defaultVisibility: 'public',
    uploadPermission: null,
    viewPermission: null,
  },
  site_asset: {
    maxSize: 2 * MB,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/x-icon',
      'image/vnd.microsoft.icon',
    ],
    defaultVisibility: 'public',
    uploadPermission: null,
    viewPermission: null,
  },
  certificate: {
    maxSize: 5 * MB,
    allowedMimeTypes: [
      'application/x-pkcs12',
      'application/pkcs12',
      'application/octet-stream',
    ],
    defaultVisibility: 'private',
    uploadPermission: 'electronic_documents.certificate.load',
    viewPermission: 'electronic_documents.certificate.load',
  },
  ph_condominium_logo: {
    maxSize: 2 * MB,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    defaultVisibility: 'public',
    uploadPermission: null,
    viewPermission: null,
  },
  ph_document: {
    maxSize: 10 * MB,
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
      'application/msword',       // .doc
      'application/vnd.ms-excel', // .xls
      'image/jpeg',
      'image/jpg',
      'image/png',
    ],
    defaultVisibility: 'company',
    uploadPermission: null,
    viewPermission: null,
  },
  product_image: {
    maxSize: 5 * MB,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    defaultVisibility: 'company',
    uploadPermission: 'inventory.items.upload_image',
    viewPermission: null,
  },
  general: {
    maxSize: 5 * MB,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ],
    defaultVisibility: 'company',
    uploadPermission: null,
    viewPermission: null,
  },
};

export function getCategoryConfig(category: string): CategoryRule | null {
  return CATEGORY_CONFIG[category] ?? null;
}

export function getValidCategories(): string[] {
  return Object.keys(CATEGORY_CONFIG);
}
