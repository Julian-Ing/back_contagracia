# Plan Unico de Cuentas (PUC)

## Descripcion General

El sistema implementa el Plan Unico de Cuentas (PUC) colombiano con cuentas de hasta 8 digitos organizadas jerarquicamente.

## Estructura Jerarquica

```
1 digito  -> Clase (ej: 5 Gasto)
2 digitos -> Grupo (ej: 51 Administrativos)
4 digitos -> Cuenta (ej: 5105 Gastos de personal)
6 digitos -> Subcuenta (ej: 510505 Gastos de personal)
8 digitos -> Auxiliar (ej: 51050501 Salarios)
```

## Clases Principales

| Codigo | Nombre | Tipo |
|--------|--------|------|
| 1 | Activo | ASSET |
| 2 | Pasivo | LIABILITY |
| 3 | Patrimonio | EQUITY |
| 4 | Ingresos | INCOME |
| 5 | Gasto | EXPENSE |
| 6 | Costos de venta | COST |
| 7 | Costos de Produccion | PRODUCTION_COST |
| 8 | Cuentas de Orden Deudoras | DEBTOR_ACCOUNTS |
| 9 | Cuentas de Orden Acreedoras | CREDITOR_ACCOUNTS |

## Cuentas de Nomina (Clase 5)

### Estructura 51 vs 52

La clase 5 (Gastos) se divide en:

- **51 - Administrativos**: Gastos de personal operativo
- **52 - Gastos no Administrativos**: Gastos de personal administrativo
- **53 - Gastos no operacionales**: Gastos financieros (NO para nomina)

### Grupos de Nomina

| Codigo 51 | Codigo 52 | Nombre |
|-----------|-----------|--------|
| 5105 | 5205 | Gastos de personal |
| 5125 | 5225 | Contribuciones y afiliaciones |
| 5130 | 5230 | Seguros |
| 5199 | 5299 | Otros gastos |

### Cuentas 51 (Operativo)

| Codigo | Nombre |
|--------|--------|
| 510505 | Gastos de personal |
| 510514 | Bonos EPCTV |
| 510517 | Anticipos |
| 510529 | Recargos dominicales/festivos |
| 510574 | Auxilio Alimentacion |
| 510576 | Bonificaciones |
| 510582 | Compensaciones |
| 510587 | Vacaciones compensadas |
| 510589 | Licencias remuneradas |
| 510593 | Licencias no remuneradas |
| 510597 | Licencia de maternidad |
| 510599 | Huelga legal |
| 510600 | Cesantias |
| 512545 | SENA |
| 512560 | Aporte Salud |
| 512570 | Bonificacion de retiro |
| 512575 | Teletrabajo |
| 512580 | Aporte Pension |
| 512590 | Horas extras diurnas |
| 513005 | ARL |
| 513025 | Comisiones |
| 513030 | Auxilios |
| 513040 | Dotacion |
| 513045 | Horas extras nocturnas |
| 513050 | Caja de Compensacion |
| 513060 | Prima de Servicios |
| 513065 | Auxilio de transporte |
| 513075 | Incapacidades |
| 519900 | Otros devengos |
| 519920 | Provision Vacaciones - Operativo |
| 519930 | Provision Cesantias - Operativo |
| 519940 | Provision Prima - Operativo |
| 519950 | Provision Int. Cesantias - Operativo |

### Cuentas 52 (Administrativo)

Todas las cuentas 52 tienen el sufijo "- Administrativo":

| Codigo | Nombre |
|--------|--------|
| 520505 | Gastos de personal - Administrativo |
| 520514 | Bonos EPCTV - Administrativo |
| 520517 | Anticipos - Administrativo |
| 520529 | Recargos dominicales/festivos - Administrativo |
| ... | (equivalentes a las 51) |
| 529920 | Provision Vacaciones - Administrativo |
| 529930 | Provision Cesantias - Administrativo |
| 529940 | Provision Prima - Administrativo |
| 529950 | Provision Int. Cesantias - Administrativo |

## Cuentas de Pasivo para Nomina (Clase 2)

### Salarios y Aportes (23xx, 25xx)

| Codigo | Nombre |
|--------|--------|
| 250505 | Salarios por pagar |
| 236555 | Retencion en la fuente por pagar |
| 237035 | Aportes de salud por pagar |
| 237040 | Aportes de pension por pagar |
| 237045 | ICBF por pagar |
| 237050 | SENA por pagar |
| 237055 | ARL por pagar |
| 237060 | CCF por pagar |

### Acreedores Varios (238x)

| Codigo | Nombre |
|--------|--------|
| 238001 | Anticipos por cobrar |
| 238004 | Sanciones por pagar |
| 238020 | Pension voluntaria por pagar |
| 238040 | AFC por pagar |
| 238050 | Libranzas por pagar |
| 238060 | Cuotas sindicales por pagar |
| 238065 | Cooperativas por pagar |
| 238070 | Gravamenes por pagar |
| 238075 | Plan complementario por pagar |
| 238080 | Educacion por pagar |
| 238085 | Deudas del empleado por pagar |
| 238090 | Pagos a terceros por pagar |
| 238098 | Reintegros por pagar |
| 238099 | Otras deducciones por pagar |

### Provisiones (27xx)

| Codigo | Nombre |
|--------|--------|
| 270505 | Provision Cesantias |
| 270515 | Provision Vacaciones |
| 279999 | Otras provisiones |

## Cuentas Financieras (53xx)

Las cuentas 53 se usan SOLO para gastos financieros, NO para nomina:

| Codigo | Nombre | Uso |
|--------|--------|-----|
| 530506 | Gastos bancarios | bankAdjustmentTypes |
| 530515 | Comisiones bancarias | bankAdjustmentTypes |
| 530520 | Intereses | bankAdjustmentTypes |
| 530525 | Diferencia en cambio | bankAdjustmentTypes |
| 530535 | Descuentos comerciales | bankAdjustmentTypes |
| 530540 | Gastos tarjetas | bankAdjustmentTypes |
| 530545 | GMF (4x1000) | bankAdjustmentTypes |
| 530555 | Chequeras | bankAdjustmentTypes |
| 530560 | Multas y sanciones | bankAdjustmentTypes |

## Archivos Relacionados

- `prisma/seeds/seed-puc.ts` - Seeder principal de cuentas
- `prisma/seeds/bankAdjustmentTypes.ts` - Tipos de ajuste bancario
- `prisma/seeds/seed-accounting-config.ts` - Configuraciones contables

## Reglas Importantes

1. **Provisiones**: SIEMPRE en 51/52, NUNCA en 53
2. **Administrativo**: SIEMPRE en 52 con sufijo "- Administrativo"
3. **Operativo**: SIEMPRE en 51, sin sufijo o con "- Operativo"
4. **Financieros**: SOLO 53 para gastos bancarios/financieros
5. **6 digitos**: Todas las cuentas de nomina son de 6 digitos
