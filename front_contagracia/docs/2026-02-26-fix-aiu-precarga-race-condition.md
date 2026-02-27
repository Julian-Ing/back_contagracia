# Fix: race condition en precarga AIU del DocumentForm

**Fecha:** 2026-02-26

## Problema

Al editar un documento con tipo de operacion AIU, los porcentajes AIU (administracion, imprevistos, utilidad) se cargaban correctamente desde `initialData` en el efecto de precarga, pero inmediatamente despues se reseteaban a valores vacios.

### Causa raiz

Existia un `useEffect` con un else-branch que reseteaba el estado AIU cuando el tipo de operacion no era AIU:

```typescript
useEffect(() => {
  if (operationType === 'aiu') {
    // cargar porcentajes...
  } else {
    // RESET: limpiaba aiu_percentages a {}
  }
}, [operationType]);
```

Este efecto competia con el efecto de precarga de edicion (`initialData`). La secuencia era:
1. Efecto de precarga setea `operationType = 'aiu'` y los porcentajes AIU
2. El useEffect de AIU se ejecuta, ve que `operationType === 'aiu'`, carga porcentajes (OK)
3. Pero en renders intermedios, `operationType` podia ser `''` (valor inicial), disparando el else-branch que reseteaba todo

## Solucion

Mover el reset de estado AIU al `onChange` del select de tipo de operacion, en vez del `useEffect`:

```typescript
// En el onChange del select de tipo operacion:
onChange={(value) => {
  setOperationType(value);
  if (value !== 'aiu') {
    setAiuPercentages({});  // reset solo por accion del usuario
  }
}}
```

Esto garantiza que el reset solo ocurre cuando el usuario cambia manualmente el tipo de operacion, nunca por efectos automaticos que compiten con la precarga.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/modules/invoicing/components/DocumentForm.tsx` | Movido reset AIU de useEffect else-branch al onChange del select de tipo de operacion |
