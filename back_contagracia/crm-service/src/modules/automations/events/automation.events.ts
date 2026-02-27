/**
 * Eventos de automatización del CRM
 * Estos eventos son emitidos por los servicios del CRM y escuchados por el AutomationEngineService
 */

// ============================================
// Eventos de Oportunidad
// ============================================

export class OpportunityStageChangedEvent {
  static readonly eventName = 'opportunity.stage.changed';

  constructor(
    public readonly companyId: string,
    public readonly opportunityId: string,
    public readonly fromStageId: string | null,
    public readonly toStageId: string,
    public readonly opportunity: {
      id: string;
      name: string;
      expected_value?: number;
      expected_close_date?: Date;
      assigned_to?: string;
    },
    public readonly contact: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      company_name?: string;
    } | null,
  ) {}
}

// ============================================
// Eventos de Formulario
// ============================================

export class FormSubmittedEvent {
  static readonly eventName = 'form.submitted';

  constructor(
    public readonly companyId: string,
    public readonly formId: string,
    public readonly submissionId: string,
    public readonly formData: Record<string, any>,
    public readonly contact: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
    } | null,
    public readonly leadId: string | null,
  ) {}
}

// ============================================
// Eventos de Actividad (Meeting)
// ============================================

export class MeetingCreatedEvent {
  static readonly eventName = 'meeting.created';

  constructor(
    public readonly companyId: string,
    public readonly activityId: string,
    public readonly scheduledAt: Date,
    public readonly assignedTo: string | null,
    public readonly contactId: string | null,
  ) {}
}

export class MeetingUpdatedEvent {
  static readonly eventName = 'meeting.updated';

  constructor(
    public readonly companyId: string,
    public readonly activityId: string,
    public readonly scheduledAt: Date,
    public readonly assignedTo: string | null,
    public readonly contactId: string | null,
  ) {}
}

export class MeetingCancelledEvent {
  static readonly eventName = 'meeting.cancelled';

  constructor(
    public readonly companyId: string,
    public readonly activityId: string,
  ) {}
}

// ============================================
// Eventos generales (para extensibilidad futura)
// ============================================

export class CrmEvent {
  static readonly eventName = 'crm.event';

  constructor(
    public readonly companyId: string,
    public readonly eventType: string,
    public readonly payload: Record<string, any>,
  ) {}
}

// ============================================
// Tipos de eventos
// ============================================

export const CRM_EVENTS = {
  OPPORTUNITY_STAGE_CHANGED: OpportunityStageChangedEvent.eventName,
  FORM_SUBMITTED: FormSubmittedEvent.eventName,
  MEETING_CREATED: MeetingCreatedEvent.eventName,
  MEETING_UPDATED: MeetingUpdatedEvent.eventName,
  MEETING_CANCELLED: MeetingCancelledEvent.eventName,
  CRM_EVENT: CrmEvent.eventName,
} as const;
