# pair_id + PREP_CREATED en Asientos Manuales (Frontend)

**Fecha:** 2026-02-24

## Resumen

Se agregan dos capacidades nuevas al formulario de asientos manuales:

1. **Crear Anticipo** (PREP_CREATED): Nueva opcion en RefTypeSelect para crear anticipos de Cliente, Proveedor o Empleado directamente desde una linea del asiento.
2. **pair_id**: Permite vincular lineas creadoras y consumidoras dentro del mismo asiento. El usuario puede crear un documento (CXC, CXP, Anticipo) y pagarlo/usarlo en el mismo asiento.

## Archivos modificados

### `ref-type-select.tsx`

- `selectedOption`: Ahora detecta valores `PREP_CREATED_*` y los mapea a la opcion virtual `PREP_CREATED` para display.
- `handleSelect`: Al seleccionar `PREP_CREATED`, invoca `onChange('PREP_CREATED_CLIENT')` como default.
- `isSelected`: Verifica match para variantes PREP_CREATED_*.

### `page.tsx`

#### Tipos y constantes

- `RefType`: Agregados `PREP_CREATED_CLIENT`, `PREP_CREATED_SUPPLIER`, `PREP_CREATED_EMPLOYEE`.
- `REF_TYPE_OPTIONS`: Agregada opcion `PREP_CREATED` (grupo virtual, color `#10B981`).
- `CREATOR_TYPES`: `['CXC_CREATED', 'CXP_CREATED', 'PREP_CREATED_CLIENT', 'PREP_CREATED_SUPPLIER', 'PREP_CREATED_EMPLOYEE']`
- `CONSUMER_TYPES`: `['CXC_PAID', 'CXP_PAID', 'PREP_USED']`

#### Interface `JournalEntryLine`

- Agregado `pair_id: string` (UUID temporal, vacio si no vinculado).

#### Logica de pair_id

- **Generacion**: Al seleccionar un tipo creador, se genera `pair_id = crypto.randomUUID()`.
- **Vinculacion**: Al seleccionar un tipo consumidor, si hay creadores compatibles en el asiento se muestra selector inline. El usuario puede vincular a un creador (copia pair_id, auto-llena tercero, cuenta, tipo) o buscar documento externo.
- **Limpieza**: Al cambiar ref_type de un creador o eliminarlo, se limpian pair_id de todos sus consumidores.

#### Sub-selector PREP_CREATED

Cuando `reference_type` empieza con `PREP_CREATED_`, se muestra un SearchableSelect inline con opciones: Cliente, Proveedor, Empleado.

#### Selector inline de creadores

Cuando un consumidor (CXC_PAID, CXP_PAID, PREP_USED) no tiene documento:
- Si hay creadores compatibles en el asiento: muestra lista con monto disponible + opcion "Buscar externo..."
- Si no hay creadores: abre modal directo (comportamiento original)

#### Validacion (`lineErrorsMap`)

- PREP_CREATED_CLIENT solo en lineas Credito.
- PREP_CREATED_SUPPLIER/EMPLOYEE solo en lineas Debito.
- Consumidores con pair_id: valida monto vs disponible del creador (descontando otros consumidores del mismo pair_id).
- Consumidores sin pair_id ni reference_id: requiere seleccionar documento.
- Se omite validacion de `reference_id` requerido si tiene `pair_id`.

#### Payload (`handleSubmit`)

- Se envia `pair_id: l.pair_id || null` en cada item.

#### Filtro de lineas

- Filtro `PREP_CREATED` en la barra de filtros matchea todas las variantes `PREP_CREATED_*`.

#### Display de monto maximo

- Para consumidores con pair_id: calcula disponible del creador (monto creador - suma otros consumidores).
- Para documentos externos: mantiene logica existente (reference_max_amount - otras lineas con mismo document).

## Flujo de uso

1. Usuario agrega linea, selecciona "Crear CXC" -> se genera pair_id
2. Agrega otra linea, selecciona "Cobrar CXC"
3. Sistema detecta CXC_CREATED en el asiento -> muestra opcion inline
4. Usuario clickea la opcion -> se vincula con pair_id, se auto-llenan campos
5. Al guardar, backend recibe pair_id y crea CXC + pago en una transaccion

## PaymentReceiptForm (solo vista)

- Agregado `PREP_CREATED` a `LineKind`, `KIND_LABELS`, `KIND_COLORS` para que el modal de vista/anulacion muestre correctamente lineas de anticipos creados desde asientos manuales.
- Agregado `PREP_CREATED` a `CreatePaymentReceiptLinePayload.kind` en el servicio.
- NO se agrega logica de creacion de anticipos en PaymentReceiptForm (solo lectura).

## Notas

- `pair_id` NO se almacena en DB — es efimero, solo para el request.
- Creador sin consumidores: OK (crea documento normalmente).
- Consumidor con pair_id sin creador: error de validacion.
- Todas las lineas tienen `pair_id` en el state (default `''`), y se envia como `pair_id || null` en el payload.
