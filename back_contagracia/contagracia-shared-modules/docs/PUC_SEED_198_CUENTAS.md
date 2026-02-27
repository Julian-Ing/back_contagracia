# Seed PUC - 198 Cuentas Base

## Descripcion

Seed del Plan Unico de Cuentas (PUC) de Colombia con 198 cuentas base para el sistema contable.

## Estructura

### Clases PUC (9 cuentas raiz)

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

### Niveles de Cuentas

- **Nivel 1** (1 digito): 9 clases
- **Nivel 2** (2 digitos): 18 grupos
- **Nivel 4** (4 digitos): 34 cuentas
- **Nivel 6** (6 digitos): 108 subcuentas
- **Nivel 8** (8 digitos): 29 auxiliares

**Total: 198 cuentas**

### Activos Fijos (PPE)

| Codigo | Nombre |
|--------|--------|
| 15 | Propiedad, Planta y Equipo |
| 1520 | Maquinaria y equipo |
| 152005 | Maquinaria y equipo de oficina |
| 1592 | Depreciacion acumulada |
| 159205 | Depreciacion acumulada de maquinaria y equipo |
| 5160 | Depreciacion |
| 516005 | Depreciacion de maquinaria y equipo |

### Categorias de Gasto (519901-519916)

16 cuentas hijas de 5199 (Otros gastos) para categorizar gastos personales/empresariales:

| Codigo | Nombre |
|--------|--------|
| 519901 | Alimentos y bebidas |
| 519902 | Arriendo o vivienda |
| 519903 | Servicios publicos |
| 519904 | Transporte |
| 519905 | Salud |
| 519906 | Educacion |
| 519907 | Recreacion y cultura |
| 519908 | Comunicaciones |
| 519909 | Vestido y calzado |
| 519910 | Restaurantes y comidas fuera |
| 519911 | Muebles y mantenimiento del hogar |
| 519912 | Cuidado personal |
| 519913 | Seguros |
| 519914 | Impuestos |
| 519915 | Honorarios profesionales |
| 519916 | Contribuciones y afiliaciones |

## Ejecucion

```bash
cd contagracia-shared-modules
npx ts-node prisma/seeds/seed-puc.ts
```

## Archivo

```
contagracia-shared-modules/prisma/seeds/seed-puc.ts
```
