# Motor de Automatizaciones CRM

## Resumen Ejecutivo

Este documento detalla la implementación del motor de automatizaciones para el CRM, basado en el análisis del sistema anterior (Horizont). El motor permitirá ejecutar acciones automáticas en respuesta a eventos del CRM.

---

## Estado Actual vs Objetivo

| Componente | Estado Actual | Objetivo |
|------------|---------------|----------|
| CRUD Automatizaciones | ✅ **Implementado** (campos específicos, DTOs tipados) | ~~Expandir con campos específicos~~ ✅ |
| Motor de Ejecución | ✅ **Implementado** (AutomationEngineService + EventEmitter) | ~~Implementar~~ ✅ |
| Scheduler de Eventos | ✅ **Implementado** (ScheduledEventsService + ReminderSchedulerService) | ~~Implementar~~ ✅ |
| **Servicio Email** | ✅ **Implementado** (EmailSenderService + Nodemailer) | ~~Implementar en crm-service~~ ✅ |
| Integración WhatsApp | ⏸️ Pendiente (otro dev) | Preparar interfaces |

---

## Análisis del Código Existente (2026-02-05)

### Schema Prisma - Modelos de Automatización

| Modelo | Estado | Observaciones |
|--------|--------|---------------|
| `CrmOpportunityAutomation` | ✅ Existe | Campos genéricos: `trigger_event`, `action_type`, `action_config` (JSON) |
| `CrmActivityAutomation` | ✅ Existe | Campos genéricos: `trigger_event`, `action_type`, `action_config` (JSON) |
| `CrmFormAutomation` | ✅ Existe | Tiene `form_id` + campos genéricos |
| `CrmMeetingReminderConfig` | ✅ Existe | Campos: `default_reminder_minutes[]`, `is_active` |
| `CrmScheduledReminder` | ✅ Existe | Campos: `activity_id`, `remind_at`, `sent` |
| `EmailSmsConfig` | ✅ Existe | SMTP + Twilio config por tenant |
| `CrmEventAutomation` | ❌ **NO existe** | Requiere migración |
| `CrmAutomationLog` | ❌ **NO existe** | Requiere migración |

> **IMPORTANTE:** Los modelos existentes usan campos genéricos (`trigger_event`, `action_type`, `action_config` como JSON). El plan original propone campos específicos (`trigger_stage_from`, `trigger_stage_to`, `email_template_id`, etc.). **Decisión requerida:** ¿Migrar a campos específicos o mantener esquema flexible?

### Backend - Módulo Automations

**Ubicación:** `src/modules/automations/`

**Endpoints existentes (12 total):**
```
GET/POST/PATCH/DELETE  /companies/:companyId/crm/automations/opportunity
GET/POST/PATCH/DELETE  /companies/:companyId/crm/automations/activity
GET/POST/PATCH/DELETE  /companies/:companyId/crm/automations/form
```

**DTOs actuales:**
- `CreateAutomationDto`: `{ trigger_event, action_type, action_config, form_id? }`
- `UpdateAutomationDto`: `{ trigger_event?, action_type?, action_config?, is_active? }`

**Estado:** Solo CRUD de configuración. **NO hay lógica de ejecución.**

### Backend - opportunities.service.ts

**Método `changeStage()`** (líneas 147-200):
- ✅ Valida oportunidad y etapa
- ✅ Requiere `lost_reason` si etapa es `is_lost`
- ✅ Mantiene historial de cambios (`history[]`)
- ❌ **NO dispara automatizaciones**

### Backend - forms.service.ts

**Método `submitFormForCompany()`** (líneas 170-341):
- ✅ Busca/crea tercero (contacto)
- ✅ Crea lead automáticamente (`source: FORM`, `stage: NEW`)
- ✅ Registra submission
- ❌ **NO ejecuta CrmFormAutomation configuradas**

> **NOTA:** Ya existe lógica de crear lead/contacto. Las automatizaciones de formulario deberían **extender** esta lógica, no reemplazarla.

### Frontend - Página Automations

**Ubicación:** `src/app/dashboard/crm/automations/page.tsx`

**Estado:**
- ✅ 4 tabs maquetados (Oportunidades, Actividades, Formularios, Recordatorios)
- ✅ Modales de crear/editar
- ❌ **Usa datos MOCK** - no conectada a API
- ❌ No existe hook `useAutomations`
- ❌ No existe `automation.service.ts`

**Tipos definidos en `modules/crm/types/index.ts`** (líneas 191-233):
- `CrmOpportunityAutomation`, `CrmActivityAutomation`, `CrmFormAutomation`, `CrmMeetingReminderConfig`

---

## Decisiones Tomadas ✅

### 1. Esquema de datos: **ESPECÍFICO** ✅

Se migrarán los modelos existentes de campos genéricos (`action_config: Json`) a campos específicos. No temer a las migraciones.

