# Analisis Completo: Modulo PH (Propiedad Horizontal) — Horizont

**Fecha:** 2026-02-12
**Fuente:** `C:\Users\may13\OneDrive\Escritorio\arawana\Contagracia\horizont`
**Objetivo:** Documentar completamente el modulo PH del proyecto anterior para su migracion a NuevoContagracia (NestJS + Next.js)

---

## Resumen Ejecutivo

El modulo PH es un sistema completo de **administracion de propiedad horizontal** (conjuntos residenciales, edificios, copropiedades). Cubre:

- Gestion de copropiedades, torres, unidades y copropietarios
- Facturacion mensual con generacion masiva de cuotas
- Intereses de mora, descuentos por pronto pago, recargos
- Zonas comunes con reservas y calendario
- Registro de vehiculos
- Alquileres entre unidades (parqueaderos, etc.)
- Contabilidad integrada (CxC, asientos contables)
- Pagos online (ePayco, Bold, Wompi)
- Comprobantes de pago con flujo de aprobacion
- Reportes: cartera por edades, deudores, tendencias, estados de cuenta

---

## 1. Navegacion y Rutas

### Menu Lateral (Sidebar)
```
PH (expandible)
  ├── Dashboard         /dashboard/ph
  ├── Copropiedades     /dashboard/ph/condominiums
  ├── Unidades          /dashboard/ph/units
  ├── Copropietarios    /dashboard/ph/residents
  ├── Facturacion       /dashboard/ph/billing
  ├── Zonas Comunes     /dashboard/ph/common-areas
  ├── Vehiculos         /dashboard/ph/vehicles
  ├── Alquileres        /dashboard/ph/rentals
  ├── Contabilidad      /dashboard/ph/accounting
  └── Configuracion     /dashboard/ph/settings
```

### Control de Acceso
- Todas las rutas protegidas por `<ModuleGate module="ph">`
- Menu visible solo si `hasModule('ph')` es true
- Caso especial: miembros PH (copropietarios) ven sidebar simplificado → solo "Mis Cuentas por Cobrar"

---

## 2. Base de Datos — 18 Tablas Principales

### 2.1 Estructura Core

#### `ph_condominiums` — Copropiedades
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| company_id | FK → companies | Multi-tenancy |
| name | VARCHAR | Nombre del conjunto |
| nit | VARCHAR | NIT de la copropiedad |
| address | VARCHAR | Direccion |
| department_id | FK → parametricas | Departamento |
| municipality_id | FK → parametricas | Municipio |
| phone | VARCHAR | Telefono |
| email | VARCHAR | Email |
| admin_company_id | FK → companies | Empresa administradora (puede ser diferente) |
| total_units | INT | Total de unidades |
| price_per_m2 | DECIMAL | Precio por metro cuadrado (para calculo de cuotas) |
| is_active | BOOLEAN | Estado |
| created_by | FK → users | |

#### `ph_towers` — Torres/Bloques
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| condominium_id | FK → ph_condominiums | |
| name | VARCHAR | Nombre (Torre A, Bloque 1) |
| code | VARCHAR | Codigo corto |
| total_floors | INT | Pisos |
| is_active | BOOLEAN | |

#### `ph_units` — Unidades (Apartamentos, Locales, Parqueaderos)
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| condominium_id | FK → ph_condominiums | |
| tower_id | FK → ph_towers | Opcional |
| unit_type_id | FK → ph_unit_types | Tipo de unidad |
| unit_number | VARCHAR | Numero (101, P-05, L-3) |
| floor | INT | Piso |
| area_m2 | DECIMAL | Area en m2 |
| coefficient | DECIMAL | Coeficiente de copropiedad |
| parent_unit_id | FK → ph_units (self) | Unidad padre (ej: parqueadero de un apto) |
| is_active | BOOLEAN | |
| notes | TEXT | |

#### `ph_unit_types` — Tipos de Unidad
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| company_id | FK | |
| name | VARCHAR | Apartamento, Local, Parqueadero, Deposito |
| code | VARCHAR | APT, LOC, PRK |
| description | TEXT | |
| is_rentable | BOOLEAN | Permite alquilar entre unidades |
| free_minutes | INT | Minutos gratis antes de cobrar |
| rental_fee | DECIMAL | Tarifa de alquiler |
| rental_fee_type | ENUM | 'fixed', 'per_hour', 'per_day' |
| fee_concept_id | FK → ph_fee_concepts | Concepto para generar cobro |
| is_active | BOOLEAN | |

