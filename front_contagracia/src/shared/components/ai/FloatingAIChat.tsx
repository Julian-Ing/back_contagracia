'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, X, Send, Loader2, RotateCcw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { aiChatService, aiConfigService } from '@/shared/services/ai.service';

// --- Types ---

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    provider?: string;
    model?: string;
    tokensUsed?: number;
    responseTimeMs?: number;
    moduleId?: string;
  };
}

interface AIModule {
  id: string;
  name: string;
  emoji: string;
  description: string;
  enabled: boolean;
}

interface AssistantConfig {
  name: string;
  greeting: string;
  avatar: string;
}

// --- Detect module from route ---

function detectModuleFromRoute(pathname: string): string {
  if (pathname.includes('/crm')) return 'crm';
  if (pathname.includes('/invoicing') || pathname.includes('/income')) return 'ingresos';
  if (pathname.includes('/purchases') || pathname.includes('/expenses')) return 'gastos';
  if (pathname.includes('/accounting')) return 'contabilidad';
  if (pathname.includes('/tax')) return 'impuestos';
  if (pathname.includes('/inventory')) return 'inventarios';
  if (pathname.includes('/hr') || pathname.includes('/payroll')) return 'nomina';
  if (pathname.includes('/banking')) return 'bancos';
  return 'general';
}

// --- Sample questions by module ---

const SAMPLE_QUESTIONS: Record<string, string[]> = {
  general: [
    '¿Cómo puedo usar este asistente?',
    '¿Qué módulos están disponibles?',
    'Dame un resumen general de mi negocio',
  ],
  crm: [
    '¿Cuántos leads tengo activos?',
    '¿Cómo va el pipeline de ventas?',
    '¿Cuál es mi tasa de conversión?',
  ],
  ingresos: [
    '¿Cuánto he facturado este mes?',
    '¿Cuáles son mis principales clientes?',
    '¿Cómo van las ventas vs el mes pasado?',
  ],
  gastos: [
    '¿Cuáles son mis principales proveedores?',
    '¿Cuánto he gastado este mes?',
    '¿Qué categoría de gasto es la más alta?',
  ],
  impuestos: [
    '¿Cuánto debo de IVA este período?',
    '¿Cuáles son las próximas fechas de declaración?',
    '¿Cómo van mis retenciones?',
  ],
  contabilidad: [
    '¿Cuál es mi balance general actual?',
    '¿Cómo está mi estado de resultados?',
    '¿Hay asientos sin conciliar?',
  ],
};

// --- UUID generator ---
function generateId(): string {
  return crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- LocalStorage helpers ---
const STORAGE_KEY = 'ai-chat-session';

function getSavedSession(): { sessionId: string; messages: Message[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveSession(sessionId: string, messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, messages }));
  } catch { /* quota exceeded or similar */ }
}

function clearSavedSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// --- Component ---

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [modules, setModules] = useState<AIModule[]>([]);
  const [activeModule, setActiveModule] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    const saved = getSavedSession();
    return saved?.sessionId || generateId();
  });
  const [config, setConfig] = useState<AssistantConfig>({
    name: 'Asistente Contagracia',
    greeting: '¡Hola! Soy tu asistente contable. ¿En qué puedo ayudarte?',
    avatar: '🤖',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // Restaurar mensajes de localStorage al montar
  useEffect(() => {
    const saved = getSavedSession();
    if (saved?.messages?.length) {
      setMessages(saved.messages);
    }
  }, []);

  // Guardar en localStorage cada vez que cambian los mensajes
  useEffect(() => {
    if (messages.length > 0) {
      saveSession(sessionId, messages);
    }
  }, [messages, sessionId]);

  // Auto-detect module from route (only if module is enabled)
  useEffect(() => {
    const detected = detectModuleFromRoute(pathname);
    const mod = modules.find((m) => m.id === detected);
    if (mod?.enabled) {
      setActiveModule(detected);
    }
  }, [pathname, modules]);

  // Load modules and config
  useEffect(() => {
    aiConfigService.getModules().then(setModules).catch(() => {});
    aiConfigService.getConfig().then((data) => {
      setConfig({
        name: data.assistant_name || 'Asistente Contagracia',
        greeting: data.greeting || '¡Hola! Soy tu asistente contable. ¿En qué puedo ayudarte?',
        avatar: data.avatar_emoji || '🤖',
      });
    }).catch(() => {});
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await aiChatService.sendMessage({
        sessionId,
        prompt: text.trim(),
        moduleId: activeModule,
        route: pathname,
      });

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.content,
        metadata: response.metadata,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al comunicarse con el asistente. Verifica la configuración de IA.';
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: `Lo siento, ocurrió un error: ${errorMsg}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [sending, sessionId, activeModule, pathname]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewChat = () => {
    const newId = generateId();
    setSessionId(newId);
    setMessages([]);
    clearSavedSession();
  };

  const samples = SAMPLE_QUESTIONS[activeModule] || SAMPLE_QUESTIONS.general;
  const activeModuleData = modules.find((m) => m.id === activeModule);

  return (
    <>
      {/* Floating Bubble — encima del BackButton */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-14 right-1 z-50 group flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/20 transition-all hover:scale-110 active:scale-95"
          title="Abrir asistente IA"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20" />
          {/* Online indicator */}
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-white dark:border-slate-900" />
          <MessageCircle className="h-4 w-4 relative z-10" />
        </button>
      )}

      {/* Chat Panel — desde abajo como el proyecto anterior */}
      {isOpen && (
        <div className="fixed bottom-2 right-1 z-50 flex flex-col w-96 h-[600px] rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">{config.avatar}</span>
              <div>
                <p className="text-sm font-semibold leading-tight">{config.name}</p>
                <p className="text-xs text-indigo-200">Asistente IA</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                className="p-1.5 rounded-lg hover:bg-indigo-500 transition-colors"
                title="Nueva conversación"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-indigo-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Module pills — todos visibles, disabled los no implementados */}
          {modules.length > 0 && (
            <div className="flex gap-1.5 px-3 py-2 border-b border-gray-100 dark:border-slate-700 overflow-x-auto scrollbar-none">
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => mod.enabled && setActiveModule(mod.id)}
                  disabled={!mod.enabled}
                  title={mod.enabled ? mod.description : `${mod.description} (próximamente)`}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    !mod.enabled
                      ? 'bg-gray-50 text-gray-300 dark:bg-slate-800/50 dark:text-slate-600 cursor-not-allowed'
                      : activeModule === mod.id
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{mod.emoji}</span>
                  {mod.name}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <span className="text-4xl mb-3">{config.avatar}</span>
                <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">{config.greeting}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Selecciona un módulo y hazme una pregunta
                </p>
                <div className="w-full space-y-1.5">
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-left">
                    {activeModuleData?.emoji} Preguntas de {activeModuleData?.name || 'General'}:
                  </p>
                  {samples.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Messages list
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-md whitespace-pre-wrap'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="ai-markdown prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-gray-900 dark:prose-strong:text-gray-100">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                    {msg.metadata && (
                      <div className={`mt-1.5 text-[10px] ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {msg.metadata.provider && <span>{msg.metadata.provider}</span>}
                        {msg.metadata.tokensUsed != null && <span> · {msg.metadata.tokensUsed} tokens</span>}
                        {msg.metadata.responseTimeMs != null && <span> · {msg.metadata.responseTimeMs}ms</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Pensando...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Pregunta sobre ${activeModuleData?.name?.toLowerCase() || 'general'}...`}
                disabled={sending}
                className="flex-1 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || sending}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