**Antes (genérico):**
```prisma
model CrmOpportunityAutomation {
  trigger_event  String   // "stage_change"
  action_type    String   // "email"
  action_config  Json     // { stage_from: "x", stage_to: "y", template_id: "z" }
}
```

**Después (específico):**
```prisma
model CrmOpportunityAutomation {
  trigger_stage_from   String?   // null = cualquier etapa
  trigger_stage_to     String
  action_type          String    // 'email' | 'whatsapp'
  email_template_id    String?
  whatsapp_template_id String?
}
```

### 2. Ejecución asíncrona: **EventEmitter (NestJS)** ✅

Se usará el EventEmitter built-in de NestJS para desacoplar la ejecución de automatizaciones del flujo principal. Si en el futuro se necesita retry/cola, se migrará a BullMQ.

```typescript
// Ejemplo de uso
this.eventEmitter.emit('opportunity.stage.changed', {
  companyId,
  opportunityId,
  fromStage,
  toStage,
  context
});
```

### 3. Lógica de forms.service.ts: **EXTENDER** ✅

La lógica actual de `submitFormForCompany()` se mantiene como comportamiento por defecto. Las automatizaciones de formulario **extienden** esa funcionalidad agregando:
- Asignación personalizada (round robin, usuario específico)
- Crear oportunidad automáticamente
- Notificaciones al equipo
- Respuesta automática al contacto

Similar a como funcionaba en el proyecto anterior (Horizont).

---

## Orden de Implementación (de más independiente a más dependiente)

| # | Tipo | Dependencias | Prioridad |
|---|------|--------------|-----------|
| 1 | **Actividades** | Ninguna (solo crea registros CRM) | 🟢 PRIMERA |
| 2 | **Formularios** | Ninguna (ya tiene lógica parcial en forms.service) | 🟢 SEGUNDA |
| 3 | **Mensajes (Email)** | Nodemailer + tabla `EmailSmsConfig` | 🟡 TERCERA |
| 4 | **Recordatorios** | Scheduler + Email | 🟡 CUARTA |
| 5 | **Eventos** | Parcial: algunos dependen de invoicing-service | 🟠 QUINTA |

> **Nota sobre Eventos de Facturación:** Los eventos `invoice_created`, `invoice_paid`, `quote_accepted`, `quote_rejected` dependen de comunicación con `invoicing-service` y `quote-service`. Se implementará la **base/interface** para que cuando esos servicios estén listos, solo sea conectar.

---

## Tipos de Automatizaciones

### 1. Automatizaciones de Mensajes (Opportunity Automations)
**Tabla:** `crm_opportunity_automations`

**Trigger:** Cambio de etapa de oportunidad (stage_from → stage_to)

**Acciones disponibles:**
- `email` - Enviar email usando plantilla
- `whatsapp` - Enviar WhatsApp usando plantilla

**Campos clave:**
```
- trigger_stage_from: string (etapa origen)
- trigger_stage_to: string (etapa destino)
- action_type: 'email' | 'whatsapp'
- email_template_id: UUID (referencia a crm_email_templates)
- whatsapp_template_id: UUID (referencia a crm_whatsapp_templates)
- is_active: boolean
```

**Lógica de ejecución:**
1. Al cambiar stage de una oportunidad → buscar automatizaciones que coincidan con (stage_from, stage_to)
2. Para cada automatización activa → ejecutar la acción correspondiente
3. Reemplazar variables en la plantilla con datos del contacto/oportunidad

---

### 2. Automatizaciones de Actividades
**Tabla:** `crm_activity_automations`

**Trigger:** Cambio de etapa de oportunidad (stage_from → stage_to)

**Acción:** Crear actividad automática

**Campos clave:**
```
- trigger_stage_from: string
- trigger_stage_to: string
- activity_type: 'task' | 'call' | 'meeting' | 'email' | 'note'
- activity_subject: string
- activity_description: string
- days_offset: number (días después del trigger para programar)
- assigned_to_rule: 'same_as_owner' | 'specific_user'
- assigned_to_user_id: UUID (si rule = specific_user)
- is_active: boolean
```

**Lógica de ejecución:**
1. Al cambiar stage → buscar automatizaciones de actividad que coincidan
2. Calcular fecha de la actividad (now + days_offset)
3. Determinar usuario asignado según la regla
4. Crear la actividad en crm_activities

---

### 3. Automatizaciones de Formularios
**Tabla:** `crm_form_automations`

**Trigger:** Envío de formulario público (form_id específico)

**Acciones configurables:**
- Crear Lead automáticamente
- Crear Oportunidad automáticamente
- Asignar a usuario (round_robin o específico)
- Enviar notificación al equipo
- Respuesta automática al contacto