### 2.2 Residentes

#### `ph_unit_residents` — Copropietarios/Arrendatarios
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| unit_id | FK → ph_units | |
| tercero_id | FK → terceros | Persona (contacto externo) |
| resident_type | ENUM | 'owner' (propietario), 'tenant' (arrendatario) |
| is_primary | BOOLEAN | Responsable principal de la unidad |
| move_in_date | DATE | Fecha de ingreso |
| move_out_date | DATE | Fecha de salida (null si activo) |
| is_active | BOOLEAN | |
| notes | TEXT | |

#### `ph_vehicles` — Vehiculos
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| unit_id | FK → ph_units | |
| resident_id | FK → ph_unit_residents | |
| vehicle_type | ENUM | 'car', 'motorcycle', 'bicycle', 'other' |
| brand | VARCHAR | Marca |
| model | VARCHAR | Modelo |
| year | INT | Año |
| color | VARCHAR | |
| plate | VARCHAR | Placa (uppercase) |
| sticker_number | VARCHAR | Numero de sticker |
| parking_space | FK → ph_units | Parqueadero asignado |
| is_active | BOOLEAN | |
| notes | TEXT | |

### 2.3 Facturacion y Cuotas

#### `ph_fee_concepts` — Conceptos de Cobro
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| company_id | FK | |
| name | VARCHAR | Cuota ordinaria, Extraordinaria, Parqueadero, etc. |
| code | VARCHAR | ADM, EXT, PRK |
| description | TEXT | |
| default_amount | DECIMAL | Monto por defecto |
| is_recurring | BOOLEAN | Se genera automaticamente cada periodo |
| calculation_type | ENUM | 'fixed', 'per_m2', 'coefficient' |
| income_account_id | FK → chart_of_accounts | Cuenta contable de ingreso |
| is_active | BOOLEAN | |

#### `ph_billing_periods` — Periodos de Facturacion
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| condominium_id | FK → ph_condominiums | |
| name | VARCHAR | "Enero 2026" |
| year | INT | |
| month | INT | 1-12 |
| start_date | DATE | |
| end_date | DATE | |
| due_date | DATE | Fecha limite de pago |
| status | ENUM | 'draft', 'generated', 'closed' |
| generated_at | TIMESTAMP | |
| closed_at | TIMESTAMP | |
| **UNIQUE** | | (condominium_id, year, month) |

#### `ph_fees` — Cuotas Generadas
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| billing_period_id | FK → ph_billing_periods | |
| unit_id | FK → ph_units | |
| fee_concept_id | FK → ph_fee_concepts | |
| resident_id | FK → ph_unit_residents | Responsable del pago |
| amount | DECIMAL | Monto original |
| balance | DECIMAL | Saldo pendiente |
| status | ENUM | 'pending', 'partial', 'paid', 'overdue' |
| due_date | DATE | |
| paid_at | TIMESTAMP | |
| fee_type | ENUM | 'regular', 'interest', 'discount', 'surcharge', 'other' |
| parent_fee_id | FK → ph_fees (self) | Fee padre (para ajustes) |
| billing_config_id | FK → ph_billing_config | Config que genero este ajuste |
| ar_document_id | FK → manual_ar_ap_documents | Documento CxC |
| journal_entry_id | FK → journal_entries | Asiento contable |
| notes | TEXT | |

### 2.4 Configuracion de Facturacion

#### `ph_billing_config` — Intereses/Descuentos/Recargos
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| condominium_id | FK | |
| config_type | ENUM | 'interest', 'discount', 'surcharge', 'other' |
| name | VARCHAR | Ej: "Interes de mora mensual" |
| description | TEXT | |
| value_type | ENUM | 'fixed' (monto fijo), 'percentage' (porcentaje) |
| value | DECIMAL | Valor (ej: 1.5 para 1.5%) |
| calculation_period | ENUM | 'daily', 'monthly', 'annual' |
| trigger_days | INT | Dias de gracia (interes) o dias de anticipacion (descuento) |
| is_compound | BOOLEAN | Interes compuesto (solo para interest) |
| max_amount | DECIMAL | Limite maximo de cobro |
| max_percentage | DECIMAL | Limite % maximo |
| applies_to_all_concepts | BOOLEAN | Aplica a todos o selectivo |
| is_active | BOOLEAN | |
| effective_from | DATE | Vigencia desde |
| effective_to | DATE | Vigencia hasta |
| account_id | FK → chart_of_accounts | Cuenta contable |
| metadata | JSONB | |

