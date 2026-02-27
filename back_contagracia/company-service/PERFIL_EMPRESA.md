# Perfil de Empresa - Hoja de Ruta

## Resumen

Implementación de la página de Perfil de Empresa que permite configurar:
- Información general de la empresa
- Configuración de integraciones (Email SMTP, Twilio WhatsApp, Pasarelas de pago, etc.)
- Gestión de plantillas de email para automatizaciones

Basado en la implementación de `horizont/src/pages/dashboard/CompanyProfile.jsx`.

---

## Estado Actual

### Backend (company-service + crm-service)

| Componente | Estado | Ubicación |
|------------|--------|-----------|
| CRUD Company básico | ✅ Listo | `company-service/modules/companies/` |
| GET /companies/:id | ✅ Listo | Retorna datos básicos (JWT auth fixed) |
| PATCH /companies/:id | ✅ Listo | Actualiza empresa (JWT auth fixed) |
| Tabla `email_sms_config` | ✅ Listo | schema-tenant - Campos SMTP y Twilio |
| Endpoints email config | ✅ Listo | `crm-service/modules/integrations/` |
| Endpoints plantillas email | ✅ Listo | `crm-service/modules/automations/` |
| Email sender sin hardcode | ✅ Listo | Usa tenant config > env vars fallback |

### Frontend

| Componente | Estado | Ubicación |
|------------|--------|-----------|
| Ruta `/dashboard/company-profile` | ✅ Listo | `app/dashboard/company-profile/page.tsx` |
| Link en Header | ✅ Listo | `Header.tsx` |
| Módulo company | ✅ Listo | `src/modules/company/` |
| Config Email SMTP (UI) | ✅ Listo | Select SMTP, password show/hide, validación, test email |
| Plantillas Email (UI) | ✅ Listo | CRUD + modal editor |

### Tablas Relevantes (schema-tenant.prisma)

```prisma
model EmailSmsConfig {
  id String @id @default(uuid())

  smtp_host     String?
  smtp_port     Int     @default(587)
  smtp_user     String?
  smtp_password String?
  from_name     String?

  twilio_account_sid     String?
  twilio_auth_token      String?
  twilio_whatsapp_number String?

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("email_sms_config")
}

model CrmEmailTemplate {
  id          String    @id @default(uuid())
  name        String
  subject     String
  body_html   String
  variables   String?   // JSON array de variables disponibles
  is_active   Boolean   @default(true)
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt
  deleted_at  DateTime?

  // Relations
  opportunity_automations CrmOpportunityAutomation[]
  form_automations        CrmFormAutomation[]

  @@map("crm_email_templates")
}
```

---

## Plan de Implementación

### Fase 1: Backend - Endpoints de Configuración ✅

**Ubicación:** `company-service/src/modules/integrations/`

#### 1.1 Crear módulo de integraciones

```
src/modules/integrations/
├── integrations.module.ts
├── integrations.controller.ts
├── integrations.service.ts
└── dto/
    ├── email-config.dto.ts
    └── twilio-config.dto.ts
```

#### 1.2 Endpoints a crear

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/companies/:companyId/integrations/email` | Obtener config SMTP |
| PUT | `/companies/:companyId/integrations/email` | Guardar/actualizar config SMTP |
| POST | `/companies/:companyId/integrations/email/test` | Enviar email de prueba |
| GET | `/companies/:companyId/integrations/twilio` | Obtener config Twilio |
| PUT | `/companies/:companyId/integrations/twilio` | Guardar/actualizar config Twilio |

#### 1.3 DTOs

```typescript
// email-config.dto.ts
export class UpdateEmailConfigDto {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  from_name?: string;
}

// twilio-config.dto.ts
export class UpdateTwilioConfigDto {
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_whatsapp_number?: string;
}
```

---

### Fase 2: Backend - CRUD Plantillas Email ✅

**Nota:** El CRUD de plantillas ya existe en crm-service. Evaluar si:
- A) Consumir desde crm-service (recomendado - ya funciona)
- B) Duplicar en company-service (no recomendado)

**Decisión:** Usar crm-service para plantillas. El frontend llamará a:
- `GET /companies/:companyId/crm/email-templates`
- `POST /companies/:companyId/crm/email-templates`
- `PATCH /companies/:companyId/crm/email-templates/:id`
- `DELETE /companies/:companyId/crm/email-templates/:id`

---

### Fase 3: Frontend - Página Company Profile ✅

**Ubicación:** `src/app/dashboard/company-profile/page.tsx`

#### 3.1 Estructura de la página

```
Perfil de Empresa
├── Tab: General (datos básicos e integraciones)
│   ├── Card: Información General
│   │   ├── NIT, Razón Social
│   │   ├── Tipo Documento, Tipo Persona
│   │   └── Botón Guardar
│   │
│   ├── Card: Configuración de Email (SMTP) [expandible]
│   │   ├── Servidor SMTP (select + custom)
│   │   ├── Puerto (select + custom)
│   │   ├── Usuario, Contraseña
│   │   ├── Nombre remitente
│   │   ├── Estado de configuración
│   │   └── Botón Guardar + Test
│   │
│   ├── Card: Plantillas de Email [expandible]
│   │   ├── Lista de plantillas
│   │   ├── Botón Nueva Plantilla
│   │   └── Modal Editor de plantilla
│   │
│   ├── Card: WhatsApp Business (Twilio) [expandible]
│   │   └── (Pendiente - otro dev)
│   │
│   └── Card: Otras integraciones [expandible]
│       ├── ePayco
│       ├── Bold
│       ├── Wompi
│       └── Cal.com
```

#### 3.2 Componentes a crear

```
src/app/dashboard/company-profile/
├── page.tsx                    # Página principal
└── components/
    ├── GeneralInfoCard.tsx     # Info básica de empresa
    ├── EmailConfigCard.tsx     # Config SMTP
    ├── EmailTemplatesCard.tsx  # Gestión de plantillas
    ├── TwilioConfigCard.tsx    # Config WhatsApp (pendiente)
    └── TemplateEditorModal.tsx # Editor de plantillas
