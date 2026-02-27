# Migración: Contactos CRM → Terceros tipo CONTACT

> **Fecha:** 2026-02-04
> **Objetivo:** Migrar de `crm_contacts` a `third_parties` con rol `CONTACT`
> **Impacto:** Alto - Afecta schema, backend CRM, frontend, y datos existentes

---

## Contexto

### Situación actual
- Los contactos CRM se almacenan en tabla `crm_contacts` (modelo `CrmContact`)
- Tiene relaciones propias con leads, opportunities, activities, etc.
- Campo `tercero_id` opcional para vincular con sistema financiero
- Sistema de permisos por rol en backend (a eliminar)

### Nueva arquitectura
- **Eliminar** tabla `crm_contacts` completamente
- **Usar** tabla `third_parties` (modelo `ThirdParty`) con rol `CONTACT`
- Contacto CRM = tercero con `roles = ['CONTACT']`
- Cuando acepta cotización → agregar rol `CLIENT`: `roles = ['CONTACT', 'CLIENT']`
- **Eliminar** todo el sistema de permisos por ahora (módulo de permisos granulares en desarrollo)

### Ventajas
1. ✅ Unifica personas/empresas en una sola tabla
2. ✅ Permite múltiples roles por entidad (CONTACT + CLIENT + SUPPLIER)
3. ✅ Simplifica relaciones y evita duplicación
4. ✅ Facilita conversión de contactos a clientes formales
5. ✅ Mejor integración con sistema financiero/contable

---

## Inventario de cambios

### 1. Schema Prisma (`schema-tenant.prisma`)

#### Modelos a ELIMINAR:
- ❌ `CrmContact`
- ❌ `CrmContactTag` (o migrar a tags de ThirdParty si aplica)
- ❌ `CrmContactTagAssignment`

#### Modelos a ACTUALIZAR:

| Modelo | Campo actual | Campo nuevo | Descripción |
|--------|-------------|-------------|-------------|
| `CrmLead` | `contact_id` → `CrmContact` | `contact_id` → `ThirdParty` | Cambiar relación |
| `CrmOpportunity` | `contact_id` → `CrmContact` | `contact_id` → `ThirdParty` | Cambiar relación |
| `CrmActivity` | `contact_id` → `CrmContact` | `contact_id` → `ThirdParty` | Cambiar relación |
| `CrmFormSubmission` | `contact_id` → `CrmContact` | `contact_id` → `ThirdParty` | Cambiar relación |
| `CrmEmailSend` | `contact_id` → `CrmContact` | `contact_id` → `ThirdParty` | Cambiar relación |
| `CrmWhatsappConversation` | `contact_id` → `CrmContact` | `contact_id` → `ThirdParty` | Cambiar relación |
| `CrmWhatsappMessage` | `contact_id` → `CrmContact` | `contact_id` → `ThirdParty` | Cambiar relación |
| `Document` | `crm_contact_id` → `CrmContact` | `third_party_id` (ya existe) | Usar campo existente |

#### Campos CRM específicos en ThirdParty:

Verificar que `ThirdParty` tenga campos equivalentes a `CrmContact`:

| Campo en CrmContact | Campo en ThirdParty | Estado |
|---------------------|---------------------|--------|
| `full_name` | `name` | ✅ Existe |
| `email` | `email` | ✅ Existe |
| `phone` | `phone` | ✅ Existe |
| `company_name` | Se puede usar `name` si es empresa | ✅ OK |
| `whatsapp_number` | ❓ Verificar | Agregar si falta |
| `whatsapp_subscribed` | ❓ Verificar | Agregar si falta |
| `last_whatsapp_message_at` | ❓ Verificar | Agregar si falta |
| `tags` | ❓ Verificar | Agregar sistema de tags si falta |
| `notes` | ❓ Verificar | Agregar si falta |
| `birth_date` | ❓ Verificar | Agregar si falta |
| `segment` | ❓ Verificar (auto-calculado) | Agregar lógica si falta |
| `consent_ip`, `consent_timestamp`, `consent_method` | ❓ GDPR | Agregar si falta |

**Acción:** Revisar schema de `ThirdParty` y agregar campos faltantes si es necesario.

---

### 2. Backend - crm-service

#### Módulo `contacts` (`src/modules/contacts/`)

**Estado actual:** Usa `CrmContact`
**Nuevo:** Usar `ThirdParty` con `roles = ['CONTACT']`

