# Fixes en seleccion de documentos CxC/CxP en asiento manual

**Fecha:** 2026-02-13

## Problemas corregidos

### 1. Modal no reseteaba estado al cerrarse programaticamente

**Archivo:** `src/app/dashboard/accounting/journal-entries/new/SelectArApDocumentModal.tsx`

**Problema:** El Dialog de Radix UI solo dispara `onOpenChange` cuando el usuario cierra manualmente (ESC, click fuera). Cuando el padre cambia `open` a `false` via `setDocModalLineId(null)`, el estado interno del modal (terceros cargados, tercero seleccionado, documentos, filtros) NO se reseteaba. Al reabrir el modal para CXP, mostraba datos stale de RECEIVABLE.

**Solucion:** Se agrego `useEffect` que resetea TODO el estado interno cuando `open` cambia a `false`:

```typescript
useEffect(() => {
  if (!open) {
    setThirdParties([]);
    setSelectedThirdParty(null);
    setDocuments([]);
    setDocSearch('');
    setDocStatuses(['PENDING', 'PARTIAL']);
    setDocOverdue('all');
    setDocPage(1);
    setTpSearch('');
    setTpBucket('all');
    setTpDateFrom('');
    setTpDateTo('');
    setTpDueDateFrom('');
    setTpDueDateTo('');
    setTpPage(1);
    setInitialLoaded(false);
  }
}, [open]);
```

**Cambio adicional:** Se renombraron todas las variables de espanol a ingles (terceros -> thirdParties, fetchTerceros -> fetchThirdParties, etc.).

### 2. Label de referencia no distinguia CxC de CxP del mismo asiento

**Archivo:** `src/app/dashboard/accounting/journal-entries/new/page.tsx`

**Problema:** El `reference_label` usaba `source_description: source_number` sin el consecutivo del ArAp. Dos ArAp del mismo asiento mostraban labels identicos.

**Solucion:** Se cambio el formato a incluir el consecutivo del ArAp:

```typescript
// ANTES:
reference_label: `${doc.source_description}: ${doc.source_number || doc.consecutive || '-'}`

// DESPUES:
reference_label: `${doc.consecutive || '-'} | ${doc.source_description}: ${doc.source_number || '-'}`
```

Ahora muestra: "CXC-0001 | Asiento Manual: JE-0016" vs "CXP-0001 | Asiento Manual: JE-0016".

### 3. ThirdPartySelect no se actualizaba al seleccionar documento

**Archivo:** `src/shared/components/ui/third-party-select.tsx`

**Problema:** El `useEffect` de sincronizacion tenia la condicion `!selectedOption`, que impedia actualizar cuando el usuario ya habia seleccionado un tercero manualmente. Al seleccionar un documento ArAp de otro tercero, el select seguia mostrando el tercero anterior.

**Solucion:** Se cambio la condicion para comparar por ID:

```typescript
// ANTES:
if (value && valueLabel && !selectedOption) {

// DESPUES:
if (value && valueLabel) {
  if (selectedOption?.id !== value) {
```

Ahora si el `value` prop cambia externamente (ej: handleDocumentSelected setea otro third_party_id), el componente actualiza su estado interno.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `SelectArApDocumentModal.tsx` | Reset de estado en useEffect + rename variables a ingles |
| `page.tsx` | Formato de reference_label con consecutivo ArAp |
| `third-party-select.tsx` | Fix sincronizacion de selectedOption con value prop externo |