**Campos clave:**
```
- form_id: UUID
- create_lead: boolean
- lead_stage: string ('new', 'contacted', etc.)
- lead_source: string
- create_opportunity: boolean
- opportunity_stage_id: UUID
- opportunity_value: number
- opportunity_probability: number
- assignment_type: 'round_robin' | 'specific_user'
- assigned_user_id: UUID
- round_robin_users: UUID[] (array de usuarios para rotación)
- send_notification: boolean
- auto_response_enabled: boolean
- is_active: boolean
```

**Lógica de ejecución:**
1. Al recibir submission de formulario → buscar automatización para ese form_id
2. Si create_lead = true → crear lead con los datos del formulario
3. Si create_opportunity = true → crear oportunidad vinculada
4. Asignar según assignment_type (mantener contador de round_robin)
5. Si send_notification = true → notificar al usuario asignado
6. Si auto_response_enabled = true → enviar email de confirmación

**NOTA:** El forms.service.ts ya tiene lógica parcial de creación de lead/contacto. Hay que integrarla con este sistema.

---

### 4. Automatizaciones de Eventos
**Tabla:** `crm_event_automations`

**Tipos de evento (triggers):**
| Evento | Descripción | Origen | Estado |
|--------|-------------|--------|--------|
| `birthday` | Cumpleaños del contacto | CRM (scheduler) | ✅ Implementar |
| `opportunity_won` | Oportunidad ganada | CRM (stage change) | ✅ Implementar |
| `opportunity_lost` | Oportunidad perdida | CRM (stage change) | ✅ Implementar |
| `year_end` | Fin de año | CRM (scheduler) | ✅ Implementar |
| `custom_date` | Fecha personalizada | CRM (scheduler) | ✅ Implementar |
| `invoice_created` | Factura creada | invoicing-service | ⏸️ Solo interface |
| `invoice_paid` | Factura pagada | invoicing-service | ⏸️ Solo interface |
| `quote_accepted` | Cotización aceptada | quote-service | ⏸️ Solo interface |
| `quote_rejected` | Cotización rechazada | quote-service | ⏸️ Solo interface |

> **Eventos externos (invoice_*, quote_*):** Se implementa solo la interface/método receptor. Cuando `invoicing-service` o `quote-service` estén listos, llamarán a estos endpoints para disparar las automatizaciones.

**Acciones:**
- `email` - Enviar email
- `whatsapp` - Enviar WhatsApp
- `both` - Enviar ambos

**Campos clave:**
```
- name: string
- description: string
- event_type: string (uno de los tipos de arriba)
- action_type: 'email' | 'whatsapp' | 'both'
- email_template_id: UUID
- whatsapp_template_id: UUID
- target_segments: string[] (filtrar por segmentos/tags)
- delay_minutes: number
- custom_time: string (hora de envío para eventos programados)
- execution_count: number (contador de ejecuciones)
- last_executed_at: timestamp
- is_active: boolean
- applies_to_terceros: boolean (para cartera)
```

**Lógica de ejecución:**
- **Eventos inmediatos** (invoice_*, quote_*, opportunity_*): Ejecutar al momento del evento
- **Eventos programados** (birthday, year_end, custom_date): Scheduler diario que revisa y ejecuta

---

### 5. Recordatorios de Reuniones
**Tablas:**
- `crm_meeting_reminder_configs` - Configuración global por empresa
- `crm_scheduled_reminders` - Cola de recordatorios programados

**Trigger:** Tiempo antes de una actividad tipo "meeting"

**Configuración:**
```
crm_meeting_reminder_configs:
- company_id: UUID
- is_active: boolean
- send_to_assigned: boolean (enviar al usuario asignado)
- send_to_contact: boolean (enviar al contacto)
- reminder_times: number[] (ej: [1440, 60] = 24h y 1h antes)
- subject_template: string (con variables {{date}}, {{time}}, etc.)
- body_template: string (HTML)
```

**Cola de recordatorios:**
```
crm_scheduled_reminders:
- company_id: UUID
- activity_id: UUID
- scheduled_for: timestamp
- reminder_minutes_before: number
- status: 'pending' | 'sent' | 'failed'
- sent_at: timestamp
- error_message: string
```

**Lógica de ejecución:**
1. Al crear/actualizar meeting → generar recordatorios según reminder_times
2. Scheduler cada minuto → buscar recordatorios pending donde scheduled_for <= now
3. Enviar email usando la plantilla y marcar como sent

---

## Arquitectura de Implementación

### Fase 1: Modelos Prisma (Base de datos)
**Prioridad: ALTA | Estimación: 1-2 días**

