import { crmClient, integrationsClient } from '@/shared/services/api/apiClient';

const base = (companyId: string) => `/companies/${companyId}/crm`;

// ─── Dashboard ───
export const dashboardService = {
  getAll: (companyId: string) =>
    crmClient.get(`${base(companyId)}/dashboard`).then(r => r.data),
  getStats: (companyId: string) =>
    crmClient.get(`${base(companyId)}/dashboard/stats`).then(r => r.data),
  getPipeline: (companyId: string) =>
    crmClient.get(`${base(companyId)}/dashboard/pipeline`).then(r => r.data),
  getLeadsBySource: (companyId: string) =>
    crmClient.get(`${base(companyId)}/dashboard/leads-by-source`).then(r => r.data),
  getRecentActivities: (companyId: string) =>
    crmClient.get(`${base(companyId)}/dashboard/recent-activities`).then(r => r.data),
};

// ─── Stages ───
export const stagesService = {
  getAll: (companyId: string) =>
    crmClient.get(`${base(companyId)}/stages`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/stages`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/stages/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    crmClient.delete(`${base(companyId)}/stages/${id}`).then(r => r.data),
  reorder: (companyId: string, data: { stages: { id: string; position: number }[] }) =>
    crmClient.patch(`${base(companyId)}/stages/reorder`, data).then(r => r.data),
};

// ─── Tags ───
export const tagsService = {
  getAll: (companyId: string) =>
    crmClient.get(`${base(companyId)}/tags`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/tags`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/tags/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    crmClient.delete(`${base(companyId)}/tags/${id}`).then(r => r.data),
};

// ─── Contacts ───
export const contactsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    crmClient.get(`${base(companyId)}/contacts`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    crmClient.get(`${base(companyId)}/contacts/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/contacts`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/contacts/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    crmClient.delete(`${base(companyId)}/contacts/${id}`).then(r => r.data),
  addTag: (companyId: string, contactId: string, tagId: string) =>
    crmClient.post(`${base(companyId)}/contacts/${contactId}/tags`, { tagId }).then(r => r.data),
  removeTag: (companyId: string, contactId: string, tagId: string) =>
    crmClient.delete(`${base(companyId)}/contacts/${contactId}/tags/${tagId}`).then(r => r.data),
};

// ─── Campaigns ───
export const campaignsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    crmClient.get(`${base(companyId)}/campaigns`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    crmClient.get(`${base(companyId)}/campaigns/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/campaigns`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/campaigns/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    crmClient.delete(`${base(companyId)}/campaigns/${id}`).then(r => r.data),
};

// ─── Leads ───
export const leadsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    crmClient.get(`${base(companyId)}/leads`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    crmClient.get(`${base(companyId)}/leads/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/leads`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/leads/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    crmClient.delete(`${base(companyId)}/leads/${id}`).then(r => r.data),
  updateStage: (companyId: string, id: string, stage: string) =>
    crmClient.patch(`${base(companyId)}/leads/${id}/stage`, { stage }).then(r => r.data),
  convert: (companyId: string, id: string, data?: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/leads/${id}/convert`, data).then(r => r.data),
  bulkAssign: (companyId: string, data: { leadIds: string[]; assignedTo: string }) =>
    crmClient.patch(`${base(companyId)}/leads/bulk-assign`, data).then(r => r.data),
};

// ─── Opportunities ───
export const opportunitiesService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    crmClient.get(`${base(companyId)}/opportunities`, { params }).then(r => r.data),
  getKanban: (companyId: string) =>
    crmClient.get(`${base(companyId)}/opportunities/kanban`).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    crmClient.get(`${base(companyId)}/opportunities/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/opportunities`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/opportunities/${id}`, data).then(r => r.data),
  updateStage: (companyId: string, id: string, stageId: string) =>
    crmClient.patch(`${base(companyId)}/opportunities/${id}/stage`, { stage_id: stageId }).then(r => r.data),
  remove: (companyId: string, id: string) =>
    crmClient.delete(`${base(companyId)}/opportunities/${id}`).then(r => r.data),
};

// ─── Forms ───
export const formsService = {
  getAll: (companyId: string) =>
    crmClient.get(`${base(companyId)}/forms`).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    crmClient.get(`${base(companyId)}/forms/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/forms`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/forms/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    crmClient.delete(`${base(companyId)}/forms/${id}`).then(r => r.data),
  getSubmissions: (companyId: string, formId: string) =>
    crmClient.get(`${base(companyId)}/forms/${formId}/submissions`).then(r => r.data),
};

// ─── Email (via integrations-service) ───
export const emailService = {
  // Template Types
  getTypes: () =>
    integrationsClient.get('/email-template-types').then(r => r.data),
  createType: (data: Record<string, unknown>) =>
    integrationsClient.post('/email-template-types', data).then(r => r.data),
  updateType: (id: string, data: Record<string, unknown>) =>
    integrationsClient.patch(`/email-template-types/${id}`, data).then(r => r.data),
  removeType: (id: string) =>
    integrationsClient.delete(`/email-template-types/${id}`).then(r => r.data),
  // Templates
  getTemplates: (_companyId: string) =>
    integrationsClient.get('/email-templates').then(r => r.data),
  getByModule: (moduleKey: string) =>
    integrationsClient.get(`/email-templates/by-module/${moduleKey}`).then(r => r.data),
  createTemplate: (_companyId: string, data: Record<string, unknown>) =>
    integrationsClient.post('/email-templates', data).then(r => r.data),
  updateTemplate: (_companyId: string, id: string, data: Record<string, unknown>) =>
    integrationsClient.patch(`/email-templates/${id}`, data).then(r => r.data),
  removeTemplate: (_companyId: string, id: string) =>
    integrationsClient.delete(`/email-templates/${id}`).then(r => r.data),
  // Sends
  getSends: (_companyId: string, params?: Record<string, unknown>) =>
    integrationsClient.get('/email-sends', { params }).then(r => r.data),
  send: (_companyId: string, data: Record<string, unknown>) =>
    integrationsClient.post('/email-sends', data).then(r => r.data),
};

// ─── Team ───
export const teamService = {
  getMembers: (companyId: string) =>
    crmClient.get(`${base(companyId)}/team/members`).then(r => r.data),
  getPerformance: (companyId: string, userId: string, params?: Record<string, unknown>) =>
    crmClient.get(`${base(companyId)}/team/members/${userId}/performance`, { params }).then(r => r.data),
  getRanking: (companyId: string, params?: Record<string, unknown>) =>
    crmClient.get(`${base(companyId)}/team/ranking`, { params }).then(r => r.data),
};

// ─── Public Forms (no auth required) ───
export const publicFormsService = {
  getForm: (companyId: string, slug: string) =>
    crmClient.get(`/public/forms/${companyId}/${slug}`).then(r => r.data),
  submit: (companyId: string, slug: string, data: Record<string, unknown>) =>
    crmClient.post(`/public/forms/${companyId}/${slug}/submit`, data).then(r => r.data),
};

// ─── Automations ───
export const automationsService = {
  // Opportunity Automations
  getOpportunityAutomations: (companyId: string) =>
    crmClient.get(`${base(companyId)}/automations/opportunity`).then(r => r.data),
  createOpportunityAutomation: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/automations/opportunity`, data).then(r => r.data),
  updateOpportunityAutomation: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/automations/opportunity/${id}`, data).then(r => r.data),
  toggleOpportunityAutomation: (companyId: string, id: string) =>
    crmClient.patch(`${base(companyId)}/automations/opportunity/${id}/toggle`).then(r => r.data),
  deleteOpportunityAutomation: (companyId: string, id: string) =>
    crmClient.delete(`${base(companyId)}/automations/opportunity/${id}`).then(r => r.data),

  // Activity Automations
  getActivityAutomations: (companyId: string) =>
    crmClient.get(`${base(companyId)}/automations/activity`).then(r => r.data),
  createActivityAutomation: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/automations/activity`, data).then(r => r.data),
  updateActivityAutomation: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/automations/activity/${id}`, data).then(r => r.data),
  toggleActivityAutomation: (companyId: string, id: string) =>
    crmClient.patch(`${base(companyId)}/automations/activity/${id}/toggle`).then(r => r.data),
  deleteActivityAutomation: (companyId: string, id: string) =>
    crmClient.delete(`${base(companyId)}/automations/activity/${id}`).then(r => r.data),

  // Form Automations
  getFormAutomations: (companyId: string) =>
    crmClient.get(`${base(companyId)}/automations/form`).then(r => r.data),
  createFormAutomation: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/automations/form`, data).then(r => r.data),
  updateFormAutomation: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/automations/form/${id}`, data).then(r => r.data),
  toggleFormAutomation: (companyId: string, id: string) =>
    crmClient.patch(`${base(companyId)}/automations/form/${id}/toggle`).then(r => r.data),
  deleteFormAutomation: (companyId: string, id: string) =>
    crmClient.delete(`${base(companyId)}/automations/form/${id}`).then(r => r.data),

  // Automation Logs
  getLogs: (companyId: string, params?: Record<string, unknown>) =>
    crmClient.get(`${base(companyId)}/automations/logs`, { params }).then(r => r.data),

  // Test Email
  testEmail: (companyId: string, data: { to: string; subject?: string; message?: string }) =>
    crmClient.post(`${base(companyId)}/automations/test-email`, data).then(r => r.data),
};

// ─── WhatsApp ───
export const whatsappService = {
  // Conversations
  getConversations: (companyId: string, params?: { skip?: number; take?: number; status?: string }) =>
    crmClient.get(`${base(companyId)}/whatsapp/conversations`, { params }).then(r => r.data),
  getMessages: (companyId: string, conversationId: string, params?: { skip?: number; take?: number }) =>
    crmClient.get(`${base(companyId)}/whatsapp/conversations/${conversationId}/messages`, { params }).then(r => r.data),
  assignConversation: (companyId: string, conversationId: string, assignedTo: string | null) =>
    crmClient.patch(`${base(companyId)}/whatsapp/conversations/${conversationId}/assign`, { assigned_to: assignedTo }).then(r => r.data),
  closeConversation: (companyId: string, conversationId: string) =>
    crmClient.patch(`${base(companyId)}/whatsapp/conversations/${conversationId}/close`).then(r => r.data),
  markRead: (companyId: string, conversationId: string) =>
    crmClient.patch(`${base(companyId)}/whatsapp/conversations/${conversationId}/read`).then(r => r.data),

  // Messages
  sendMessage: (companyId: string, data: { third_party_id: string; conversation_id?: string; body?: string; media_url?: string; media_content_type?: string }) =>
    crmClient.post(`${base(companyId)}/whatsapp/messages/send`, data).then(r => r.data),

  // Templates
  getTemplates: (companyId: string) =>
    crmClient.get(`${base(companyId)}/whatsapp/templates`).then(r => r.data),
  createTemplate: (companyId: string, data: Record<string, unknown>) =>
    crmClient.post(`${base(companyId)}/whatsapp/templates`, data).then(r => r.data),
  updateTemplate: (companyId: string, id: string, data: Record<string, unknown>) =>
    crmClient.patch(`${base(companyId)}/whatsapp/templates/${id}`, data).then(r => r.data),
  updateTemplateMapping: (companyId: string, id: string, data: { variable_mapping: Record<string, unknown> }) =>
    crmClient.patch(`${base(companyId)}/whatsapp/templates/${id}/mapping`, data).then(r => r.data),
  syncTemplates: (companyId: string) =>
    crmClient.post(`${base(companyId)}/whatsapp/templates/sync`).then(r => r.data),
  sendTemplate: (companyId: string, data: { third_party_id: string; template_id: string; variables?: Record<string, string>; conversation_id?: string }) =>
    crmClient.post(`${base(companyId)}/whatsapp/templates/send`, data).then(r => r.data),

  // Twilio Config
  getTwilioConfig: (companyId: string) =>
    crmClient.get(`${base(companyId)}/twilio-config`).then(r => r.data),
  saveTwilioConfig: (companyId: string, data: { twilio_account_sid?: string; twilio_auth_token?: string; twilio_whatsapp_number?: string }) =>
    crmClient.put(`${base(companyId)}/twilio-config`, data).then(r => r.data),
  testTwilioConfig: (companyId: string) =>
    crmClient.post(`${base(companyId)}/twilio-config/test`).then(r => r.data),
};