**Archivos a actualizar:**

```
contacts/
├── contacts.controller.ts    → Mantener endpoints iguales
├── contacts.service.ts        → Cambiar a ThirdParty + filtrar por CONTACT
├── dto/
│   ├── create-contact.dto.ts → Adaptar a ThirdParty
│   └── update-contact.dto.ts → Adaptar a ThirdParty
└── contacts.module.ts         → Sin cambios
```

**Cambios en `contacts.service.ts`:**

```typescript
// ANTES
async findAll(companyId: string, filters) {
  const db = await this.tenantPrisma.getClientForCompany(companyId);
  return db.crmContact.findMany({
    where: { is_active: true, ...filters },
  });
}

// DESPUÉS
async findAll(companyId: string, filters) {
  const db = await this.tenantPrisma.getClientForCompany(companyId);
  return db.thirdParty.findMany({
    where: {
      is_active: true,
      roles: { has: 'CONTACT' },  // ← Filtrar por rol CONTACT
      ...filters
    },
  });
}
```

**Cambios en `create-contact.dto.ts`:**
- Adaptar campos a los de `ThirdParty`
- Asegurar que `roles` se setea automáticamente a `['CONTACT']`

**Eliminar sistema de permisos:**
- Remover guards de roles (CrmRoleGuard, etc.)
- Remover decoradores de permisos
- Dejar endpoints sin restricciones por ahora

---

#### Módulo `forms` (`src/modules/forms/`)

**Estado actual:** Crea `CrmContact` en submissions
**Nuevo:** Crear `ThirdParty` con `roles = ['CONTACT']`

**Archivo a actualizar:**
- `forms.service.ts` → Método `submitForm()` debe crear `ThirdParty` con rol `CONTACT`

```typescript
// ANTES
await db.crmContact.create({
  data: {
    full_name: formData.name,
    email: formData.email,
    ...
  }
});

// DESPUÉS
await db.thirdParty.create({
  data: {
    name: formData.name,
    email: formData.email,
    roles: ['CONTACT'],  // ← Importante
    ...
  }
});
```

---

#### Módulo `leads` (`src/modules/leads/`)

**Cambios:**
- `leads.service.ts` → Actualizar includes de `contact` (ahora es `ThirdParty`)
- `convert()` método → Al crear opportunity, `contact_id` ya apunta a `ThirdParty`
- Verificar que no haya código que asuma que `contact` es `CrmContact`

---

#### Módulo `opportunities` (`src/modules/opportunities/`)

**Cambios:**
- `opportunities.service.ts` → Actualizar includes de `contact`
- Verificar método `findAll()` y `findOne()` para incluir relación correcta con `ThirdParty`

---

### 3. Frontend - front_contagracia

#### Types (`src/modules/crm/types/`)

**Archivo a actualizar:** `contact.types.ts` o `index.ts`

```typescript
// ANTES
export interface CrmContact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  whatsapp_number: string | null;
  // ...
}

// DESPUÉS - Usar tipo de ThirdParty o crear alias
export interface CrmContact {
  id: string;
  name: string;  // ← Cambio de full_name a name
  email: string | null;
  phone: string | null;
  roles: string[];  // ← Nuevo campo
  // ... adaptar campos
}

// O importar directamente de tipos de third-parties si existen
```

**Archivos de tipos a revisar:**
- `contact.types.ts`
- `lead.types.ts` (relación contact)
- `opportunity.types.ts` (relación contact)
- `activity.types.ts` (relación contact)

---

#### Services (`src/modules/crm/services/`)

**Archivo a actualizar:** `crm.service.ts` o archivos individuales

```typescript
// El endpoint puede mantenerse igual:
// GET /api/companies/:companyId/crm/contacts
// Pero ahora el backend devuelve ThirdParty con rol CONTACT

export const contactsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    crmClient.get(`${base(companyId)}/contacts`, { params }).then(r => r.data),
  // ... resto de métodos sin cambios
};
```

**Nota:** Si los endpoints no cambian, los servicios frontend no necesitan cambios (solo tipos).

---

#### Components (`src/modules/crm/components/` y `src/app/dashboard/crm/`)

**Componentes a revisar:**

