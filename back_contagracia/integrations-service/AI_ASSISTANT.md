# Asistente IA — Hoja de Ruta de Migración

> Migración del asistente IA de **horizont** (frontend-only) a **NuevoContagracia** (backend NestJS + frontend Next.js)

---

## Origen: Proyecto horizont

El proyecto anterior tenía un asistente IA completo ejecutándose **100% en el frontend** (React), con llamadas directas del navegador a Gemini/OpenAI/Claude usando `dangerouslyAllowBrowser: true`.

### Archivos clave del proyecto anterior

| Carpeta | Archivos | Descripción |
|---------|----------|-------------|
| `src/lib/ai/` | `ai.service.js` | Orquestador/router de proveedores |
| | `aiConfig.service.js` | Config (nombre, tono, modelo, system prompt) |
| | `gemini.service.js` | Proveedor Google Gemini |
| | `openai.service.js` | Proveedor OpenAI GPT |
| | `claude.service.js` | Proveedor Anthropic Claude |
| | `audit.service.js` | Auditoría de consultas |
| `src/lib/ai/modules/` | 11 archivos `.module.js` | Módulos de dominio (ingresos, gastos, cartera, etc.) |
| `src/lib/ai/queries/` | 11 archivos `.queries.js` | Queries Supabase por módulo |
| `src/lib/ai/utils/` | `date-parser.js` | Parser de fechas en lenguaje natural |
| | `export-instructions.js` | Instrucciones de exportación |
| `src/lib/ai/exporters/` | `pdf.exporter.js`, `excel.exporter.js` | Exportación de respuestas |
| `src/components/` | `AIAssistantBubble.jsx` | Botón flotante |
| | `FloatingAIChat.jsx` (718 líneas) | Chat principal con 12 módulos |
| `src/pages/admin/integrations/` | `AIConfigTab.jsx` | Panel de configuración admin |

### 12 Módulos del chat

| ID | Nombre | Emoji | Descripción |
|----|--------|-------|-------------|
| `general` | General | 💬 | Consultas generales |
| `ingresos` | Ingresos | 💰 | Ventas y facturación |
| `gastos` | Gastos | 📉 | Compras y proveedores |
| `cartera` | Cartera | 💳 | Cuentas por cobrar |
| `bancos` | Bancos | 🏦 | Cuentas bancarias |
| `impuestos` | Impuestos | 📊 | IVA y retenciones |
| `inventarios` | Inventarios | 📦 | Stock y productos |
| `contabilidad` | Contabilidad | 📒 | Asientos y PUC |
| `centros_costo` | Centros de Costo | 🏢 | Proyectos y presupuestos |
| `nomina` | Nómina | 👥 | Empleados y liquidaciones |
| `situacion_financiera` | Situación Financiera | 📈 | Reportes financieros |
| `crm` | CRM | 🎯 | Leads y oportunidades |

### Configuración de personalidad

- **Proveedores**: Gemini (gemini-2.5-flash), OpenAI (gpt-4o), Claude (claude-sonnet-4-5)
- **Identidad**: Nombre, rol, saludo, avatar emoji
- **Tono**: Formal / Amigable / Técnico
- **Detalle**: Conciso / Detallado / Mixto
- **Opciones**: Emojis sí/no, Sugerencias proactivas sí/no

### Problema de seguridad (razón de la migración)

Las API keys se almacenaban en BD pero se cargaban al frontend y se usaban directamente desde el navegador. Con la migración, **las keys nunca salen del servidor**.

---

## Destino: NuevoContagracia

### Estado del integrations-service

- ✅ NestJS + Prisma (master DB)
- ✅ CRUD de Integration/IntegrationKey (proveedores email, pagos, etc.)
- ✅ Shared modules: AuthModule, AuditModule, TenantContextModule
- ✅ Swagger en `/api/docs`
- ✅ Puerto 3014
- ✅ Módulo IA completo (providers, config, domain-modules, controller)
- ✅ SDKs: @google/generative-ai, openai, @anthropic-ai/sdk

### Estado del frontend

- ✅ Pestaña "Configuración de IA" en `/admin/integrations` conectada al backend
- ✅ FloatingAIChat integrado en dashboard layout (dynamic import, SSR: false)
- ✅ ai.service.ts con integrationsClient (auth JWT automático)

---

## Implementación

### Fase 1: Base de Datos

- [x] Agregar modelo `AIConfiguration` a `schema-master.prisma`
- [x] Agregar modelos `AIChatSession` + `AIChatMessage` a `schema-tenant.prisma`
- [x] Generar clientes Prisma (`npx prisma generate`)
- [x] Aplicar migraciones (`npx prisma db push`)
- [x] Seed: registrar integraciones `gemini`, `openai`, `anthropic` tipo `ai` con sus `integration_keys`

