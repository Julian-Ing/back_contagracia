# Electronic Documents - Frontend Components

**Fecha**: 18 de febrero, 2026

## Resumen

Implementación de los tres componentes React para gestión de configuración DIAN:
- **CertificateCard**: Carga y gestión de certificados digitales (.p12/.pfx)
- **InvoiceSoftwareCard**: Configuración de software de facturación y ambiente (producción/habilitación)
- **PayrollSoftwareCard**: Configuración de software de nómina y ambiente (producción/habilitación)

Todos los componentes están integrados en la pestaña "Configuración DIAN" dentro de la sección de perfil de compañía.

## Cambios en el Frontend

### Nuevos Componentes

**`src/modules/electronic-documents/components/CertificateCard.tsx`**
- Upload de archivo .p12/.pfx (máximo 5MB)
- Input de contraseña
- Validación de formato de archivo
- Muestra fecha de vencimiento del certificado
- Permiso requerido: `electronic_documents.certificate.load`
- Endpoint: `POST /api/electronic-documents/certificate/upload`

**`src/modules/electronic-documents/components/InvoiceSoftwareCard.tsx`**
- Inputs para Software ID (UUID) y Software PIN (5 dígitos numéricos)
- Toggle para cambiar ambiente entre Habilitación y Producción
- Validación de PIN (exactamente 5 dígitos)
- Permisos: `electronic_documents.invoice_software.manage`, `electronic_documents.invoice_environment.manage`
- Endpoints:
  - `PATCH /api/electronic-documents/software/invoice` → `{software_id, software_pin}`
  - `PATCH /api/electronic-documents/environment/invoice/production`
  - `PATCH /api/electronic-documents/environment/invoice/habilitation`

**`src/modules/electronic-documents/components/PayrollSoftwareCard.tsx`**
- Idéntico a InvoiceSoftwareCard pero para nómina
- Permisos: `electronic_documents.payroll_software.manage`, `electronic_documents.payroll_environment.manage`
- Endpoints:
  - `PATCH /api/electronic-documents/software/payroll` → `{payroll_id, payroll_pin}`
  - `PATCH /api/electronic-documents/environment/payroll/production`
  - `PATCH /api/electronic-documents/environment/payroll/habilitation`

**`src/modules/electronic-documents/components/index.ts`**
- Export público de los tres componentes

### Actualización de Componentes Existentes

**`src/app/dashboard/company-profile/components/DianConfigTab.tsx`**
- Reemplazado placeholder "Próximamente" con grilla responsiva
- Layout: 3 columnas en desktop (lg), 2 en tablet (md), 1 en móvil
- Importa y renderiza: CertificateCard, InvoiceSoftwareCard, PayrollSoftwareCard
- Grid con gap de 6px

## Características Comunes de Componentes

- Hooks de permisos: `usePermissions()` con `hasPermission()`
- Validación de permisos con UI de sin-acceso si el usuario no tiene permisos
- Estado de carga con spinner durante peticiones API
- Manejo de errores con react-hot-toast
- Campos deshabilitados durante carga
- Validación de inputs en frontend antes de envío

## Estructura de Carpetas

```
src/modules/electronic-documents/
├── components/
│   ├── CertificateCard.tsx
│   ├── InvoiceSoftwareCard.tsx
│   ├── PayrollSoftwareCard.tsx
│   └── index.ts
```

## Notas Técnicas

- Todos los componentes son 'use client' (componentes del cliente)
- Se utiliza Lucide React para iconografía
- Componentes de UI: Button, Input, Label, Card (de shadcn/ui)
- Validación de PIN: solo acepta dígitos numéricos, máximo 5 caracteres
- Validación de certificado: solo archivos .p12 o .pfx, máximo 5MB
- Estados visuales de carga/deshabilitación bien definidos

## Integración

Los componentes están listos para ser usados en la configuración DIAN del perfil de compañía. La integración en DianConfigTab es automática y responsiva.

## Endpoints del Backend Requeridos

Los tres componentes esperan los siguientes endpoints (implementados en electronic-documents-service):

- `POST /api/electronic-documents/certificate/upload`
- `POST /api/electronic-documents/certificate/info`
- `PATCH /api/electronic-documents/software/invoice`
- `PATCH /api/electronic-documents/software/payroll`
- `PATCH /api/electronic-documents/environment/invoice/production`
- `PATCH /api/electronic-documents/environment/invoice/habilitation`
- `PATCH /api/electronic-documents/environment/payroll/production`
- `PATCH /api/electronic-documents/environment/payroll/habilitation`
