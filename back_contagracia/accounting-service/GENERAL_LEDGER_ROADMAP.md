# Hoja de Ruta — Libro Mayor (`general-ledger`)

> Estado actual y plan de migración de exportaciones al `accounting-service`

---

## 1. Estado actual

### Backend (`accounting-service`)
| Archivo | Responsabilidad |
|---|---|
| `general-ledger.constants.ts` | Mapa `ACCOUNT_NATURE_MAP` (tipo de cuenta → naturaleza DB/CR) |
| `general-ledger.service.ts` | Lógica de negocio: saldo inicial (SI), movimientos, saldo corrido |
| `general-ledger.controller.ts` | `GET /general-ledger?date_from&date_to` → JSON |
| `general-ledger.module.ts` | Registro del módulo en NestJS |

**Endpoint disponible:**
```
GET /general-ledger?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
Authorization: Bearer <token>
```
Respuesta: `{ from_date, to_date, accounts[], grand_total_debits, grand_total_credits }`

### Frontend (`front_contagracia`)
| Archivo | Responsabilidad |
|---|---|
| `useGeneralLedger.ts` | Hook: llama `GET /general-ledger`, gestiona estado `data/loading/error` |
| `page.tsx` | UI completa: filtros, selectores de firma, fecha personalizable, vista previa HTML |
| `GeneralLedgerPdfDownload.tsx` | Genera PDF en el **navegador** con `@react-pdf/renderer` |
| `useReportCompany.ts` (shared) | Carga datos de empresa + imágenes de firma con auth |
| `ReportSignatures.tsx` (shared) | Bloque de firmas HTML (diploma) |
| `PdfSignatures.tsx` (shared) | Bloque de firmas PDF |

**Flujo actual de exportaciones:**
```
Usuario → [Generar] → GET /general-ledger (JSON)
                    → Vista previa HTML en página

Usuario → [Descargar PDF] → react-pdf corre en BROWSER → descarga .pdf
Usuario → [Imprimir]      → window.print() del browser
```

---

## 2. Qué migrar al backend

Las exportaciones de archivo (Excel, PDF) deben generarse en `accounting-service` por:
- Consistencia: el back ya tiene ExcelJS instalado y lo usa en `periods/`
- Rendimiento: no cargar librerías pesadas en el navegador
- Seguridad: los datos nunca abandonan el servidor en bruto
- Reutilización: el mismo endpoint sirve para integraciones futuras (scheduled reports, email, etc.)

---

## 3. Plan — Exportación Excel (`GET /general-ledger/export`)

### 3.1 Archivos a crear/modificar en `accounting-service`

#### `general-ledger.service.ts` — agregar método `generateExcel()`
```
generateExcel(companyId, from, to): Promise<ExcelJS.Workbook>
```
- Reutiliza la lógica existente de `getGeneralLedger()`
- Obtiene datos de empresa desde `TenantContextService`:
  - `getCompanyEstablishmentData(companyId)` → `company_name, address, phone, email`
  - `getCompanyNit(companyId)` → NIT
- Construye workbook con ExcelJS

**Estructura del Excel — hoja "Libro Mayor":**
```
Fila 1:   [Nombre empresa]                              ← bold, size 14, merge A:G
Fila 2:   NIT: XXXXXXXXX-X                              ← muted, size 10
Fila 3:   Ciudad, Dpto  ·  Dirección  ·  Tel  ·  Email ← muted, size 9
Fila 4:   (vacía)
Fila 5:   Libro Mayor — del 1 de enero de 2026 al...   ← bold, size 12, merge A:G
Fila 6:   (vacía)

Por cada cuenta:
  Fila N:   [1101 — Caja]  Saldo inicial: $X,XXX.XX    ← fondo gris, bold (merge A:D)
  Fila N+1: Fecha | Comprobante | Descripción | Tercero | Débito | Crédito | Saldo  ← headers
  Fila N+2..M: filas de movimientos (números reales con numFmt)
  Fila M+1: Total 1101: | | | | $deb | $cred | $saldo  ← bold, borde superior

Fila final-2: TOTALES GENERALES | | | | $grand_deb | $grand_cred | —   ← bold, borde doble
Fila final:   "Este informe se elaboró el XX/XX/XXXX..."              ← muted, borde superior
```

