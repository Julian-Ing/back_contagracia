# Hoja de Ruta - Migración del Módulo CRM

> **Origen:** `horizont/` (React + Supabase)
> **Destino:** `NuevoContagracia/` (NestJS + Next.js + Prisma + PostgreSQL multi-tenant)
> **Fecha de creación:** 2026-02-02
> **Puerto del servicio:** 3011

---

## Estado actual

### Proyecto viejo (horizont)
- 16 páginas principales + 25+ modales/componentes
- ~21 tablas Supabase específicas de CRM
- Integraciones: WhatsApp API, Email Service (causacion.contagracia.com), Calendar, Inventario
- 5 niveles de roles: super_admin, admin, director comercial, asesor comercial, otros
- Sistema de automatizaciones completo (stage change → email/whatsapp/activity)

### Proyecto nuevo (NuevoContagracia) - ESTADO ACTUAL
- **Backend:** crm-service completamente funcional (puerto 3011) con 14 módulos implementados
- **Schema tenant Prisma:** ✅ Todos los modelos CRM implementados (21 modelos)
- **Frontend:** ✅ 14 vistas completas + hooks + servicios conectados al backend
- **API config:** `NEXT_PUBLIC_CRM_SERVICE_URL` configurado apuntando a `localhost:3011`

---

## Inventario completo del CRM viejo

### Tablas Supabase (a migrar como modelos Prisma en schema-tenant)

| Tabla | Descripción |
|-------|-------------|
| `crm_contacts` | Contactos (nombre, email, teléfono, whatsapp, empresa, tercero_id) |
| `crm_leads` | Leads (contact_id, campaign_id, stage, source, assigned_to) |
| `crm_opportunities` | Oportunidades (lead_id, contact_id, stage, expected_value, calculated_value, cost_center_id) |
| `crm_campaigns` | Campañas (nombre, canal, status, budget, fechas) |
| `crm_activities` | Actividades (lead/opp/contact_id, tipo, subject, status, due_date, assigned_to) |
| `crm_opportunity_stages` | Etapas configurables por empresa (value, name, color, probability, is_won, is_lost, is_quoting_stage) |
| `crm_contact_tags` | Tags para segmentación de contactos |
| `crm_contact_tag_assignments` | Asignación de tags a contactos |
| `crm_lead_forms` | Formularios web para captura de leads |
| `crm_form_fields` | Campos de los formularios |
| `crm_form_submissions` | Envíos de formularios |
| `crm_opportunity_automations` | Automatizaciones por cambio de etapa (email/whatsapp) |
| `crm_activity_automations` | Auto-crear actividades por cambio de etapa |
| `crm_form_automations` | Automatizaciones por envío de formulario |
| `crm_meeting_reminder_configs` | Configuración de recordatorios de reuniones |
| `crm_scheduled_reminders` | Recordatorios programados |
| `crm_email_templates` | Plantillas de email |
| `crm_email_sends` | Historial de envíos de email |
| `crm_whatsapp_templates` | Plantillas de WhatsApp |
| `crm_whatsapp_conversations` | Conversaciones de WhatsApp |
| `crm_whatsapp_messages` | Mensajes individuales de WhatsApp |

### Pantallas / Vistas

| Vista | Archivo viejo | Ruta nueva (Next.js) | Descripción |
|-------|---------------|----------------------|-------------|
| Dashboard CRM | `CRMDashboard.jsx` | `/dashboard/crm` | Stats, pipeline, actividades recientes |
| Contactos | `Contacts.jsx` | `/dashboard/crm/contacts` | Tabla con segmentación |
| Leads | `Leads.jsx` | `/dashboard/crm/leads` | Agrupados por contacto, bulk assign |
| Oportunidades | `Opportunities.jsx` | `/dashboard/crm/opportunities` | Kanban drag-drop por etapa |
| Clientes | `Clients.jsx` | `/dashboard/crm/clients` | Opps ganadas, datos financieros |
| Actividades | `Activities.jsx` | `/dashboard/crm/activities` | Lista/calendario |
| Campañas | `Campaigns.jsx` | `/dashboard/crm/campaigns` | Gestión con ROI |
| Email Marketing | `EmailMarketing.jsx` | `/dashboard/crm/email-marketing` | Templates + envíos |
| WhatsApp | `WhatsApp.jsx` | `/dashboard/crm/whatsapp` | Chat de conversaciones |
| Formularios Web | `Forms.jsx` | `/dashboard/crm/forms` | Constructor de formularios |
| Automatizaciones | `Automations.jsx` | `/dashboard/crm/automations` | 4 tabs: opp, activity, form, meeting |
| Equipos | `TeamManagement.jsx` | `/dashboard/crm/team-management` | Jerarquía y rendimiento |
| Desempeño V2 | `EmployeePerformanceV2.jsx` | `/dashboard/crm/employee-performance-v2` | Analytics de rendimiento (solo V2, V1 descartado) |
| Config Etapas | `OpportunityStagesSettings.jsx` | `/dashboard/crm/stages-settings` | CRUD de etapas |

