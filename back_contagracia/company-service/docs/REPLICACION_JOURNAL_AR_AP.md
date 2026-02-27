# Replicación: JournalEntryType y ArApSource

## Cambio en tenant.service.ts
Se agregó replicación de tablas `journal_entry_types` y `ar_ap_sources` a nuevos tenants.

## Tablas replicadas
- `journalEntryTypes` (61 registros)
- `arApSources` (7 registros)

## Código agregado
```typescript
// En Promise.all de fetch desde master:
journalEntryTypes,
arApSources,

// Replicación:
await Promise.all(
  journalEntryTypes.map((jet) =>
    tenantPrisma.journalEntryType.upsert({...})
  )
);

await Promise.all(
  arApSources.map((source) =>
    tenantPrisma.arApSource.upsert({...})
  )
);
```

## Archivos
- `src/modules/tenant/tenant.service.ts`
