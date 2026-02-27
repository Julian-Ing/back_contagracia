# Hoja de Ruta — Mejoras Módulo PH

## Contexto

Documento de referencia: `Comentarios PH (1).pdf`
El módulo PH ya tiene CRUD completo de: Copropiedades, Unidades, Copropietarios, Vehículos, Zonas Comunes, Reservas, Facturación (periodos, fees, configs), Alquileres, Configuración.

Esta hoja de ruta cubre las mejoras que **se pueden hacer ahora** sin depender de módulos nuevos o de otros devs.

---

## Estado General

| # | Tarea | Estado | Prioridad |
|---|-------|--------|-----------|
| 1 | Reorganizar menú lateral según PDF | ✅ Completado | Alta |
| 2 | Eliminar edición de cuotas (fees) | ✅ Completado | Alta |
| 3 | Semáforo visual en reservas | ✅ Completado | Media |
| 4 | Recordatorios de reservas | ✅ Completado | Media |
| 5 | Vista de Cartera PH | ✅ Completado | Media |
| 6 | Bloqueos por morosidad | ✅ Completado | Media |

---

## Tarea 1 — Reorganizar menú lateral

### Descripción

Cambiar el sidebar del módulo PH para que coincida con la estructura propuesta en el PDF. Se agregan secciones agrupadas (Contabilidad, Administración) y se incluyen items de módulos futuros deshabilitados o con badge "Próximamente".

### Estructura propuesta

```
PH (Propiedad Horizontal)
├── Dashboard
├── Copropiedades
│   └── Alquileres (sub-item o mover dentro de Copropiedades)
├── Copropietarios
├── Unidades
├── Vehículos – Parqueaderos
├── Zonas Comunes
├── Contabilidad (grupo)
│   ├── Cartera          ← NUEVO (Tarea 5)
│   ├── Facturación      ← ya existe
│   └── Bancos           ← futuro (deshabilitado)
├── Administración (grupo)
│   ├── Asamblea         ← futuro (deshabilitado)
│   ├── Documentos       ← futuro (deshabilitado)
│   ├── Plan de Manto.   ← futuro (deshabilitado)
│   ├── Pólizas          ← futuro (deshabilitado)
│   └── Portería         ← futuro (deshabilitado)
├── Citofonía            ← futuro (deshabilitado)
├── Gestión de PQRS      ← futuro (deshabilitado)
└── Configuración        ← ya existe
```

### Archivos a modificar

- `front_contagracia/src/config/navigation.ts` — reestructurar sección `ph`

### Criterios de aceptación

- [ ] Menú refleja la estructura del PDF
- [ ] Items existentes (Dashboard, Copropiedades, Unidades, etc.) siguen funcionando
- [ ] Items futuros aparecen deshabilitados con tooltip/badge "Próximamente"
- [ ] Alquileres se mueve como sub-item de Copropiedades
- [ ] Nuevo grupo "Contabilidad" con Cartera + Facturación
- [ ] Nuevo grupo "Administración" con items futuros

---

## Tarea 2 — Eliminar edición de cuotas (fees)

### Descripción

Actualmente en `/dashboard/ph/billing`, las cuotas generadas se pueden editar (monto, saldo, estado, notas) mediante un modal. **Contablemente no tiene sentido** permitir editar estos campos manualmente — los montos se generan por el sistema y el estado debe cambiar solo mediante pagos/abonos reales.

### Qué quitar

**Frontend** (`front_contagracia/src/app/dashboard/ph/billing/page.tsx`):
- Eliminar el botón de editar (ícono lápiz) en la tabla de cuotas
- Convertir el modal "Detalle de Cuota" en solo lectura (quitar inputs editables)
- Eliminar botón "Guardar" del modal de fee
- Mantener la vista de detalle como consulta (read-only)

**Backend** (`ph-service/src/modules/billing/`):
- Eliminar o deshabilitar endpoint `PATCH /fees/:feeId`
- Quitar `updateFee()` del service o marcarlo como deprecado
- Eliminar permiso `ph.billing.edit_fee` del seed (o dejarlo para uso interno futuro)

### Criterios de aceptación

- [ ] No se puede editar monto, saldo ni estado de una cuota desde el frontend
- [ ] El modal de cuota muestra datos en modo solo lectura
- [ ] Endpoint PATCH de fees eliminado o deshabilitado
- [ ] Las notas pueden seguir siendo editables (opcional, decisión del usuario)

---

## Tarea 3 — Semáforo visual en reservas

### Descripción

Agregar indicadores visuales de color por estado en la lista/tabla de reservas de zonas comunes.

### Colores

| Estado | Color | Icono |
|--------|-------|-------|
| `pending` | 🟡 Amarillo | Reloj |
| `confirmed` | 🟢 Verde | Check |
| `cancelled` | 🔴 Rojo | X |
| `completed` | 🔵 Azul/Gris | CheckCheck |

### Archivos a modificar

- `front_contagracia/src/app/dashboard/ph/common-areas/page.tsx` — actualizar tabla de reservas con badges de color por estado

### Criterios de aceptación

- [ ] Cada reserva muestra badge de color según estado
- [ ] Colores son claramente distinguibles
- [ ] Funciona en dark mode

---

## Tarea 4 — Recordatorios de reservas

### Descripción

Sistema para enviar recordatorios antes de la fecha de una reserva confirmada. El recordatorio se dispara X horas antes de la reserva.