```prisma
// Añadir al schema.prisma

model CrmOpportunityAutomation {
  id                  String    @id @default(uuid())
  company_id          String
  trigger_stage_from  String
  trigger_stage_to    String
  action_type         String    // 'email' | 'whatsapp'
  email_template_id   String?
  whatsapp_template_id String?
  is_active           Boolean   @default(true)
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt
  deleted_at          DateTime?

  @@map("crm_opportunity_automations")
}

model CrmActivityAutomation {
  id                  String    @id @default(uuid())
  company_id          String
  trigger_stage_from  String
  trigger_stage_to    String
  activity_type       String
  activity_subject    String
  activity_description String?
  days_offset         Int       @default(0)
  assigned_to_rule    String    // 'same_as_owner' | 'specific_user'
  assigned_to_user_id String?
  is_active           Boolean   @default(true)
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt
  deleted_at          DateTime?

  @@map("crm_activity_automations")
}

model CrmFormAutomation {
  id                    String    @id @default(uuid())
  company_id            String
  form_id               String
  create_lead           Boolean   @default(true)
  lead_stage            String?
  lead_source           String?
  create_opportunity    Boolean   @default(false)
  opportunity_stage_id  String?
  opportunity_value     Float?
  opportunity_probability Int?
  assignment_type       String    // 'round_robin' | 'specific_user'
  assigned_user_id      String?
  round_robin_users     Json?     // UUID[]
  round_robin_index     Int       @default(0)
  send_notification     Boolean   @default(true)
  auto_response_enabled Boolean   @default(false)
  is_active             Boolean   @default(true)
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  @@map("crm_form_automations")
}

model CrmEventAutomation {
  id                    String    @id @default(uuid())
  company_id            String
  name                  String
  description           String?
  event_type            String
  action_type           String    // 'email' | 'whatsapp' | 'both'
  email_template_id     String?
  whatsapp_template_id  String?
  target_segments       Json?     // string[]
  delay_minutes         Int       @default(0)
  custom_time           String?   // 'HH:mm'
  execution_count       Int       @default(0)
  last_executed_at      DateTime?
  applies_to_terceros   Boolean   @default(false)
  is_active             Boolean   @default(true)
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt
  deleted_at            DateTime?

  @@map("crm_event_automations")
}

model CrmMeetingReminderConfig {
  id                String    @id @default(uuid())
  company_id        String    @unique
  is_active         Boolean   @default(true)
  send_to_assigned  Boolean   @default(true)
  send_to_contact   Boolean   @default(true)
  reminder_times    Json      // number[] en minutos
  subject_template  String?
  body_template     String?
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  @@map("crm_meeting_reminder_configs")
}

model CrmScheduledReminder {
  id                      String    @id @default(uuid())
  company_id              String
  activity_id             String
  scheduled_for           DateTime
  reminder_minutes_before Int
  status                  String    @default("pending") // 'pending' | 'sent' | 'failed'
  sent_at                 DateTime?
  error_message           String?
  created_at              DateTime  @default(now())

  @@map("crm_scheduled_reminders")
}

model CrmAutomationLog {
  id              String    @id @default(uuid())
  company_id      String
  automation_type String    // 'opportunity' | 'activity' | 'form' | 'event' | 'reminder'
  automation_id   String
  trigger_data    Json      // Datos del evento que disparó
  action_data     Json      // Datos de la acción ejecutada
  status          String    // 'success' | 'failed'
  error_message   String?
  executed_at     DateTime  @default(now())

  @@map("crm_automation_logs")
}
```

**Dependencias:** Ninguna
**Entregable:** Migración de Prisma ejecutada

---

### Fase 2: Servicios de Automatización (Core)
**Prioridad: ALTA | Estimación: 3-4 días**

#### 2.1 Servicio Base de Automatizaciones
**Archivo:** `src/automations/automation-engine.service.ts`

```typescript
// Estructura sugerida
@Injectable()
export class AutomationEngineService {
  // Ejecuta automatizaciones de oportunidad al cambiar stage
  async executeOpportunityAutomations(
    companyId: string,
    opportunityId: string,
    fromStage: string,
    toStage: string,
    context: OpportunityContext
  ): Promise<AutomationResult[]>;

  // Ejecuta automatizaciones de actividad
  async executeActivityAutomations(
    companyId: string,
    fromStage: string,
    toStage: string,
    context: OpportunityContext
  ): Promise<AutomationResult[]>;

  // Ejecuta automatizaciones de formulario
  async executeFormAutomations(
    companyId: string,
    formId: string,
    submissionData: FormSubmissionData
  ): Promise<FormAutomationResult>;

  // Ejecuta automatizaciones de evento
  async executeEventAutomation(
    companyId: string,
    eventType: EventType,
    context: EventContext
  ): Promise<AutomationResult[]>;

  // Procesa la cola de recordatorios
  async processReminderQueue(): Promise<void>;
}
```

#### 2.2 Servicio de Variables de Plantilla
**Archivo:** `src/automations/template-variables.service.ts`

