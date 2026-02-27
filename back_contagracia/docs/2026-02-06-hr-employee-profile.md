# HR Module - EmployeeProfile, Contracts & Salary History

**Fecha:** 2026-02-06

## Resumen

Reestructuración del módulo HR para separar datos de empleado de ThirdParty. Se crearon 3 nuevas tablas: `EmployeeProfile` (1:1 con ThirdParty), `EmployeeContract` (historial de contratos), y `SalaryHistory` (historial de salarios). Se agregaron 17 endpoints con permisos granulares.

## Arquitectura de Datos

```
ThirdParty (identidad genérica)
  ├── name, identification_number, dv, email, phone, address
  ├── roles: ['EMPLOYEE', 'CLIENT', ...]
  └── first_name, second_name, first_surname, second_surname

EmployeeProfile (datos HR específicos, 1:1 con ThirdParty)
  ├── hire_date, employee_status, employee_role
  ├── eps_id, pension_fund_id, arl_id, ...
  ├── bank_name, bank_account_type, bank_account_number
  ├── director_id, cost_center_id, is_administrative
  └── current_contract_id, current_salary_id

EmployeeContract (historial de contratos, N:1 con EmployeeProfile)
  ├── contract_type_id, worker_type_id, worker_subtype_id
  ├── start_date, end_date
  └── is_current, termination_reason, observations

SalaryHistory (historial de salarios, N:1 con EmployeeProfile)
  ├── salary, basic_salary, transportation_allowance
  ├── effective_date, end_date
  └── is_current, reason
```

### Patrón de "registro actual"

`EmployeeProfile` tiene dos FK únicas:
- `current_contract_id` -> apunta al contrato vigente
- `current_salary_id` -> apunta al salario vigente

Cuando se crea un nuevo contrato o se cambia el salario, el registro anterior se cierra (`is_current = false`, `end_date = fecha`) y se actualiza la referencia en el perfil.

## Tablas Prisma

### `employee_profiles`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | |
| third_party_id | UUID unique | FK a ThirdParty (1:1) |
| employee_code | String? | Código interno EMP-001 |
| hire_date | DateTime | Fecha de contratación |
| employee_status | EmployeeStatus | ACTIVE, INACTIVE, ON_LEAVE, TERMINATED |
| employee_role | EmployeeRole? | SALES_ADVISOR, SALES_DIRECTOR, ADMINISTRATIVE, MANAGER, OTHER |
| is_administrative | Boolean | Default false |
| commission_rate | Decimal(8,4)? | Tasa de comisión |
| director_id | String? | FK a ThirdParty (jefe directo) |
| cost_center_id | String? | FK a CostCenter |
| payment_method_id | String? | FK a PaymentMethod |
| eps_id, pension_fund_id, arl_id, arl_risk_class_id, compensation_fund_id, severance_fund_id | String? | FKs seguridad social |
| bank_name, bank_account_type, bank_account_number | String? | Datos bancarios |
| current_contract_id | String? unique | FK al contrato vigente |
| current_salary_id | String? unique | FK al salario vigente |

### `employee_contracts`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | |
| employee_profile_id | UUID | FK a EmployeeProfile |
| contract_number | String? | Número de contrato CTR-001 |
| contract_type_id | String? | FK a TypeContract |
| worker_type_id | String? | FK a TypeWorker |
| worker_subtype_id | String? | FK a SubTypeWorker |
| start_date | Date | Fecha inicio |
| end_date | Date? | Fecha fin (null = indefinido) |
| is_current | Boolean | Si es el contrato vigente |
| termination_reason | String? | Motivo de terminación |
| observations | String? | Notas |

### `salary_history`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | |
| employee_profile_id | UUID | FK a EmployeeProfile |
| salary | Decimal(15,4) | Salario total mensual |
| basic_salary | Decimal(15,4)? | Salario básico |
| transportation_allowance | Decimal(15,4)? | Auxilio de transporte |
| variable_salary | Decimal(15,4)? | Componente variable |
| fixed_fees | Decimal(15,4)? | Honorarios fijos |
| effective_date | Date | Desde cuándo aplica |
| end_date | Date? | Hasta cuándo aplicó (null = vigente) |
| is_current | Boolean | Si es el salario vigente |
| reason | String? | "Ingreso", "Aumento anual", "Promoción" |

## Endpoints (17 total)

### CRUD Empleados

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | /employees | `employees.view` | Listar con filtros y paginación |
| GET | /employees/stats | `employees.view` | Estadísticas |
| GET | /employees/exists/:idNumber | `employees.view` | Verificar existencia por cédula |
| GET | /employees/:id | `employees.view_detail` | Detalle completo |
| POST | /employees | `employees.create` | Crear (ThirdParty + Profile + Contract + Salary) |
| PATCH | /employees/:id | `employees.edit` | Actualizar datos |
| PATCH | /employees/:id/activate | `employees.activate` | Activar |
| PATCH | /employees/:id/deactivate | `employees.deactivate` | Desactivar |
| PATCH | /employees/:id/terminate | `employees.terminate` | Retirar (cierra contrato + salario) |
| DELETE | /employees/:id | `employees.delete` | Eliminar rol EMPLOYEE |

