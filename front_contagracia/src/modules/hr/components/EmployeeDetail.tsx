'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  User,
  Briefcase,
  Shield,
  CreditCard,
  DollarSign,
  Calendar,
  FileText,
  Building2,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Pencil,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUS_COLORS, TERMINATION_TYPE_LABELS, SALARY_TYPE_LABELS } from '../types';
import { employeesService } from '../services/employees.service';
import type { Employee, EmployeeContract, SalaryRecord } from '../types';
import { EditContractModal, RenewContractModal, TerminateModal, NewContractModal, ChangeSalaryModal } from './EmployeeModals';

interface EmployeeDetailProps {
  employee: Employee;
  canViewContracts: boolean;
  canViewSalary: boolean;
  canEditContract?: boolean;
  canRenewContract?: boolean;
  canCreateContract?: boolean;
  canEditSalary?: boolean;
  canTerminate?: boolean;
  onRefresh?: () => void;
}

// ==================== Helpers ====================

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ==================== Main Component ====================

export function EmployeeDetail({
  employee,
  canViewContracts,
  canViewSalary,
  canEditContract = false,
  canRenewContract = false,
  canCreateContract = false,
  canEditSalary = false,
  canTerminate = false,
  onRefresh,
}: EmployeeDetailProps) {
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  // Modal states
  const [editContract, setEditContract] = useState<EmployeeContract | null>(null);
  const [renewContract, setRenewContract] = useState<EmployeeContract | null>(null);
  const [showNewContract, setShowNewContract] = useState(false);
  const [showChangeSalary, setShowChangeSalary] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);

  const loadContracts = useCallback(async () => {
    if (!canViewContracts) return;
    setLoadingContracts(true);
    try {
      const data = await employeesService.getContracts(employee.id);
      setContracts(data);
    } catch {
      setContracts([]);
    } finally {
      setLoadingContracts(false);
    }
  }, [employee.id, canViewContracts]);

  const loadSalary = useCallback(async () => {
    if (!canViewSalary) return;
    setLoadingSalary(true);
    try {
      const data = await employeesService.getSalaryHistory(employee.id);
      setSalaryHistory(data);
    } catch {
      setSalaryHistory([]);
    } finally {
      setLoadingSalary(false);
    }
  }, [employee.id, canViewSalary]);

  useEffect(() => { loadContracts(); }, [loadContracts]);
  useEffect(() => { loadSalary(); }, [loadSalary]);

  const handleContractSuccess = () => {
    setEditContract(null);
    setRenewContract(null);
    setShowNewContract(false);
    loadContracts();
    loadSalary();
    onRefresh?.();
  };

  const handleSalarySuccess = () => {
    setShowChangeSalary(false);
    loadSalary();
    onRefresh?.();
  };

  const handleTerminateSuccess = () => {
    setShowTerminate(false);
    loadContracts();
    loadSalary();
    onRefresh?.();
  };

  const isActive = employee.employee_status === 'ACTIVE';
  const currentContract = contracts.find((c) => c.is_current);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <User className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {employee.name || '-'}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <Badge
                className={
                  employee.employee_status
                    ? EMPLOYEE_STATUS_COLORS[employee.employee_status]
                    : 'bg-gray-100 text-gray-700'
                }
              >
                {employee.employee_status ? EMPLOYEE_STATUS_LABELS[employee.employee_status] : '-'}
              </Badge>
              {employee.identification_number && (
                <span className="text-sm font-mono text-gray-400">{employee.identification_number}</span>
              )}
              {currentContract?.position && (
                <span className="text-sm text-muted-foreground">{currentContract.position}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className={`grid w-full ${canViewContracts && canViewSalary ? 'grid-cols-3' : canViewContracts || canViewSalary ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Informacion</span>
          </TabsTrigger>
          {canViewContracts && (
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Contratos</span>
            </TabsTrigger>
          )}
          {canViewSalary && (
            <TabsTrigger value="salary" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Salario</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ==================== Tab Info ==================== */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" /> Datos Personales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Documento" value={`${employee.type_document_identification?.name || ''} ${employee.identification_number || '-'}`} />
                {employee.first_name && <InfoRow label="Nombres" value={`${employee.first_name || ''} ${employee.second_name || ''}`.trim()} />}
                {employee.first_surname && <InfoRow label="Apellidos" value={`${employee.first_surname || ''} ${employee.second_surname || ''}`.trim()} />}
                <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={employee.email || '-'} />
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telefono" value={employee.phone || '-'} />
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Direccion" value={employee.address || '-'} />
              </CardContent>
            </Card>

            {/* Laboral */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Datos Laborales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Fecha Ingreso" value={formatDate(employee.hire_date)} />
                <InfoRow label="Administrativo" value={employee.is_administrative ? 'Si' : 'No'} />
                <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Centro de Costo" value={employee.cost_center ? `${employee.cost_center.consecutive} - ${employee.cost_center.name}` : '-'} />
                <InfoRow label="Director" value={employee.director?.name || '-'} />
              </CardContent>
            </Card>

            {/* Seguridad Social */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Seguridad Social
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="EPS" value={employee.eps?.name || '-'} />
                <InfoRow label="Fondo Pensiones" value={employee.pension_fund?.name || '-'} />
                <InfoRow label="ARL" value={employee.arl?.name || '-'} />
                <InfoRow label="Riesgo ARL" value={employee.arl_risk_class?.name || '-'} />
                <InfoRow label="Caja Compensacion" value={employee.compensation_fund?.name || '-'} />
                <InfoRow label="Fondo Cesantias" value={employee.severance_fund?.name || '-'} />
              </CardContent>
            </Card>

            {/* Bancario + Salario actual */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Datos Bancarios & Salario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Banco" value={employee.bank_name || '-'} />
                <InfoRow label="Tipo Cuenta" value={employee.bank_account_type === 'SAVINGS' ? 'Ahorros' : employee.bank_account_type === 'CHECKING' ? 'Corriente' : '-'} />
                <InfoRow label="No. Cuenta" value={employee.bank_account_number || '-'} />
                <div className="border-t pt-2 mt-2">
                  <InfoRow icon={<DollarSign className="h-3.5 w-3.5 text-green-600" />} label="Salario" value={employee.current_salary?.salary != null ? <FormattedNumber value={employee.current_salary.salary} type="currency" /> : '-'} bold />
                  {employee.current_salary && (
                    <InfoRow label="Tipo Salario" value={SALARY_TYPE_LABELS[employee.current_salary.salary_type] || 'Ordinario'} />
                  )}
                  {(employee.current_salary?.transportation_allowance ?? 0) > 0 && (
                    <InfoRow label="Aux. Transporte" value={<FormattedNumber value={employee.current_salary!.transportation_allowance!} type="currency" />} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== Tab Contracts ==================== */}
        {canViewContracts && (
        <TabsContent value="contracts">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Historial de Contratos
                  <Badge variant="secondary">{contracts.length}</Badge>
                </CardTitle>
                <div className="flex gap-2">
                  {canEditSalary && isActive && (
                    <Button size="sm" variant="outline" onClick={() => setShowChangeSalary(true)}>
                      <DollarSign className="h-3.5 w-3.5 mr-1" />
                      Cambiar Salario
                    </Button>
                  )}
                  {canCreateContract && (
                    <Button size="sm" variant="outline" onClick={() => setShowNewContract(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Nuevo Contrato
                    </Button>
                  )}
                  {canTerminate && (isActive || currentContract) && (
                    <Button size="sm" variant="destructive" onClick={() => setShowTerminate(true)}>
                      Terminar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingContracts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                </div>
              ) : contracts.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-slate-400">Sin contratos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>No.</TableHead>
                        <TableHead>Tipo Contrato</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Transp.</TableHead>
                        <TableHead>Estado</TableHead>
                        {(canEditContract || canRenewContract) && <TableHead className="w-20">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((c) => {
                        const isExpanded = expandedContract === c.id;
                        const salaries = c.salary_history || [];
                        return (
                          <Fragment key={c.id}>
                            <TableRow className={isExpanded ? 'border-b-0' : ''}>
                              <TableCell className="px-2">
                                {salaries.length > 0 && (
                                  <button
                                    onClick={() => setExpandedContract(isExpanded ? null : c.id)}
                                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                                  >
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{c.contract_number || '-'}</TableCell>
                              <TableCell>
                                {c.contract_type?.name || '-'}
                                {c.worker_type && (
                                  <span className="text-xs text-gray-500 block">{c.worker_type.name}</span>
                                )}
                              </TableCell>
                              <TableCell>{c.position || '-'}</TableCell>
                              <TableCell>{formatDate(c.start_date)}</TableCell>
                              <TableCell>{c.end_date ? formatDate(c.end_date) : 'Indefinido'}</TableCell>
                              <TableCell>{c.includes_transport ? 'Si' : 'No'}</TableCell>
                              <TableCell>
                                {c.is_current ? (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Vigente
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    {c.termination_type ? TERMINATION_TYPE_LABELS[c.termination_type] : 'Cerrado'}
                                  </Badge>
                                )}
                              </TableCell>
                              {(canEditContract || canRenewContract) && (
                                <TableCell>
                                  {c.is_current && (
                                    <div className="flex gap-1">
                                      {canEditContract && (
                                        <button
                                          onClick={() => setEditContract(c)}
                                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 hover:text-gray-700"
                                          title="Editar contrato"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {canRenewContract && c.end_date && (() => {
                                        const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000);
                                        return daysLeft <= 60;
                                      })() && (
                                        <button
                                          onClick={() => setRenewContract(c)}
                                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-500 hover:text-blue-700"
                                          title="Renovar contrato"
                                        >
                                          <RefreshCw className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                            {/* Expandable salary history */}
                            {isExpanded && salaries.length > 0 && (
                              <TableRow key={`${c.id}-salaries`} className="bg-gray-50 dark:bg-slate-800/50">
                                <TableCell colSpan={(canEditContract || canRenewContract) ? 9 : 8} className="py-2 px-6">
                                  <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">
                                    Historial de salarios en este contrato
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {salaries.map((s, i) => (
                                      <div
                                        key={s.id}
                                        className={`px-3 py-2 rounded-md border text-sm ${
                                          s.is_current
                                            ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                                            : 'border-gray-200 bg-white dark:bg-slate-800 dark:border-slate-700'
                                        }`}
                                      >
                                        <div className="font-semibold"><FormattedNumber value={s.salary} type="currency" /></div>
                                        <div className="text-xs text-muted-foreground">
                                          {SALARY_TYPE_LABELS[s.salary_type] || s.salary_type} &middot; {formatDate(s.effective_date)}
                                        </div>
                                        {s.reason && <div className="text-xs text-muted-foreground">{s.reason}</div>}
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ==================== Tab Salary ==================== */}
        {canViewSalary && (
        <TabsContent value="salary">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Historial de Salarios
                  <Badge variant="secondary">{salaryHistory.length}</Badge>
                </CardTitle>
                {canEditSalary && isActive && (
                  <Button size="sm" variant="outline" onClick={() => setShowChangeSalary(true)}>
                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                    Cambiar Salario
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingSalary ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                </div>
              ) : salaryHistory.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-slate-400">Sin registros de salario</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Salario</TableHead>
                        <TableHead>Aux. Transporte</TableHead>
                        <TableHead>Desde</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salaryHistory.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium"><FormattedNumber value={s.salary} type="currency" /></TableCell>
                          <TableCell>{(s.transportation_allowance ?? 0) > 0 ? <FormattedNumber value={s.transportation_allowance!} type="currency" /> : '-'}</TableCell>
                          <TableCell>{formatDate(s.effective_date)}</TableCell>
                          <TableCell>{s.reason || '-'}</TableCell>
                          <TableCell>
                            <Badge className={s.is_current ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}>
                              {s.is_current ? 'Vigente' : 'Anterior'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {/* ==================== Modals ==================== */}
      {editContract && (
        <EditContractModal
          open={!!editContract}
          onClose={() => setEditContract(null)}
          employeeId={employee.id}
          contract={editContract}
          onSuccess={handleContractSuccess}
        />
      )}
      {renewContract && (
        <RenewContractModal
          open={!!renewContract}
          onClose={() => setRenewContract(null)}
          employeeId={employee.id}
          contract={renewContract}
          onSuccess={handleContractSuccess}
        />
      )}
      <NewContractModal
        open={showNewContract}
        onClose={() => setShowNewContract(false)}
        employeeId={employee.id}
        currentSalary={employee.current_salary}
        onSuccess={handleContractSuccess}
      />
      <ChangeSalaryModal
        open={showChangeSalary}
        onClose={() => setShowChangeSalary(false)}
        employeeId={employee.id}
        currentSalary={employee.current_salary}
        contractIncludesTransport={currentContract?.includes_transport}
        onSuccess={handleSalarySuccess}
      />
      <TerminateModal
        open={showTerminate}
        onClose={() => setShowTerminate(false)}
        employeeId={employee.id}
        employeeName={employee.name || '-'}
        onSuccess={handleTerminateSuccess}
      />
    </div>
  );
}

// ==================== Sub-components ====================

function InfoRow({ icon, label, value, bold }: { icon?: React.ReactNode; label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-gray-400 dark:text-slate-500">{icon}</span>}
      <div className="flex-1 flex justify-between gap-2">
        <span className="text-gray-500 dark:text-slate-400 shrink-0">{label}</span>
        <span className={`text-right ${bold ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-slate-300'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
