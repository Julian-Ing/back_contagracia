# Roadmap - Módulo de Facturación

> Archivo de seguimiento persistente. Se marca conforme avanzamos.
> Cada bloque se detalla cuando llega su turno.

---

## Fase 1: Base

- [x] **1.1 Tabla de facturas** — Listar facturas con filtros, búsqueda, paginación, estados
- [ ] **1.2 Crear factura** — Formulario completo (tercero, items, impuestos, retenciones, totales, pago)

## Fase 2: Componentizar formulario de documentos

Todos los DocTypes comparten el mismo modelo `Document` + `DocumentItem`, `DocumentPayment`, `DocumentWithholding`.
El formulario se componentiza una vez y se configura por tipo.

- [ ] **2.1 Extraer `DocumentTotals`** — Sacar la sección de totales de page.tsx a componente reutilizable
- [ ] **2.2 Crear `DocumentFormConfig`** — Objeto de configuración por DocType (qué secciones mostrar, rol tercero, campos extra)
- [ ] **2.3 Crear `DocumentFormPage`** — Wrapper que recibe config y renderiza header + ítems + retenciones + pagos + totales + botones
- [ ] **2.4 Migrar `invoices/new/page.tsx`** — Usar DocumentFormPage con config INVOICE

**Tipos de documento y sus variaciones:**

| Grupo | DocTypes | Tercero | Secciones extras |
|-------|----------|---------|-----------------|
| Ventas | INVOICE, INVOICE_CREDIT_NOTE, INVOICE_DEBIT_NOTE | CLIENT | Tipo operación DIAN, OC, resolución, CUFE |
| Compras | PURCHASE, PURCHASE_CREDIT_NOTE | SUPPLIER | Número externo (factura proveedor) |
| Gastos | EXPENSE, EXPENSE_CREDIT_NOTE | Cualquiera | Categoría, deducible, CUFE importado |
| Cotizaciones | QUOTE_INVOICE, QUOTE_CRM | CLIENT | Vigencia, aceptación, CRM |
| Órdenes de compra | PURCHASE_ORDER | SUPPLIER | Entrega esperada, tipo orden, aprobación, recepciones |
| Recurrentes | *_RECURRENT (6 tipos) | Heredan del base | Nombre, período, activo |

> INVOICE_POS se deja fuera por ahora (va a cambiar).

## Fase 3: Guardado y lógica de negocio

- [ ] **3.1 Endpoint POST /documents** — Crear documento con ítems, retenciones, pagos en una transacción
- [ ] **3.2 Lógica de guardado frontend** — API call desde DocumentFormPage
- [ ] **3.3 Generar JE al facturar** — Asiento contable automático
- [ ] **3.4 Movimientos de inventario** — Descontar stock al facturar
- [ ] **3.5 CxC automática** — Crear cuenta por cobrar (crédito)
- [ ] **3.6 Movimiento bancario** — Registrar pago (contado)

## Fase 4: Documentos relacionados

- [ ] **4.1 Ver detalle de factura** — Modal o página con toda la info
- [ ] **4.2 Editar factura borrador** — Solo si status DRAFT
- [ ] **4.3 Eliminar factura borrador**
- [ ] **4.4 Nota Crédito** — Crear NC referenciando factura original
- [ ] **4.5 Nota Débito** — Crear ND referenciando factura original

## Fase 5: DIAN / Facturación electrónica

- [ ] **5.1 Envío a DIAN** — Generar CUFE, enviar via DianApiService
- [ ] **5.2 Consultar estado DIAN** — ZipKey status
- [ ] **5.3 Generación PDF** — PDF de factura electrónica
- [ ] **5.4 Envío por email** — Enviar factura al cliente

## Fase 6: Extras

- [ ] **6.1 Facturas recurrentes** — Templates + scheduler
- [ ] **6.2 POS** — Factura punto de venta simplificada (pendiente rediseño)
- [ ] **6.3 Importar facturas** — Desde archivo Excel
- [ ] **6.4 Exportar facturas** — Excel/PDF
- [ ] **6.5 A.I.U.** — Administración, Imprevistos, Utilidad

---

## Detalle 1.1 — Tabla de facturas

### Backend — `invoicing-service`

**Ubicación:** `invoicing-service/src/modules/documents/`

**Archivos:**
- `documents.module.ts` — Módulo NestJS
- `documents.controller.ts` — Controlador REST
- `documents.service.ts` — Servicio con lógica jerárquica

**Endpoint:** `GET /documents`

