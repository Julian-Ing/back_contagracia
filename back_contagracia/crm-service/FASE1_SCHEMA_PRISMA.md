# FASE 1 - Schema Prisma (Modelos CRM en schema-tenant)

> **Archivo principal:** `contagracia-shared-modules/prisma/schema-tenant.prisma`
> **Referencia:** SQL migraciones en `horizont/supabase/migrations/`
> **Fecha inicio:** 2026-02-02

---

## Resumen

Agregar **8 enums** + **21 modelos CRM** + actualizar **4 modelos existentes** + **seed de etapas por defecto** al schema-tenant.prisma.

---

## Dependencias verificadas

| Modelo existente | Ubicación en schema | Estado |
|---|---|---|
| `ThirdParty` | Línea 719 | Ya existe - agregar relación inversa |
| `TenantUser` | Línea 263 | Ya existe - agregar 13 relaciones inversas CRM |
| `CostCenter` | Línea 875 | Ya existe - agregar relación inversa |
| `Document` | Línea 1828 | Ya tiene `opportunity_id` y `crm_contact_id` - agregar relaciones formales |
| `EmailSmsConfig` | Línea 1701 | Ya tiene config Twilio/SMTP - no requiere cambios |

---

## Tareas detalladas

### 1.1 Enums CRM
> Insertar después de `enum TransactionDirection` (línea ~219)

| Enum | Valores |
|------|---------|
| `LeadStage` | NEW, CONTACTED, QUALIFIED, LOST, CONVERTED |
| `LeadSource` | WEB, SOCIAL, REFERRAL, ADS, MANUAL, WHATSAPP, EMAIL, FORM, OTHER |
| `CampaignChannel` | EMAIL, SOCIAL, ADS, MANUAL, WEB, WHATSAPP |
| `CampaignStatus` | ACTIVE, PAUSED, FINISHED |
| `CrmActivityType` | CALL, MEETING, EMAIL, TASK, NOTE, REMINDER, WHATSAPP_MESSAGE |
| `CrmActivityStatus` | PENDING, COMPLETED, CANCELED |
| `MessageDirection` | INBOUND, OUTBOUND |
| `MessageStatus` | PENDING, SENT, DELIVERED, READ, FAILED |

---

### 1.2 Modelo `CrmContact`
> Tabla: `crm_contacts`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| full_name | String | |
| email | String? | |
| phone | String? | |
| company_name | String? | |
| whatsapp_number | String? @unique | |
| whatsapp_subscribed | Boolean | default false |
| last_whatsapp_message_at | DateTime? | |
| tags | String[] | Array PostgreSQL |
| notes | Text? | |
| birth_date | Date? | |
| consent_ip | String? | GDPR |
| consent_timestamp | DateTime? | GDPR |
| consent_method | String? | GDPR |
| tercero_id | String? FK | → ThirdParty (cuando se convierte a cliente formal) |
| segment | String? | "Cliente Frecuente", "Cliente Inactivo", "Alto Valor", "Nuevo Cliente" |
| created_by | String? FK | → TenantUser |
| updated_by | String? FK | → TenantUser |
| is_active | Boolean | Soft delete |
| deleted_at | DateTime? | Soft delete |

**Relaciones inversas:** leads[], activities[], tag_assignments[], opportunities[], form_submissions[], email_sends[], whatsapp_conversations[], whatsapp_messages[], documents[]

---

### 1.3 Modelo `CrmLead`
> Tabla: `crm_leads`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| contact_id | String FK | → CrmContact (CASCADE) |
| campaign_id | String? FK | → CrmCampaign |
| source | LeadSource | |
| stage | LeadStage | default NEW |
| assigned_to | String? FK | → TenantUser |
| converted_at | DateTime? | |
| created_by / updated_by | String? FK | → TenantUser |
| is_active / deleted_at | | Soft delete |

**Relaciones inversas:** activities[], opportunities[], whatsapp_messages[]