#### `ph_billing_config_concepts` — Config ↔ Conceptos (M:N)
| Campo | Tipo |
|-------|------|
| id | UUID PK |
| billing_config_id | FK → ph_billing_config |
| fee_concept_id | FK → ph_fee_concepts |

#### `ph_fee_adjustments` — Historial de Ajustes
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| fee_id | FK → ph_fees | |
| billing_config_id | FK → ph_billing_config | |
| adjustment_type | ENUM | 'interest', 'discount', 'surcharge', 'other' |
| base_amount | DECIMAL | Monto base del calculo |
| adjustment_amount | DECIMAL | Monto calculado |
| trigger_days_at_calculation | INT | Dias al momento del calculo |
| calculated_at | TIMESTAMP | |
| is_applied | BOOLEAN | |
| applied_at | TIMESTAMP | |
| notes | TEXT | |

### 2.5 Configuracion Contable

#### `ph_accounting_config` — Cuentas Contables por Copropiedad
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| condominium_id | FK | |
| company_id | FK | |
| cxc_pivot_account_id | FK → chart_of_accounts | Cuenta puente CxC |
| income_pivot_account_id | FK → chart_of_accounts | Cuenta puente ingresos |
| income_account_id | FK → chart_of_accounts | Cuenta de ingresos real |
| interest_income_account_id | FK → chart_of_accounts | Ingresos por intereses |
| discount_expense_account_id | FK → chart_of_accounts | Gasto por descuentos |
| surcharge_income_account_id | FK → chart_of_accounts | Ingresos por recargos |
| prepayment_account_id | FK → chart_of_accounts | Anticipos |
| bank_account_id | FK → bank_accounts | Cuenta bancaria |

### 2.6 Zonas Comunes y Reservas

#### `ph_common_areas` — Zonas Comunes
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| condominium_id | FK | |
| name | VARCHAR | Salon comunal, BBQ, Piscina, Gym |
| description | TEXT | |
| capacity | INT | Capacidad |
| rental_fee | DECIMAL | Tarifa de alquiler |
| requires_deposit | BOOLEAN | Requiere deposito |
| deposit_amount | DECIMAL | Monto deposito |
| requires_approval | BOOLEAN | Requiere aprobacion del admin |
| min_hours | INT | Minimo de horas |
| max_hours | INT | Maximo de horas |
| available_from | TIME | Hora inicio disponibilidad |
| available_to | TIME | Hora fin disponibilidad |
| available_days | INT[] | Dias de la semana [0-6] |
| is_active | BOOLEAN | |

#### `ph_common_area_reservations` — Reservas
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| common_area_id | FK | |
| unit_id | FK → ph_units | |
| tercero_id | FK → terceros | |
| resident_id | FK → ph_unit_residents | |
| reservation_date | DATE | |
| start_time | TIME | |
| end_time | TIME | |
| status | ENUM | 'pending', 'confirmed', 'cancelled', 'completed' |
| total_fee | DECIMAL | |
| deposit_paid | BOOLEAN | |
| notes | TEXT | |
| cancelled_at | TIMESTAMP | |
| cancelled_by | FK | |
| cancellation_reason | TEXT | |
| confirmed_at | TIMESTAMP | |
| confirmed_by | FK | |

### 2.7 Alquileres entre Unidades

#### `ph_unit_rentals` — Alquileres
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| unit_id | FK → ph_units | Unidad alquilada (ej: parqueadero) |
| renter_unit_id | FK → ph_units | Unidad que alquila (ej: apto 302) |
| condominium_id | FK | |
| start_time | TIMESTAMP | |
| end_time | TIMESTAMP | |
| total_minutes | INT | Tiempo total |
| billable_minutes | INT | Minutos facturables (despues de free_minutes) |
| amount | DECIMAL | Monto a cobrar |
| fee_id | FK → ph_fees | Cuota generada (si aplica) |
| status | ENUM | 'active', 'completed', 'cancelled' |
| notes | TEXT | |

### 2.8 Comprobantes de Pago