| Parámetro   | Tipo   | Default | Descripción                                         |
| ----------- | ------ | ------- | --------------------------------------------------- |
| `search`    | string | —       | Búsqueda por consecutivo, nombre tercero o NIT      |
| `doc_type`  | enum   | todos   | `INVOICE`, `INVOICE_CREDIT_NOTE`, `INVOICE_DEBIT_NOTE` |
| `status`    | enum   | todos   | `DRAFT`, `PENDING`, `PAID`                          |
| `from_date` | string | —       | Fecha inicio (ISO date)                             |
| `to_date`   | string | —       | Fecha fin (ISO date)                                |
| `page`      | number | 1       | Página actual                                       |
| `limit`     | number | 50      | Registros por página                                |

**Respuesta:** `{ data, total, page, limit, totalPages, hasMore }`

**Lógica jerárquica:**
1. Top-level = `INVOICE` + NC/ND sin `referenced_doc_id` (huérfanas)
2. Cada factura incluye `referencing_docs` con sus NC/ND hijas
3. Paginación aplica solo a top-level
4. Si búsqueda coincide con NC/ND hija → trae su padre completo
5. Búsqueda case-insensitive en `consecutive`, `third_party_name`, `identification_number`

**Nota técnica:** El modelo `Document` no tiene relación Prisma a `ThirdParty` vía `third_party_id`. Se usa batch-fetch separado para `identification_number`.

### Frontend — `src/modules/invoicing/`

**Archivos:**
```
src/modules/invoicing/
├── index.ts                         (barrel exports)
├── types/index.ts                   (DocumentListItem, enums, filtros)
├── services/documents.service.ts    (API calls via invoicingClient puerto 3005)
├── hooks/useDocuments.ts            (hook con filtros, paginación, localStorage)
└── components/DocumentsTable.tsx    (tabla con expand/collapse)
```

**Página:** `src/app/dashboard/invoices/page.tsx`

**Columnas:**

| Columna      | Campo                              | Formato              |
| ------------ | ---------------------------------- | -------------------- |
| ▶            | expand                             | Chevron solo si tiene NC/ND hijas |
| Consecutivo  | `consecutive`                      | Monospace            |
| Tipo         | `doc_type`                         | Badge: Factura=indigo, NC=amber, ND=red |
| Fecha        | `doc_date`                         | dd/mm/yyyy           |
| Vencimiento  | `due_date`                         | dd/mm/yyyy o "—"     |
| Tercero      | `third_party.name`                 | Truncado max 200px   |
| NIT          | `third_party.identification_number`| Monospace            |
| Subtotal     | `subtotal`                         | FormattedNumber      |
| Impuestos    | `total_taxes`                      | FormattedNumber      |
| Retenciones  | `total_withholdings`               | FormattedNumber      |
| Total        | `net_amount`                       | FormattedNumber bold |
| Estado       | `status`                           | Badge: DRAFT=gray, PENDING=yellow, PAID=green |
| DIAN         | `sent_to_api`                      | Solo si módulo `electronic_documents` activo |
| Acciones     | —                                  | Eye (ver)            |

**Filas hijas (NC/ND):** fondo `bg-gray-50/50 dark:bg-slate-800/30`, indentación `pl-4`, sin expand.

**Filtros:** Input búsqueda + SearchableSelect tipo doc + SearchableSelect estado + DatePicker rango. Tipo y estado persisten en localStorage key `invoicing-documents-filters`.

**Hook `useDocuments`:** race condition prevention con `fetchIdRef`, paginación `goToPage()`/`submitSearch()`.

**Dependencias:** `useCompanyModules('electronic_documents')` para columna DIAN, `invoicingClient`, `FormattedNumber`.

## Detalle 1.2 — Crear factura (en progreso)

### Página: `src/app/dashboard/invoices/new/page.tsx` (thin wrapper → `DocumentForm mode="create"`)

**Componente reutilizable:** `src/modules/invoicing/components/DocumentForm.tsx`
- Props: `mode: 'create' | 'edit'`, `documentId?`, `initialData?: DocumentDetail`
- En modo edit: useEffect pobla estado desde initialData (mapDetailItems/Payments/Withholdings/Credit)
- Save: create → POST, edit → PUT `/documents/:id`
- Cancelar: create → listado, edit → detalle del documento

**Permiso:** `sales.invoices.create` (ProtectedRoute + botón "Nueva Factura" en listado)

**Fila 1 (3 columnas):**

