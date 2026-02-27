# Hoja de Ruta: Decimales Configurables + Pestaña Integraciones

> **Página:** `/dashboard/company-profile`
> **Backend:** `company-service` (NestJS, puerto 3003)
> **Frontend:** `front_contagracia` (Next.js App Router)
> **Fecha:** 2026-02-12
> **Estado:** COMPLETADO

---

## 0. Notas y decisiones confirmadas

### 0.1 Decimales: solo display, BD siempre 4

Cada tenant puede elegir cuántos decimales **mostrar** en los inputs numéricos y vistas del frontend (0 a 4). Sin embargo, todos los cálculos y campos de tablas al guardarse siempre usan 4 decimales (`Decimal(19,4)`).

- Opciones: 0, 1, 2, 3, 4
- Default: **2** (estándar contable colombiano)
- El campo se guarda en la tabla `Company` de la master DB como `display_decimals Int @default(2)`

### 0.2 ¿Por qué en Company (master DB) y no en CompanySetting (tenant DB)?

- El `company-service` siempre está activo (es servicio core)
- El `hr-service` (donde vive el CRUD de CompanySetting) está desactivado temporalmente
- Los datos de company ya se cargan al autenticarse (auth store) → no se necesita endpoint extra
- Solo se agrega 1 campo al PATCH existente de `/companies/:id`

### 0.3 NumericInput: backward compatible

El componente `NumericInput` ya tiene prop `maxDecimals`. La modificación:
- Si `maxDecimals` está definido explícitamente → lo usa (sin cambios para usos existentes)
- Si no está definido → lee del `CompanySettingsContext` (los decimales del tenant)
- Si no hay provider (página pública) → sin límite (comportamiento actual)

Los 3 usos existentes (banking, journal-entries, campaigns) ya pasan `maxDecimals` explícito → **cero impacto**.

### 0.4 Pestaña Integraciones: extracción de componente

Las 10 secciones de integración que estaban en la pestaña "General" se mueven a una nueva 6ta pestaña "Integraciones". Esto:
- Reduce `page.tsx` en ~400 líneas
- Deja la pestaña General limpia (solo datos básicos + decimales)
- Componente `IntegrationsTab` es self-contained (estado + handlers propios)

---

## 1. Parte A — Decimales Configurables

### Fase 1: Backend (company-service)

#### 1.1 Schema Prisma

**Archivo:** `contagracia-shared-modules/prisma/schema-master.prisma`

Agregar campo al modelo `Company`:

```prisma
model Company {
  // ... campos existentes ...
  user_plus Int @default(0)

  // Decimales a mostrar en UI (0-4). BD siempre guarda 4.
  display_decimals Int @default(2)

  // Status
  is_active  Boolean  @default(true)
  // ...
}
```

#### 1.2 Migración

```bash
cd contagracia-shared-modules
npx prisma migrate dev --name add-display-decimals --schema prisma/schema-master.prisma
```

Esto genera un `ALTER TABLE companies ADD COLUMN display_decimals INTEGER DEFAULT 2`.

#### 1.3 DTO de actualización

**Archivo:** `company-service/src/modules/companies/dto/update-company.dto.ts`

```typescript
import { IsInt, Min, Max } from 'class-validator';

// Agregar al final del DTO:
@ApiProperty({ description: 'Decimales a mostrar en UI (0-4)', required: false })
@IsOptional()
@IsInt()
@Min(0)
@Max(4)
display_decimals?: number;
```

#### 1.4 Service

**Archivo:** `company-service/src/modules/companies/companies.service.ts`

En `getCompany()`: agregar `display_decimals: company.display_decimals` al return.

En `updateCompany()`: agregar `display_decimals: number` al tipo Partial y al `data:` del update.

---

### Fase 2: Frontend — Provider y contexto

#### 2.1 CompanySettingsProvider

**Crear:** `front_contagracia/src/shared/providers/CompanySettingsProvider.tsx`

Context React que:
- Expone `displayDecimals` (número) y `setDisplayDecimals(n)` (actualiza local + PATCH)
- Lee de `companyService.getCompany()` al montar
- Default: 2 si no existe
- Hook `useDisplayDecimals()` retorna solo el número

#### 2.2 Montar en DashboardLayout

**Modificar:** `front_contagracia/src/app/dashboard/layout.tsx`

```tsx
<RealtimeProvider>
  <CompanySettingsProvider>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ... */}
    </div>
  </CompanySettingsProvider>
</RealtimeProvider>
```

#### 2.3 Exports

**Modificar:** `front_contagracia/src/shared/providers/index.ts`

```typescript
export { CompanySettingsProvider, useCompanySettings, useDisplayDecimals } from './CompanySettingsProvider';
```

---

### Fase 3: Frontend — NumericInput

#### 3.1 Leer contexto opcionalmente

**Modificar:** `front_contagracia/src/shared/components/ui/numeric-input.tsx`

```typescript
import { CompanySettingsContext } from '@/shared/providers/CompanySettingsProvider';

// Dentro del componente:
const settingsContext = React.useContext(CompanySettingsContext);
const maxDecimals = maxDecimalsProp !== undefined
  ? maxDecimalsProp
  : settingsContext?.displayDecimals;
```

---

### Fase 4: Frontend — UI selector de decimales

#### 4.1 Sección en pestaña General

**Modificar:** `front_contagracia/src/app/dashboard/company-profile/page.tsx`

Después del botón "Guardar Información General" (línea 925), agregar card:

- Ícono `Hash` de lucide-react + título "Decimales en Pantalla"
- 5 botones (0, 1, 2, 3, 4) tipo toggle
- Preview en vivo: `1.234,5678` → muestra formateado con los decimales seleccionados
- Al click: `companyService.updateCompany(id, { display_decimals: n })` + `setDisplayDecimals(n)` + toast

