# Seed All Tenants: JournalEntryType y ArApSource

## Cambio en seed-all-tenants.ts
Se agregó replicación de `journal_entry_types` y `ar_ap_sources` a tenants existentes.

## Uso
```bash
npx ts-node prisma/scripts/seed-all-tenants.ts
```

## Tablas agregadas
- `journalEntryTypes` (61 registros)
- `arApSources` (7 registros)

## Archivo
- `prisma/scripts/seed-all-tenants.ts`