| Campo              | Componente         | Notas                                  |
| ------------------ | ------------------ | -------------------------------------- |
| Cliente            | `ThirdPartySelect` | Async con fuzzy search, filtrado por rol CLIENT |
| Fecha de Emisión   | `DatePicker`       | Default: hoy                           |
| Configuración de Pago | `Button` → modal | `DocumentPaymentsModal`: líneas de pago (banco/caja/anticipo) + resumen (documento/pagos/diferencia o cambio). Si saldo > 0 → sección crédito (vencimiento + medio + CC). Tipo se auto-determina por montos (total>0). Edge case $0: toggle explícito Contado/Crédito. Cambio solo válido desde líneas de caja |

**Fila 2 (3 columnas):**

| Campo              | Componente         | Notas                                  |
| ------------------ | ------------------ | -------------------------------------- |
| Tipo de Operación  | `SearchableSelect` | 09 AIU, 10 Estándar, 11 Mandatos. Default: 10 |
| Orden de Compra    | `Button` → modal   | Modal con consecutivo (Input) + fecha (DatePicker). Warning visual amber si uno incompleto. No bloquea. |
| Descripción        | `Textarea`         | Términos, condiciones, observaciones   |

**Pagos del documento:** Se manejan en tabla `DocumentPayment` (antes `DocumentBankPayment`). Cada línea tiene medio de pago (requerido) + banco o anticipo (al menos uno). Permite múltiples pagos por documento.

**Retenciones:** Gestionadas via `DocumentWithholdingsModal` (mismo patrón que pagos).
- Modal: TaxSelect + tabla con Base real (FormattedNumber) + Monto auto-calculado + CC condicional
- Totales: fila clickeable "Retenciones (N)" abre modal + resumen 1×1 debajo
- Ver `docs/2026-02-25-withholdings-totals-buttons.md` para detalle completo

**Totales:**
- Subtotal → Descuento líneas → Base gravable → (Impuestos 1×1 comentado) → Subtotal + Impuestos → Retenciones (modal + resumen) → Total a pagar
- Solo impuestos 1×1 está comentado (depende de items)
- Sin descuentos globales — solo descuentos por línea de ítem
- Todos con `FormattedNumber` + `Decimal.js`
- Se alimentan de la tabla de ítems (`DocumentItemsTable`)

**Botones:** Cancelar (navega a listado o detalle) | Guardar Borrador (DRAFT) | Guardar (PENDING). API: documentsService.create() (create) / documentsService.update() (edit). Redirect a detalle tras guardar.

**Tabla de ítems:** Implementada en `DocumentItemsTable`. Ver `docs/2026-02-25-document-items-table.md` para detalle completo.

**Futuro:** Si el usuario no paga el total completo en modo Contado, el documento se cambiará automáticamente a Crédito (generando CxC por la diferencia). Esta lógica se implementará al momento de guardar la factura.

---

## Progreso actual

