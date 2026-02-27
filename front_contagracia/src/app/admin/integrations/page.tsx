'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plug,
  Save,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Bot,
  Sparkles,
  Eye,
  EyeOff,
  Power,
  Zap,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select } from '@/shared/components/ui/select';
import toast from 'react-hot-toast';
import { integrationsClient } from '@/shared/services/api/apiClient';
import { aiConfigService } from '@/shared/services/ai.service';

// --- Types ---

interface Integration {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface IntegrationKey {
  id: string;
  integration_id: string;
  key_name: string;
  key_value: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

interface AIConfig {
  provider: string;
  geminiModel: string;
  openaiModel: string;
  anthropicModel: string;
  assistantName: string;
  role: string;
  greeting: string;
  avatar: string;
  tone: string;
  detailLevel: string;
  useEmojis: boolean;
  proactiveSuggestions: boolean;
}

interface APIKeys {
  gemini: string;
  openai: string;
  anthropic: string;
}

const AI_PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini', emoji: '✨', description: 'Gemini 2.5 Flash - Rápido y eficiente', keyUrl: 'https://aistudio.google.com/apikey' },
  { value: 'openai', label: 'OpenAI', emoji: '🤖', description: 'GPT-4o - Más reciente y multimodal', keyUrl: 'https://platform.openai.com/api-keys' },
  { value: 'anthropic', label: 'Anthropic Claude', emoji: '🧠', description: 'Claude Sonnet 4.5 - Inteligente y eficiente', keyUrl: 'https://console.anthropic.com/settings/keys' },
];

const AVATAR_OPTIONS = ['🤖', '💼', '📊', '💰', '🧠', '💬', '🎯', '✨', '🚀', '💡'];

const AI_MODELS: Record<string, { value: string; label: string }[]> = {
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  anthropic: [
    { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  ],
};

const TONE_OPTIONS = [
  { value: 'professional', label: '💼 Profesional - Claro y directo' },
  { value: 'friendly', label: '😊 Amigable - Cálido y cercano' },
  { value: 'casual', label: '🗣️ Casual - Relajado y conversacional' },
  { value: 'formal', label: '🤓 Técnico - Preciso y detallado' },
];

const DETAIL_OPTIONS = [
  { value: 'concise', label: '📝 Conciso - Breve y al punto' },
  { value: 'balanced', label: '📊 Mixto - Se adapta según la pregunta' },
  { value: 'detailed', label: '📖 Detallado - Explicaciones completas' },
];

// Helper: Map backend snake_case → frontend AIConfig
function mapBackendToFrontend(data: Record<string, any>): Partial<AIConfig> {
  return {
    provider: data.active_provider,
    geminiModel: data.gemini_model,
    openaiModel: data.openai_model,
    anthropicModel: data.anthropic_model,
    assistantName: data.assistant_name,
    role: data.assistant_role,
    greeting: data.greeting,
    avatar: data.avatar_emoji,
    tone: data.tone,
    detailLevel: data.detail_level,
    useEmojis: data.use_emojis,
    proactiveSuggestions: data.proactive_suggestions,
  };
}

// Helper: Map frontend AIConfig → backend PATCH body
function mapFrontendToBackend(config: AIConfig): Record<string, any> {
  return {
    active_provider: config.provider,
    gemini_model: config.geminiModel,
    openai_model: config.openaiModel,
    anthropic_model: config.anthropicModel,
    assistant_name: config.assistantName,
    assistant_role: config.role,
    greeting: config.greeting,
    avatar_emoji: config.avatar,
    tone: config.tone,
    detail_level: config.detailLevel,
    use_emojis: config.useEmojis,
    proactive_suggestions: config.proactiveSuggestions,
  };
}

// --- Component ---

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selected, setSelected] = useState<Integration | null>(null);
  const [keys, setKeys] = useState<IntegrationKey[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const pageSize = 10;

  // AI config state
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'gemini',
    geminiModel: 'gemini-2.5-flash',
    openaiModel: 'gpt-4o',
    anthropicModel: 'claude-sonnet-4-5',
    assistantName: 'Asistente Contagracia',
    role: 'Asistente contable especializado',
    greeting: '¡Hola! Soy tu asistente contable. ¿En qué puedo ayudarte?',
    avatar: '🤖',
    tone: 'professional',
    detailLevel: 'balanced',
    useEmojis: true,
    proactiveSuggestions: true,
  });
  const [apiKeys, setApiKeys] = useState<APIKeys>({ gemini: '', openai: '', anthropic: '' });
  const [aiConfigLoading, setAiConfigLoading] = useState(true);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  // Fetch integrations
  useEffect(() => {
    fetchIntegrations();
  }, []);

  // Load AI config from backend
  useEffect(() => {
    loadAIConfig();
  }, []);

  // Fetch keys when selection changes
  useEffect(() => {
    if (selected) {
      fetchKeys(selected.id);
    } else {
      setKeys([]);
    }
  }, [selected]);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const { data } = await integrationsClient.get('/integrations');
      setIntegrations(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar integraciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchKeys = async (integrationId: string) => {
    try {
      const { data } = await integrationsClient.get(`/integrations/${integrationId}/keys`);
      setKeys(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar claves');
    }
  };

  const saveKeys = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const keysToUpdate = keys.map(k => ({
        key_name: k.key_name,
        key_value: k.key_value,
      }));
      await integrationsClient.patch(`/integrations/${selected.id}/keys`, { keys: keysToUpdate });
      toast.success('Claves guardadas correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar claves');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (integration: Integration) => {
    try {
      await integrationsClient.patch(`/integrations/${integration.id}/toggle`, {
        is_active: !integration.is_active,
      });
      setIntegrations(prev =>
        prev.map(i => (i.id === integration.id ? { ...i, is_active: !i.is_active } : i))
      );
      if (selected?.id === integration.id) {
        setSelected(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
      }
      toast.success(`Integración ${!integration.is_active ? 'activada' : 'desactivada'}`);
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar estado');
    }
  };

  const loadAIConfig = async () => {
    try {
      setAiConfigLoading(true);

      // Load AI personality config (only works for company users)
      try {
        const data = await aiConfigService.getConfig();
        const mapped = mapBackendToFrontend(data);
        setAiConfig((prev) => ({ ...prev, ...mapped }));
      } catch {
        // system_admin no tiene company_id → usa defaults
      }

      // Load ALL API keys (works for any user via integrations CRUD)
      await loadAllApiKeys();
    } finally {
      setAiConfigLoading(false);
    }
  };

  const loadAllApiKeys = async () => {
    try {
      const { data: allIntegrations } = await integrationsClient.get('/integrations');
      const newKeys: APIKeys = { gemini: '', openai: '', anthropic: '' };

      for (const providerCode of ['gemini', 'openai', 'anthropic'] as const) {
        const integration = allIntegrations.find((i: Integration) => i.code === providerCode);
        if (!integration) continue;

        try {
          const { data: providerKeys } = await integrationsClient.get(`/integrations/${integration.id}/keys`);
          const apiKeyRecord = providerKeys.find((k: IntegrationKey) => k.key_name === 'api_key');
          if (apiKeyRecord?.key_value) {
            newKeys[providerCode] = apiKeyRecord.key_value;
          }
        } catch { /* key not configured */ }
      }

      setApiKeys(newKeys);
    } catch { /* integrations not loaded */ }
  };

  const filteredIntegrations = useMemo(() => {
    if (!search.trim()) return integrations;
    const term = search.toLowerCase();
    return integrations.filter(
      (i) => i.name.toLowerCase().includes(term) || i.description?.toLowerCase().includes(term)
    );
  }, [integrations, search]);

  const pagedIntegrations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredIntegrations.slice(start, start + pageSize);
  }, [filteredIntegrations, page]);

  const totalPages = Math.max(1, Math.ceil(filteredIntegrations.length / pageSize));

  const updateKeyValue = (idx: number, value: string) => {
    setKeys((prev) => prev.map((k, i) => (i === idx ? { ...k, key_value: value } : k)));
  };

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integraciones</h1>
        <p className="text-gray-500 dark:text-gray-400">Gestiona las integraciones externas y la configuración de IA</p>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-800">
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integraciones Externas
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Configuración de IA
          </TabsTrigger>
        </TabsList>

        {/* ========== INTEGRACIONES TAB ========== */}
        <TabsContent value="integrations" className="mt-6">
          <div className="flex gap-6">
            {/* Left: Integration list */}
            <div className="w-80 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Integraciones</h2>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={search}
                  onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                  className="pl-9 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                />
              </div>
              <div className="border border-gray-200 dark:border-slate-700 rounded-md divide-y divide-gray-200 dark:divide-slate-700">
                {pagedIntegrations.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">Sin integraciones</div>
                ) : (
                  pagedIntegrations.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => setSelected(it)}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors ${
                        selected?.id === it.id ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{it.name}</span>
                        <Badge variant={it.is_active ? 'default' : 'secondary'} className="text-xs">
                          {it.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 truncate">{it.description}</div>
                    </button>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-gray-500">{filteredIntegrations.length} en total</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="text-gray-500 dark:text-gray-400 h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-500">
                    {page}/{totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="text-gray-500 dark:text-gray-400 h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Detail panel */}
            <div className="flex-1">
              {!selected ? (
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-12 text-center">
                  <Plug className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Selecciona una integración para ver sus detalles</p>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selected.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{selected.description}</p>
                    </div>
                    <Button
                      variant={selected.is_active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleActive(selected)}
                      className="gap-2"
                    >
                      <Power className="h-4 w-4" />
                      {selected.is_active ? 'Activo' : 'Inactivo'}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Claves de Integración</h4>
                      <p className="text-xs text-gray-500">Configura las claves y parámetros de la integración</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                          <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400 font-medium w-1/3">Clave</th>
                          <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {keys.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-4 py-4 text-center text-gray-500">
                              Sin claves configuradas
                            </td>
                          </tr>
                        ) : (
                          keys.map((row, idx) => (
                            <tr key={row.id}>
                              <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{row.key_name}</td>
                              <td className="px-4 py-2">
                                <div className="flex gap-2">
                                  <Input
                                    type={row.is_secret && !showSecrets[row.id] ? 'password' : 'text'}
                                    value={row.key_value}
                                    placeholder="Valor"
                                    onChange={(e) => updateKeyValue(idx, e.target.value)}
                                    className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                                  />
                                  {row.is_secret && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleSecretVisibility(row.id)}
                                      className="px-2"
                                    >
                                      {showSecrets[row.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end">
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={saveKeys}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar Cambios
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ========== AI CONFIG TAB ========== */}
        <TabsContent value="ai" className="mt-6">
          {aiConfigLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <AIConfigPanel
              config={aiConfig}
              setConfig={setAiConfig}
              apiKeys={apiKeys}
              setApiKeys={setApiKeys}
              showApiKeys={showApiKeys}
              setShowApiKeys={setShowApiKeys}
              integrations={integrations}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- AI Config Panel ---

function AIConfigPanel({
  config,
  setConfig,
  apiKeys,
  setApiKeys,
  showApiKeys,
  setShowApiKeys,
  integrations,
}: {
  config: AIConfig;
  setConfig: React.Dispatch<React.SetStateAction<AIConfig>>;
  apiKeys: APIKeys;
  setApiKeys: React.Dispatch<React.SetStateAction<APIKeys>>;
  showApiKeys: Record<string, boolean>;
  setShowApiKeys: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  integrations: Integration[];
}) {
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const update = (field: keyof AIConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const activeProvider = AI_PROVIDERS.find((p) => p.value === config.provider)!;

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      await aiConfigService.updateConfig(mapFrontendToBackend(config));
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar configuración (solo disponible desde dashboard de empresa)');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveKeys = async () => {
    try {
      setSavingKeys(true);
      for (const providerCode of ['gemini', 'openai', 'anthropic'] as const) {
        const integration = integrations.find((i) => i.code === providerCode);
        if (!integration) continue;
        await integrationsClient.patch(`/integrations/${integration.id}/keys`, {
          keys: [{ key_name: 'api_key', key_value: apiKeys[providerCode] }],
        });
      }
      toast.success('API Keys guardadas');
    } catch {
      toast.error('Error al guardar API keys');
    } finally {
      setSavingKeys(false);
    }
  };

  const handleTestConnection = async (providerCode: string) => {
    try {
      setTesting(providerCode);
      // Save key first
      const integration = integrations.find((i) => i.code === providerCode);
      if (integration && apiKeys[providerCode as keyof APIKeys]) {
        await integrationsClient.patch(`/integrations/${integration.id}/keys`, {
          keys: [{ key_name: 'api_key', key_value: apiKeys[providerCode as keyof APIKeys] }],
        });
      }
      const result = await aiConfigService.testConnection(providerCode);
      if (result.success) {
        toast.success(`${providerCode}: Conexión exitosa (${result.responseTimeMs}ms)`);
      } else {
        // Mensajes amigables para errores comunes
        const msg = result.message || '';
        if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
          toast.error(`${providerCode}: Sin créditos. La cuenta asociada a esta API key no tiene saldo. Revisa el plan de facturación del proveedor.`, { duration: 6000 });
        } else if (msg.includes('401') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('unauthorized')) {
          toast.error(`${providerCode}: API key inválida. Verifica que la key sea correcta y esté activa.`, { duration: 6000 });
        } else if (msg.includes('403') || msg.toLowerCase().includes('permission')) {
          toast.error(`${providerCode}: Sin permisos. La API key no tiene acceso al modelo configurado.`, { duration: 6000 });
        } else {
          toast.error(`${providerCode}: ${msg}`);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al probar conexión');
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Config */}
      <div className="lg:col-span-2 space-y-6">

        {/* ===== 1. Proveedor Activo ===== */}
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Proveedor de IA</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona qué modelo de IA quieres usar para el asistente</p>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">Modelo de IA Activo</Label>
            <div className="grid grid-cols-3 gap-3">
              {AI_PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => update('provider', p.value)}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    config.provider === p.value
                      ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{p.emoji}</span>
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{p.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">El proveedor seleccionado se usará para todas las consultas del asistente</p>
          </div>
        </div>

        {/* ===== 2. Modelos por proveedor ===== */}
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Modelos de IA</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configura qué modelo específico usar para cada proveedor</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {AI_PROVIDERS.map((p) => {
              const modelKey = `${p.value}Model` as keyof AIConfig;
              const models = AI_MODELS[p.value] || [];
              return (
                <div key={p.value} className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300 text-xs">Modelo de {p.label}</Label>
                  <Select
                    value={config[modelKey] as string}
                    onChange={(v) => update(modelKey, v)}
                    options={models}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== 3. API Keys ===== */}
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">API Keys de Modelos de IA</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configura las claves de API para los diferentes modelos de IA. Estas keys se guardan de forma segura en la base de datos.</p>
          </div>

          <div className="space-y-4">
            {AI_PROVIDERS.map((p) => (
              <div key={p.value} className="space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">{p.label} API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKeys[p.value] ? 'text' : 'password'}
                    value={apiKeys[p.value as keyof APIKeys]}
                    onChange={(e) => setApiKeys((prev) => ({ ...prev, [p.value]: e.target.value }))}
                    placeholder="sk-..."
                    className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApiKeys((prev) => ({ ...prev, [p.value]: !prev[p.value] }))}
                    className="px-2"
                  >
                    {showApiKeys[p.value] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(p.value)}
                    disabled={testing !== null || !apiKeys[p.value as keyof APIKeys]}
                    className="px-2 gap-1 text-xs"
                  >
                    {testing === p.value ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Probar
                  </Button>
                </div>
                <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:text-indigo-600">
                  Obtén tu API key en {p.label === 'Google Gemini' ? 'Google AI Studio' : p.label === 'OpenAI' ? 'OpenAI Platform' : 'Anthropic Console'}
                </a>
              </div>
            ))}
          </div>

          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
            onClick={handleSaveKeys}
            disabled={savingKeys}
          >
            {savingKeys ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar API Keys
          </Button>
        </div>

        {/* ===== 4. Identidad ===== */}
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <div>
            <Bot className="h-5 w-5 text-indigo-400 inline mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 inline">Identidad de la IA</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Personaliza el nombre, rol y apariencia del asistente de IA</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Nombre del Asistente</Label>
              <Input
                value={config.assistantName}
                onChange={(e) => update('assistantName', e.target.value)}
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Rol/Profesión</Label>
              <Input
                value={config.role}
                onChange={(e) => update('role', e.target.value)}
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">Mensaje de Bienvenida</Label>
            <Input
              value={config.greeting}
              onChange={(e) => update('greeting', e.target.value)}
              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">Avatar/Emoji</Label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => update('avatar', emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    config.avatar === emoji
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500 scale-110'
                      : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== 5. Personalidad y Tono ===== */}
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <div>
            <Sparkles className="h-5 w-5 text-indigo-400 inline mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 inline">Personalidad y Tono</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configura el estilo de comunicación del asistente</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Tono de Conversación</Label>
              <Select
                value={config.tone}
                onChange={(v) => update('tone', v)}
                options={TONE_OPTIONS}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Nivel de Detalle</Label>
              <Select
                value={config.detailLevel}
                onChange={(v) => update('detailLevel', v)}
                options={DETAIL_OPTIONS}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-800/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Usar Emojis</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Incluir emojis en las respuestas para hacerlas más visuales</p>
              </div>
              <button
                onClick={() => update('useEmojis', !config.useEmojis)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  config.useEmojis ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  config.useEmojis ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-800/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sugerencias Proactivas</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sugerir análisis relacionados al final de cada respuesta</p>
              </div>
              <button
                onClick={() => update('proactiveSuggestions', !config.proactiveSuggestions)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  config.proactiveSuggestions ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  config.proactiveSuggestions ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={handleSaveConfig}
          disabled={savingConfig}
        >
          {savingConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar Configuración
        </Button>
      </div>

      {/* ===== Right: Preview ===== */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-5 h-fit sticky top-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Vista Previa</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Así se verá el asistente con la configuración actual</p>
        <div className="rounded-lg bg-white dark:bg-slate-800 p-4 space-y-3 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{config.avatar}</div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{config.assistantName || 'Asistente'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{config.role || 'Asistente'}</p>
            </div>
          </div>
          <div className="rounded-lg bg-gray-100 dark:bg-slate-700 p-3">
            <p className="text-sm text-gray-800 dark:text-gray-200">
              {config.greeting || '¡Hola! ¿En qué puedo ayudarte?'}
            </p>
          </div>
          <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>Proveedor IA:</span>
              <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                {activeProvider.emoji} {activeProvider.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Tono:</span>
              <span>{TONE_OPTIONS.find((t) => t.value === config.tone)?.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Detalle:</span>
              <span>{DETAIL_OPTIONS.find((d) => d.value === config.detailLevel)?.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Emojis:</span>
              <span>{config.useEmojis ? '✅ Sí' : '❌ No'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Sugerencias:</span>
              <span>{config.proactiveSuggestions ? '✅ Sí' : '❌ No'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
