# Fix: word_similarity en Plan de Cuentas

**Fecha:** 2026-02-11

## Archivo modificado

`src/modules/chart-of-accounts/chart-of-accounts.service.ts`

## Cambio

Reemplazado `similarity()` por `word_similarity()` en la busqueda fuzzy del plan de cuentas. Mismo problema que en AR/AP: nombres largos de cuentas diluian el score de similarity.

### Antes
```sql
OR similarity("name", $1) > 0.3
OR similarity("code", $1) > 0.3
```

### Despues
```sql
OR word_similarity($1, COALESCE("name", '')) > 0.3
OR word_similarity($1, COALESCE("code", '')) > 0.3
```

Tambien se agrego `COALESCE` para manejar nulls.