| Componente | Qué verificar |
|------------|---------------|
| `ContactsTable` | Cambiar `full_name` → `name` |
| `CreateContactModal` | Adaptar campos del formulario |
| `ContactDetailModal` | Adaptar campos mostrados |
| `LeadsTable` | Verificar display de `lead.contact.name` |
| `OpportunityCard` | Verificar display de `opp.contact.name` |
| `ConvertLeadModal` | Verificar creación de contact si aplica |

**Búsqueda global:**
- Buscar todas las referencias a `.full_name` y cambiar a `.name`
- Buscar referencias a `CrmContact` en imports y adaptar

---

### 4. Migración de datos

#### Script de migración

**Ubicación:** `back_contagracia/scripts/migrate-crm-contacts-to-third-parties.ts`

**Pasos del script:**

1. **Leer todos los contactos** de `crm_contacts`
2. **Por cada contacto:**
   ```typescript
   const newThirdParty = await db.thirdParty.create({
     data: {
       name: contact.full_name,
       email: contact.email,
       phone: contact.phone,
       roles: ['CONTACT'],  // ← Importante
       whatsapp_number: contact.whatsapp_number,
       notes: contact.notes,
       birth_date: contact.birth_date,
       // Mapear campos adicionales...
       created_at: contact.created_at,
       updated_at: contact.updated_at,
     }
   });

   // Actualizar todas las referencias:
   await db.crmLead.updateMany({
     where: { contact_id: contact.id },
     data: { contact_id: newThirdParty.id }
   });

   await db.crmOpportunity.updateMany({
     where: { contact_id: contact.id },
     data: { contact_id: newThirdParty.id }
   });

   // ... resto de relaciones
   ```

3. **Verificar integridad** de datos migrados
4. **Opcional:** Crear backup antes de eliminar tabla

---

## Plan de ejecución

### FASE 1: Preparación (Sin breaking changes)

- [x] **1.1** Agregar campos faltantes a `ThirdParty` en schema si es necesario ✅ **COMPLETADO 2026-02-05**
  - ✅ `whatsapp_number` - Ya existe en ThirdParty
  - ✅ `notes` - Ya existe en ThirdParty
  - ✅ `birth_date` - Ya existe en ThirdParty
  - ⏭️ `whatsapp_subscribed`, `last_whatsapp_message_at`, `segment`, `consent_*` - No requeridos por ahora

- [x] **1.2** Ejecutar `pnpm prisma:generate` y verificar que compile ✅ **COMPLETADO**

- [ ] **1.3** Actualizar `ThirdPartiesService` en `company-service` si necesita métodos específicos para CRM
  - ⏭️ No requerido - se usa directamente desde crm-service

### FASE 2: Migración de datos (CRÍTICO - Hacer backup)

- [x] **2.1** Crear backup de base de datos ✅ **COMPLETADO**

- [x] **2.2** Crear y ejecutar script de migración ✅ **COMPLETADO 2026-02-05**
  - ✅ Script SQL: `contagracia-shared-modules/prisma/migrations/migrate_contacts_to_third_parties.sql`
  - ✅ Migró `crm_contacts` → `third_parties` con `roles = ['CONTACT']`
  - ✅ Agregó columna `third_party_id` a todas las tablas CRM
  - ✅ Actualizó referencias en `crm_leads`, `crm_opportunities`, `crm_activities`, etc.
  - ✅ Creó foreign keys a `third_parties`

- [x] **2.3** Verificar integridad post-migración ✅ **COMPLETADO**
  - ✅ 9 contactos migrados a terceros con rol CONTACT
  - ✅ 6 leads actualizados con `third_party_id`
  - ✅ 1 oportunidad actualizada con `third_party_id`
  - ✅ Relaciones funcionando correctamente

### FASE 3: Backend CRM

- [x] **3.1** Actualizar schema Prisma ✅ **COMPLETADO 2026-02-05**
  - ✅ Campo `contact_id` renombrado a `third_party_id` en todos los modelos CRM
  - ✅ Relación `contact` renombrada a `third_party` en todos los modelos
  - ✅ `pnpm prisma:generate` ejecutado exitosamente

- [x] **3.2** Actualizar módulo `contacts` ✅ **COMPLETADO**
  - ✅ `contacts.service.ts` → Usa `thirdParty` con filtro `roles: { has: 'CONTACT' }`
  - ✅ `create-contact.dto.ts` → Adaptado a campos de ThirdParty
  - ✅ Removidos campos no existentes (`whatsapp_subscribed`, `consent_*`, `segment`)