#### `ph_payment_vouchers` — Comprobantes
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | |
| company_id | FK | |
| condominium_id | FK | |
| tercero_id | FK → terceros | |
| consecutive | INT | Numero consecutivo |
| file_url | VARCHAR | URL del archivo |
| file_name | VARCHAR | |
| file_type | VARCHAR | |
| file_size | INT | |
| amount | DECIMAL | |
| payment_date | DATE | |
| bank_reference | VARCHAR | |
| status | ENUM | 'pending', 'approved', 'rejected' |
| reviewed_by | FK | |
| reviewed_at | TIMESTAMP | |
| review_comment | TEXT | |
| payment_receipt_id | FK | Recibo generado al aprobar |

---

## 3. Funciones de Base de Datos (RPC)

### `ph_generate_fees_for_period(period_id, units[], concepts[])`
- Genera cuotas masivas para un periodo
- Calcula montos segun tipo: fijo, por m2, por coeficiente
- Asigna residente primario como responsable
- v2 soporta seleccion selectiva de unidades/conceptos

### `ph_check_area_availability(area_id, date, start_time, end_time)`
- Valida disponibilidad de zona comun
- Previene doble reserva
- Verifica horarios y dias habiles

### `ph_calculate_fee_adjustment(fee_id, config_type, calculation_date)`
- Calcula intereses/descuentos/recargos
- Soporta calculo diario, mensual, anual
- Aplica limites y reglas de interes compuesto
- Retorna: config_id, nombre, monto_base, monto_ajuste, dias_trigger

### `ph_apply_overdue_adjustments()`
- Aplica ajustes calculados a las cuotas
- Crea registros de fee tipo 'interest'/'surcharge'
- Registra auditoria en ph_fee_adjustments
- Actualiza status de fees a 'overdue'

### `get_ph_fee_payment_data(fee_id)`
- Obtiene datos completos de una cuota para pago
- Incluye ajustes pendientes, descuentos aplicables

---

## 4. Paginas del Frontend — Detalle

### 4.1 PHDashboard (Dashboard)
**Archivo:** `pages/dashboard/ph/PHDashboard.jsx` (19KB)

- **KPIs:** Copropiedades, Unidades, Residentes, Cuotas pendientes, Saldo total
- **Financiero anual:** Total facturado, Pagado, Pendiente, Vencido, Tasa de recaudo
- **Actividad reciente:** Comprobantes pendientes, Reservas pendientes, Pagos recientes
- **Lista de copropiedades** con conteo de unidades

### 4.2 Condominiums (Copropiedades)
**Archivo:** `pages/dashboard/ph/Condominiums.jsx` (6.6KB)

- **CRUD** de copropiedades (crear, editar, desactivar)
- **Tabla** con NIT, direccion, ciudad, telefono, empresa administradora
- **Modales:** CreateCondominiumModal, TowersModal (gestionar torres), ImportPHModal
- **Acciones por fila:** Editar, Gestionar torres, Desactivar

### 4.3 Units (Unidades)
**Archivo:** `pages/dashboard/ph/Units.jsx` (8.7KB)

- **CRUD** de unidades (crear, editar, desactivar)
- **Filtro** por copropiedad
- **Tabla:** Numero, tipo, torre, piso, area m2, coeficiente, unidad padre
- **Modales:** CreateUnitModal, UnitStatementModal, ImportPHModal
- **Acciones:** Ver estado de cuenta, Editar, Desactivar

### 4.4 Residents (Copropietarios)
**Archivo:** `pages/dashboard/ph/Residents.jsx` (13KB)

- **CRUD** de residentes con tipo (propietario/arrendatario)
- **Filtro** por copropiedad
- **Vinculacion** con usuario del sistema (para acceso al portal)
- **Envio** de estados de cuenta por email (integracion Django)
- **Modales:** CreateResidentModal, ResidentStatementModal, ImportPHModal
- **Acciones:** Ver estado de cuenta, Enviar por email, Editar, Desactivar/Reactivar

### 4.5 Billing (Facturacion) — LA MAS COMPLEJA
**Archivo:** `pages/dashboard/ph/Billing.jsx` (39KB)

**4 Pestanas:**

**Tab 1 — Periodos:**
- Crear periodos mensuales por copropiedad
- Status: borrador → generado → cerrado
- Acciones: Generar cuotas, Ver cuotas, Editar, Cerrar periodo

