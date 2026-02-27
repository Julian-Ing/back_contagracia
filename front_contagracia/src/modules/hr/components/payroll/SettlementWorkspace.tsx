'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import {
  Users,
  UserPlus,
  Calculator,
  CheckCircle,
  Loader2,
  FileText,
  Send,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { payrollSettlementsService } from '../../services/payroll-settlements.service';
import type {
  PayrollSettlement,
  PayrollSettlementDetail as DetailType,
  PayrollSettlementDetailSummary,
} from '../../types';
import {
  SETTLEMENT_TYPE_LABELS,
} from '../../types';
import type { SettlementType } from '../../types';
import { WorkspaceHeader } from './workspace/WorkspaceHeader';
import { WizardStepIndicator } from './workspace/WizardStepIndicator';
import type { WizardStep } from './workspace/WizardStepIndicator';
import { WorkspaceSummaryCards } from './workspace/WorkspaceSummaryCards';
import { WorkspaceEmployeeSection } from './workspace/WorkspaceEmployeeSection';
import { ConceptsBreakdown } from './workspace/ConceptsBreakdown';
import { ProcessingMetadata } from './workspace/ProcessingMetadata';
import { EmployeeConceptsDetail } from './workspace/EmployeeConceptsDetail';
import { OvertimeModal } from './workspace/OvertimeModal';
import { GeneratePILAModal } from './workspace/GeneratePILAModal';
import { SendPayslipsModal } from './workspace/SendPayslipsModal';
import { EmployeePayrollDetailEnhanced } from './EmployeePayrollDetailEnhanced';
import { AddEmployeesModal } from './AddEmployeesModal';
import toast from 'react-hot-toast';

type ConfirmActionType = 'calculate' | 'approve' | 'void' | 'delete';

interface SettlementWorkspaceProps {
  settlementId: string;
}