### Dependencias con otros módulos

| Módulo externo | Uso en CRM | Estado en nuevo proyecto |
|----------------|-----------|--------------------------|
| **Terceros (ThirdParty)** | `tercero_id` en contactos, vincula contacto con entidad financiera | Modelo existe en schema-tenant |
| **Documentos/Cotizaciones (Document)** | Cotizaciones CRM (`doc_type:QUOTE` + `doc_subtype:CRM`, consecutivo `CTC-`), cálculo de valor | Modelo existe con `opportunity_id` y `crm_contact_id`. CRM crea directamente en `documents` |
| **Facturas (Document INVOICE)** | Tracking financiero de clientes ganados | Modelo existe |
| **Inventario (CostCenter)** | Centro de costos en oportunidades | Modelo existe en schema-tenant |
| **Empleados (TenantUser)** | Asignación de leads/opps/actividades, roles CRM | Modelo existe |
| **WhatsApp API (Twilio)** | Envío de mensajes/plantillas | Va en `integrations-service` (en desarrollo) |
| **Email Service** | Envío de campañas | Va en `integrations-service` (en desarrollo) |
| **Calendar Service** | Horarios laborales, reuniones | NO existe |
| **Notificaciones** | Toast + recordatorios | notifications-service (puerto 3015) es stub |

### Helpers y utilidades clave

| Archivo viejo | Funciones | Destino nuevo |
|---------------|-----------|---------------|
| `crmHelpers.js` | `calculateOpportunityValueFromQuotes()`, `getQuoteValue()` | `modules/crm/utils/opportunity.utils.ts` |
| `useCrmEnums.js` | Hook de enums (stages, activity types, channels) | `modules/crm/hooks/useCrmEnums.ts` |
| `contactSegmentationHelpers.js` | Auto-segmentación (Frecuente, Inactivo, Alto Valor, Nuevo) | `modules/crm/utils/segmentation.utils.ts` |
| `timelineHelpers.js` | Formateo de timeline de actividades | `modules/crm/utils/timeline.utils.ts` |
| `useBulkOpportunityActions.js` | Operaciones bulk en oportunidades | `modules/crm/hooks/useBulkOpportunityActions.ts` |

### Sistema de permisos

| Rol (EmployeeRole en Prisma) | Alcance CRM |
|------------------------------|-------------|
| MANAGER / admin | Ve todo, gestiona config, automatizaciones, templates |
| SALES_DIRECTOR | Ve datos de su equipo de asesores |
| SALES_ADVISOR | Ve solo lo asignado a él |
| ADMINISTRATIVE / OTHER | Sin acceso CRM |

---

## Plan de migración

### FASE 0 - Maquetación Frontend (PRIMERA TAREA)
> **Prioridad: ALTA** - Hacer primero porque el backend CRM aún no tiene modelos y los módulos externos (WhatsApp, Email, Calendar) no existen.

Crear TODAS las vistas/páginas del CRM en el frontend, siguiendo la arquitectura de `ARQUITECTURA.md`. Sin datos mock extensos; solo los mínimos donde sea necesario (ej: tablas para que aparezcan botones de acciones y modales). Lo importante es dejar las vistas listas para cuando se implementen las funcionalidades.