### Contratos

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | /employees/:id/contracts | `employees.contracts.view` | Historial de contratos |
| POST | /employees/:id/contracts | `employees.contracts.create` | Nuevo contrato (cierra anterior) |
| PATCH | /employees/:id/contracts/:cid | `employees.contracts.edit` | Editar contrato |
| POST | /employees/:id/contracts/:cid/renew | `employees.contracts.renew` | Renovar contrato |

### Salario

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | /employees/:id/salary | `employees.salary.view` | Salario actual |
| GET | /employees/:id/salary/history | `employees.salary.view` | Historial de salarios |
| PATCH | /employees/:id/salary | `employees.salary.edit` | Cambiar salario (crea registro) |

### Paramétricas (social-security)

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | /social-security/cost-centers | `employees.view` |

(Los demás endpoints de social-security ya existían)

## Flujo de Creación de Empleado

```
POST /employees
  1. Buscar ThirdParty por identification_number
  2. Si existe y ya es EMPLOYEE → Error 409
  3. Si existe pero no es EMPLOYEE → Agregar rol EMPLOYEE + actualizar datos
  4. Si no existe → Crear ThirdParty con rol EMPLOYEE
  5. Crear EmployeeProfile (1:1 con ThirdParty)
  6. Crear EmployeeContract (contrato inicial, is_current=true)
  7. Crear SalaryHistory (salario inicial, is_current=true)
  8. Actualizar Profile con current_contract_id y current_salary_id
  9. Retornar Profile con todas las relaciones incluidas
```

## Flujo de Terminación

```
PATCH /employees/:id/terminate
  1. Cerrar contrato actual (is_current=false, end_date=fecha)
  2. Cerrar salario actual (is_current=false, end_date=fecha)
  3. Actualizar perfil: employee_status=TERMINATED, limpiar current_contract_id y current_salary_id
```

## Flujo de Cambio de Salario

```
PATCH /employees/:id/salary
  1. Cerrar salario anterior (is_current=false, end_date=effective_date)
  2. Crear nuevo SalaryHistory (is_current=true, effective_date, reason)
  3. Actualizar Profile.current_salary_id
```

## Permisos (core_hr.ts)

Los 18 permisos existentes en `prisma/seeds/modules/actions/core_hr.ts` cubren todos los endpoints:

```
employees.view              employees.view_detail
employees.create            employees.edit
employees.delete            employees.activate
employees.deactivate        employees.terminate
employees.contracts.view    employees.contracts.create
employees.contracts.edit    employees.contracts.renew
employees.salary.view       employees.salary.edit
employees.import            employees.export
employees.invite            employees.portal.generate
```

No se necesitaron cambios en la seed de permisos.

## Archivos Modificados

### Schema
- `contagracia-shared-modules/prisma/schema-tenant.prisma` — +3 modelos, +relaciones inversas

### Backend (hr-service)
- `dto/create-employee.dto.ts` — Reestructurado con secciones ThirdParty/Profile/Contrato/Salario
- `dto/update-employee.dto.ts` — Actualizado, omite campos de contrato/salario, +TerminateEmployeeDto
- `dto/query-employees.dto.ts` — +cost_center_id, +employee_role
- `dto/create-contract.dto.ts` — **NUEVO** DTO para crear/renovar contratos
- `dto/update-salary.dto.ts` — **NUEVO** DTO con reason y effective_date
- `dto/index.ts` — Exporta todos los DTOs
- `employees.service.ts` — Reescrito para EmployeeProfile + transacciones
- `employees.controller.ts` — 17 endpoints con permisos granulares
- `social-security-entities.service.ts` — +findAllCostCenters
- `social-security-entities.controller.ts` — +GET /social-security/cost-centers

### Frontend
- `modules/hr/types/index.ts` — +EmployeeContract, +SalaryRecord, Employee reestructurado
- `modules/hr/services/employees.service.ts` — +contracts, +salary, +exists API methods

## Notas

- `transportation_allowance`: El frontend envía `boolean`, el backend deberia convertirlo a monto usando CompanySettings (marcado con TODO en el service).
- Los campos de empleado en ThirdParty (hire_date, salary, etc.) siguen existiendo pero ya NO se usan. Los nuevos flujos escriben en EmployeeProfile/EmployeeContract/SalaryHistory.
- El ID de empleado ahora es el ID del `EmployeeProfile`, no el del `ThirdParty`.