**Anchos de columna:**
| Col | Campo | Ancho |
|---|---|---|
| A | Fecha | 12 |
| B | Comprobante | 15 |
| C | Descripción | 42 |
| D | Tercero | 25 |
| E | Débito | 16 |
| F | Crédito | 16 |
| G | Saldo | 16 |

**Formatos:**
- Números: `numFmt = '#,##0.00'` (valor real, no string)
- Fechas: `numFmt = 'dd/mm/yyyy'` (valor `Date`, no string)

#### `general-ledger.controller.ts` — agregar endpoint
```
GET /general-ledger/export?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
```
- Importa `Response` de `express` y usa `@Res()`
- Headers:
  ```
  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="libro-mayor-2026-01-01_2026-12-31.xlsx"
  ```
- Escribe con `workbook.xlsx.write(res)` → `res.end()`
  *(mismo patrón que `periods.controller.ts → downloadOpeningBalanceTemplate`)*

> ⚠️ Declarar `@Get('export')` **antes** de `@Get()` en el controlador para que NestJS no confunda el path.

### 3.2 Frontend — botón Excel en `page.tsx`
- Agregar estado `excelLoading: boolean`
- Handler `handleExcelDownload()`:
  ```ts
  const res = await accountingClient.get('/general-ledger/export', {
    params: { date_from: dateFrom, date_to: dateTo },
    responseType: 'blob',
  });
  // trigger download via URL.createObjectURL
  ```
- Botón habilitado cuando `dateFrom && dateTo` (no requiere haber generado el preview)
- Icono: `FileSpreadsheet` de lucide-react
- Label: `"Excel"`

---

## 4. Plan — Exportación PDF (`GET /general-ledger/pdf`)

> **Prioridad ALTA.** Migración decidida el 2026-02-26.
> El PDF pasa al backend con `pdfmake` (Node.js puro, sin headless browser).
>
> ⚠️ **BLOQUEADO** — ver sección 4.0 (pre-requisito de datos).

### 4.0 Pre-requisito: migración de datos de empresa al tenant

**Contexto descubierto el 2026-02-26:**
- La tabla `company_settings` del tenant YA existe y tiene estructura `category/key/value`
- El perfil de empresa (nombre, NIT, dirección, régimen, firmantes) vive actualmente en la **master DB** (`companies` table) — accedido vía `company-service`
- La decisión de arquitectura es mover esos datos al **tenant** (`company_settings`) para que cada tenant gestione su propio perfil

**Estado actual del tenant `tenant_martinezgu_ml01ivl9` (2026-02-26):**
| Categoría | Claves | Estado |
|---|---|---|
| `brand` | `logo_url` | ✅ ya migrado |
| `legal_representative` | `name`, `identification`, `phone`, `email`, `signature_url` | ✅ ya migrado |
| `contador` | `name`, `identification`, `phone`, `email`, `signature_url` | ❌ pendiente |
| `revisor_fiscal` | `name`, `identification`, `phone`, `email`, `signature_url` | ❌ pendiente |
| `company_profile` (o similar) | `company_name`, `nit`, `dv`, `address`, `phone`, `email`, `municipality`, `department`, `regime`, `liability`, `person_type` | ❌ pendiente |

**Bloqueante:** otro desarrollador está actualizando el seed para poblar las categorías faltantes.
Una vez que estén disponibles en `company_settings`, el backend PDF puede leerlas desde `tenantDb.companySetting.findMany(...)` sin tocar la master DB.