**Tab 2 — Cuotas (Fees):**
- Tabla con todas las cuotas generadas
- Columnas: Unidad, Residente, Concepto, Periodo, Monto, Saldo, Vencimiento, Estado
- Registrar pago individual
- Exportar PDF individual (jsPDF + autoTable)
- Editar monto, Eliminar

**Tab 3 — Cartera (Dashboard):**
- PHBillingDashboard component
- Resumen: unidades al dia, pendientes, vencidas
- Saldos totales pendientes y vencidos
- Filtro por torre, estado, busqueda
- Exportar Excel/PDF

**Tab 4 — Configuracion:**
- Intereses de mora (compuesto/simple, diario/mensual/anual)
- Descuentos por pronto pago
- Recargos
- Periodo de gracia (trigger_days)
- Aplicacion selectiva o general a conceptos

**Modales clave:**
- CreateBillingPeriodModal
- GenerateFeesModal (la mas compleja — seleccion de unidades/conceptos, calculo por m2 o fijo, validacion contable)
- CreateBillingConfigModal
- PaymentReceiptForm (registro de pago)

### 4.6 CommonAreas (Zonas Comunes)
**Archivo:** `pages/dashboard/ph/CommonAreas.jsx` (55KB — la mas grande)

**3 Vistas:**

**Vista 1 — Areas:**
- CRUD de zonas comunes
- Capacidad, tarifa, horarios, dias, deposito, aprobacion

**Vista 2 — Reservas:**
- Lista con filtros (pendientes/confirmadas/canceladas/completadas)
- Acciones: Confirmar, Rechazar, Completar, Cancelar, Reactivar

**Vista 3 — Calendario:**
- `react-big-calendar` con vista mes/semana/dia
- Eventos coloreados por estado
- Click en slot → crear reserva
- Click en evento → ver detalle
- Sidebar con reservas proximas

**Modales:**
- CreateCommonAreaModal
- CreateReservationModal (con verificacion de disponibilidad RPC)

### 4.7 Vehicles (Vehiculos)
**Archivo:** `pages/dashboard/ph/Vehicles.jsx` (8.4KB)

- **CRUD** de vehiculos por unidad
- **Filtro** por copropiedad
- **Tabla:** Placa, tipo, marca, modelo, color, parqueadero, sticker
- **Iconos** por tipo de vehiculo
- Import masivo

### 4.8 Rentals (Alquileres)
**Archivo:** `pages/dashboard/ph/Rentals.jsx` (12KB)

- **Flujo:** Check-in → Check-out
- **Check-in:** Seleccionar unidad rentable y unidad rentista
- **Check-out:** Calcula tiempo, minutos facturables (restando free_minutes), monto
- **Genera cuota** automatica si monto > 0 y fee_concept_id configurado
- **Tabla:** Unidad, Rentista, Inicio, Fin, Minutos, Monto, Estado
- **Acciones:** Registrar salida, Editar, Cancelar

### 4.9 PHAccounting (Contabilidad)
**Archivo:** `pages/dashboard/ph/PHAccounting.jsx` (26KB)

- **Selector** de copropiedad + rango de fechas
- **KPIs:** Total facturado, Pagado, Pendiente, Vencido, Tasa de recaudo
- **Cartera por edades:** Corriente, 1-30, 31-60, 61-90, 90+ dias
- **Top 10 deudores** con monto y unidad
- **Tendencia mensual** (ultimos 6 meses)
- **Pagos recientes** con detalle
- Solo lectura (dashboard de reportes)

### 4.10 Settings (Configuracion)
**Archivo:** `pages/dashboard/ph/Settings.jsx` (28KB)

**3 Pestanas:**

**Tab 1 — Tipos de Unidad:**
- CRUD: codigo, nombre, descripcion
- Config de alquiler: is_rentable, free_minutes, rental_fee, fee_concept

**Tab 2 — Conceptos de Cobro:**
- CRUD: codigo, nombre, monto default, tipo calculo, es recurrente
- Vinculo con cuenta contable de ingreso

**Tab 3 — Configuracion Contable:**
- Por copropiedad: mapeo de 8 cuentas contables
- Cuenta CxC puente, Ingreso puente, Ingreso real
- Intereses, Descuentos, Recargos, Anticipos
- Cuenta bancaria
- Validacion: todas requeridas para generar cuotas

