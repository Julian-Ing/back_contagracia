'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { DollarSign, TrendingDown, Building2, PiggyBank } from 'lucide-react';
import { SETTLEMENT_STATUS_COLORS, SETTLEMENT_STATUS_LABELS } from '../../types';
import type { PayrollSettlementDetail as DetailType, SettlementStatus } from '../../types';

interface EmployeePayrollDetailProps {
  detail: DetailType;
  open: boolean;
  onClose: () => void;
}

export function EmployeePayrollDetail({ detail, open, onClose }: EmployeePayrollDetailProps) {
  const data = detail.payroll_data;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{detail.employee_name}</span>
            <Badge className={SETTLEMENT_STATUS_COLORS[detail.status as SettlementStatus]}>
              {SETTLEMENT_STATUS_LABELS[detail.status as SettlementStatus] ?? detail.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Header info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Documento:</span>
            <p className="font-medium">{detail.employee_document ?? '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Cargo:</span>
            <p className="font-medium">{detail.employee_position ?? '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Salario Base:</span>
            <FormattedNumber value={detail.employee_base_salary ?? 0} type="currency" className="font-medium block" />
          </div>
          <div>
            <span className="text-muted-foreground">Dias Trabajados:</span>
            <p className="font-medium">{detail.days_worked}</p>
          </div>
        </div>

        {/* Net salary highlight */}
        <Card className="bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">Salario Neto</p>
            <FormattedNumber value={detail.net_salary ?? 0} type="currency" className="text-3xl font-bold text-indigo-700 dark:text-indigo-300" />
          </CardContent>
        </Card>

        {data ? (
          <Tabs defaultValue="accrued" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="accrued" className="text-xs">
                <DollarSign className="h-3 w-3 mr-1" /> Devengados
              </TabsTrigger>
              <TabsTrigger value="deductions" className="text-xs">
                <TrendingDown className="h-3 w-3 mr-1" /> Deducciones
              </TabsTrigger>
              <TabsTrigger value="employer" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" /> Aportes
              </TabsTrigger>
              <TabsTrigger value="provisions" className="text-xs">
                <PiggyBank className="h-3 w-3 mr-1" /> Provisiones
              </TabsTrigger>
            </TabsList>

            {/* Devengados Tab */}
            <TabsContent value="accrued">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Salario ({data.accrued.worked_days} dias)</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.accrued.salary} type="currency" /></TableCell>
                  </TableRow>
                  {data.accrued.transportation_allowance > 0 && (
                    <TableRow>
                      <TableCell>Auxilio de Transporte</TableCell>
                      <TableCell className="text-right"><FormattedNumber value={data.accrued.transportation_allowance} type="currency" /></TableCell>
                    </TableRow>
                  )}
                  {/* Overtime entries */}
                  {[
                    { key: 'HEDs', label: 'Hora Extra Diurna' },
                    { key: 'HENs', label: 'Hora Extra Nocturna' },
                    { key: 'HEDDFs', label: 'Hora Extra Diurna Dom/Fest' },
                    { key: 'HENDFs', label: 'Hora Extra Nocturna Dom/Fest' },
                    { key: 'HRNs', label: 'Recargo Nocturno' },
                    { key: 'HRDDFs', label: 'Recargo Diurno Dom/Fest' },
                    { key: 'HRNDFs', label: 'Recargo Nocturno Dom/Fest' },
                  ].map(({ key, label }) => {
                    const entries = (data.accrued as any)[key] as any[];
                    if (!entries?.length) return null;
                    return entries.map((e: any, i: number) => (
                      <TableRow key={`${key}-${i}`}>
                        <TableCell>{label} ({e.quantity}h @ {e.rate}%)</TableCell>
                        <TableCell className="text-right"><FormattedNumber value={e.payment} type="currency" /></TableCell>
                      </TableRow>
                    ));
                  })}
                  {/* Other concepts */}
                  {data.accrued.other_concepts?.map((c, i) => (
                    <TableRow key={`oc-${i}`}>
                      <TableCell>{c.concept_name}</TableCell>
                      <TableCell className="text-right"><FormattedNumber value={c.amount} type="currency" /></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total Devengados</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.accrued.accrued_total} type="currency" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            {/* Deducciones Tab */}
            <TabsContent value="deductions">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>EPS (Salud)</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.deductions.eps_deduction} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pension</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.deductions.pension_deduction} type="currency" /></TableCell>
                  </TableRow>
                  {data.deductions.fondosp_deduction_SP > 0 && (
                    <TableRow>
                      <TableCell>Fondo de Solidaridad Pensional</TableCell>
                      <TableCell className="text-right"><FormattedNumber value={data.deductions.fondosp_deduction_SP} type="currency" /></TableCell>
                    </TableRow>
                  )}
                  {data.deductions.withholding_at_source > 0 && (
                    <TableRow>
                      <TableCell>Retencion en la Fuente</TableCell>
                      <TableCell className="text-right"><FormattedNumber value={data.deductions.withholding_at_source} type="currency" /></TableCell>
                    </TableRow>
                  )}
                  {data.deductions.other_deductions?.map((d, i) => (
                    <TableRow key={`od-${i}`}>
                      <TableCell>{d.concept_name}</TableCell>
                      <TableCell className="text-right"><FormattedNumber value={d.amount} type="currency" /></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total Deducciones</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.deductions.deductions_total} type="currency" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            {/* Aportes Patronales Tab */}
            <TabsContent value="employer">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Salud Empleador</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.employer_contributions.employer_health} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pension Empleador</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.employer_contributions.employer_pension} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>ARL</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.employer_contributions.arl} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Caja de Compensacion (CCF)</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.employer_contributions.ccf} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>ICBF</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.employer_contributions.icbf} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>SENA</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.employer_contributions.sena} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total Aportes Patronales</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.employer_contributions.total_employer_contributions} type="currency" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            {/* Provisiones Tab */}
            <TabsContent value="provisions">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Vacaciones</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.provisions.vacation_provision} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cesantias</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.provisions.severance_provision} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Intereses sobre Cesantias</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.provisions.severance_interest_provision} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Prima de Servicios</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.provisions.service_bonus_provision} type="currency" /></TableCell>
                  </TableRow>
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total Provisiones</TableCell>
                    <TableCell className="text-right"><FormattedNumber value={data.provisions.total_provisions} type="currency" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-center text-muted-foreground py-8">Sin datos de calculo disponibles</p>
        )}

        {/* Metadata */}
        {data?.metadata && (
          <Card className="mt-2">
            <CardHeader className="py-2">
              <CardTitle className="text-sm">Parametros del Calculo</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                <div><span className="text-muted-foreground">IBC:</span> <FormattedNumber value={data.metadata.ibc} type="currency" className="font-medium" /></div>
                <div><span className="text-muted-foreground">Tipo Salario:</span> <p className="font-medium">{data.metadata.salary_type}</p></div>
                <div><span className="text-muted-foreground">SMLV:</span> <FormattedNumber value={data.metadata.smlv} type="currency" className="font-medium" /></div>
                <div><span className="text-muted-foreground">UVT:</span> <FormattedNumber value={data.metadata.uvt_value} type="currency" className="font-medium" /></div>
                <div><span className="text-muted-foreground">Lim. Transporte:</span> <FormattedNumber value={data.metadata.transportation_limit} type="currency" className="font-medium" /></div>
                <div><span className="text-muted-foreground">Exoneracion:</span> <p className="font-medium">{data.metadata.exoneration_applied ? 'Si' : 'No'}</p></div>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
