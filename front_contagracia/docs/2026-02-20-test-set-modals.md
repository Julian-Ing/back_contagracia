# Modales de Habilitación Test Set DIAN

**Fecha:** 2026-02-20
**Autor:** Claude Code
**Módulo:** electronic-documents

## Descripción

Modales para el proceso de habilitación (paso a producción) de facturación y nómina electrónica. Se abren al presionar "Habilitar" en las tarjetas de configuración de software.

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `InvoiceTestSetModal.tsx` | Modal con flujo de 5 pasos para facturación |
| `PayrollTestSetModal.tsx` | Modal con flujo de 5 pasos para nómina |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `InvoiceSoftwareCard.tsx` | Botones "Guardar", "Imp. Resoluciones", "Habilitar"; reload config al cerrar |
| `PayrollSoftwareCard.tsx` | Botón "Habilitar" abre `PayrollTestSetModal`, reload config al cerrar |

## InvoiceTestSetModal - Flujo Completo

### Antes de iniciar
- Input "Número de factura a enviar" (default 1)
- Se calcula: 990.000.000 + número = consecutivo real (ej: 1 → SETP990.000.001)
- Muestra preview del consecutivo resultante debajo del input
- Botón "Iniciar validación"

### Durante la ejecución
- Progress bar con porcentaje (0% → 25% → 50% → 75% → 100%)
- Colores: azul (en progreso), verde (completado), rojo (error)
- No se puede cerrar el modal mientras corre
- 5 pasos con iconos de estado:

| Paso | Endpoint | Icono |
|------|----------|-------|
| 1. Registrando resolución SETP | `POST /test-set/invoice/register-resolution` | Spinner → Check/X |
| 2. Enviando factura de prueba | `POST /test-set/invoice/send` | Spinner → Check/X |
| 3. Consultando estado en DIAN | `POST /test-set/invoice/status/:zipKey` | Spinner → Check/X |
| 4. Importando resoluciones de producción | `POST /test-set/invoice/import-resolutions` | Spinner → Check/X |
| 5. Cambiando ambiente a producción | `PATCH /environment/invoice/production` | Spinner → Check/X |

### Polling (Paso 3)
- Hasta 10 intentos con 3 segundos de espera entre cada uno
- Si el API devuelve error HTTP se detiene de inmediato (no reintenta)
- `statusCode "00"` = éxito, `"99"` = error

### Al finalizar
- Toast de éxito o error
- Botón "Listo" (si éxito) o "Cerrar" (si error)
- Reset completo al cerrar

## PayrollTestSetModal - Flujo Completo

### Antes de iniciar
- Inputs de prefijo nómina (default TNI) y prefijo anulación (default TNA), editables, auto-uppercase
- Input numérico para consecutivo de nómina (desde), default 1
- Input numérico para consecutivo de anulación (desde), default 1
- Botón "Iniciar validación"

### Durante la ejecución
- Progress bar granular: paso 1 = 5%, paso 2 = 45%, paso 3 = 35%, paso 4 = 5%, paso 5 = 10%
- Colores: azul (en progreso), verde (completado), rojo (error)
- No se puede cerrar el modal mientras corre
- Progreso detallado por sub-paso: "3/10 - TNI3 OK"
- 5 pasos con iconos de estado:

| Paso | Endpoint | Descripción |
|------|----------|-------------|
| 1. Registrando resoluciones | `POST /test-set/payroll/register-resolutions` | Registra 2 resoluciones con prefijos editables |
| 2. Enviando 10 nóminas de prueba | `POST /test-set/payroll/send` × 10 | Secuencial, guarda CUNEs |
| 3. Enviando 8 notas de ajuste | `POST /test-set/payroll/send-adjust-note` × 8 | Referencia CUNEs del paso 2 |
| 4. Creando resoluciones NI y NA | `POST /test-set/payroll/create-production-resolutions` | Crea en API + DB, skipea si existen |
| 5. Cambiando ambiente a producción | `PATCH /environment/payroll/production` | Endpoint existente |

### Lógica de CUNEs
- Paso 2 guarda `{ consecutive, cune, issueDate }` de cada nómina
- Paso 3 usa CUNEs como predecessors: nota 1 → nómina 1, nota 2 → nómina 2, ... nota 8 → nómina 8
- Nóminas 9 y 10 quedan sin anular (requisito DIAN)

### Al finalizar
- Toast de éxito o error
- Botón "Listo" (si éxito) o "Cerrar" (si error)
- Reset completo al cerrar