**Estructura a crear:**
```
front_contagracia/src/
├── app/(dashboard)/crm/
│   ├── page.tsx                        # Dashboard CRM
│   ├── contacts/page.tsx
│   ├── leads/page.tsx
│   ├── opportunities/page.tsx
│   ├── clients/page.tsx
│   ├── activities/page.tsx
│   ├── campaigns/page.tsx
│   ├── forms/page.tsx
│   ├── automations/page.tsx
│   ├── email-marketing/page.tsx
│   ├── whatsapp/page.tsx
│   ├── team-management/page.tsx
│   ├── employee-performance-v2/page.tsx
│   └── stages-settings/page.tsx
│
├── modules/crm/
│   ├── components/                     # Componentes CRM (PascalCase)
│   │   ├── CrmDashboard/
│   │   ├── ContactsTable/
│   │   ├── ContactDetailModal/
│   │   ├── CreateContactModal/
│   │   ├── LeadsTable/
│   │   ├── CreateLeadModal/
│   │   ├── ConvertLeadModal/
│   │   ├── LeadTimelineModal/
│   │   ├── ImportLeadsModal/
│   │   ├── OpportunityKanban/
│   │   ├── OpportunityCard/
│   │   ├── CreateOpportunityModal/
│   │   ├── OpportunityDetailModal/
│   │   ├── ClientsTable/
│   │   ├── ActivitiesView/
│   │   ├── CreateActivityModal/
│   │   ├── CampaignsTable/
│   │   ├── CreateCampaignModal/
│   │   ├── FormBuilder/
│   │   ├── AutomationsTabs/
│   │   ├── EmailTemplateEditor/
│   │   ├── WhatsAppChat/
│   │   ├── TeamHierarchy/
│   │   ├── PerformanceDashboard/
│   │   ├── StagesSetting/
│   │   └── shared/                     # Componentes compartidos CRM
│   │       ├── StageBadge/
│   │       ├── ContactSelector/
│   │       ├── LeadSelector/
│   │       └── AssigneeSelector/
│   ├── hooks/                          # camelCase con prefijo use
│   │   ├── useContacts.ts
│   │   ├── useLeads.ts
│   │   ├── useOpportunities.ts
│   │   ├── useCampaigns.ts
│   │   ├── useActivities.ts
│   │   ├── useCrmEnums.ts
│   │   └── useBulkOpportunityActions.ts
│   ├── services/                       # camelCase con sufijo .service
│   │   ├── contact.service.ts
│   │   ├── lead.service.ts
│   │   ├── opportunity.service.ts
│   │   ├── campaign.service.ts
│   │   ├── activity.service.ts
│   │   ├── form.service.ts
│   │   ├── automation.service.ts
│   │   ├── email.service.ts
│   │   └── whatsapp.service.ts
│   ├── stores/                         # camelCase con sufijo Store
│   │   └── crmStore.ts
│   ├── types/                          # Tipos TypeScript
│   │   ├── contact.types.ts
│   │   ├── lead.types.ts
│   │   ├── opportunity.types.ts
│   │   ├── campaign.types.ts
│   │   ├── activity.types.ts
│   │   ├── form.types.ts
│   │   ├── automation.types.ts
│   │   └── index.ts
│   └── utils/                          # camelCase con sufijo .utils
│       ├── opportunity.utils.ts
│       ├── segmentation.utils.ts
│       └── timeline.utils.ts
```

**Tareas de Fase 0:**
- [x] **0.1** Crear estructura de carpetas `modules/crm/` y types base
- [x] **0.2** Crear types base en `modules/crm/types/` (interfaces de cada entidad)
- [x] **0.3** Página Dashboard CRM (stats cards, mini-pipeline, actividades recientes)
- [x] **0.4** Página Contactos (DataTable, filtros, búsqueda, modal crear/editar/detalle)
- [x] **0.5** Página Leads (tabla agrupada, filtros por stage/source/asesor/campaña, modal crear/editar, timeline)
- [x] **0.6** Página Oportunidades (Kanban con @dnd-kit, cards, filtros, modal crear/editar/detalle)
- [x] **0.7** Página Clientes (tabla con datos financieros mock)
- [x] **0.8** Página Actividades (vista lista + calendario con Recharts, modal crear/editar)
- [x] **0.9** Página Campañas (tabla, modal crear/editar, stats de ROI)
- [x] **0.10** Página Formularios Web (lista, builder de formularios)
- [x] **0.11** Página Automatizaciones (4 tabs: opp, activity, form, meeting)
- [x] **0.12** Página Email Marketing (editor de templates con TipTap, historial de envíos)
- [x] **0.13** Página WhatsApp (chat UI, gestión de templates)
- [x] **0.14** Página Equipos y Desempeño
- [x] **0.15** Configuración de Etapas de Oportunidad (CRUD visual con colores)