```typescript
// Reemplazo de variables en plantillas
@Injectable()
export class TemplateVariablesService {
  // Variables de contacto
  replaceContactVariables(template: string, contact: Contact): string;

  // Variables de oportunidad
  replaceOpportunityVariables(template: string, opportunity: Opportunity): string;

  // Variables de empresa
  replaceCompanyVariables(template: string, company: Company): string;

  // Variables de evento
  replaceEventVariables(template: string, event: EventData): string;
}
```

**Variables soportadas:**
```
Contacto:
{{contact_name}}, {{contact_email}}, {{contact_phone}}, {{contact_company}}

Oportunidad:
{{opportunity_name}}, {{opportunity_value}}, {{opportunity_stage}}, {{expected_close_date}}

Empresa:
{{company_name}}, {{company_email}}, {{company_phone}}

Eventos:
{{date}}, {{time}}, {{amount}}, {{invoice_number}}, {{quote_number}}
```

**Dependencias:** Fase 1 (modelos)
**Entregable:** Servicios con tests unitarios

---

### Fase 3: Integración con Servicios Existentes
**Prioridad: ALTA | Estimación: 2-3 días**

#### 3.1 Modificar opportunities.service.ts
Añadir llamada al motor de automatizaciones en `updateStage`:

```typescript
// En opportunities.service.ts - método updateStage
async updateStage(companyId: string, opportunityId: string, stageId: string) {
  const opportunity = await this.findOne(companyId, opportunityId);
  const oldStage = opportunity.stage_id;

  // Actualizar stage
  const updated = await this.prisma.crmOpportunity.update({...});

  // NUEVO: Ejecutar automatizaciones
  await this.automationEngine.executeOpportunityAutomations(
    companyId,
    opportunityId,
    oldStage,
    stageId,
    { opportunity: updated, contact: opportunity.contact }
  );

  await this.automationEngine.executeActivityAutomations(
    companyId,
    oldStage,
    stageId,
    { opportunity: updated, contact: opportunity.contact }
  );

  return updated;
}
```

#### 3.2 Modificar forms.service.ts
Integrar automatizaciones de formulario en `submitForm`:

```typescript
// En forms.service.ts - método submitPublicForm
async submitPublicForm(formSlug: string, data: SubmissionDto) {
  // ... lógica existente de guardar submission ...

  // NUEVO: Ejecutar automatizaciones
  const result = await this.automationEngine.executeFormAutomations(
    form.company_id,
    form.id,
    { submission, formData: data }
  );

  return { success: true, ...result };
}
```

**Dependencias:** Fase 2 (servicios core)
**Entregable:** Servicios modificados con tests de integración

---

### Fase 4: Scheduler para Eventos Programados
**Prioridad: MEDIA | Estimación: 2 días**

#### 4.1 Scheduler de Cumpleaños y Fechas
**Archivo:** `src/automations/scheduled-events.service.ts`

```typescript
@Injectable()
export class ScheduledEventsService {
  // Ejecutar diariamente a las 00:05
  @Cron('5 0 * * *')
  async processBirthdayAutomations(): Promise<void>;

  // Ejecutar el 31 de diciembre
  @Cron('0 0 31 12 *')
  async processYearEndAutomations(): Promise<void>;

  // Procesar fechas personalizadas
  @Cron('0 * * * *') // Cada hora
  async processCustomDateAutomations(): Promise<void>;
}
```

#### 4.2 Scheduler de Recordatorios
**Archivo:** `src/automations/reminder-scheduler.service.ts`

```typescript
@Injectable()
export class ReminderSchedulerService {
  // Ejecutar cada minuto
  @Cron('* * * * *')
  async processReminders(): Promise<void> {
    const pendingReminders = await this.findPendingReminders();
    for (const reminder of pendingReminders) {
      await this.sendReminder(reminder);
    }
  }

  // Al crear/actualizar meeting, programar recordatorios
  async scheduleReminders(activityId: string): Promise<void>;

  // Cancelar recordatorios si se cancela meeting
  async cancelReminders(activityId: string): Promise<void>;
}
```

**Dependencias:**
- Fase 2 (servicios core)
- Fase 5 (comunicaciones) - parcial, puede usar mocks

**Entregable:** Schedulers funcionando con NestJS @Cron

---

### Fase 5: Servicios de Comunicación
**Prioridad: ALTA | Estimación: 2-3 días**

#### 5.1 Servicio de Email (Nodemailer) - INTERNO en crm-service
**Archivo:** `src/email/email-sender.service.ts`

```typescript
@Injectable()
export class EmailSenderService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Configurar transporter con SMTP de la empresa
    this.transporter = nodemailer.createTransport({
      host: configService.get('SMTP_HOST'),
      port: configService.get('SMTP_PORT'),
      secure: true,
      auth: {
        user: configService.get('SMTP_USER'),
        pass: configService.get('SMTP_PASS'),
      },
    });
  }

  // Enviar email usando template
  async sendFromTemplate(params: {
    companyId: string;
    templateId: string;
    to: string;
    variables: Record<string, string>;
  }): Promise<EmailResult>;

  // Enviar email directo
  async send(params: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<EmailResult>;

  // Registrar envío en crm_email_sends
  private async logEmailSend(data: EmailSendLog): Promise<void>;
}
```