> **Impacto en el plan:** la sección 4.2 ("Nuevo método en TenantContextService") queda **descartada**.
> En su lugar, el `GeneralLedgerPdfService` leerá `company_settings` directamente del tenant.

---

### 4.1 Decisión de librería

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| `puppeteer` + HTML | Fiel al diseño actual | ~300MB, headless browser | ❌ Descartado |
| `pdfmake` (Node.js) | Liviano, tablas nativas, fuentes bundleadas | API diferente a react-pdf | ✅ Elegido |
| Mantener en front | Sin cambios en back | Carga al browser, no reutilizable | ❌ Descartado |

### 4.2 Fuente de datos (post-migración)

Una vez completa la migración de datos al tenant, el endpoint obtendrá **todo** del tenant:

| Dato | Fuente | Acceso |
|---|---|---|
| Movimientos contables | Tenant DB | `GeneralLedgerService.getGeneralLedger()` |
| Nombre empresa, NIT, DV | Tenant DB | `company_settings` — categoría `company_profile` |
| Dirección, tel, email | Tenant DB | `company_settings` — categoría `company_profile` |
| Municipio, departamento, régimen, responsabilidad | Tenant DB | `company_settings` — categoría `company_profile` |
| Logo | Tenant DB | `company_settings` — `brand.logo_url` (URL a media-service) |
| Firma rep. legal | Tenant DB | `company_settings` — `legal_representative.signature_url` |
| Nombre rep. legal | Tenant DB | `company_settings` — `legal_representative.name` |
| Firma contador | Tenant DB | `company_settings` — `contador.signature_url` |
| Nombre contador | Tenant DB | `company_settings` — `contador.name` |
| Firma revisor fiscal | Tenant DB | `company_settings` — `revisor_fiscal.signature_url` |
| Nombre revisor fiscal | Tenant DB | `company_settings` — `revisor_fiscal.name` |

> **Token forwarding para imágenes:** el endpoint extrae `Authorization: Bearer <token>` del request
> y lo reenvía al media-service para obtener logo y firmas como base64.
> Si una imagen falla (URL nula, error de red), se omite silenciosamente.

**Helper para leer settings:**
```typescript
// En GeneralLedgerPdfService — lectura de company_settings desde tenantDb
const settings = await tenantDb.companySetting.findMany({
  where: { category: { in: ['company_profile', 'brand', 'legal_representative', 'contador', 'revisor_fiscal'] } },
});
const s = (cat: string, key: string) =>
  settings.find((r) => r.category === cat && r.key === key)?.value ?? '';
// Uso: s('company_profile', 'company_name'), s('brand', 'logo_url'), etc.
```

### 4.3 Archivos a crear/modificar en `accounting-service`

#### Nuevo: `general-ledger-pdf.service.ts`

```
GeneralLedgerPdfService
  ├── constructor(GeneralLedgerService, TenantContextService)
  └── generatePdf(companyId, dateFrom, dateTo, signerKeys[], title, generatedAt, authToken)
        ├── getGeneralLedger()      → datos contables
        ├── getCompanyPdfData()     → datos empresa
        ├── fetchImageDataUri(url, token) × 4  → logo + 3 firmas (en paralelo)
        └── buildDocDef()          → TDocumentDefinitions para pdfmake
              ├── header() function  → encabezado fijo en cada página
              ├── footer() function  → "Elaborado el..." · pág. X de Y · Generado por Contagracia
              ├── buildAccountSection() × N → sección por cuenta
              │     ├── section header (fondo gris): "1101 — Caja  Saldo inicial: $X"
              │     ├── tabla de movimientos (widths: [50,62,*,88,58,58,58])
              │     └── fila totales de cuenta (bold, borde superior)
              ├── buildGrandTotalsRow()   → TOTALES GENERALES (bold, borde doble)
              └── buildSignatures()      → bloques diploma (1=centro, 2=L/R, 3=L/R+centro)
```

