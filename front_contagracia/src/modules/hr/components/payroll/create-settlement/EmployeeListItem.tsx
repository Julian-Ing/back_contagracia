'use client';

import { Checkbox } from '@/shared/components/ui/checkbox';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';

interface EmployeeListItemProps {
  employee: any;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function EmployeeListItem({ employee, selected, onToggle }: EmployeeListItemProps) {
  const initials = (employee.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
        selected
          ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
      }`}
      onClick={() => onToggle(employee.id)}
    >
      <Checkbox checked={selected} onCheckedChange={() => onToggle(employee.id)} />
      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{employee.name ?? 'Sin nombre'}</p>
        <p className="text-xs text-muted-foreground">
          {employee.identification_number ?? '-'}
          {employee.current_contract?.position && (
            <> · {employee.current_contract.position}</>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        {employee.current_salary ? (
          <FormattedNumber
            value={employee.current_salary.salary}
            type="currency"
            className="text-sm font-medium"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Sin salario</span>
        )}
      </div>
    </div>
  );
}