**Configuración SMTP por tenant:**
La configuración SMTP se obtiene de la tabla `email_sms_config` (modelo `EmailSmsConfig`):
```prisma
model EmailSmsConfig {
  id            String  @id @default(uuid())
  smtp_host     String?
  smtp_port     Int     @default(587)
  smtp_user     String?
  smtp_password String?
  from_name     String?
  // ... también tiene config de Twilio para WhatsApp
}
```

**Comportamiento si no hay SMTP configurado:**
- La automatización NO se ejecuta
- Se registra en `crm_automation_logs` con status `'skipped'` y mensaje `'SMTP no configurado'`
- En frontend: mostrar toast/alerta indicando que falta configurar SMTP

#### 5.2 Servicio de WhatsApp (preparar interface)
**Archivo:** `src/whatsapp/whatsapp-sender.service.ts`

```typescript
@Injectable()
export class WhatsAppSenderService {
  // Interface preparada - implementación pendiente (otro dev)
  async sendFromTemplate(params: {
    companyId: string;
    templateId: string;
    to: string;
    variables: Record<string, string>;
  }): Promise<WhatsAppResult>;
}
```

**Estado:** Solo interface/mock. La integración real con Twilio la hace otro dev.

#### 5.3 Templates de Email/WhatsApp
Los templates ya existen en el sistema:
- `crm_email_templates` - Templates de email
- `crm_whatsapp_templates` - Templates de WhatsApp

**Dependencias:**
- Fase 2 (servicios core)
- WhatsApp: interface preparada, implementación pendiente (otro dev)

**Entregable:**
- ✅ EmailSenderService funcional con Nodemailer
- ⏸️ WhatsAppSenderService con mock/interface

---

### Fase 6: CRUD Completo de Automatizaciones
**Prioridad: MEDIA | Estimación: 2 días**

Expandir el `automations.service.ts` actual (66 líneas) para incluir:

#### 6.1 CRUD por tipo de automatización
```typescript
// Opportunity automations
opportunityAutomations: {
  findAll(companyId): Promise<OpportunityAutomation[]>;
  create(companyId, dto): Promise<OpportunityAutomation>;
  update(companyId, id, dto): Promise<OpportunityAutomation>;
  remove(companyId, id): Promise<void>;
  toggle(companyId, id): Promise<OpportunityAutomation>;
}

// Activity automations
activityAutomations: {
  findAll(companyId): Promise<ActivityAutomation[]>;
  create(companyId, dto): Promise<ActivityAutomation>;
  // ... etc
}

// Form automations
formAutomations: {
  findAll(companyId): Promise<FormAutomation[]>;
  // ... etc
}

// Event automations
eventAutomations: {
  findAll(companyId): Promise<EventAutomation[]>;
  // ... etc
}

// Reminder config
reminderConfig: {
  get(companyId): Promise<ReminderConfig>;
  upsert(companyId, dto): Promise<ReminderConfig>;
}
```

#### 6.2 Controller actualizado
```typescript
@Controller('crm/:companyId/automations')
export class AutomationsController {
  @Get('opportunity')
  @Get('opportunity/:id')
  @Post('opportunity')
  @Patch('opportunity/:id')
  @Delete('opportunity/:id')

  @Get('activity')
  // ... etc para cada tipo

  @Get('logs')
  async getLogs(@Query() filters): Promise<AutomationLog[]>;
}
```

**Dependencias:** Fase 1 (modelos)
**Entregable:** API REST completa con documentación Swagger

---

### Fase 7: Frontend - Página de Automatizaciones
**Prioridad: BAJA | Estimación: 3-4 días**

**Ubicación:** `front_contagracia/src/modules/crm/pages/AutomationsPage.tsx`

Componentes necesarios:
1. `AutomationsPage.tsx` - Página principal con tabs
2. `MessageAutomationsTab.tsx` - Tab de mensajes
3. `ActivityAutomationsTab.tsx` - Tab de actividades
4. `FormAutomationsTab.tsx` - Tab de formularios
5. `EventAutomationsTab.tsx` - Tab de eventos
6. `RemindersTab.tsx` - Tab de recordatorios
7. `AutomationLogsModal.tsx` - Modal para ver logs

Hook necesario:
```typescript
// useAutomations.ts
export const useAutomations = () => {
  // CRUD para cada tipo de automatización
  // Cargar stages, templates, usuarios
};
```

**Dependencias:** Fase 6 (API completa)
**Entregable:** UI funcional con todas las pestañas

---

## Orden de Implementación Recomendado