### FASE 1 - Schema Prisma (modelos CRM en schema-tenant)
> Agregar todos los modelos CRM al `contagracia-shared-modules/prisma/schema-tenant.prisma`

- [x] **1.1** Enums: `LeadStage`, `LeadSource`, `CampaignChannel`, `CampaignStatus`, `CrmActivityType`, `CrmActivityStatus`, `MessageDirection`, `MessageStatus`
- [x] **1.2** Modelo `CrmContact` (relación a `ThirdParty`, `TenantUser`)
- [x] **1.3** Modelo `CrmLead` (relación a `CrmContact`, `CrmCampaign`, `TenantUser`)
- [x] **1.4** Modelo `CrmOpportunity` (relación a `CrmLead`, `CrmContact`, `CostCenter`, `Document`)
- [x] **1.5** Modelo `CrmCampaign`
- [x] **1.6** Modelo `CrmActivity` (relación a Lead, Opportunity, Contact, TenantUser)
- [x] **1.7** Modelo `CrmOpportunityStage` (etapas configurables por empresa)
- [x] **1.8** Modelos de tags: `CrmContactTag`, `CrmContactTagAssignment`
- [x] **1.9** Modelos de formularios: `CrmLeadForm`, `CrmFormField`, `CrmFormSubmission`
- [x] **1.10** Modelos de automatizaciones: `CrmOpportunityAutomation`, `CrmActivityAutomation`, `CrmFormAutomation`
- [x] **1.11** Modelos de recordatorios: `CrmMeetingReminderConfig`, `CrmScheduledReminder`
- [x] **1.12** Modelos de email: `CrmEmailTemplate`, `CrmEmailSend`
- [x] **1.13** Modelos de WhatsApp: `CrmWhatsappTemplate`, `CrmWhatsappConversation`, `CrmWhatsappMessage`
- [x] **1.14** Seed de etapas por defecto (Prospección, Negociación, Cotizando, Ganada, Perdida)
- [x] **1.15** `pnpm prisma:generate` validado exitosamente

### FASE 2 - Backend crm-service (NestJS, puerto 3011)
> Estructura del microservicio siguiendo el patrón de los servicios existentes (auth-service, admin-service, company-service)

**Estructura implementada:**
```
crm-service/src/
├── modules/
│   ├── prisma/                 # PrismaModule master
│   ├── tenant/                 # TenantPrismaService (multi-tenant)
│   ├── contacts/               # ✅ CRUD + soft delete + tags
│   ├── leads/                  # ✅ CRUD + stage change + conversión + bulk assign
│   ├── opportunities/          # ✅ CRUD + stage change + kanban
│   ├── campaigns/              # ✅ CRUD + stats leads/conversión
│   ├── activities/             # ✅ CRUD + completar/cancelar + filtros
│   ├── stages/                 # ✅ CRUD etapas + reorder
│   ├── tags/                   # ✅ CRUD tags de contactos
│   ├── forms/                  # ✅ CRUD + endpoint público + auto-crear lead/contacto
│   ├── automations/            # ✅ CRUD reglas (opportunity/activity/form)
│   ├── email/                  # ✅ Templates CRUD + sends CRUD
│   ├── whatsapp/               # ✅ Templates + conversaciones + mensajes
│   ├── dashboard/              # ✅ Stats, pipeline, leads by source, recent activities
│   └── team/                   # ✅ Members, performance, ranking
├── main.ts
└── app.module.ts
```