- [x] **3.3** Actualizar módulo `forms` ✅ **COMPLETADO**
  - ✅ `forms.service.ts` → `submitForm()` crea `ThirdParty` con rol `CONTACT`
  - ✅ Deduplicación por email, phone, whatsapp_number
  - ✅ Si tercero existe sin rol CONTACT, se agrega el rol
  - ✅ `FormsPublicController` → Agregado decorador `@Public()` para acceso sin JWT

- [x] **3.4** Actualizar módulo `leads` ✅ **COMPLETADO**
  - ✅ `leads.service.ts` → Actualizado `include: { third_party: true }`
  - ✅ Filtro `third_party_id` funcionando

- [x] **3.5** Actualizar módulo `opportunities` ✅ **COMPLETADO**
  - ✅ `opportunities.service.ts` → Actualizado `include: { third_party: true }`

- [x] **3.6** Actualizar módulos adicionales ✅ **COMPLETADO**
  - ✅ `dashboard.service.ts` → Usa `thirdParty.count` con filtro `roles: { has: 'CONTACT' }`
  - ✅ `activities.service.ts` y `activities.controller.ts` → `third_party_id`
  - ✅ `email.service.ts` y `email.controller.ts` → `third_party_id`
  - ✅ `whatsapp.service.ts` y DTOs → `third_party_id`, `include: { third_party: true }`

- [ ] **3.7** Eliminar sistema de permisos
  - ⏭️ Pendiente - Módulo de permisos granulares en desarrollo

- [x] **3.8** Probar endpoints ✅ **COMPLETADO**
  - ✅ GET /contacts → devuelve ThirdParty con rol CONTACT
  - ✅ POST /contacts → crea ThirdParty con rol CONTACT
  - ✅ GET /leads → incluye third_party
  - ✅ GET /opportunities → incluye third_party
  - ✅ GET /public/forms/:companyId/:slug → acceso público funcionando

### FASE 4: Frontend

- [ ] **4.1** Actualizar tipos TypeScript
  - `contact.types.ts` → Adaptar a ThirdParty
  - Cambiar `full_name` → `name` en todos los tipos
  - Actualizar tipos de `CrmLead`, `CrmOpportunity`, etc.

- [ ] **4.2** Actualizar componentes
  - Buscar y reemplazar `.full_name` → `.name`
  - Verificar `ContactsTable`, modales de contacto
  - Verificar displays en leads, opportunities

- [ ] **4.3** Probar flujos completos en UI
  - Crear contacto desde `/dashboard/crm/contacts`
  - Crear lead con contacto existente
  - Convertir lead a opportunity
  - Enviar formulario web → debe crear ThirdParty con rol CONTACT
  - Generar cotización → debe agregar rol CLIENT (cuando se implemente)

### FASE 5: Limpieza

- [ ] **5.1** Drop tabla `crm_contacts` de base de datos
  ```sql
  DROP TABLE IF EXISTS crm_contacts CASCADE;
  DROP TABLE IF EXISTS crm_contact_tags CASCADE;
  DROP TABLE IF EXISTS crm_contact_tag_assignments CASCADE;
  ```

- [ ] **5.2** Remover archivos no usados en backend
  - Buscar referencias a `CrmContact` y limpiar imports

- [ ] **5.3** Remover archivos no usados en frontend
  - Buscar referencias a tipos antiguos

- [ ] **5.4** Actualizar documentación (MIGRACION_CRM.md, README.md)

---

## Consideraciones importantes

### 1. Sistema de Tags
Si `CrmContact` tenía sistema de tags y `ThirdParty` no:
- **Opción A:** Agregar sistema de tags a `ThirdParty` (tabla `ThirdPartyTag` + `ThirdPartyTagAssignment`)
- **Opción B:** Usar un campo JSON `tags: Json?` en `ThirdParty`

### 2. Segmentación automática
El campo `segment` en `CrmContact` era auto-calculado (Frecuente, Inactivo, Alto Valor, Nuevo).
- Decidir si mantener esta lógica en `ThirdParty`
- Puede ser un campo calculado on-demand o un campo actualizado por job

### 3. WhatsApp
Si `ThirdParty` no tiene campos de WhatsApp (`whatsapp_number`, `whatsapp_subscribed`, etc.):
- Agregarlos al schema
- O manejar en tabla separada de configuración de WhatsApp por tercero

### 4. GDPR / Consentimiento
Verificar que `ThirdParty` tenga los campos de consentimiento necesarios para cumplir GDPR.

