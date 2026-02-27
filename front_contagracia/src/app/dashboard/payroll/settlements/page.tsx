'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
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
import { DollarSign, Plus, ArrowLeft } from 'lucide-react';
import { SettlementsListEnhanced } from '@/modules/hr/components/payroll/SettlementsListEnhanced';
import { payrollSettlementsService } from '@/modules/hr/services/payroll-settlements.service';
import type { PayrollSettlement } from '@/modules/hr';
import toast from 'react-hot-toast';

type ConfirmActionType = 'calculate' | 'approve' | 'void' | 'delete';

export default function SettlementsListPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can('payroll_settlements.create');
  const canEdit = can('payroll_settlements.edit');
  const canCalculate = can('payroll_settlements.calculate');
  const canApprove = can('payroll_settlements.approve');
  const canVoid = can('payroll_settlements.void');
  const canDelete = can('payroll_settlements.delete');

  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    type: ConfirmActionType;
    settlement: PayrollSettlement;
  } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const handleNavigate = useCallback((id: string) => {
    router.push(`/dashboard/payroll/settlements/${id}`);
  }, [router]);

  const executeAction = async () => {
    if (!confirmAction) return;
    setLoadingAction(true);
    try {
      switch (confirmAction.type) {
        case 'calculate':
          await payrollSettlementsService.calculate(confirmAction.settlement.id);
          toast.success('Liquidacion calculada exitosamente');
          break;
        case 'approve':
          await payrollSettlementsService.approve(confirmAction.settlement.id);
          toast.success('Liquidacion aprobada');
          break;
        case 'void':
          await payrollSettlementsService.voidSettlement(confirmAction.settlement.id);
          toast.success('Liquidacion anulada');
          break;
        case 'delete':
          await payrollSettlementsService.delete(confirmAction.settlement.id);
          toast.success('Liquidacion eliminada');
          break;
      }
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al realizar la accion');
    } finally {
      setLoadingAction(false);
      setConfirmAction(null);
    }
  };

  const getConfirmTitle = () => {
    if (!confirmAction) return '';
    const titles: Record<ConfirmActionType, string> = {
      calculate: 'Calcular Liquidacion',
      approve: 'Aprobar Liquidacion',
      void: 'Anular Liquidacion',
      delete: 'Eliminar Liquidacion',
    };
    return titles[confirmAction.type];
  };

  const getConfirmDescription = () => {
    if (!confirmAction) return '';
    const name = confirmAction.settlement.settlement_name;
    const descriptions: Record<ConfirmActionType, string> = {
      calculate: `¿Esta seguro que desea calcular la liquidacion "${name}"? Se calculara la nomina de todos los empleados incluidos.`,
      approve: `¿Esta seguro que desea aprobar la liquidacion "${name}"? Una vez aprobada no podra modificarse.`,
      void: `¿Esta seguro que desea anular la liquidacion "${name}"? Esta accion marcara la liquidacion como anulada.`,
      delete: `¿Esta seguro que desea eliminar la liquidacion "${name}"? Esta accion no se puede deshacer.`,
    };
    return descriptions[confirmAction.type];
  };

  return (
    <ProtectedRoute permission="payroll_settlements.view" deniedMessage="No tienes permisos para ver Liquidaciones.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/payroll')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-indigo-500 text-white">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Liquidaciones de Nomina</h1>
                <p className="text-sm text-muted-foreground">
                  Lista completa de liquidaciones de nomina.
                </p>
              </div>
            </div>
            {canCreate && (
              <Button onClick={() => router.push('/dashboard/payroll/settlements/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Liquidacion
              </Button>
            )}
          </div>
        </header>

        <SettlementsListEnhanced
          key={refreshKey}
          canEdit={canEdit}
          canCalculate={canCalculate}
          canApprove={canApprove}
          canVoid={canVoid}
          canDelete={canDelete}
          onNavigate={handleNavigate}
          onCalculate={(s) => setConfirmAction({ type: 'calculate', settlement: s })}
          onApprove={(s) => setConfirmAction({ type: 'approve', settlement: s })}
          onVoid={(s) => setConfirmAction({ type: 'void', settlement: s })}
          onDelete={(s) => setConfirmAction({ type: 'delete', settlement: s })}
        />

        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{getConfirmTitle()}</AlertDialogTitle>
              <AlertDialogDescription>{getConfirmDescription()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loadingAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeAction}
                disabled={loadingAction}
                className={
                  confirmAction?.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmAction?.type === 'void'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : ''
                }
              >
                {loadingAction ? 'Procesando...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