```
┌─────────────────────────────────────────────────────────────────┐
│ SEMANA 1                                                         │
├─────────────────────────────────────────────────────────────────┤
│ 📦 Instalar dependencias: @nestjs/schedule, nodemailer    [0.5d]│
│ Fase 1: Modelos Prisma                                    [1d]  │
│ Fase 2: Servicios Core (AutomationEngine, TemplateVars)   [3d]  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SEMANA 2 - Automatizaciones sin dependencias externas           │
├─────────────────────────────────────────────────────────────────┤
│ 🟢 Actividades: stage change → crear CrmActivity          [1.5d]│
│ 🟢 Formularios: submit → crear lead/oportunidad/asignar   [2d]  │
│ 🟡 Mensajes (Email): stage change → enviar email          [1.5d]│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SEMANA 3 - Schedulers y eventos                                  │
├─────────────────────────────────────────────────────────────────┤
│ 🟡 Recordatorios: scheduler + email antes de meeting      [2d]  │
│ 🟢 Eventos internos: birthday, opportunity_won/lost       [2d]  │
│ 🟠 Eventos externos: interfaces para invoice_*, quote_*   [1d]  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SEMANA 4 - CRUD completo + Frontend                              │
├─────────────────────────────────────────────────────────────────┤
│ Fase 6: CRUD completo + controller + Swagger              [2d]  │
│ Fase 7: Frontend (AutomationsPage con tabs)               [3d]  │
└─────────────────────────────────────────────────────────────────┘
```

**Leyenda:**
- 🟢 Sin dependencias externas
- 🟡 Depende de EmailSmsConfig (puede fallar silenciosamente si no hay SMTP)
- 🟠 Solo interface (depende de invoicing-service/quote-service)

---

## Dependencias Externas

| Servicio | Estado | Responsable | Impacto |
|----------|--------|-------------|---------|
| **Email (Nodemailer)** | ✅ **Implementado** | **Este proyecto** | **Funcional** |
| WhatsApp (Twilio) | ⏸️ Pendiente | Otro dev | Solo WhatsApp bloqueado |
| Permisos granulares | 🔄 En desarrollo | Otro dev | No bloqueante |

**Estado actual:**
1. **Email:** ✅ Implementado con `EmailSenderService` usando Nodemailer y config SMTP por tenant
2. **WhatsApp:** ⏸️ Interface preparada en eventos, implementación real con Twilio pendiente (otro dev)
3. **Automatizaciones de email funcionan** cuando hay SMTP configurado en `email_sms_config`

---

## Testing

### Tests Unitarios
- [ ] AutomationEngineService - triggers y ejecución
- [ ] TemplateVariablesService - reemplazo de variables
- [ ] Cada tipo de automatización CRUD

### Tests de Integración
- [ ] Cambio de stage dispara automatizaciones
- [ ] Envío de formulario crea lead/oportunidad
- [ ] Scheduler procesa cumpleaños correctamente
- [ ] Recordatorios se envían a tiempo

### Tests E2E
- [ ] Flujo completo: Crear automatización → Cambiar stage → Verificar acción
- [ ] Flujo formulario: Submit público → Lead creado → Usuario asignado

---

## Notas Técnicas

### Dependencias NPM a Instalar
```bash
# En crm-service
pnpm add @nestjs/schedule nodemailer
pnpm add -D @types/nodemailer
```

### Variables de Entorno Requeridas
```env
# Scheduler
ENABLE_AUTOMATIONS_SCHEDULER=true
```

**NOTA:** La configuración SMTP se obtiene de la tabla `email_sms_config` por tenant:
- `smtp_host`, `smtp_user`, `smtp_password`, `smtp_port`, `from_name`

### Consideraciones de Performance
- Las automatizaciones deben ejecutarse de forma asíncrona (no bloquear el request principal)
- Usar cola de mensajes para eventos de alto volumen
- Implementar rate limiting para envío de emails/WhatsApp

### Logging y Monitoreo
- Cada ejecución de automatización debe registrarse en `crm_automation_logs`
- Alertas si hay muchos fallos consecutivos
- Dashboard de métricas (ejecuciones/día, tasa de éxito, etc.)

### Permisos Granulares (preparar para integración futura)
Otro dev está implementando el sistema de permisos granulares. En cada endpoint del controller, **dejar comentado el permiso que se requerirá**:

```typescript
@Controller('crm/:companyId/automations')
export class AutomationsController {

  @Get('opportunity')
  // @RequirePermission('crm.automations.read')
  findAllOpportunityAutomations() { ... }

  @Post('opportunity')
  // @RequirePermission('crm.automations.create')
  createOpportunityAutomation() { ... }

  @Patch('opportunity/:id')
  // @RequirePermission('crm.automations.update')
  updateOpportunityAutomation() { ... }

  @Delete('opportunity/:id')
  // @RequirePermission('crm.automations.delete')
  deleteOpportunityAutomation() { ... }
}
```