---

## 5. Componentes Reutilizables (22 archivos)

| Componente | Proposito |
|-----------|-----------|
| CreateCondominiumModal | Crear/editar copropiedad |
| CreateUnitModal | Crear/editar unidad |
| CreateUnitTypeModal | Crear/editar tipo de unidad (con config rental) |
| CreateResidentModal | Asignar residente a unidad (con vinculacion usuario) |
| CreateVehicleModal | Registrar vehiculo |
| CreateFeeConceptModal | Crear/editar concepto de cobro |
| CreateBillingPeriodModal | Crear periodo de facturacion |
| CreateBillingConfigModal | Config intereses/descuentos/recargos |
| CreateCommonAreaModal | Crear/editar zona comun |
| CreateReservationModal | Crear reserva (con check de disponibilidad) |
| CreateRentalModal | Registrar alquiler entre unidades |
| GenerateFeesModal | Generar cuotas masivas (la mas compleja) |
| ImportPHModal | Importar desde Excel (condominios, unidades, residentes, vehiculos) |
| TowersModal | Gestionar torres de una copropiedad |
| PHBillingDashboard | Dashboard de cartera (exporta Excel/PDF) |
| ResidentStatementModal | Estado de cuenta por residente |
| UnitStatementModal | Estado de cuenta por unidad |
| UploadVoucherModal | Subir comprobante de pago |
| VoucherDetailModal | Ver detalle de comprobante |
| VoucherReviewModal | Aprobar/rechazar comprobante |
| EpaycoPaymentModal | Pago online (ePayco, Bold, Wompi) |
| PaymentReceiptForm | Registrar recibo de pago manual |

---

## 6. Integraciones con Otros Modulos

| Modulo | Integracion |
|--------|-------------|
| **Terceros** | Identidad de propietarios/arrendatarios (nombre, email, NIT, etc.) |
| **Plan de Cuentas** | Todas las cuentas contables (ingresos, gastos, CxC, bancos) |
| **CxC (AR)** | Genera documentos de cuentas por cobrar (ar_document_id en fees) |
| **Asientos Contables** | Genera journal entries al facturar/cobrar |
| **Recibos de Pago** | PaymentReceipt al aprobar comprobantes |
| **Cuentas Bancarias** | Para pagos y conciliacion |
| **Pasarelas de Pago** | ePayco, Bold, Wompi |
| **Companies** | Multi-tenancy, modulo habilitado por plan |

---

## 7. Flujos Principales

### 7.1 Flujo de Facturacion Mensual
```
1. Crear periodo de facturacion (mes/año, fecha vencimiento)
2. Seleccionar conceptos de cobro y unidades
3. Generar cuotas masivamente (RPC: ph_generate_fees_for_period)
   - Calcula montos: fijo, por m2, por coeficiente
   - Asigna residente primario como responsable
   - Valida configuracion contable (REQUERIDA)
4. Cuotas en estado "pending"
5. Si pasa fecha vencimiento + trigger_days:
   - Aplica intereses de mora (RPC: ph_apply_overdue_adjustments)
   - Cambia status a "overdue"
6. Si paga antes de trigger_days (descuento):
   - Aplica descuento por pronto pago
7. Registrar pago → status "paid" o "partial"
8. Cerrar periodo
```

### 7.2 Flujo de Pago
```
Opcion A — Online:
  1. Residente abre portal
  2. Selecciona cuotas pendientes
  3. Paga via ePayco/Bold/Wompi
  4. Confirmacion automatica

Opcion B — Comprobante:
  1. Residente paga en banco
  2. Sube comprobante (foto/PDF)
  3. Admin revisa comprobante
  4. Aprueba → genera recibo de pago
  5. Saldo actualizado

Opcion C — Manual:
  1. Admin registra pago directamente (PaymentReceiptForm)
```

### 7.3 Flujo de Reserva de Zona Comun
```
1. Residente selecciona zona comun
2. Selecciona fecha y hora
3. Sistema verifica disponibilidad (RPC: ph_check_area_availability)
4. Si requires_approval: reserva queda en "pending"
   - Admin confirma/rechaza
5. Si no requires_approval: reserva en "confirmed" directo
6. Dia del evento → admin marca "completed"
```