#### AIConfiguration (master DB)

```
id, company_id (unique), active_provider, gemini_model, openai_model, anthropic_model,
assistant_name, assistant_role, greeting, avatar_emoji, tone, detail_level,
use_emojis, proactive_suggestions, created_at, updated_at
```

#### AIChatSession (tenant DB)

```
id, user_id, title, module_id, is_active, last_message_at, created_at, updated_at
→ messages: AIChatMessage[]
```

#### AIChatMessage (tenant DB)

```
id, session_id (FK), user_id, role (user|assistant), content, module_id,
provider, model, tokens_used, response_time_ms, feedback, rating, created_at
```

---

### Fase 2: Backend — Módulo IA

- [x] Instalar SDKs: `pnpm add @google/generative-ai openai @anthropic-ai/sdk`
- [x] Crear estructura `src/modules/ai/`
- [x] Implementar interfaz base de proveedores (`AIProvider`)
- [x] Implementar `GeminiProvider`
- [x] Implementar `OpenAIProvider`
- [x] Implementar `AnthropicProvider`
- [x] Implementar `AIConfigService` (CRUD config + system prompts + getApiKey)
- [x] Implementar `AIService` (orquestador: config → provider → módulo → respuesta → audit)
- [x] Implementar interfaz `DomainModule`
- [x] Implementar `GeneralDomainModule` (sin contexto de datos)
- [x] Implementar `CRMDomainModule` (queries al tenant: leads, pipeline, campañas, win rate)
- [ ] Implementar `DateParserUtil` (migrar de horizont) — pospuesto para fase futura
- [x] Implementar `PromptBuilderUtil`
- [x] Crear DTOs: `ChatRequestDto`, `AIConfigDto`
- [x] Implementar `AIController` (endpoints REST + POST sessions)
- [x] Registrar `AIModule` en `AppModule`

#### Estructura de archivos

```
src/modules/ai/
├── ai.module.ts
├── ai.controller.ts
├── ai.service.ts
├── config/
│   └── ai-config.service.ts
├── providers/
│   ├── ai-provider.interface.ts
│   ├── gemini.provider.ts
│   ├── openai.provider.ts
│   └── anthropic.provider.ts
├── domain-modules/
│   ├── domain-module.interface.ts
│   ├── general.domain-module.ts
│   └── crm.domain-module.ts
├── utils/
│   ├── date-parser.util.ts
│   └── prompt-builder.util.ts
└── dto/
    ├── chat-request.dto.ts
    └── ai-config.dto.ts
```

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/ai/chat` | Enviar mensaje → respuesta IA |
| `GET` | `/api/ai/config` | Config IA de la empresa |
| `PATCH` | `/api/ai/config` | Actualizar config IA |
| `GET` | `/api/ai/sessions` | Sesiones del usuario |
| `GET` | `/api/ai/sessions/:id/messages` | Historial de sesión |
| `POST` | `/api/ai/test-connection` | Probar proveedor |
| `GET` | `/api/ai/modules` | Módulos disponibles |

#### Flujo de una pregunta

```
Frontend: POST /api/ai/chat { sessionId, prompt, moduleId }
    ↓
AIController (JWT auth, extrae companyId + userId)
    ↓
AIService.chat()
    ├─ AIConfigService.getConfig(companyId)     → config empresa
    ├─ AIConfigService.getApiKey(provider)       → API key desde integration_keys
    ├─ DomainModule.getContext(companyId, query)  → datos del tenant DB
    ├─ PromptBuilder.build(config, context)       → system prompt + contexto
    ├─ Provider.chat(apiKey, model, options)       → llamada a Gemini/OpenAI/Claude
    ├─ Guardar mensajes en ai_chat_messages       → tenant DB
    └─ return { content, metadata }
```

---

### Fase 3: Frontend

- [x] Crear `src/shared/services/ai.service.ts` (wrapper API con integrationsClient)
- [x] Conectar `AIConfigPanel` al backend (GET/PATCH config, test connection, API key por proveedor)
- [x] Crear `src/shared/components/ai/FloatingAIChat.tsx`
- [x] Agregar FloatingAIChat al layout del dashboard (dynamic import, SSR: false)

#### FloatingAIChat — Diseño

```
┌─ Bubble ──────────────────────────┐
│  🤖 (fixed bottom-6 right-6)     │
└───────────────────────────────────┘