**Tareas:**
- [x] **2.1** Setup base: PrismaModule tenant, TenantPrismaService, .env
- [x] **2.2** Módulo Contacts (CRUD + soft delete + tags)
- [x] **2.3** Módulo Leads (CRUD + stage change + conversión a oportunidad + bulk assign)
- [x] **2.4** Módulo Opportunities (CRUD + stage change + kanban endpoints)
- [x] **2.5** Módulo Campaigns (CRUD + stats de leads/conversión)
- [x] **2.6** Módulo Activities (CRUD + completar/cancelar + filtros por entidad)
- [x] **2.7** Módulo Stages (CRUD de etapas configurables + reorder)
- [x] **2.8** Módulo Forms (CRUD formularios + campos + endpoint público + auto-crear lead/contacto)
- [x] **2.9** Módulo Automations (CRUD reglas para opportunity/activity/form)
- [x] **2.10** Módulo Email (templates CRUD + sends CRUD)
- [x] **2.11** Módulo WhatsApp (templates + conversaciones + mensajes CRUD)
- [x] **2.12** Módulo Dashboard (stats, pipeline, leads by source, recent activities)
- [x] **2.13** Módulo Team/Performance (members, performance por usuario, ranking)
- [ ] **2.14** Permisos: scoping por rol en todos los endpoints (MANAGER=todo, SALES_DIRECTOR=equipo, SALES_ADVISOR=propio) - *Otro dev lo está implementando*
- [x] **2.15** Import Excel de leads (seleccionar campaña → subir .xlsx)

**Pendientes Fase 2:**
- Motor de ejecución de automatizaciones (solo tiene CRUD, no ejecuta acciones automáticamente) - **PRÓXIMO A IMPLEMENTAR**
- Guards de permisos por rol (2.14) - *Otro dev*

### FASE 3 - Integración Frontend ↔ Backend
> Reemplazar datos mock por llamadas reales al crm-service (puerto 3011)

- [x] **3.1** Implementar servicios API en `modules/crm/services/crm.service.ts` usando `crmClient`
- [x] **3.2** Implementar hooks: `useContacts`, `useLeads`, `useOpportunities`, `useCampaigns`, `useForms`, `useStages`, `useTags`, `useDashboard`, `useTeam`, `useEmail`
- [x] **3.3** Estado UI manejado con hooks locales (useState/useCallback)
- [x] **3.4** Conectar cada página con hooks reales (14 vistas conectadas)
- [ ] **3.5** Permisos en frontend: `usePermissions` para filtrar vistas según `EmployeeRole` - *Otro dev lo está implementando*
- [x] **3.6** Drag-drop kanban real con mutación al backend (@dnd-kit)
- [x] **3.7** Paginación y búsqueda server-side (skip/take params disponibles)

**Pendientes Fase 3:**
- Permisos en frontend por rol (3.5) - *Otro dev*

### FASE 4 - Integraciones externas (bloqueadas por otros servicios)

- [ ] **4.1** Integración WhatsApp (Twilio) vía `integrations-service` - *Otro dev*
- [x] **4.2** Servicio Email — CRUD de templates y sends migrado a `integrations-service` (2026-02-21). EmailSenderService en crm-service sigue leyendo templates directo de tenant DB.
- [ ] **4.3** Integración Calendar Service (horarios laborales, recordatorios) - requiere definir servicio
- [ ] **4.4** Integración notifications-service (puerto 3015) para recordatorios push/email
- [x] **4.5** Endpoint público de formularios CRM (captura de leads desde web externa) - `POST /public/forms/:companyId/:slug/submit`

### FASE 5 - Migración de datos (Supabase → PostgreSQL tenant)

- [ ] **5.1** Script de migración de contactos (crm_contacts → CrmContact)
- [ ] **5.2** Script de migración de leads + oportunidades
- [ ] **5.3** Script de migración de campañas + actividades
- [ ] **5.4** Script de migración de templates (email/whatsapp)
- [ ] **5.5** Script de migración de automatizaciones + formularios
- [ ] **5.6** Validación de integridad referencial post-migración
- [ ] **5.7** Script de seed de datos CRM en `seed-all-tenants.ts`

---

## Dependencias bloqueantes