### 7.4 Flujo de Alquiler entre Unidades
```
1. Check-in: seleccionar unidad rentable + unidad rentista
2. Registra hora de inicio
3. Check-out: registra hora de fin
4. Calcula: total_minutes - free_minutes = billable_minutes
5. Calcula monto segun fee_type (fijo, por hora, por dia)
6. Si monto > 0 y hay fee_concept_id → genera cuota automatica en ph_fees
```

---

## 8. Migraciones SQL

| Archivo | Contenido |
|---------|-----------|
| `20250205_create_ph_module.sql` | Tablas core: condominiums, towers, units, residents, fee_concepts, billing_periods, fees, accounting_config. RPCs: generate_fees, check_availability |
| `20251206_ph_common_areas_vehicles.sql` | Tablas: common_areas, reservations, vehicles. RPC: check_area_availability |
| `20251209_ph_billing_config.sql` | Tablas: billing_config, billing_config_concepts, fee_adjustments. RPCs: calculate_adjustment, apply_overdue |
| `20251210_ph_accounting_prep.sql` | Tabla: accounting_config ampliada. RPC: generate_fees_v2 |
| `20260107_bold_ph_support.sql` | Soporte Bold: tercero_id y payment_link_id en bold_transactions |
| `20260109_ph_condominiums_price_m2.sql` | Campo price_per_m2 en condominiums |
| `20260109_ph_unit_rentals.sql` | Tabla: unit_rentals completa |
| `20260109_ph_units_parent_unit.sql` | Campo parent_unit_id en units (self-reference) |
| `20260120_ph_common_areas_requires_approval.sql` | Campo requires_approval en common_areas |
| `20260123_ph_fee_concepts_calculation_type.sql` | Campo calculation_type en fee_concepts |

---

## 9. Dependencias Externas

| Libreria | Uso |
|----------|-----|
| `react-big-calendar` | Calendario de reservas (CommonAreas) |
| `jsPDF` + `jspdf-autotable` | Exportar PDF (cuotas, cartera) |
| `xlsx` + `file-saver` | Importar/Exportar Excel |
| `date-fns` | Manejo de fechas |
| `lucide-react` | Iconos |
| Supabase Client | Queries directas + RPCs |

---

## 10. Consideraciones para Migracion

### Backend (NestJS ph-service)
- **18 tablas** a crear con TypeORM/Prisma
- **4 RPCs** a migrar como servicios NestJS
- **Modulos sugeridos:**
  - `condominiums/` — CRUD copropiedades + torres
  - `units/` — CRUD unidades + tipos
  - `residents/` — CRUD residentes + vinculacion usuario
  - `billing/` — Periodos, cuotas, generacion masiva, ajustes
  - `billing-config/` — Intereses, descuentos, recargos
  - `common-areas/` — Zonas + reservas + disponibilidad
  - `vehicles/` — CRUD vehiculos
  - `rentals/` — Alquileres entre unidades
  - `accounting/` — Config contable + reportes
  - `vouchers/` — Comprobantes de pago + flujo aprobacion
  - `settings/` — Tipos de unidad, conceptos de cobro

### Frontend (Next.js)
- **10 paginas** en `app/dashboard/ph/`
- **22+ componentes** en `modules/ph/components/`
- **Hooks:** usePHCondominiums, usePHUnits, usePHResidents, usePHBilling, etc.
- **Servicios API:** phService con todos los endpoints

### Prioridad de Migracion Sugerida
1. **Fase 1:** Estructura base — Copropiedades, Torres, Tipos de unidad, Unidades
2. **Fase 2:** Residentes — CRUD + vinculacion con terceros
3. **Fase 3:** Facturacion core — Conceptos, Periodos, Generacion de cuotas
4. **Fase 4:** Facturacion avanzada — Intereses, descuentos, recargos, ajustes
5. **Fase 5:** Zonas comunes — Areas + reservas + calendario
6. **Fase 6:** Vehiculos + Alquileres
7. **Fase 7:** Contabilidad — Config contable + reportes + CxC
8. **Fase 8:** Pagos — Comprobantes + pasarelas online
9. **Fase 9:** Dashboard + Estados de cuenta + Emails
10. **Fase 10:** Importacion masiva Excel

---

**Total estimado:**
- Backend: ~60-80 endpoints REST
- Frontend: 10 paginas + 22 componentes + 10 hooks + servicios
- BD: 18 tablas + 4 funciones/procedures
