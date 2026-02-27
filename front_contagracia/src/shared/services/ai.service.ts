import { integrationsClient } from '@/shared/services/api/apiClient';

// ─── AI Config ───

export const aiConfigService = {
  getConfig: () =>
    integrationsClient.get('/ai/config').then((r) => r.data),

  updateConfig: (data: Record<string, unknown>) =>
    integrationsClient.patch('/ai/config', data).then((r) => r.data),

  testConnection: (provider: string) =>
    integrationsClient.post('/ai/test-connection', { provider }).then((r) => r.data),

  getModules: () =>
    integrationsClient.get('/ai/modules').then((r) => r.data),
};

// ─── AI Chat ───

export const aiChatService = {
  sendMessage: (data: { sessionId: string; prompt: string; moduleId?: string; route?: string }) =>
    integrationsClient.post('/ai/chat', data).then((r) => r.data),

  getSessions: () =>
    integrationsClient.get('/ai/sessions').then((r) => r.data),

  getSessionMessages: (sessionId: string) =>
    integrationsClient.get(`/ai/sessions/${sessionId}/messages`).then((r) => r.data),

  createSession: (data?: { moduleId?: string; title?: string }) =>
    integrationsClient.post('/ai/sessions', data || {}).then((r) => r.data),
};