| Dependencia | Bloquea | Estado |
|-------------|---------|--------|
| Modelos Prisma CRM (Fase 1) | Fase 2, 3 | ✅ Completada |
| Backend CRM (Fase 2) | Fase 3 | ✅ Completada (excepto permisos por rol) |
| Frontend CRM (Fase 3) | - | ✅ Completada (excepto permisos por rol) |
| Motor de automatizaciones | Fase 4.2 (Email) | 🔜 PRÓXIMO |
| integrations-service | Fase 4.1 (WhatsApp Twilio) | En desarrollo (otro dev) |
| Calendar Service | Fase 4.3 | No existe |
| notifications-service (3015) | Fase 4.4 | Stub |

---

## Resumen de Estado Actual

| Fase | Descripción | Progreso |
|------|-------------|----------|
| **FASE 0** | Maquetación Frontend | ✅ 15/15 (100%) |
| **FASE 1** | Schema Prisma | ✅ 15/15 (100%) |
| **FASE 2** | Backend crm-service | ✅ 14/15 (93%) - Permisos: otro dev |
| **FASE 3** | Integración Frontend ↔ Backend | ✅ 6/7 (86%) - Permisos: otro dev |
| **FASE 4** | Integraciones externas | ⏸️ 1/5 (20%) - Bloqueada |
| **FASE 5** | Migración de datos | 🔚 0/7 (0%) - AL FINAL |

**El flujo básico del CRM está 100% funcional:**
- ✅ Dashboard con stats reales
- ✅ CRUD completo de Contactos, Leads, Oportunidades, Campañas, Actividades
- ✅ Conversión de Lead → Oportunidad
- ✅ Kanban de oportunidades con drag-drop
- ✅ Formularios públicos con auto-creación de lead/contacto
- ✅ Import Excel de leads (.xlsx)
- ✅ Configuración de etapas
- ✅ Tags de contactos
- ✅ Team management y performance

**Pendiente para completar:**
- ⏳ Permisos por rol (backend guards + frontend filtering) - *Otro dev lo está implementando*
- 🔜 **Motor de ejecución de automatizaciones** - PRÓXIMO (ver [MOTOR_AUTOMATIZACIONES.md](./MOTOR_AUTOMATIZACIONES.md))
- 🔜 Envío real de Email (Nodemailer en crm-service) - parte del motor de automatizaciones
- ⏸️ WhatsApp (Twilio) - *Otro dev*
- 🔚 Migración de datos de Supabase - *AL FINAL*

---

## Decisiones tomadas

### 1. WhatsApp → `integrations-service` (en desarrollo) | Email → `crm-service` (Nodemailer)
- **WhatsApp (Twilio):** Se maneja desde `integrations-service` (otro dev).
- **Email:** Se implementa directamente en `crm-service` usando Nodemailer. La config SMTP viene de la tabla `email_sms_config` (modelo `EmailSmsConfig`). NO es integración externa. Si no hay SMTP configurado, la automatización no se ejecuta y se registra en logs.

### 2. Cotizaciones → Dos tipos: `quote_invoice` y `quote_crm`
El modelo `Document` unificado ya soporta cotizaciones CRM. Se usa `doc_type: QUOTE` + `doc_subtype: CRM` (consecutivo `CTC-`). El CRM genera cotizaciones directamente en la tabla `documents` con `opportunity_id` y `crm_contact_id`. No depende del invoicing-service.

**Tipos de documento completos (doc_type + doc_subtype combinados):**
1. `invoice` (FV)
2. `purchase` (CO)
3. `expense` (GA)
4. `quote_invoice` (CTV) - cotización de venta
5. `quote_crm` (CTC) - cotización CRM
6. `purchase_order` (OC)
7. `invoice_credit_note` (NC)
8. `invoice_debit_note` (ND)
9. `purchase_credit_note` (NCC)
10. `expense_credit_note` (NCG)
11. `invoice_pos` (POS)
12. `invoice_recurrent` (FVR)
13. `expense_recurrent` (GAR)
14. `purchase_recurrent`
15. `quote_invoice_recurrent`
16. `quote_crm_recurrent`
17. `purchase_order_recurrent`

