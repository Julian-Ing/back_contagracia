# FASE 3 - Integración Frontend ↔ Backend CRM

> **Directorio:** `front_contagracia/src/modules/crm/`
> **Backend:** `crm-service` (puerto 3011)
> **API Client:** `crmClient` de `@/shared/services/api/apiClient`
> **Fecha inicio:** 2026-02-02

---

## Resumen

Conectar las 11 vistas maquetadas (Fase 0) con los endpoints del backend (Fase 2). Crear service layer centralizado, hooks por dominio, y actualizar cada página reemplazando datos mock por llamadas reales.

---

## Vistas a integrar (orden sidebar)

| # | Vista | Ruta frontend | Endpoints backend | Estado |
|---|-------|---------------|-------------------|--------|
| 1 | Dashboard | `/dashboard/crm` | `GET /dashboard/stats`, `GET /dashboard/pipeline` | ✅ |
| 2 | Formularios Web | `/dashboard/crm/forms` | CRUD `/forms`, `/forms/:id/fields`, `/forms/:id/submissions` | ✅ |
| 3 | Campañas | `/dashboard/crm/campaigns` | CRUD `/campaigns` | ✅ |
| 4 | Leads | `/dashboard/crm/leads` | CRUD `/leads` | ✅ |
| 5 | Oportunidades | `/dashboard/crm/opportunities` | CRUD `/opportunities` (sin cotizaciones) | ✅ |
| 6 | Contactos | `/dashboard/crm/contacts` | CRUD `/contacts`, tags | ✅ |
| 7 | Clientes | `/dashboard/crm/clients` | `GET /contacts?is_client=true` | ✅ |
| 8 | Email Marketing | `/dashboard/crm/email-marketing` | CRUD `/email/templates`, `GET /email/sends` | ✅ |
| 9 | Etapas Settings | `/dashboard/crm/stages-settings` | CRUD `/stages` | ✅ |
| 10 | Desempeño | `/dashboard/crm/employee-performance-v2` | `GET /team/performance` | ✅ |
| 11 | Equipos | `/dashboard/crm/team-management` | `GET /team/members` | ✅ |

### Vistas skip (dependencias externas)

| Vista | Razón |
|-------|-------|
| Calendario (Activities) | Depende de Calendar Service (Fase 4) |
| WhatsApp | Depende de Twilio/integrations-service (Fase 4) |
| Automatizaciones | Depende de motor de ejecución (Fase 4) |

---

## Patrones del proyecto

| Concepto | Implementación |
|----------|----------------|
| API client | `crmClient` (axios con interceptor de token) |
| Base URL | `http://localhost:3011/api` |
| CompanyId | `useAuthStore().company?.id` |
| Ruta API | `/companies/${companyId}/crm/{recurso}` |
| State management | `useState` / `useEffect` / `useCallback` |
| Toasts | `react-hot-toast` |
| Types | `@/modules/crm/types` (ya existen, Fase 0) |
| Dark mode | `dark:bg-slate-800/50` pattern |
| Moneda | `toLocaleString('es-CO', { style: 'currency', currency: 'COP' })` |

---

## Estructura de archivos a crear

```
src/modules/crm/
├── types/index.ts                    # Ya existe (Fase 0)
├── services/
│   └── crm.service.ts                # NUEVO — todas las llamadas API
└── hooks/
    ├── useDashboard.ts               # NUEVO
    ├── useStages.ts                  # NUEVO
    ├── useTags.ts                    # NUEVO
    ├── useContacts.ts                # NUEVO
    ├── useCampaigns.ts               # NUEVO
    ├── useLeads.ts                   # NUEVO
    ├── useOpportunities.ts           # NUEVO
    ├── useForms.ts                   # NUEVO
    ├── useEmail.ts                   # NUEVO
    └── useTeam.ts                    # NUEVO
```

---

## Detalle por paso

### Paso 1 — Service layer + Hooks

**Archivo: `services/crm.service.ts`**

Funciones centralizadas que usan `crmClient`:

```
// Dashboard
getStats(companyId) → GET /companies/:id/crm/dashboard/stats
getPipeline(companyId) → GET /companies/:id/crm/dashboard/pipeline

// Stages
getStages(companyId) → GET /companies/:id/crm/stages
createStage(companyId, data) → POST /companies/:id/crm/stages
updateStage(companyId, stageId, data) → PATCH /companies/:id/crm/stages/:stageId
deleteStage(companyId, stageId) → DELETE /companies/:id/crm/stages/:stageId
reorderStages(companyId, data) → PATCH /companies/:id/crm/stages/reorder

// Tags
getTags(companyId) → GET /companies/:id/crm/tags
createTag(companyId, data) → POST /companies/:id/crm/tags
updateTag(companyId, tagId, data) → PATCH /companies/:id/crm/tags/:tagId
deleteTag(companyId, tagId) → DELETE /companies/:id/crm/tags/:tagId

// Contacts
getContacts(companyId, params?) → GET /companies/:id/crm/contacts
getContact(companyId, contactId) → GET /companies/:id/crm/contacts/:contactId
createContact(companyId, data) → POST /companies/:id/crm/contacts
updateContact(companyId, contactId, data) → PATCH /companies/:id/crm/contacts/:contactId
deleteContact(companyId, contactId) → DELETE /companies/:id/crm/contacts/:contactId
addTagToContact(companyId, contactId, tagId) → POST /companies/:id/crm/contacts/:contactId/tags/:tagId
removeTagFromContact(companyId, contactId, tagId) → DELETE /companies/:id/crm/contacts/:contactId/tags/:tagId

// Campaigns
getCampaigns(companyId) → GET /companies/:id/crm/campaigns
createCampaign(companyId, data) → POST /companies/:id/crm/campaigns
updateCampaign(companyId, campaignId, data) → PATCH /companies/:id/crm/campaigns/:campaignId
deleteCampaign(companyId, campaignId) → DELETE /companies/:id/crm/campaigns/:campaignId

// Leads
getLeads(companyId, params?) → GET /companies/:id/crm/leads
createLead(companyId, data) → POST /companies/:id/crm/leads
updateLead(companyId, leadId, data) → PATCH /companies/:id/crm/leads/:leadId
deleteLead(companyId, leadId) → DELETE /companies/:id/crm/leads/:leadId

// Opportunities
getOpportunities(companyId, params?) → GET /companies/:id/crm/opportunities
createOpportunity(companyId, data) → POST /companies/:id/crm/opportunities
updateOpportunity(companyId, oppId, data) → PATCH /companies/:id/crm/opportunities/:oppId
deleteOpportunity(companyId, oppId) → DELETE /companies/:id/crm/opportunities/:oppId

// Forms
getForms(companyId) → GET /companies/:id/crm/forms
createForm(companyId, data) → POST /companies/:id/crm/forms
updateForm(companyId, formId, data) → PATCH /companies/:id/crm/forms/:formId
deleteForm(companyId, formId) → DELETE /companies/:id/crm/forms/:formId
getFormFields(companyId, formId) → GET /companies/:id/crm/forms/:formId/fields
createFormField(companyId, formId, data) → POST /companies/:id/crm/forms/:formId/fields
getFormSubmissions(companyId, formId) → GET /companies/:id/crm/forms/:formId/submissions

// Email
getEmailTemplates(companyId) → GET /companies/:id/crm/email/templates
createEmailTemplate(companyId, data) → POST /companies/:id/crm/email/templates
updateEmailTemplate(companyId, templateId, data) → PATCH /companies/:id/crm/email/templates/:templateId
deleteEmailTemplate(companyId, templateId) → DELETE /companies/:id/crm/email/templates/:templateId
getEmailSends(companyId) → GET /companies/:id/crm/email/sends

// Team
getTeamMembers(companyId) → GET /companies/:id/crm/team/members
getTeamPerformance(companyId, params?) → GET /companies/:id/crm/team/performance
```

**Hooks:** Cada hook sigue el patrón:
```ts
export function useLeads() {
  const [data, setData] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const companyId = useAuthStore(s => s.company?.id);

  const fetch = useCallback(async (params?) => { ... }, [companyId]);
  const create = useCallback(async (data) => { ... refetch ... }, [companyId]);
  const update = useCallback(async (id, data) => { ... refetch ... }, [companyId]);
  const remove = useCallback(async (id) => { ... refetch ... }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch, create, update, remove };
}
```

### Paso 2 — Dashboard (`/dashboard/crm`)
- Hook: `useDashboard` → stats + pipeline
- Reemplazar KPIs hardcoded por `stats.*`
- Reemplazar pipeline mock por `pipeline[]`

### Paso 3 — Formularios Web (`/dashboard/crm/forms`)
- Hook: `useForms`
- CRUD formularios + campos + ver submissions

### Paso 4 — Campañas (`/dashboard/crm/campaigns`)
- Hook: `useCampaigns`
- CRUD + filtros por status/channel

### Paso 5 — Leads (`/dashboard/crm/leads`)
- Hook: `useLeads`
- CRUD + filtros stage/source + asignación

### Paso 6 — Oportunidades (`/dashboard/crm/opportunities`)
- Hook: `useOpportunities` + `useStages`
- Kanban board con drag & drop → `updateOpportunity(id, { stage })`
- Sin cotizaciones (preparado para futuro)

### Paso 7 — Contactos (`/dashboard/crm/contacts`)
- Hook: `useContacts` + `useTags`
- CRUD + tags + filtros

### Paso 8 — Clientes (`/dashboard/crm/clients`)
- Hook: `useContacts` con filtro `is_client=true`
- Misma tabla que contactos, filtrada

### Paso 9 — Email Marketing (`/dashboard/crm/email-marketing`)
- Hook: `useEmail`
- CRUD templates + listar envíos

### Paso 10 — Etapas Settings (`/dashboard/crm/stages-settings`)
- Hook: `useStages`
- CRUD etapas + reorder + colores

### Paso 11 — Desempeño + Equipos
- Hook: `useTeam`
- Performance: métricas por usuario
- Team: listar miembros + jerarquía

---

## Verificación

- [x] `pnpm --filter front_contagracia build` sin errores (solo error preexistente en admin/blog)
- [x] Cada vista muestra estado loading → datos reales
- [x] CRUD funciona con refetch automático
- [x] Filtros y paginación conectados
- [x] Toasts en éxito/error de operaciones
- [x] Prisma db push aplicado a tenant DB (tablas CRM creadas)
- [x] Bugs corregidos: response format `{data,total}`, `state.companyId` → `s.company?.id`, `.delete()` → `.remove()`