#### 4.2 Tipos frontend

**Modificar:** `front_contagracia/src/modules/company/types/index.ts`

Agregar `display_decimals?: number` a:
- `Company`
- `UpdateCompanyDto`

---

## 2. Parte B — Pestaña "Integraciones" (6ta)

### Fase 5: Extraer componente IntegrationsTab

#### 5.1 Crear IntegrationsTab

**Crear:** `front_contagracia/src/app/dashboard/company-profile/components/IntegrationsTab.tsx`

Componente self-contained que incluye:

**Estado propio:**
- 10 expanded states (email, templates, pila, twilio, epayco, bold, wompi, cal, ecommerce, notifications)
- Email config state (smtp_host, smtp_port, smtp_user, smtp_password, from_name)
- Template state (showTemplateModal, editingTemplate, templateForm)
- customSmtpHost, customSmtpPort, hasPasswordConfigured, showPassword

**Handlers propios:**
- `loadEmailConfig()` — GET `/companies/{id}/crm/email-config`
- `handleSaveEmailConfig()` — PUT `/companies/{id}/crm/email-config`
- `handleTestEmail()` — POST `/companies/{id}/crm/email-config/test`
- `getEmailConfigErrors()`, `isEmailConfigComplete`
- Template CRUD via `useEmail()` hook
- `handleOpenTemplateModal()`, `handleSaveTemplate()`, `handleDeleteTemplate()`

**10 ExpandableSection:**
1. Credenciales PILA (Su Aporte) — placeholder
2. Configuración de Email — IMPLEMENTADO (SMTP + test)
3. Plantillas de Email — IMPLEMENTADO (CRUD tabla)
4. WhatsApp Business (Twilio) — placeholder
5. Pagos con ePayco — placeholder
6. Pagos con Bold — placeholder
7. Pagos con Wompi — placeholder
8. Cal.com — placeholder
9. Integración Ecommerce — placeholder
10. Configuración de Notificaciones — placeholder

**Modal de plantillas** (Dialog con EmailTemplateEditor)

#### 5.2 Componente ExpandableSection

Se copia `ExpandableSection` (actualmente definido en page.tsx líneas 130-184) dentro de IntegrationsTab.tsx o se extrae a un archivo compartido.

---

### Fase 6: Reestructurar page.tsx

#### 6.1 Actualizar TABS

```typescript
type TabKey = 'general' | 'representante' | 'facturacion' | 'marca' | 'nomina' | 'integraciones';

const TABS = [
  { key: 'general', label: 'General', icon: Building2, description: 'Datos básicos de la empresa', ... },
  // ... 4 tabs existentes sin cambio ...
  { key: 'integraciones', label: 'Integraciones', icon: Plug, description: 'Email, pagos, WhatsApp y más', color: 'bg-orange-600', iconBg: 'bg-orange-500' },
];
```

Importar `Plug` de lucide-react.

#### 6.2 Limpiar General tab

Eliminar de page.tsx:
- 10 ExpandableSection de integraciones (líneas 927-1296)
- State variables de integración (líneas 229-262)
- Handlers de email config y templates
- Modal de plantillas
- Imports innecesarios (`useEmail`, `CrmEmailTemplate`, `EmailTemplateEditor`, `Mail`, `MessageSquare`, `CreditCard`, `Calendar`, `Bell`, `ShoppingCart`, `Shield`)

#### 6.3 Agregar tab Integraciones

```tsx
import { IntegrationsTab } from './components/IntegrationsTab';

// En el render:
{activeTab === 'integraciones' && <IntegrationsTab />}
```

---

## 3. Verificación

1. `cd contagracia-shared-modules && npx prisma migrate dev` — migración exitosa
2. Levantar company-service (`pnpm dev:company`) y frontend (`pnpm dev`)
3. Navegar a `/dashboard/company-profile` → pestaña General
4. Verificar sección "Decimales en Pantalla" con botones 0-4 y preview
5. Cambiar decimales → verificar que el valor se guarda (refresh persiste)
6. Ir a una página con NumericInput (ej: asientos contables) → verificar decimales configurados
7. Verificar pestaña "Integraciones" → 10 secciones expandibles presentes
8. Email config y templates funcionan igual que antes en la nueva pestaña
9. Tab General ya NO tiene secciones de integración

---

## 4. Checklist

### Backend — Decimales

- [x] **Fase 1:** Agregar `display_decimals` a `schema-master.prisma`
- [x] **Fase 1:** Ejecutar migración Prisma (`prisma db push` + `prisma generate` + `pnpm install`)
- [x] **Fase 1:** Agregar `display_decimals` a `UpdateCompanyDto`
- [x] **Fase 1:** Agregar a `updateCompany()` y `getCompany()` en service

### Frontend — Provider y NumericInput

- [x] **Fase 2:** Crear `CompanySettingsProvider.tsx`
- [x] **Fase 2:** Exportar desde `providers/index.ts`
- [x] **Fase 2:** Montar en `DashboardLayout`
- [x] **Fase 3:** Modificar `NumericInput` para leer contexto
- [x] **Fase 4:** Agregar `display_decimals` a tipos de company
- [x] **Fase 4:** Agregar UI selector de decimales en pestaña General

### Frontend — Pestaña Integraciones

- [x] **Fase 5:** Crear `IntegrationsTab.tsx` con estado y handlers propios
- [x] **Fase 6:** Agregar 6ta pestaña a TABS array
- [x] **Fase 6:** Limpiar page.tsx (eliminar integraciones de General)
- [x] **Fase 6:** Renderizar IntegrationsTab en nueva pestaña
- [x] **Fase 6:** Verificar que Email config y templates funcionan en nueva ubicación