---

### 1.4 Modelo `CrmOpportunity`
> Tabla: `crm_opportunities`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| lead_id | String? FK | → CrmLead |
| contact_id | String? FK | → CrmContact |
| name | String | |
| expected_value | Decimal(19,4) | |
| stage_id | String FK | → CrmOpportunityStage |
| probability | Decimal(5,2) | 0-100 |
| close_date | Date? | |
| won_at | DateTime? | |
| lost_reason | Text? | |
| assigned_to | String? FK | → TenantUser |
| cost_center_id | String? FK | → CostCenter |
| history | Json? | Log de cambios de etapa |
| created_by / updated_by | String? FK | → TenantUser |
| is_active / deleted_at | | Soft delete |

**Relaciones inversas:** activities[], documents[] (via Document.opportunity_id), whatsapp_messages[]

---

### 1.5 Modelo `CrmCampaign`
> Tabla: `crm_campaigns`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| name | String | |
| description | Text? | |
| channel | CampaignChannel | |
| target_audience | Json? | |
| start_date | Date | |
| end_date | Date? | |
| budget | Decimal(19,4)? | |
| status | CampaignStatus | default ACTIVE |
| whatsapp_template_sid | String? | |
| whatsapp_template_params | Json? | |
| created_by / updated_by | String? FK | → TenantUser |
| is_active / deleted_at | | Soft delete |

**Relaciones inversas:** leads[], activities[], email_sends[], whatsapp_messages[], lead_forms[]

---

### 1.6 Modelo `CrmActivity`
> Tabla: `crm_activities`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| contact_id | String? FK | → CrmContact |
| lead_id | String? FK | → CrmLead |
| opportunity_id | String? FK | → CrmOpportunity |
| user_id | String? FK | → TenantUser (responsable) |
| campaign_id | String? FK | → CrmCampaign |
| type | CrmActivityType | |
| subject | String | |
| description | Text? | |
| status | CrmActivityStatus | default PENDING |
| due_date | DateTime? | |
| completed_at | DateTime? | |
| metadata | Json? | |
| created_by | String? FK | → TenantUser |
| is_active / deleted_at | | Soft delete |

**Relaciones inversas:** scheduled_reminders[]

---

### 1.7 Modelo `CrmOpportunityStage`
> Tabla: `crm_opportunity_stages`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| name | String | |
| position | Int | Orden visual |
| color | String | default "#3B82F6" |
| is_won | Boolean | default false |
| is_lost | Boolean | default false |
| is_active | Boolean | |

**Relaciones inversas:** opportunities[]

---

### 1.8 Modelos de Tags

**CrmContactTag** (`crm_contact_tags`): id, name (unique), color, is_active

**CrmContactTagAssignment** (`crm_contact_tag_assignments`): id, contact_id FK, tag_id FK, unique(contact_id, tag_id)

---

### 1.9 Modelos de Formularios

**CrmLeadForm** (`crm_lead_forms`): id, name, description, slug (unique), redirect_url, campaign_id? FK, is_active

**CrmFormField** (`crm_form_fields`): id, form_id FK (CASCADE), field_name, field_type, is_required, position, options (Json?)

**CrmFormSubmission** (`crm_form_submissions`): id, form_id FK (CASCADE), contact_id? FK, data (Json), ip_address, submitted_at

---

### 1.10 Modelos de Automatizaciones

**CrmOpportunityAutomation** (`crm_opportunity_automations`): id, trigger_event, action_type, action_config (Json), is_active

**CrmActivityAutomation** (`crm_activity_automations`): id, trigger_event, action_type, action_config (Json), is_active

**CrmFormAutomation** (`crm_form_automations`): id, form_id FK (CASCADE), action_type, action_config (Json), is_active

---

### 1.11 Modelos de Recordatorios

**CrmMeetingReminderConfig** (`crm_meeting_reminder_configs`): id, default_reminder_minutes (Int[]), is_active