### 3. Formularios Web públicos → Ruta pública en crm-service + endpoint en frontend
El endpoint público de submissions va en el crm-service con una ruta sin auth. En el frontend se expone en las rutas públicas `(public)/forms/`.

### 4. Scope Fase 0 → TODAS las vistas, sin mocks innecesarios
Se hacen las 15 vistas completas de una vez. No se necesitan datos mock extensos; solo los mínimos donde sea necesario (ej: tablas para que aparezcan botones de acciones y modales). Lo importante es que las vistas queden listas para cuando se implemente la funcionalidad.

### 5. Email Marketing y WhatsApp → Pantallas separadas
Se mantienen como pantallas independientes, igual que en el proyecto viejo.

### 6. Desempeño → Solo V2
Se migra únicamente `EmployeePerformanceV2.jsx`. El V1 básico se descarta.

### 7. WhatsApp → Base UI ahora, integración Twilio después
Se deja la base (modelos, templates, chat UI) pero la integración real con Twilio va en `integrations-service` para después.

### 8. Email Config SMTP + Templates → Migrado a `integrations-service` (2026-02-21)
Los endpoints de configuración SMTP y el CRUD de email templates/sends se movieron de crm-service a integrations-service (puerto 3014). Ver sección "Limpieza pendiente" abajo.

---

## Limpieza pendiente al reactivar crm-service

> **Fecha de migración:** 2026-02-21
> **Motivo:** crm-service estaba desactivado en el workspace. Los endpoints de email config se movieron a integrations-service para que funcionen independientemente.

### Endpoints migrados a integrations-service

| Endpoint original (CRM 3011) | Endpoint nuevo (Integrations 3014) |
|------|------|
| `GET /companies/:companyId/crm/email-config` | `GET /api/email-config` |
| `PUT /companies/:companyId/crm/email-config` | `PUT /api/email-config` |
| `POST /companies/:companyId/crm/email-config/test` | `POST /api/email-config/test` |
| `GET /companies/:companyId/crm/email/templates` | `GET /api/email-templates` |
| `POST /companies/:companyId/crm/email/templates` | `POST /api/email-templates` |
| `PATCH /companies/:companyId/crm/email/templates/:id` | `PATCH /api/email-templates/:id` |
| `DELETE /companies/:companyId/crm/email/templates/:id` | `DELETE /api/email-templates/:id` |
| `GET /companies/:companyId/crm/email/sends` | `GET /api/email-sends` |
| `POST /companies/:companyId/crm/email/sends` | `POST /api/email-sends` |

El frontend usa `integrationsClient` (puerto 3014) en vez de `crmClient` (3011) para todas estas rutas.

### Que eliminar del CRM

**`src/modules/integrations/integrations.controller.ts`:**
- Eliminar endpoints: `GET email-config`, `PUT email-config`, `POST email-config/test` (lineas ~75-114)

**`src/modules/integrations/integrations.service.ts`:**
- Eliminar: `getEmailConfig()`, `upsertEmailConfig()`, `testEmailConfig()` (lineas ~27-152)
- Eliminar: `import * as nodemailer` y `interface EmailConfig`

**`src/modules/email/` (directorio completo):**
- Eliminar `email.controller.ts`, `email.service.ts`, `email.module.ts`, `dto/`
- Eliminar registro de `EmailModule` en `app.module.ts`
- La lógica ahora vive en `integrations-service/src/modules/email-templates/`

### Que NO tocar

- **`EmailSenderService`** (`automations/services/email-sender.service.ts`) — lee SMTP config directo de `emailSmsConfig` en tenant DB, no depende de EmailService ni IntegrationsService
- **`AutomationsModule`** — lee templates directo de tenant DB (`crmEmailTemplate.findFirst()`), no depende del email controller
- **`TemplateVariablesService`** — sustituye variables en plantillas, funciona independientemente
- **Twilio config endpoints** — (opcional) tambien podrian migrar a integrations-service en el futuro

### Permisos

- `crm.email_marketing.*` — siguen usándose por el PermissionsGuard de integrations-service (los permisos viven en tenant DB, compartida)
- `crm.integrations.view` / `crm.integrations.manage` — quedan huerfanos si no hay otros endpoints CRM que los usen. Evaluar si eliminarlos del seed