```

#### 3.3 Hooks y Services

```
src/modules/company/
├── hooks/
│   ├── useCompanyProfile.ts    # Datos de empresa
│   └── useIntegrations.ts      # Config de integraciones
├── services/
│   └── company.service.ts      # API calls
└── types/
    └── index.ts                # Tipos
```

---

## Secciones de la Pestaña General

### 1. Información General
- NIT (readonly)
- Dígito verificación (readonly)
- Razón Social
- Código Decreto 768
- Tipo Documento (select)
- Tipo de Persona (select)
- **Botón:** Guardar Información General

### 2. Configuración de Email (SMTP) ⭐ PRIORIDAD
- Servidor SMTP (select con opciones: Gmail, Outlook, Yahoo, Otro)
- Puerto SMTP (select: 587 TLS, 465 SSL, 25, Otro)
- Usuario SMTP (email)
- Contraseña SMTP (password con show/hide)
- Nombre del remitente
- **Estado:** Indicador de configuración completa
- **Botones:** Guardar, Enviar email de prueba

### 3. Plantillas de Email ⭐ PRIORIDAD ✅
- Lista de plantillas existentes
- Acciones por plantilla: Editar, Eliminar
- **Botón:** Nueva Plantilla
- **Modal Editor (EmailTemplateEditor - TipTap WYSIWYG):**
  - Nombre de plantilla
  - Asunto
  - **3 modos de edición:** Visual (WYSIWYG) | HTML (avanzado) | Vista Previa
  - Toolbar: Negrita, Cursiva, H2, H3, Listas, Links, Deshacer/Rehacer
  - Variables clickeables: clic inserta `{{variable}}` en posición del cursor
  - Sincronización entre modos (Visual ↔ HTML ↔ Preview)

### 4. Credenciales PILA (Su Aporte)
- Usuario Su Aporte
- Contraseña
- Clave Secreta
- ID Aportante (readonly)

### 5. WhatsApp Business (Twilio) - Pendiente otro dev
- Account SID
- Auth Token
- Número WhatsApp

### 6. Pasarelas de Pago - Futuro
- ePayco
- Bold
- Wompi

### 7. Otras Integraciones - Futuro
- Cal.com
- Ecommerce (WooCommerce, Tienda Nube)

---

## Checklist de Implementación

### Backend (crm-service - módulo integrations)

- [x] Crear módulo `integrations` (en crm-service)
- [x] Crear `IntegrationsController`
- [x] Crear `IntegrationsService`
- [x] Endpoint GET `/companies/:id/crm/email-config`
- [x] Endpoint PUT `/companies/:id/crm/email-config`
- [x] Endpoint POST `/companies/:id/crm/email-config/test`
- [x] DTOs con validación
- [x] Fix JWT AuthGuard (Reflector dual-package en shared-modules)

### Frontend

- [x] Crear página `/dashboard/company-profile/page.tsx`
- [x] Sección Información General (NIT, Razón Social, etc.)
- [x] Sección Configuración Email SMTP (select host/port, show/hide password, validación)
- [x] Sección Plantillas de Email (CRUD + modal editor)
- [x] Componente `ExpandableSection` (extraído para evitar re-renders)
- [x] Hook `useEmail` para plantillas
- [x] Service `company.service.ts` (actualizado)
- [x] Tipos TypeScript
- [x] Validación con mensajes humanos (getEmailConfigErrors)
- [x] Test email con feedback de errores SMTP legibles
- [x] Editor visual de plantillas (TipTap WYSIWYG) con 3 modos: Visual, HTML, Vista Previa
- [x] Variables clickeables que insertan `{{variable}}` en posición del cursor
- [x] Componente `EmailTemplateEditor` reutilizable (`shared/components/editors/`)

### Integración

- [x] Conectar config email con backend (crm-service)
- [x] Conectar plantillas email con crm-service
- [x] Probar envío de email con config guardada ✅ Funcional
- [x] Quitar credenciales hardcoded de `email-sender.service.ts` (usa ConfigService + env vars)
- [x] Automatizaciones CRM usan misma config SMTP del tenant

### Pendiente (futuro)

- [ ] WhatsApp Business (Twilio) - Config UI
- [ ] Credenciales PILA (Su Aporte)
- [ ] Pasarelas de pago (ePayco, Bold, Wompi)
- [ ] Otras integraciones (Cal.com, Ecommerce)
- [ ] Tabs adicionales: Tributaria, Contacto, Facturación, Marca & Formato, Nómina

---

## Dependencias

| Servicio | Puerto | Uso |
|----------|--------|-----|
| company-service | 3003 | Config de integraciones |
| crm-service | 3011 | Plantillas de email, automatizaciones |

---

## Variables de Plantilla (de horizont)

```
Contacto:
{{contact_name}}     - Nombre del contacto
{{contact_email}}    - Email del contacto
{{contact_phone}}    - Teléfono
{{contact_company}}  - Empresa del contacto

Empresa:
{{company_name}}     - Nombre de tu empresa

Oportunidad:
{{opportunity_name}} - Nombre de la oportunidad
{{opportunity_value}} - Valor esperado

Usuario:
{{owner_name}}       - Nombre del vendedor/dueño
```

---

*Documento creado: 2026-02-06*
*Basado en: horizont/src/pages/dashboard/CompanyProfile.jsx*