**CrmScheduledReminder** (`crm_scheduled_reminders`): id, activity_id FK (CASCADE), remind_at, sent (default false)

---

### 1.12 Modelos de Email

**CrmEmailTemplate** (`crm_email_templates`): id, name, subject, body_html (Text), variables (Json?), is_active

**CrmEmailSend** (`crm_email_sends`): id, template_id? FK, contact_id? FK, campaign_id? FK, subject, body_html (Text), status (MessageStatus), sent_at, opened_at, clicked_at, bounced_at, failure_reason

---

### 1.13 Modelos de WhatsApp

**CrmWhatsappTemplate** (`crm_whatsapp_templates`): id, name, template_sid (unique), language, body_template (Text), variables (Json?), status, is_active

**CrmWhatsappConversation** (`crm_whatsapp_conversations`): id, contact_id FK (CASCADE), phone_number, is_active, last_message_at

**CrmWhatsappMessage** (`crm_whatsapp_messages`): id, conversation_id? FK, contact_id? FK, lead_id? FK, opportunity_id? FK, campaign_id? FK, direction (MessageDirection), phone_number, message_type, message_content (Text), template_name?, template_params (Json?), status (MessageStatus), sent_at, delivered_at, read_at, failed_at, failure_reason, user_id? FK, replied_to_message_id?, media_url?, metadata (Json?)

---

### 1.14 Modificaciones a modelos existentes

#### TenantUser (+13 relaciones inversas)
```
crm_contacts_created, crm_contacts_updated,
crm_leads_assigned, crm_leads_created, crm_leads_updated,
crm_opportunities_assigned, crm_opportunities_created, crm_opportunities_updated,
crm_campaigns_created, crm_campaigns_updated,
crm_activities, crm_activities_created,
crm_whatsapp_messages
```

#### Document (+2 relaciones, +2 indexes)
```
crm_opportunity  → CrmOpportunity (vía opportunity_id existente)
crm_contact      → CrmContact (vía crm_contact_id existente)
@@index([opportunity_id])
@@index([crm_contact_id])
```

#### CostCenter (+1 relación inversa)
```
crm_opportunities CrmOpportunity[]
```

#### ThirdParty (+1 relación inversa)
```
crm_contacts CrmContact[] @relation("CrmContactToThirdParty")
```

---

### 1.14 Seed de etapas por defecto
> Crear: `contagracia-shared-modules/prisma/seeds/crm-stages.seed.ts`

| position | name | color | is_won | is_lost |
|----------|------|-------|--------|---------|
| 1 | Prospección | #3B82F6 | false | false |
| 2 | Contacto | #8B5CF6 | false | false |
| 3 | Propuesta | #F59E0B | false | false |
| 4 | Negociación | #EF4444 | false | false |
| 5 | Ganado | #10B981 | true | false |
| 6 | Perdido | #6B7280 | false | true |

---

### 1.15 Generar y validar
```bash
pnpm prisma:generate   # Validar que compila
# Cuando haya BD de prueba: migrate-all-tenants.ts --force
```

---

## Convenciones aplicadas

- **PK:** `id String @id @default(uuid())`
- **Tabla:** `@@map("crm_snake_case")`
- **Indexes:** `@@index([fk_field])` en todas las FKs
- **Soft delete:** `is_active Boolean @default(true)` + `deleted_at DateTime?`
- **Audit:** `created_by`/`updated_by` → TenantUser + `created_at`/`updated_at`
- **Decimales:** `@db.Decimal(19, 4)` para valores monetarios
- **Relations nombradas:** `@relation("CrmContactCreatedBy")`

---

## Notas

- Todos los cambios son **aditivos** (no se modifica data existente)
- Las FKs `opportunity_id` y `crm_contact_id` en Document ya existen como `String?` - solo se agregan las relaciones formales
- Los servicios externos (WhatsApp API, Email sending) son **Fase 4** - el schema solo define la estructura