**Permisos sugeridos para automatizaciones:**
| Permiso | Descripción |
|---------|-------------|
| `crm.automations.read` | Ver automatizaciones configuradas |
| `crm.automations.create` | Crear nuevas automatizaciones |
| `crm.automations.update` | Editar automatizaciones existentes |
| `crm.automations.delete` | Eliminar automatizaciones |
| `crm.automations.toggle` | Activar/desactivar automatizaciones |
| `crm.automations.logs` | Ver logs de ejecución |

---

## Checklist de Implementación

### Fase 1 - Modelos ✅
- [x] Modificar schema Prisma con campos específicos (trigger_stage_from, trigger_stage_to, etc.)
- [x] Agregar CrmEventAutomation y CrmAutomationLog
- [x] Agregar relaciones en CrmEmailTemplate y CrmWhatsappTemplate
- [x] Generar cliente Prisma (`pnpm prisma generate`)
- [x] Ejecutar migración en desarrollo (`npx ts-node --transpile-only prisma/scripts/migrate-all-tenants.ts --force`)

### Fase 2 - Servicios Core ✅
- [x] AutomationEngineService (escucha eventos, ejecuta automatizaciones)
- [x] TemplateVariablesService (reemplazo de variables en templates)
- [ ] Tests unitarios

### Fase 3 - Integración ✅
- [x] Modificar opportunities.service.ts (emite `opportunity.stage.changed`)
- [x] Modificar forms.service.ts (emite `form.submitted`)
- [ ] Tests de integración

### Fase 4 - Schedulers ✅
- [x] ScheduledEventsService (cumpleaños, año nuevo, fechas personalizadas)
- [x] ReminderSchedulerService (recordatorios de reuniones)
- [x] Configurar cron jobs
- [x] Integrar con activities.service.ts para programar/cancelar recordatorios

### Fase 5 - Comunicaciones ✅
- [x] Instalar `@nestjs/schedule`, `@nestjs/event-emitter` y `nodemailer`
- [x] EmailSenderService (Nodemailer) - interno en crm-service
- [x] Obtener config SMTP por tenant desde tabla `email_sms_config`
- [x] Fallback a Gmail si no hay SMTP configurado (credenciales hardcoded temporalmente)
- [x] Endpoint de prueba `POST /automations/test-email`
- [ ] WhatsAppSenderService interface/mock (implementación Twilio: otro dev)

### Fase 6 - CRUD ✅
- [x] Expandir automations.service.ts con DTOs específicos
- [x] Actualizar controller con endpoints toggle y logs
- [x] **Comentar permisos en cada endpoint** (ej: `// @RequirePermission('crm.automations.read')`)
- [ ] Documentar API en Swagger

### Fase 7 - Frontend ✅
- [x] Conectar AutomationsPage a la API real
- [x] Hook useAutomations (`src/modules/crm/hooks/useAutomations.ts`)
- [x] Service automationsService (`src/modules/crm/services/crm.service.ts`)
- [x] Formularios de oportunidad y actividad
- [x] Modal de logs (basico)

---

## Archivos Creados/Modificados (2026-02-06)

**Nuevos archivos:**
- `src/modules/automations/dto/opportunity-automation.dto.ts`
- `src/modules/automations/dto/activity-automation.dto.ts`
- `src/modules/automations/dto/form-automation.dto.ts`
- `src/modules/automations/events/automation.events.ts`
- `src/modules/automations/services/automation-engine.service.ts`
- `src/modules/automations/services/template-variables.service.ts`
- `src/modules/automations/services/email-sender.service.ts`
- `src/modules/automations/services/scheduled-events.service.ts` - Scheduler de cumpleaños, año nuevo, fechas personalizadas
- `src/modules/automations/services/reminder-scheduler.service.ts` - Scheduler de recordatorios de reuniones

**Archivos modificados:**
- `schema-tenant.prisma` - Modelos de automatización con campos específicos
- `app.module.ts` - Agregados EventEmitterModule y ScheduleModule
- `automations.module.ts` - Exporta nuevos servicios (incluye schedulers)
- `automations.service.ts` - CRUD con campos específicos + logs
- `automations.controller.ts` - Endpoints toggle y logs
- `opportunities.service.ts` - Emite evento al cambiar stage
- `forms.service.ts` - Emite evento al recibir submission
- `activities.service.ts` - Programa recordatorios al crear/actualizar reuniones
- `activities.module.ts` - Importa AutomationsModule para recordatorios

---

*Documento creado: 2026-02-05*
*Ultima actualizacion: 2026-02-06 (Fase 7 Frontend conectado + Migración BD ejecutada)*
*Basado en analisis de: horizont/src/pages/dashboard/crm/Automations.jsx*
