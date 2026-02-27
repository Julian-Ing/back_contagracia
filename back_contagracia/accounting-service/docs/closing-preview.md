# Preview de Cierre Contable

## Descripción
Endpoint y función para obtener vista previa de cierre de período contable, mostrando saldos de cuentas de resultado (4, 5, 6) y utilidad neta.

## Endpoint

```
GET /accounting-periods/:id/closing-preview
```

### Response
```typescript
{
  period: {
    id: string;
    name: string;
    year: number;
    is_annual: boolean;
    start_date: string;
    end_date: string;
  };
  income: AccountBalanceResult;    // Clase 4 - Ingresos
  expenses: AccountBalanceResult;  // Clase 5 - Gastos
  costs: AccountBalanceResult;     // Clase 6 - Costos
  net_income: number;              // Utilidad neta = income - expenses - costs
}
```

## Función getAccountBalance

Ubicación: `src/functions/get-account-balance.ts`

### Parámetros
```typescript
interface GetAccountBalanceParams {
  account_code: string;   // Código de cuenta (ej: "4", "41", "4101")
  from_date: string;      // Fecha inicio YYYY-MM-DD (inclusivo)
  to_date: string;        // Fecha fin YYYY-MM-DD (inclusivo)
  with_children?: boolean; // Incluir cuentas hijas recursivamente
}
```

### Respuesta
```typescript
interface AccountBalanceResult {
  account: AccountInfo;           // Info de la cuenta principal
  from_date: string;
  to_date: string;
  with_children: boolean;
  accounts_included: AccountInfo[]; // Cuentas incluidas en el cálculo
  total_debits: number;           // Total de débitos
  total_credits: number;          // Total de créditos
  balance: number;                // Saldo según naturaleza de cuenta
  movements: AccountMovement[];   // Detalle de todos los movimientos
  movements_count: number;        // Cantidad de movimientos
}
```

### Detalle de Movimiento
```typescript
interface AccountMovement {
  id: string;
  date: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string | null;
  account_code: string;
  account_name: string;
  journal_entry_id: string;
  journal_entry_consecutive: string;
  journal_entry_description: string | null;
  third_party_id: string | null;
  third_party_name: string | null;
  third_party_identification: string | null;
  bank_account_id: string | null;
  bank_account_name: string | null;
}
```

## Lógica de Cálculo

### Naturaleza de Cuentas
- **DEBIT**: ASSET, EXPENSE, COST, PRODUCTION_COST, DEBTOR_ACCOUNTS
  - Balance = total_debits - total_credits
- **CREDIT**: LIABILITY, EQUITY, INCOME, CREDITOR_ACCOUNTS
  - Balance = total_credits - total_debits

### Jerarquía de Cuentas (with_children)
Usa recursión para obtener todas las cuentas descendientes:
```typescript
async function getDescendantCodes(prisma, parentCode): Promise<string[]> {
  const children = await prisma.chartOfAccount.findMany({
    where: { parent_code: parentCode, is_active: true },
    select: { code: true },
  });
  const codes: string[] = [];
  for (const child of children) {
    codes.push(child.code);
    const descendants = await getDescendantCodes(prisma, child.code);
    codes.push(...descendants);
  }
  return codes;
}
```

## Archivos

- `src/functions/get-account-balance.ts` - Función principal
- `src/modules/periods/periods.service.ts` - Método getClosingPreview
- `src/modules/periods/periods.controller.ts` - Endpoint GET closing-preview