┌─ Panel (w-96, h-[600px]) ────────┐
│ Header: 🤖 Asistente IA    [X]   │
├───────────────────────────────────┤
│ [💬 General] [🎯 CRM] [...]      │  ← Módulos (pills)
├───────────────────────────────────┤
│                                   │
│  Mensajes:                        │
│    User → (derecha, indigo)       │
│    ← Assistant (izquierda, gray)  │
│                                   │
├───────────────────────────────────┤
│ [Escribe tu pregunta...] [Enviar] │
└───────────────────────────────────┘
```

- Auto-detección de módulo por ruta (`/crm/*` → CRM)
- Preguntas ejemplo clickeables en estado vacío
- Metadata por mensaje (tokens, tiempo)

---

### Fase 4: Verificación

- [x] `integrations-service` levanta → Swagger visible
- [x] Config IA → guardar desde admin → persiste en BD
- [x] API key guardada en integration_keys (3 proveedores)
- [x] "Probar conexión" → éxito con Gemini y Claude (OpenAI requiere créditos en cuenta)
- [x] Chat bubble → pregunta → respuesta del proveedor (Gemini, ~2-4s)
- [x] Módulo CRM → datos reales del tenant (5 leads, 1 oportunidad, 1 campaña)
- [x] Conversación mantiene contexto (localStorage + historial BD 20 msgs)
- [x] Markdown renderizado correctamente (react-markdown + prose)
- [ ] Mensajes guardados en `ai_chat_messages` del tenant (verificar en BD)
- [ ] Multi-tenant: aislamiento entre empresas

---

## Módulos futuros (post-implementación)

| # | Módulo | Servicio que necesita | Estado |
|---|--------|-----------------------|--------|
| 1 | **CRM** | crm-service | ✅ Incluido en este plan |
| 2 | Impuestos | tax-service | ⏳ Migrado |
| 3 | Contabilidad | accounting-service | ❌ Pendiente |
| 4 | Facturación/Ingresos | invoicing-service | ❌ Pendiente |
| 5 | Gastos | purchase-service | ❌ Pendiente |
| 6 | Inventarios | inventory-service | ❌ Pendiente |
| 7 | Nómina | hr-service | ⏳ En desarrollo |
| 8 | Bancos | (por definir) | ❌ Pendiente |
| 9 | Cartera | (por definir) | ❌ Pendiente |
| 10 | Centros de Costo | (por definir) | ❌ Pendiente |
| 11 | Situación Financiera | reports-service | ❌ Pendiente |

---

## Guía: Cómo conectar un nuevo módulo a la IA

> Referencia: `crm.domain-module.ts` (218 líneas, funcional y probado)

### Paso 1: Crear el archivo del domain module

Crear `src/modules/ai/domain-modules/{modulo}.domain-module.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { DomainModule, DomainModuleContext } from './domain-module.interface';

@Injectable()
export class IngresosDomainModule implements DomainModule {
  moduleId = 'ingresos'; // ← Debe coincidir con el id en AI_MODULES
  private readonly logger = new Logger(IngresosDomainModule.name);

  constructor(private readonly tenantContext: TenantContextService) {}

  async getContext(companyId: string, query: string): Promise<DomainModuleContext> {
    const tenant = await this.tenantContext.getTenantClient(companyId);
    if (!tenant) {
      return { data: null, instructions: ['No se pudo conectar al tenant.'], description: 'Error' };
    }

    const queryLower = query.toLowerCase();
    const data: Record<string, any> = {};
    const instructions: string[] = [];

    // 1. Detectar intención por keywords
    if (queryLower.includes('factura') || queryLower.includes('venta')) {
      // 2. Hacer queries Prisma al tenant
      const totalFacturas = await tenant.invoice.count({ where: { status: 'SENT' } });
      data.facturas = { total: totalFacturas };
      instructions.push('Tienes datos de facturas de venta.');
    }

    // 3. Si no se detectó intención, dar resumen general
    if (Object.keys(data).length === 0) {
      const resumen = await tenant.invoice.count();
      data.summary = { totalFacturas: resumen };
      instructions.push('Tienes un resumen general de ingresos.');
    }

    // 4. Instrucciones comunes
    instructions.push(
      'Presenta los datos de forma clara.',
      'Los montos están en pesos colombianos (COP).',
    );

    return { data, instructions, description: 'Datos del módulo de Ingresos.' };
  }
}
```

### Paso 2: Registrar en AIService

Archivo: `src/modules/ai/ai.service.ts`

1. Importar el módulo:
```typescript
import { IngresosDomainModule } from './domain-modules/ingresos.domain-module';
```

2. Inyectar en el constructor:
```typescript
constructor(
  // ... existentes
  private readonly ingresosModule: IngresosDomainModule,
) {
```

3. Registrar en el Map de domainModules:
```typescript
this.domainModules = new Map<string, DomainModule>([
  ['general', this.generalModule],
  ['crm', this.crmModule],
  ['ingresos', this.ingresosModule], // ← nuevo
]);
```

### Paso 3: Registrar en AIModule

Archivo: `src/modules/ai/ai.module.ts`

Agregar al array de `providers`:
```typescript
providers: [
  // ... existentes
  IngresosDomainModule,
],
```

### Paso 4: Activar en AI_MODULES

Archivo: `src/modules/ai/domain-modules/domain-module.interface.ts`

Cambiar `enabled: false` → `enabled: true`:
```typescript
{ id: 'ingresos', name: 'Ingresos', emoji: '💰', description: 'Ventas y facturación', enabled: true },
```

### Paso 5: Agregar preguntas ejemplo (frontend)

Archivo: `front_contagracia/src/shared/components/ai/FloatingAIChat.tsx`

Ya tiene preguntas base para `ingresos`. Ajustar si se necesitan más específicas:
```typescript
const SAMPLE_QUESTIONS: Record<string, string[]> = {
  // ...
  ingresos: [
    '¿Cuánto he facturado este mes?',
    '¿Cuáles son mis principales clientes?',
    '¿Cómo van las ventas vs el mes pasado?',
  ],
};
```

### Paso 6: Reiniciar y probar

1. Reiniciar `integrations-service` (`pnpm start:dev`)
2. En el chat, seleccionar el módulo nuevo (ya no aparecerá gris)
3. Hacer una pregunta → verificar que trae datos reales

### Checklist rápido por módulo

| # | Qué hacer | Dónde |
|---|-----------|-------|
| 1 | Crear `{modulo}.domain-module.ts` | `domain-modules/` |
| 2 | Inyectar e importar en constructor | `ai.service.ts` |
| 3 | Registrar en `domainModules` Map | `ai.service.ts` |
| 4 | Agregar a providers del módulo | `ai.module.ts` |
| 5 | Cambiar `enabled: true` | `domain-module.interface.ts` |
| 6 | Verificar preguntas ejemplo | `FloatingAIChat.tsx` |

### Patrón de detección de intenciones

El CRM usa un mapa de keywords por intención. Replicar este patrón:

```typescript
private detectIntents(query: string): Set<string> {
  const intents = new Set<string>();
  const keywords: Record<string, string[]> = {
    facturas: ['factura', 'facturas', 'facturado', 'venta', 'ventas'],
    clientes: ['cliente', 'clientes', 'comprador'],
    // ...más intenciones
  };
  for (const [intent, words] of Object.entries(keywords)) {
    if (words.some((w) => query.includes(w))) intents.add(intent);
  }
  return intents;
}
```

### Qué modelos Prisma usar por módulo

| Módulo | Modelos probables del tenant |
|--------|------------------------------|
| Ingresos | `Invoice`, `InvoiceItem`, `ThirdParty` (clientes) |
| Gastos | `Purchase`, `PurchaseItem`, `Expense`, `ThirdParty` (proveedores) |
| Cartera | `AccountReceivable`, `Payment` |
| Bancos | `BankAccount`, `BankTransaction` |
| Impuestos | `TaxDeclaration`, `WithholdingTax`, `Invoice` (IVA) |
| Inventarios | `Product`, `InventoryMovement`, `Warehouse` |
| Contabilidad | `JournalEntry`, `AccountingAccount`, `LedgerEntry` |
| C. Costo | `CostCenter`, `CostCenterBudget` |
| Nómina | `Employee`, `Payroll`, `PayrollDetail` |
| Financiero | Combina datos de varios módulos (Invoice, Expense, BankAccount) |

> **Nota:** Los nombres exactos de los modelos dependen del `schema-tenant.prisma`. Revisar el schema antes de implementar cada módulo.

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| API keys | **Globales** (una por proveedor para toda la plataforma) | Más simple de administrar. Se reusan Integration/IntegrationKey existentes |
| Config IA | Nuevo modelo `AIConfiguration` en master | Es per-company, no per-tenant |
| Historial chat | En tenant DB | Datos de negocio, aislamiento por empresa |
| Llamadas a IA | **Backend-only** | Seguridad: keys nunca llegan al frontend |
| Acceso al chat | **Todos los usuarios** (por ahora) | Después se definirá restricción por roles si se requiere |
| Acceso a datos (módulos) | **Directo al tenant DB** via TenantContextService | Más rápido que HTTP entre servicios. Ya existe el shared module |
| Streaming | Fase futura (SSE) | POST simple funciona bien para MVP |
| Exportación PDF/Excel | Fase futura | No bloqueante para la base |
| Múltiples API keys por empresa | Fase futura | Por ahora una key global por proveedor |
