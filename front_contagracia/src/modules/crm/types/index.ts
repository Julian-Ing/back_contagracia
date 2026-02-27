// ============================================
// CRM Types
// ============================================

// ---------- Enums ----------

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type LeadSource = 'manual' | 'web' | 'whatsapp' | 'facebook' | 'instagram' | 'referral' | 'import' | 'form' | 'other';
export type CampaignChannel = 'email' | 'social' | 'ads' | 'whatsapp' | 'web' | 'manual';
export type CampaignStatus = 'active' | 'paused' | 'finished';
export type ActivityType = 'call' | 'meeting' | 'email' | 'task' | 'note' | 'reminder' | 'whatsapp_message';
export type ActivityStatus = 'pending' | 'completed' | 'canceled';
export type AutomationActionType = 'email' | 'whatsapp' | 'activity';
export type AssignedToRule = 'same_as_owner' | 'specific_user' | 'creator';

// ---------- Core Entities ----------

// CrmContact ahora es ThirdParty con roles = ['CONTACT']
export interface CrmContact {
  id: string;
  name: string; // Antes era full_name
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  company_name: string | null;
  birth_date: string | null;
  segment: string | null;
  notes: string | null;
  roles: string[];
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations (populated)
  assigned_user?: TenantUserRef;
  crm_tag_assignments?: CrmContactTagAssignment[];
  tags?: CrmContactTag[];
  leads_count?: number;
}

export interface CrmContactTagAssignment {
  id: string;
  tag: CrmContactTag;
}

export interface CrmLead {
  id: string;
  third_party_id: string;
  campaign_id: string | null;
  stage: LeadStage;
  source: LeadSource;
  assigned_to: string | null;
  converted_at: string | null;
  probability: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations (populated)
  third_party?: CrmContact;
  campaign?: CrmCampaign;
  assigned_user?: TenantUserRef;
}

export interface CrmOpportunity {
  id: string;
  lead_id: string | null;
  third_party_id: string | null;
  name: string;
  stage_id: string;
  expected_value: number | null;
  calculated_value: number | null;
  close_date: string | null;
  probability: number | null;
  assigned_to: string | null;
  cost_center_id: string | null;
  won_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations (populated)
  third_party?: CrmContact;
  lead?: CrmLead;
  assigned_user?: TenantUserRef;
  stage?: CrmOpportunityStage;
  quotes_count?: number;
}

export interface CrmCampaign {
  id: string;
  name: string;
  description: string | null;
  channel: CampaignChannel;
  status: CampaignStatus;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
  // Computed
  leads_count?: number;
  conversion_rate?: number;
}

export interface CrmActivity {
  id: string;
  lead_id: string | null;
  opportunity_id: string | null;
  third_party_id: string | null;
  user_id: string;
  type: ActivityType;
  subject: string;
  description: string | null;
  status: ActivityStatus;
  due_date: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
  // Relations (populated)
  third_party?: CrmContact;
  lead?: CrmLead;
  opportunity?: CrmOpportunity;
  assigned_user?: TenantUserRef;
}

// ---------- Configuration ----------