**Fuentes (pdfmake en Node.js):**
```typescript
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vfsFonts = require('pdfmake/build/vfs_fonts');
const vfs = vfsFonts?.pdfMake?.vfs ?? vfsFonts;
const PRINTER = new PdfPrinter({
  Roboto: {
    normal:      Buffer.from(vfs['Roboto-Regular.ttf'], 'base64'),
    bold:        Buffer.from(vfs['Roboto-Medium.ttf'], 'base64'),
    italics:     Buffer.from(vfs['Roboto-Italic.ttf'], 'base64'),
    bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
  },
});
```

**Márgenes de página:**
```
pageMargins: [35, 135, 35, 50]
             left  top  right bottom
```
El `top: 135` deja espacio al header fijo (~115pt de contenido + separador).

**Anchos de columna en la tabla de movimientos:**
| Col | Campo | pt |
|---|---|---|
| A | Fecha | 50 |
| B | Comprobante | 62 |
| C | Descripción | * (flex) |
| D | Tercero | 88 |
| E | Débito | 58 |
| F | Crédito | 58 |
| G | Saldo | 58 |

Ancho útil A4 portrait con márgenes [35,_,35,_] = 595 − 70 = **525 pt**
Fijos = 50+62+88+58+58+58 = 374 → descripción ≈ 151 pt ✓

**Imagen fetching:**
```typescript
async function fetchImageDataUri(url: string | null, token: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct  = res.headers.get('content-type') ?? 'image/png';
    return `data:${ct};base64,${buf.toString('base64')}`;
  } catch { return null; }
}
```

**Generar Buffer:**
```typescript
return new Promise<Buffer>((resolve, reject) => {
  const chunks: Buffer[] = [];
  const doc = PRINTER.createPdfKitDocument(docDef);
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);
  doc.end();
});
```

#### `general-ledger.controller.ts` — agregar endpoint

```
GET /general-ledger/pdf?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
                       &signers=legal_rep,contador      ← orden = posición en diploma
                       &title=Libro+Mayor               ← opcional
                       &generated_at=2026-02-26T10:00   ← opcional (ISO string)
Authorization: Bearer <token>
```

- Declarar **antes** de `@Get()` para evitar colisión de rutas NestJS
- Extraer token: `req.headers['authorization']?.replace('Bearer ', '')`
- Headers de respuesta:
  ```
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="libro-mayor-2026-01-01_2026-12-31.pdf"
  ```
- Usar `@Res()` + `res.end(buffer)`

#### `general-ledger.module.ts` — registrar servicio

```typescript
providers: [GeneralLedgerService, GeneralLedgerPdfService],
```

### 4.4 Frontend — reemplazar botón PDF en `page.tsx`

- Eliminar import dinámico de `GeneralLedgerPdfDownload`
- Eliminar componente `<GeneralLedgerPdfDownload .../>` del JSX
- Agregar estado `pdfLoading: boolean`
- Handler `handlePdfDownload()`:
  ```ts
  const signerParam = ([slot1, slot2, slot3] as (SignerKey | '')[])
    .filter(Boolean).join(',');

  const res = await accountingClient.get('/general-ledger/pdf', {
    params: {
      date_from: dateFrom,
      date_to: dateTo,
      signers: signerParam,
      title: title || 'Libro Mayor',
      ...(generatedAt ? { generated_at: generatedAt.toISOString() } : {}),
    },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = `libro-mayor-${dateFrom}_${dateTo}.pdf`;
  a.click(); URL.revokeObjectURL(url);
  ```
- Botón habilitado cuando `dateFrom && dateTo` (no requiere preview previo)
- Icono: `Download` de lucide-react
- Label: `"PDF"` con spinner cuando `pdfLoading`

> `signerSrcs` y `logoSrc` del `useReportCompany` ya **no son necesarios** para el PDF
> (el backend los obtiene directamente). Siguen siendo necesarios para la vista previa HTML.

