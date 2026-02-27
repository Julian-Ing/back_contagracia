# Limpieza de textos en perfil de empresa

**Fecha:** 2026-02-17

## Archivo modificado

`src/app/dashboard/company-profile/page.tsx`

## Cambios realizados

### 1. Eliminación de sección de logo DIAN (líneas 1181-1210)

Se eliminó completamente la sección "Subir Logo de la Empresa" que incluía:
- Logo DIAN (700×300 px)
- Badge "Próximamente"
- Input de archivo deshabilitado
- Selector de formato de impresión deshabilitado

**Razón:** Funcionalidad no implementada y sin fecha definida de desarrollo.

### 2. Simplificación de sección de logo para impresión

**Cambios en el título:**
- Antes: "Logo para impresión (Software propio)"
- Después: "Logo para impresión"

**Texto eliminado:**
- "No es el logo de DIAN. Se usa en documentos del sistema (Carta y Tirilla 80 mm)."
- "Si te pasas, lo reescalamos automáticamente."

**Texto conservado:**
- "Recomendado: hasta 800×300 px."

**Razón:** Simplificar y eliminar información confusa o innecesaria para el usuario.

## Resultado

Formulario de perfil de empresa más limpio y enfocado solo en funcionalidades activas.