| Fecha | Tarea | Estado |
|-------|-------|--------|
| 2026-02-25 | Página placeholder creada | Hecho |
| 2026-02-25 | 1.1 Tabla de facturas (backend + frontend) | Hecho |
| 2026-02-25 | 1.2 Header form nueva factura (selects) | Hecho |
| 2026-02-25 | Schema: DocumentBankPayment → DocumentPayment (payment_method requerido, bank nullable, prepayment_id nuevo) | Hecho |
| 2026-02-25 | 1.2 DocumentPaymentsModal (banco/caja/anticipo, validación visual) | Hecho |
| 2026-02-25 | 1.2 TypeOperation DIAN catalog (schema + seeds master/tenant) | Hecho |
| 2026-02-25 | 1.2 Tipo operación select (09/10/11), cost_center_id en DocumentPayment | Hecho |
| 2026-02-25 | 1.2 Reorganizar header: fila 1 (4 cols) + fila 2 (3 cols: operación, OC modal, descripción) + placeholder items | Hecho |
| 2026-02-25 | 1.2 Retenciones: TaxSelect isTax=false, tabla con tasa/base/monto/CC, auto-cálculo | Hecho |
| 2026-02-25 | 1.2 Totales: desglose completo (subtotal, descuentos, impuestos, retenciones, neto) | Hecho |
| 2026-02-25 | 1.2 Botones: Cancelar, Guardar Borrador, Guardar (sin API aún) | Hecho |
| 2026-02-25 | Schema: cost_center_id FK en DocumentWithholding | Hecho |
| 2026-02-25 | 1.2 Refactor: retenciones a DocumentWithholdingsModal + resumen en totales | Hecho |
| 2026-02-25 | Backend: findForSelect ampliado (price, tax, parent_product_id) | Hecho |
| 2026-02-25 | 1.2 DocumentItemsTable: tabla inline editable, agrupación variantes, dcto %/$, impuestos, bodega/CC condicionales | Hecho |
| 2026-02-25 | 1.2 Totales computados desde ítems (subtotal, descuentos, impuestos 1×1, retenciones, neto) | Hecho |
| 2026-02-25 | 1.2 Modal variantes: buscador, nombre+código+atributos+precio, sin restricción duplicados, fix batch add | Hecho |
| 2026-02-25 | Schema: Document.payment_method_id FK → CompanyPaymentMethod, Document.cost_center_id FK → CostCenter | Hecho |
| 2026-02-25 | 1.2 DocumentCreditModal: vencimiento + medio de pago + centro de costos para crédito | Hecho |
| 2026-02-25 | 1.2 Bodega ítems: filtrada por almacenes asignados al usuario (useUserStorages), label Almacén/Bodega si múltiples | Hecho |
| 2026-02-25 | 1.2 Buscar ítems: input filtra filas por nombre/consecutivo/barcode. Consecutivo y barcode visibles en columna Producto | Hecho |
| 2026-02-25 | 1.2 Validaciones: cliente, ítems (qty>0, price>0, impuesto, bodega, CC), retenciones (CC). Servicios qty=1 fijo | Hecho |
| 2026-02-25 | 1.2 ThirdPartySelect filtra por rol CLIENT (includeRoles prop, backend include_roles hasSome). Servicios qty=1 fijo | Hecho |
| 2026-02-26 | 1.2 Modal unificado: sin select Contado/Crédito. Siempre muestra líneas de pago + resumen (documento/pagos/diferencia o cambio). Si hay saldo pendiente → sección crédito aparece automáticamente | Hecho |
| 2026-02-26 | 1.2 Validaciones de pago: líneas completas (monto>0, recurso, medio, CC), excedente solo de caja (cambio), crédito requerido si saldo>0. Labels * en campos requeridos | Hecho |
| 2026-02-26 | 1.2 Fix: sección crédito visible cuando doc=0 (sin ítems), no solo cuando saldo>0 | Hecho |
| 2026-02-26 | 1.2 Fix: bodegas deduplicadas + consecutivos visibles (ALM-0001 Principal / BOD-0001 Principal) | Hecho |
| 2026-02-26 | 1.2 Fix: quitar usePortal del PaymentMethodSelect de crédito (dropdown se despegaba del input) | Hecho |
| 2026-02-26 | 1.2 Fix: Tipo de Operación marcado como requerido (*) con validación | Hecho |
| 2026-02-26 | 1.2 Ítems: input inline para nombre de factura (description), lápiz en fila padre abre modal variantes con contadores +/- (duplicados), trash en grupo, removeGroup | Hecho |
| 2026-02-26 | 1.2 Fix: description de combinaciones sin atributos — solo nombre base del producto (ej: "Lapiz" no "Lapiz — Azul") | Hecho |
| 2026-02-26 | 1.2 Buscador productos: búsqueda server-side con paginación. Si combinación coincide (nombre/barcode/consecutivo) → muestra su padre. Backend findForSelect ampliado (search, page, limit). SearchableSelect async (onSearchChange + loading). Debounce 300ms | Hecho |
| 2026-02-26 | Seeder AIU: categoría AIU (is_aiu, CAT-AIU) + 3 servicios (Administración 413507, Imprevistos 413508, Utilidad 413509) is_service=true, is_aiu=true, tax_id=null, price=0. Consecutivos no-numéricos (AIU-ADM/IMP/UTI). Sync last_number para product/product_category | Hecho |
| 2026-02-26 | Tax.is_system: campo en schema + seeders is_system=true (6 taxes). Backend bloquea edición y eliminación de system taxes (ConflictException). Frontend oculta botones editar/eliminar si is_system. Fix import @Audit en periods.controller. Config dev:all solo 8 servicios activos | Hecho |
| 2026-02-26 | TaxSelect.onChange: pasa (id, label, {name, rate, taxTypeId}) directo — eliminados regex hacks en DocumentItemsTable y DocumentWithholdingsModal (rate y taxTypeId se parseaban del label string) | Hecho |
| 2026-02-26 | 1.2 AIU: sección A.I.U. cuando tipo operación=09. Fuerza IVA 0% en todos los ítems (tax locked en tabla). 3 inputs porcentaje (NumericInput maxDecimals=2) + TaxSelect IVA solo para utilidad. Totales con desglose AIU + IVA utilidad. Retenciones usan IVA utilidad como base ReteIVA. Mandatos (11) comentado | Hecho |
| 2026-02-26 | Backend: findForSelect excluye productos AIU (is_aiu: false) del buscador de ítems de factura | Hecho |
| 2026-02-26 | 1.2 AIU rediseño: sección grande reemplazada por botón compacto en fila 2 (junto a Tipo Operación) + modal config. Grid 4 cols cuando AIU activo. Totales restaurados al formato original (sin desglose AIU inline) | Hecho |
| 2026-02-26 | TaxSelect portal fix: aislamiento focus/scroll/pointer para funcionar dentro de Dialogs (mismo patrón que SearchableSelect). onPointerDown stopPropagation + focusin/focusout capture phase + wheel/touchmove isolation | Hecho |
| 2026-02-26 | TaxSelect usePortal en DocumentItemsTable: dropdown de impuesto ya no se recorta por overflow-x-auto de la tabla | Hecho |
| 2026-02-26 | excludeCostTax: nuevo filtro en endpoint for-select (backend) + prop en TaxSelect (frontend). Excluye impuestos a mayor costo (is_cost_tax=true) de selects de ventas (ítems factura + AIU utilidad) | Hecho |
| 2026-02-26 | tax_included: ItemLine ahora incluye tax_included del producto. calcLineTotals extrae base cuando tax_included=true: base = precio / (1 + tasa/100). Aplica a addProductLine y handleConfirmVariants | Hecho |
| 2026-02-26 | UI: botones flotantes (IA + Volver) pegados a esquina inferior derecha (bottom-2 right-1). Botón IA reducido de h-14/w-14 a h-10/w-10 | Hecho |
| 2026-02-26 | Unidad de medida: backend devuelve unit_name en for-select (name, no symbol). Frontend muestra abreviatura (max 4 chars) a la izquierda del input de cantidad con tooltip nombre completo. Schema: eliminado campo symbol de ProductUnit (nunca poblado) + migración | Hecho |
| 2026-02-26 | Backend: POST /documents (crear borrador/pendiente) — DTO validado, transacción atómica, consecutivo auto, items+taxes+payments+withholdings+AIU. GET /documents/:id (detalle completo con relations). GET /documents/catalogs/type-operations (catálogo DIAN) | Hecho |
| 2026-02-26 | Frontend: documentsService.create() + getById() + getTypeOperations(). Tipos completos (CreateDocumentPayload, DocumentDetail + sub-interfaces). Tipo operación carga del backend (UUID), select guarda ID y code separados. Lógica AIU usa code, guardado usa ID | Hecho |
| 2026-02-26 | Componentización: DocumentForm extraído de new/page.tsx (880→12 líneas). Props: mode (create/edit), documentId, initialData. Helpers mapDetailItems/Payments/Withholdings/Credit para poblar form desde DocumentDetail. Cancelar navega a detalle (edit) o listado (create). Save usa create o update según mode. documentsService.update() agregado (PUT). Barrel export actualizado | Hecho |
| 2026-02-26 | Fix: validación cambio — excedente de pago solo puede provenir de líneas de caja. Modal muestra "Cambio" en rojo si excede caja disponible + mensaje explicativo. Botón Confirmar deshabilitado si cambio inválido | Hecho |
| 2026-02-26 | Fix: desglose AIU en totales — Administración/Imprevistos/Utilidad/IVA Utilidad visibles entre Base gravable y Subtotal+AIU+IVA. Impuestos estándar solo en modo no-AIU. Label dinámico "Subtotal + AIU + IVA" | Hecho |
| 2026-02-26 | Fix: botón pago muestra "Contado" (verde) cuando totalmente pagado, "Crédito: fecha" (amber) cuando hay saldo pendiente. Ya no muestra crédito stale cuando se paga de más | Hecho |
| 2026-02-26 | Fix: backend payment_type determinado por montos reales (netAmount vs totalPaid), no por presencia de payments/credit. Corrige caso donde hasPayments+hasCredit daba CASH en vez de CREDIT | Hecho |
| 2026-02-26 | Edge case $0: toggle Contado/Crédito en modal solo cuando docTotal===0. Texto: "Documento sin valor — no se generarán movimientos". Validación: require paymentType, skip amount>0 en líneas, credit config si CREDIT. buildPayload respeta paymentType para $0. Total negativo = inválido (no es $0) | Hecho |