export interface CrmOpportunityStage {
  id: string;
  value: string | null;
  name: string;
  color: string;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  is_quoting_stage: boolean;
  is_initial_stage: boolean;
  position: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CrmContactTag {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

// ---------- Forms ----------

export interface CrmLeadForm {
  id: string;
  company_id?: string;
  name: string;
  slug: string;
  description: string | null;
  redirect_url: string | null;
  campaign_id: string | null;
  fields: CrmFormField[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: { submissions: number };
  submissions_count?: number;
  leads_count?: number;
}

export interface CrmFormField {
  id: string;
  form_id: string;
  field_name: string;
  field_type: string;
  label: string;
  placeholder: string | null;
  is_required: boolean;
  position: number;
  options: any;
  created_at: string;
}

export interface CrmFormSubmission {
  id: string;
  form_id: string;
  data: Record<string, string>;
  lead_id: string | null;
  created_at: string;
}

// ---------- Automations ----------

export interface CrmOpportunityAutomation {
  id: string;
  trigger_from_stage: string | null;
  trigger_to_stage: string;
  action_type: AutomationActionType;
  template_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CrmActivityAutomation {
  id: string;
  trigger_from_stage: string | null;
  trigger_to_stage: string;
  activity_type: ActivityType;
  activity_subject: string;
  activity_description: string | null;
  days_offset: number;
  assigned_to_rule: AssignedToRule;
  assigned_to_user_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CrmFormAutomation {
  id: string;
  form_id: string;
  action_type: 'assign' | 'create_activity' | 'send_email';
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface CrmMeetingReminderConfig {
  id: string;
  timezone: string;
  enabled_days: number[];
  start_time: string;
  end_time: string;
  is_active: boolean;
}

// ---------- Email ----------

export interface EmailTemplateType {
  id: string;
  name: string;
  module_key: string | null;
  description: string | null;
  is_active: boolean;
  _count?: { templates: number };
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  type_id?: string | null;
  type?: { id: string; name: string; module_key: string | null } | null;
  is_active: boolean;
  created_at: string;
}

/** @deprecated Use EmailTemplate instead */
export type CrmEmailTemplate = EmailTemplate;

export interface EmailSend {
  id: string;
  third_party_id: string | null;
  template_id: string | null;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  sent_at: string | null;
  created_at: string;
  third_party?: CrmContact;
  template?: EmailTemplate;
}

/** @deprecated Use EmailSend instead */
export type CrmEmailSend = EmailSend;

// ---------- WhatsApp ----------

export type WhatsappMessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export type WhatsappConversationStatus = 'open' | 'pending' | 'closed';

export interface CrmWhatsappTemplate {
  id: string;
  name: string;
  template_sid: string;
  language: string | null;
  body_template: string | null;
  variables: string[] | null;
  status: string;
  is_active: boolean;
  created_at: string;
  template_type: string | null;
  template_config: Record<string, unknown> | null;
  header_text: string | null;
  footer_text: string | null;
  buttons: Record<string, unknown>[] | null;
  media_url: string | null;
  twilio_status: string | null;
  variable_mapping: Record<string, { source: string; field?: string; value?: string }> | null;
  last_synced_at: string | null;
}

export interface CrmWhatsappConversation {
  id: string;
  third_party_id: string;
  phone_number: string;
  assigned_to: string | null;
  status: WhatsappConversationStatus;
  last_message_at: string | null;
  last_inbound_message_at: string | null;
  unread_count: number;
  is_active: boolean;
  created_at: string;
  third_party?: CrmContact;
  assigned_user?: { id: string; full_name: string } | null;
  messages?: CrmWhatsappMessage[];
}

export interface CrmWhatsappMessage {
  id: string;
  conversation_id: string | null;
  third_party_id: string | null;
  direction: 'INBOUND' | 'OUTBOUND';
  phone_number: string;
  message_type: string;
  message_content: string;
  template_name: string | null;
  template_params: Record<string, string> | null;
  media_url: string | null;
  media_content_type: string | null;
  twilio_sid: string | null;
  status: WhatsappMessageStatus;
  user_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

// ---------- Team / Performance ----------

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  leads_count: number;
  opportunities_count: number;
  won_count: number;
  total_won_value: number;
  activities_completed: number;
  conversion_rate: number;
  supervisor_id: string | null;
}

// ---------- Refs ----------

export interface TenantUserRef {
  id: string;
  name: string;
  email: string;
  role?: string;
}

// ---------- Dashboard ----------

export interface CrmDashboardStats {
  total_leads: number;
  new_leads: number;
  open_opportunities: number;
  total_pipeline_value: number;
  won_opportunities: number;
  total_won_value: number;
  conversion_rate: number;
  active_campaigns: number;
  activities_pending: number;
  emails_sent: number;
  whatsapp_conversations: number;
}

export interface PipelineStageStats {
  stage: string;
  stage_name: string;
  color: string;
  count: number;
  value: number;
}