export function SettlementWorkspace({ settlementId }: SettlementWorkspaceProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can('payroll_settlements.edit');
  const canCalculate = can('payroll_settlements.calculate');
  const canApprove = can('payroll_settlements.approve');
  const canVoid = can('payroll_settlements.void');
  const canDelete = can('payroll_settlements.delete');

  const [settlement, setSettlement] = useState<PayrollSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic_info');
  const [selectedDetail, setSelectedDetail] = useState<DetailType | null>(null);
  const [showAddEmployees, setShowAddEmployees] = useState(false);
  const [showOvertime, setShowOvertime] = useState(false);
  const [overtimeEmployeeId, setOvertimeEmployeeId] = useState<string | null>(null);
  const [showPila, setShowPila] = useState(false);
  const [showPayslips, setShowPayslips] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: ConfirmActionType } | null>(null);
  const [loadingConfirm, setLoadingConfirm] = useState(false);

  const loadSettlement = useCallback(async () => {
    try {
      const data = await payrollSettlementsService.getOne(settlementId);
      setSettlement(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cargar la liquidacion');
      router.push('/dashboard/payroll/settlements');
    }
  }, [settlementId, router]);

  useEffect(() => {
    setLoading(true);
    loadSettlement().finally(() => setLoading(false));
  }, [loadSettlement]);

  const handleRefresh = useCallback(async () => {
    await loadSettlement();
  }, [loadSettlement]);

  // Derived state
  const details = useMemo(() => settlement?.details ?? [], [settlement]);
  const hasEmployees = details.length > 0;
  const hasCalculatedEmployees = useMemo(
    () => details.some((d) => d.status === 'CALCULATED' || d.status === 'APPROVED'),
    [details],
  );
  const isDraft = settlement?.status === 'DRAFT';
  const isCalculated = settlement?.status === 'CALCULATED';

  // Auto-determine initial step on first load
  const [initialStepSet, setInitialStepSet] = useState(false);
  useEffect(() => {
    if (settlement && !initialStepSet) {
      if (hasCalculatedEmployees) {
        setCurrentStep('preview');
      } else if (hasEmployees) {
        setCurrentStep('employee_management');
      } else {
        setCurrentStep('basic_info');
      }
      setInitialStepSet(true);
    }
  }, [settlement, hasCalculatedEmployees, hasEmployees, initialStepSet]);

  // Employee actions
  const handleViewDetail = useCallback(
    async (detail: PayrollSettlementDetailSummary) => {
      try {
        const fullDetail = await payrollSettlementsService.getDetail(settlementId, detail.id);
        setSelectedDetail(fullDetail);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Error al cargar detalle');
      }
    },
    [settlementId],
  );

  const handleRecalculate = useCallback(
    async (detail: PayrollSettlementDetailSummary) => {
      setLoadingAction(detail.id);
      try {
        await payrollSettlementsService.recalculateEmployee(settlementId, detail.id);
        toast.success(`Recalculado: ${detail.employee_name}`);
        await handleRefresh();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Error al recalcular');
      } finally {
        setLoadingAction(null);
      }
    },
    [settlementId, handleRefresh],
  );

  const handleDaysWorkedChange = useCallback(
    async (detailId: string, days: number) => {
      try {
        await payrollSettlementsService.updateDetailDaysWorked(settlementId, detailId, days);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Error al actualizar dias trabajados');
      }
    },
    [settlementId],
  );

  const handleAddAll = useCallback(async () => {
    setLoadingAction('add-all');
    try {
      const result = await payrollSettlementsService.addAllEmployees(settlementId);
      toast.success(`${result.added} empleados agregados`);
      await handleRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al agregar empleados');
    } finally {
      setLoadingAction(null);
    }
  }, [settlementId, handleRefresh]);

  const handleAddEmployeesSuccess = useCallback(() => {
    setShowAddEmployees(false);
    handleRefresh();
  }, [handleRefresh]);

  // Confirm actions
  const executeAction = async () => {
    if (!confirmAction || !settlement) return;
    setLoadingConfirm(true);
    try {
      switch (confirmAction.type) {
        case 'calculate':
          await payrollSettlementsService.calculate(settlementId);
          toast.success('Liquidacion calculada exitosamente');
          break;
        case 'approve':
          await payrollSettlementsService.approve(settlementId);
          toast.success('Liquidacion aprobada');
          break;
        case 'void':
          await payrollSettlementsService.voidSettlement(settlementId);
          toast.success('Liquidacion anulada');
          break;
        case 'delete':
          await payrollSettlementsService.delete(settlementId);
          toast.success('Liquidacion eliminada');
          router.push('/dashboard/payroll/settlements');
          return;
      }
      await handleRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al realizar la accion');
    } finally {
      setLoadingConfirm(false);
      setConfirmAction(null);
    }
  };

  const getConfirmTitle = () => {
    const titles: Record<ConfirmActionType, string> = {
      calculate: 'Calcular Liquidacion',
      approve: 'Aprobar Liquidacion',
      void: 'Anular Liquidacion',
      delete: 'Eliminar Liquidacion',
    };
    return confirmAction ? titles[confirmAction.type] : '';
  };

  const getConfirmDescription = () => {
    if (!confirmAction || !settlement) return '';
    const name = settlement.settlement_name;
    const descriptions: Record<ConfirmActionType, string> = {
      calculate: `¿Esta seguro que desea calcular "${name}"? Se calculara la nomina de todos los empleados incluidos.`,
      approve: `¿Esta seguro que desea aprobar "${name}"? Una vez aprobada no podra modificarse.`,
      void: `¿Esta seguro que desea anular "${name}"? Esta accion marcara la liquidacion como anulada.`,
      delete: `¿Esta seguro que desea eliminar "${name}"? Esta accion no se puede deshacer.`,
    };
    return descriptions[confirmAction.type];
  };

  if (loading || !settlement) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const existingEmployeeIds = details.map((d) => d.third_party_id);
  const isApprovedOrPaid = settlement.status === 'APPROVED' || settlement.status === 'PAID';

  return (
    <div className="space-y-6">
      {/* Header */}
      <WorkspaceHeader
        settlement={settlement}
        canVoid={canVoid}
        canDelete={canDelete}
        onBack={() => router.push('/dashboard/payroll/settlements')}
        onVoid={() => setConfirmAction({ type: 'void' })}
        onDelete={() => setConfirmAction({ type: 'delete' })}
      />

      {/* Wizard Step Indicator */}
      <WizardStepIndicator
        currentStep={currentStep}
        onStepClick={setCurrentStep}
        hasSettlement={true}
        hasEmployees={hasEmployees}
        hasCalculatedEmployees={hasCalculatedEmployees}
      />

      {/* ═══════════════ STEP 1: Basic Info ═══════════════ */}
      {currentStep === 'basic_info' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-foreground mb-6">
                Informacion de la Liquidacion
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Nombre
                  </p>
                  <p className="text-sm font-medium">{settlement.settlement_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Tipo
                  </p>
                  <p className="text-sm font-medium">
                    {SETTLEMENT_TYPE_LABELS[settlement.settlement_type as SettlementType] ??
                      settlement.settlement_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Periodo
                  </p>
                  <p className="text-sm font-medium">
                    {settlement.month}/{settlement.year} - Q{settlement.period_number}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Fecha Inicio - Fin
                  </p>
                  <p className="text-sm font-medium">
                    {settlement.start_date
                      ? new Date(settlement.start_date).toLocaleDateString('es-CO')
                      : '-'}{' '}
                    -{' '}
                    {settlement.end_date
                      ? new Date(settlement.end_date).toLocaleDateString('es-CO')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Fecha de Pago
                  </p>
                  <p className="text-sm font-medium">
                    {settlement.payment_date
                      ? new Date(settlement.payment_date).toLocaleDateString('es-CO')
                      : 'No definida'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Empleados
                  </p>
                  <p className="text-sm font-medium">{settlement.total_employees}</p>
                </div>
                {settlement.notes && (
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Notas
                    </p>
                    <p className="text-sm">{settlement.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          {isDraft && canEdit && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleAddAll}
                disabled={loadingAction === 'add-all'}
              >
                {loadingAction === 'add-all' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Agregar Todos los Empleados
              </Button>
              <Button variant="outline" onClick={() => setShowAddEmployees(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Seleccionar Empleados
              </Button>
            </div>
          )}

          {/* Next step nav */}
          {hasEmployees && (
            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep('employee_management')}>
                Gestionar Empleados
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ STEP 2: Employee Management ═══════════════ */}
      {currentStep === 'employee_management' && (
        <div className="space-y-6">
          <WorkspaceSummaryCards settlement={settlement} details={details} variant="compact" />

          <WorkspaceEmployeeSection
            details={details}
            isDraft={isDraft || false}
            isCalculated={isCalculated || false}
            canEdit={canEdit}
            canCalculate={canCalculate}
            onViewDetail={handleViewDetail}
            onRecalculate={handleRecalculate}
            onAddEmployees={() => setShowAddEmployees(true)}
            onOvertime={(detail) => {
              setOvertimeEmployeeId(detail?.third_party_id ?? null);
              setShowOvertime(true);
            }}
            onDaysWorkedChange={handleDaysWorkedChange}
            loadingAction={loadingAction}
          />

          {/* Bottom navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep('basic_info')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Informacion
            </Button>
            <div className="flex items-center gap-2">
              {isDraft && canEdit && (
                <Button
                  variant="outline"
                  onClick={handleAddAll}
                  disabled={loadingAction === 'add-all'}
                >
                  {loadingAction === 'add-all' ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4 mr-1" />
                  )}
                  Agregar Todos
                </Button>
              )}
              {isDraft && hasEmployees && canCalculate && (
                <Button onClick={() => setConfirmAction({ type: 'calculate' })}>
                  <Calculator className="h-4 w-4 mr-1" />
                  Calcular Todos
                </Button>
              )}
              {isCalculated && canCalculate && (
                <Button variant="outline" onClick={() => setConfirmAction({ type: 'calculate' })}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Recalcular Todos
                </Button>
              )}
              {isCalculated && canApprove && (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setConfirmAction({ type: 'approve' })}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aprobar Todos
                </Button>
              )}
              {hasCalculatedEmployees && (
                <Button variant="outline" onClick={() => setCurrentStep('preview')}>
                  Ver Resultados
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ STEP 3: Preview ═══════════════ */}
      {currentStep === 'preview' && (
        <div className="space-y-6">
          <WorkspaceSummaryCards settlement={settlement} details={details} variant="full" />
          <ConceptsBreakdown settlement={settlement} details={details} />
          <EmployeeConceptsDetail settlementId={settlementId} details={details} />
          <ProcessingMetadata settlement={settlement} />

          {/* Bottom navigation */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCurrentStep('basic_info')}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Informacion
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep('employee_management')}>
                <Users className="h-4 w-4 mr-1" />
                Empleados
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {isApprovedOrPaid && canApprove && (
                <>
                  <Button variant="outline" onClick={() => setShowPila(true)}>
                    <FileText className="h-4 w-4 mr-1" />
                    PILA
                  </Button>
                  <Button variant="outline" onClick={() => setShowPayslips(true)}>
                    <Send className="h-4 w-4 mr-1" />
                    Desprendibles
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Employee Payroll Detail Modal */}
      {selectedDetail && (
        <EmployeePayrollDetailEnhanced
          detail={selectedDetail}
          open={!!selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}

      {/* Add Employees Modal */}
      <AddEmployeesModal
        open={showAddEmployees}
        onClose={() => setShowAddEmployees(false)}
        settlementId={settlementId}
        existingEmployeeIds={existingEmployeeIds}
        onSuccess={handleAddEmployeesSuccess}
      />

      {/* Overtime Modal */}
      <OvertimeModal
        open={showOvertime}
        onClose={() => {
          setShowOvertime(false);
          setOvertimeEmployeeId(null);
        }}
        settlement={settlement}
        employees={details}
        initialEmployeeId={overtimeEmployeeId}
      />

      {/* PILA Modal */}
      <GeneratePILAModal
        open={showPila}
        onClose={() => setShowPila(false)}
        settlement={settlement}
      />

      {/* Payslips Modal */}
      <SendPayslipsModal
        open={showPayslips}
        onClose={() => setShowPayslips(false)}
        settlement={settlement}
        employees={details}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmTitle()}</AlertDialogTitle>
            <AlertDialogDescription>{getConfirmDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingConfirm}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={loadingConfirm}
              className={
                confirmAction?.type === 'delete'
                  ? 'bg-red-600 hover:bg-red-700'
                  : confirmAction?.type === 'void'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : ''
              }
            >
              {loadingConfirm ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