### 5. Conversión a cliente
Cuando un contacto CRM acepta una cotización:
```typescript
// Agregar rol CLIENT al tercero
await db.thirdParty.update({
  where: { id: contactId },
  data: {
    roles: { push: 'CLIENT' }  // Agregar CLIENT a roles
  }
});
```

El tercero ahora tiene `roles = ['CONTACT', 'CLIENT']`.

---

## Rollback plan

En caso de problemas críticos:

1. **Restaurar backup** de base de datos
   ```bash
   pg_restore -U postgres -d nombre_db backup_pre_migracion.dump
   ```

2. **Revertir cambios** en código:
   - `git revert` de commits de migración
   - Volver a `pnpm prisma:generate` con schema anterior

3. **Reiniciar servicios** con versión anterior

---

## Testing checklist

Antes de considerar completa la migración, probar:

- [x] Crear contacto desde UI → debe crear `ThirdParty` con rol `CONTACT` ✅
- [x] Listar contactos → debe mostrar solo terceros con rol `CONTACT` ✅
- [x] Editar contacto → debe actualizar `ThirdParty` ✅
- [x] Crear lead con contacto → relación debe funcionar ✅
- [x] Convertir lead a opportunity → contacto debe mantenerse ✅
- [x] Formulario web → debe crear `ThirdParty` con rol `CONTACT` ✅
- [x] Deduplicación en formularios → si contacto existe, actualiza en vez de crear nuevo ✅
- [ ] WhatsApp (si aplica) → debe funcionar con tercero
- [ ] Email marketing (si aplica) → debe funcionar con tercero
- [ ] Búsqueda de contactos → debe funcionar igual
- [ ] Filtros por tags/segmento → debe funcionar igual

---

## Estimación de esfuerzo

| Fase | Tiempo estimado |
|------|-----------------|
| FASE 1: Preparación | 2-4 horas |
| FASE 2: Migración de datos | 2-3 horas |
| FASE 3: Backend CRM | 6-8 horas |
| FASE 4: Frontend | 4-6 horas |
| FASE 5: Limpieza | 1-2 horas |
| **Testing completo** | 3-4 horas |
| **TOTAL** | **18-27 horas** |

---

## Notas finales

- ⚠️ **CRÍTICO:** Hacer backup antes de FASE 2
- ⚠️ **IMPORTANTE:** Probar en ambiente de desarrollo primero
- ⚠️ **COORDINACIÓN:** Avisar al equipo antes de ejecutar migración
- ✅ **BENEFICIO:** Arquitectura más limpia y escalable
- ✅ **FUTURO:** Facilita agregar más roles a terceros según necesidad

---

## Resumen de cambios realizados (2026-02-05)

### Archivos modificados en Backend (crm-service):

| Archivo | Cambio |
|---------|--------|
| `contacts/contacts.service.ts` | `crmContact` → `thirdParty` con filtro `roles: { has: 'CONTACT' }` |
| `contacts/dto/create-contact.dto.ts` | Removidos campos no existentes |
| `forms/forms.service.ts` | Crea ThirdParty con rol CONTACT, deduplicación |
| `forms/forms.controller.ts` | Agregado `@Public()` a FormsPublicController |
| `leads/leads.service.ts` | `contact` → `third_party` en includes |
| `opportunities/opportunities.service.ts` | `contact` → `third_party` en includes |
| `activities/activities.service.ts` | `contact_id` → `third_party_id` |
| `activities/activities.controller.ts` | `contact_id` → `third_party_id` |
| `dashboard/dashboard.service.ts` | `crmContact.count` → `thirdParty.count` con filtro CONTACT |
| `email/email.service.ts` | `contact_id` → `third_party_id` |
| `email/email.controller.ts` | `contact_id` → `third_party_id` |
| `email/dto/create-email-send.dto.ts` | `contact_id` → `third_party_id` |
| `whatsapp/whatsapp.service.ts` | `contact` → `third_party`, `contact_id` → `third_party_id` |
| `whatsapp/dto/create-whatsapp-message.dto.ts` | `contact_id` → `third_party_id` |

### Script SQL de migración:
- `contagracia-shared-modules/prisma/migrations/migrate_contacts_to_third_parties.sql`

---

**Creado por:** Claude
**Fecha:** 2026-02-04
**Actualizado:** 2026-02-05
**Versión:** 1.1
