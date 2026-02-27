# Fix: word_similarity en Terceros

**Fecha:** 2026-02-11

## Archivo modificado

`src/modules/third-parties/third-parties.service.ts`

## Cambio

Reemplazado `similarity()` por `word_similarity()` en la busqueda fuzzy de terceros. Con `similarity()`, buscar "malio" no encontraba "MARIO JOHN ALEXANDER" porque el score se diluye con strings largos.

### Antes
```sql
OR similarity(COALESCE("name", ''), $1) > 0.3
OR similarity(COALESCE("identification_number", ''), $1) > 0.3
```

### Despues
```sql
OR word_similarity($1, COALESCE("name", '')) > 0.3
OR word_similarity($1, COALESCE("identification_number", '')) > 0.3
```

`word_similarity(term, text)` compara el termino contra cada palabra del texto y retorna el mejor score. Ideal para nombres compuestos.