---

## 5. Checklist de implementación PDF

### Pre-requisito (bloqueante — otro dev)
- [ ] Seed actualizado: categoría `contador` en `company_settings` (name, identification, phone, email, signature_url)
- [ ] Seed actualizado: categoría `revisor_fiscal` en `company_settings` (igual)
- [ ] Seed actualizado: categoría `company_profile` en `company_settings` (company_name, nit, dv, address, phone, email, municipality, department, regime, liability, person_type)
- [ ] `company-service` actualizado para leer/escribir estas categorías desde el tenant

### Backend (desbloquear cuando el pre-requisito esté listo)
- [x] `pnpm add pdfmake` en `accounting-service/` ✅ ya instalado
- [ ] Crear `general-ledger-pdf.service.ts` (lee `company_settings` del tenant, no master)
- [ ] `general-ledger.controller.ts`: agregar `@Get('pdf')` antes de `@Get()`
- [ ] `general-ledger.module.ts`: registrar `GeneralLedgerPdfService`
- [ ] Probar endpoint con Postman → debe descargar `.pdf` válido con datos reales

### Frontend (desbloquear cuando el backend esté listo)
- [ ] `page.tsx`: eliminar `GeneralLedgerPdfDownload` (import dinámico + JSX)
- [ ] `page.tsx`: agregar estado `pdfLoading`
- [ ] `page.tsx`: implementar `handlePdfDownload()` con blob download
- [ ] `page.tsx`: reemplazar botón PDF por botón que llama al backend
- [ ] Probar descarga → verificar que el PDF abre bien y tiene los datos correctos

---

## 6. Checklist de implementación Excel

### Backend
- [ ] `general-ledger.service.ts`: agregar `import * as ExcelJS from 'exceljs'`
- [ ] `general-ledger.service.ts`: implementar `generateExcel(companyId, from, to)`
- [ ] `general-ledger.controller.ts`: agregar `import { Response } from 'express'`
- [ ] `general-ledger.controller.ts`: agregar `@Get('export')` antes de `@Get()`
- [ ] Probar endpoint con Swagger/Postman → debe descargar `.xlsx` válido

### Frontend
- [ ] `page.tsx`: importar `accountingClient` y `FileSpreadsheet`
- [ ] `page.tsx`: agregar estado `excelLoading`
- [ ] `page.tsx`: implementar `handleExcelDownload()` con blob download
- [ ] `page.tsx`: agregar botón Excel en la barra de acciones (junto a PDF e Imprimir)
- [ ] Probar descarga → verificar que el archivo abre bien en Excel/LibreOffice

---

## 7. Dependencias confirmadas

| Paquete | Ubicación | Estado |
|---|---|---|
| `exceljs ^4.4.0` | `accounting-service/package.json` | ✅ ya instalado |
| `pdfmake` | `accounting-service/package.json` | ⬜ pendiente instalar (`pnpm add pdfmake`) |
| `exceljs ^4.4.0` | `front_contagracia/package.json` | — (no se usa para esto) |
| `@react-pdf/renderer` | `front_contagracia/package.json` | ✅ se mantiene para vista previa HTML→PDF en navegador hasta que migre |

---

## 8. Historial de decisiones

| Fecha | Decisión |
|---|---|
| 2026-02-26 | Se crea el roadmap; Excel planificado en backend, PDF marcado como baja prioridad |
| 2026-02-26 | Se decide migrar PDF al backend con `pdfmake`; se documenta plan completo |
| 2026-02-26 | Descubierto que datos de empresa deben venir del **tenant** (`company_settings`), no de master DB. Plan PDF queda bloqueado hasta que el seed esté completo con las categorías `company_profile`, `contador` y `revisor_fiscal`. `pdfmake` ya instalado. |

---

*Última actualización: 2026-02-26*
