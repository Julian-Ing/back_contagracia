# Vista de Desarrollo - Contabilidad

## Ubicacion

```
/dev/accounting
```

## Descripcion

Pagina de desarrollo para visualizar el Plan Unico de Cuentas (PUC) y las configuraciones contables almacenadas en la base de datos master.

## Caracteristicas

### Tab: PUC
Vista en arbol de las cuentas contables mostrando:
- Codigo (verde)
- Nombre
- Tipo con badge de color segun clase
- Expansion/colapso de niveles

### Tab: AccountingConfig
Tabla con las configuraciones contables mostrando:
- Key (identificador)
- Descripcion
- Default (para simples) o Default Debito/Credito (para nomina)
- Cuenta asignada o Cuenta Debito
- Cuenta Credito (solo para nomina)

### Tab: Vista Plana
Lista plana de todas las cuentas PUC sin jerarquia.

## Colores por Tipo de Cuenta

| Tipo | Color |
|------|-------|
| ASSET | Azul |
| LIABILITY | Rojo |
| EQUITY | Morado |
| INCOME | Verde |
| EXPENSE | Naranja |
| COST | Ambar |
| PRODUCTION_COST | Amarillo |
| DEBTOR_ACCOUNTS | Cyan |
| CREDITOR_ACCOUNTS | Rosa |

## Estructura de Datos

### AccountingConfigItem

```typescript
interface AccountingConfigItem {
  key: string;
  description: string;
  default: string | null;           // Para configs simples
  default_debit: string | null;     // Para nomina
  default_credit: string | null;    // Para nomina
  account: Account | null;          // Cuenta asignada (simples)
  debit_account: Account | null;    // Cuenta debito (nomina)
  credit_account: Account | null;   // Cuenta credito (nomina)
}
```

## API

Consume endpoints de company-service:
- `GET http://localhost:3003/_internal/puc`
- `GET http://localhost:3003/_internal/accounting-config`

## Archivo

```
src/app/dev/accounting/page.tsx
```