### Enfoque propuesto

**Backend** (`ph-service`):
- Agregar campo `reminder_sent` (boolean) al modelo de reserva
- Crear endpoint o cron job que busque reservas confirmadas cuya fecha está dentro de las próximas 24h y `reminder_sent = false`
- Enviar notificación (email o in-app) al residente
- Marcar `reminder_sent = true`

**Dependencias:**
- Sistema de notificaciones / email del proyecto
- Decidir si es notificación in-app, email, o ambas

### Archivos a modificar

- `ph-service/prisma/schema.prisma` — agregar `reminder_sent` a PhReservation
- `ph-service/src/modules/common-areas/` — lógica de recordatorio
- Integración con servicio de email/notificaciones existente

### Criterios de aceptación

- [ ] Reservas confirmadas reciben recordatorio 24h antes
- [ ] El recordatorio no se envía más de una vez
- [ ] Se puede configurar el tiempo de anticipación (24h por defecto)
- [ ] Funciona para reservas creadas tanto por admin como por residente

---

## Tarea 5 — Vista de Cartera PH

### Descripción

Crear una página dedicada de Cartera dentro del módulo PH que muestre un resumen de fees pendientes/vencidos agrupados por unidad o por copropietario. Los datos ya existen en el sistema de billing.

### Archivos a crear/modificar

**Frontend:**
- `front_contagracia/src/app/dashboard/ph/cartera/page.tsx` — nueva página
- Reutilizar `useBilling()` hook existente o crear `useCartera()` específico

**Backend (si se necesita endpoint dedicado):**
- `ph-service/src/modules/billing/billing.controller.ts` — `GET /cartera/summary`
- Agrupar fees por unidad, mostrar: total pendiente, total vencido, último pago, estado

### Qué debe mostrar

- Tabla resumen por unidad: unidad, copropietario, total pendiente, total vencido, estado (al día / moroso)
- Filtros: copropiedad, periodo, estado
- KPI cards: total cartera, total vencido, % recaudo
- Posibilidad de ver detalle de fees por unidad (drill-down)
- Exportar a Excel

### Criterios de aceptación

- [ ] Página accesible en `/dashboard/ph/cartera`
- [ ] Muestra resumen agrupado por unidad con totales
- [ ] Identifica morosos (fees vencidos)
- [ ] Filtros por copropiedad y periodo
- [ ] KPI cards con totales generales
- [ ] Exportable a Excel

---

## Tarea 6 — Bloqueos por morosidad

### Descripción

Cuando un residente tiene cuotas vencidas, se le debe:
1. **Bloquear** la posibilidad de hacer reservas de zonas comunes
2. **Marcar** con badge "Moroso" en la vista de copropietarios

### Lógica

Un residente es "moroso" si alguna fee de su unidad tiene estado `overdue`.

**Bloqueo de reservas:**
- Al intentar crear una reserva, verificar si la unidad del residente tiene fees `overdue`
- Si tiene → rechazar con mensaje "No es posible realizar reservas con cuotas vencidas"

**Badge moroso:**
- En la lista de copropietarios, mostrar badge rojo "Moroso" junto al nombre
- En el detalle de residente, mostrar alerta con las cuotas vencidas

### Archivos a modificar

**Backend:**
- `ph-service/src/modules/common-areas/common-areas.service.ts` — validar morosidad al crear reserva
- `ph-service/src/modules/residents/residents.service.ts` — incluir flag `is_delinquent` en la respuesta

**Frontend:**
- `front_contagracia/src/app/dashboard/ph/residents/page.tsx` — mostrar badge "Moroso"
- `front_contagracia/src/app/dashboard/ph/common-areas/page.tsx` — mostrar error si intenta reservar y es moroso

### Criterios de aceptación

- [ ] Residente con fees vencidos no puede crear reservas (backend rechaza)
- [ ] Frontend muestra mensaje claro de por qué no puede reservar
- [ ] Badge "Moroso" visible en la lista de copropietarios
- [ ] Si paga la deuda, el bloqueo se levanta automáticamente
- [ ] Admin puede ver quién está bloqueado

---

## Features futuras (NO en esta hoja de ruta)

Estas features requieren módulos completamente nuevos y quedan para desarrollo posterior:

| Feature | Notas |
|---------|-------|
| Gestión de Pólizas | CRUD + recordatorios + semáforo vencimiento |
| Plan de Mantenimiento | CRUD + recordatorios + semáforo |
| Comunicados por roles | Sistema de mensajería (copropietarios, arrendatarios, consejo) |
| Espacio Documental | Upload/gestión de archivos por copropiedad |
| Portería | Control ingreso/egreso, minuta digital, paquetería |
| Citofonía Digital | Comunicación en tiempo real |
| PQRS | Peticiones, Quejas, Reclamos, Sugerencias con workflow |
| Asambleas | QR + asistencia + votaciones + descarga Excel |
| Bancos PH | Conciliación, caja menor, registro de efectivo |
| Factura PDF | Generar y descargar factura en PDF |
| Abonos/pagos | Registrar abonos parciales a cuotas |
| Facturación masiva | Generar todas las facturas + pagos + envíos masivos |
| Pago de arrendamiento | Generar soporte de pago de arriendo |

---

## Leyenda

- ✅ Completado
- 🚧 En desarrollo
- 🔍 Pendiente de iniciar
- ⏳ Esperando dependencias
- ❌ No aplica
