'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
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
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Clock, Plus } from 'lucide-react';
import {
  AttendanceStats,
  AttendanceList,
  OvertimeList,
  OvertimeForm,
  attendanceService,
} from '@/modules/time-attendance';
import { employeesService } from '@/modules/hr';
import type { OvertimeRecord } from '@/modules/time-attendance';
import toast from 'react-hot-toast';

interface SimpleEmployee {
  id: string;
  name: string;
}

interface SimpleCostCenter {
  id: string;
  name: string;
  consecutive: string;
}

export default function AttendancePage() {
  const { can } = usePermissions();

  // Permisos admin de asistencia
  const canCheckin = can('attendance.register_checkin');
  const canCheckout = can('attendance.register_checkout');
  const canEditAttendance = can('attendance.edit');

  // Permisos self-service de asistencia
  const canSelfCheckin = can('attendance.self_checkin');
  const canSelfCheckout = can('attendance.self_checkout');

  // Permisos admin de horas extras
  const canViewOvertime = can('overtime.view');
  const canCreateOvertime = can('overtime.create');
  const canEditOvertime = can('overtime.edit');
  const canDeleteOvertime = can('overtime.delete');
  const canApproveOvertime = can('overtime.approve');
  const canRejectOvertime = can('overtime.reject');

  // Permisos self-service de horas extras
  const canSelfRequestOvertime = can('overtime.self_request');

  // Combinados: puede hacer la accion (admin o self-service)
  const canDoCheckin = canCheckin || canSelfCheckin;
  const canDoCheckout = canCheckout || canSelfCheckout;
  const canDoViewOvertime = canViewOvertime || canSelfRequestOvertime;
  const canDoCreateOvertime = canCreateOvertime || canSelfRequestOvertime;

  // Es modo admin (tiene permisos de seleccionar empleado)?
  const isAdminCheckin = canCheckin;
  const isAdminCheckout = canCheckout;
  const isAdminOvertime = canCreateOvertime;

  // Estado
  const [refreshKey, setRefreshKey] = useState(0);
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [editingOvertime, setEditingOvertime] = useState<OvertimeRecord | null>(null);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
  const [costCenters, setCostCenters] = useState<SimpleCostCenter[]>([]);

  // Dialogo checkin/checkout (solo para modo admin)
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [checkinEmployeeId, setCheckinEmployeeId] = useState('');
  const [checkinNotes, setCheckinNotes] = useState('');
  const [loadingCheckin, setLoadingCheckin] = useState(false);

  // Confirmaciones
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve_overtime' | 'delete_overtime';
    record: OvertimeRecord;
  } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Rechazo
  const [rejectingOvertime, setRejectingOvertime] = useState<OvertimeRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loadingReject, setLoadingReject] = useState(false);

  const employeeSearchOptions = employees.map((e) => ({ value: e.id, label: e.name }));

  // Solo cargar empleados y centros de costo si tiene permisos admin
  const needsEmployeeList = canCheckin || canCheckout || canCreateOvertime;

  useEffect(() => {
    if (!needsEmployeeList) return;
    const loadData = async () => {
      try {
        const [empResponse, ccResponse] = await Promise.all([
          employeesService.getAll({ limit: 500, status: 'ACTIVE' }),
          employeesService.getCostCenters(),
        ]);
        setEmployees(
          empResponse.data.map((e) => ({
            id: e.id,
            name: e.name || 'Sin nombre',
          }))
        );
        setCostCenters(ccResponse);
      } catch {
        // silently fail
      }
    };
    loadData();
  }, [needsEmployeeList]);

  // ==================== ASISTENCIA ====================

  const handleCheckin = useCallback(async () => {
    if (isAdminCheckin) {
      // Modo admin: mostrar dialogo con selector de empleado
      setCheckinEmployeeId('');
      setCheckinNotes('');
      setShowCheckinDialog(true);
    } else {
      // Modo self-service: enviar directamente sin third_party_id
      setLoadingCheckin(true);
      try {
        await attendanceService.checkin({});
        toast.success('Entrada registrada');
        setRefreshKey((k) => k + 1);
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'Error al registrar entrada');
      } finally {
        setLoadingCheckin(false);
      }
    }
  }, [isAdminCheckin]);

  const handleCheckout = useCallback(async () => {
    if (isAdminCheckout) {
      // Modo admin: mostrar dialogo con selector de empleado
      setCheckinEmployeeId('');
      setCheckinNotes('');
      setShowCheckoutDialog(true);
    } else {
      // Modo self-service: enviar directamente sin third_party_id
      setLoadingCheckin(true);
      try {
        await attendanceService.checkout({});
        toast.success('Salida registrada');
        setRefreshKey((k) => k + 1);
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'Error al registrar salida');
      } finally {
        setLoadingCheckin(false);
      }
    }
  }, [isAdminCheckout]);

  const executeCheckin = async () => {
    if (!checkinEmployeeId) {
      toast.error('Selecciona un empleado');
      return;
    }
    setLoadingCheckin(true);
    try {
      await attendanceService.checkin({
        third_party_id: checkinEmployeeId,
        notes: checkinNotes || undefined,
      });
      toast.success('Entrada registrada');
      setShowCheckinDialog(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al registrar entrada');
    } finally {
      setLoadingCheckin(false);
    }
  };

  const executeCheckout = async () => {
    if (!checkinEmployeeId) {
      toast.error('Selecciona un empleado');
      return;
    }
    setLoadingCheckin(true);
    try {
      await attendanceService.checkout({
        third_party_id: checkinEmployeeId,
        notes: checkinNotes || undefined,
      });
      toast.success('Salida registrada');
      setShowCheckoutDialog(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al registrar salida');
    } finally {
      setLoadingCheckin(false);
    }
  };

  // ==================== HORAS EXTRAS ====================

  const handleCreateOvertime = useCallback(() => {
    setEditingOvertime(null);
    setShowOvertimeForm(true);
  }, []);

  const handleEditOvertime = useCallback((record: OvertimeRecord) => {
    setEditingOvertime(record);
    setShowOvertimeForm(true);
  }, []);

  const handleOvertimeSuccess = () => {
    setShowOvertimeForm(false);
    setEditingOvertime(null);
    setRefreshKey((k) => k + 1);
  };

  const handleApproveOvertime = useCallback((record: OvertimeRecord) => {
    setConfirmAction({ type: 'approve_overtime', record });
  }, []);

  const handleDeleteOvertime = useCallback((record: OvertimeRecord) => {
    setConfirmAction({ type: 'delete_overtime', record });
  }, []);

  const handleRejectOvertime = useCallback((record: OvertimeRecord) => {
    setRejectingOvertime(record);
    setRejectionReason('');
  }, []);

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setLoadingAction(true);
    try {
      if (confirmAction.type === 'approve_overtime') {
        await attendanceService.approveOvertime(confirmAction.record.id);
        toast.success('Hora extra aprobada');
      } else if (confirmAction.type === 'delete_overtime') {
        await attendanceService.deleteOvertime(confirmAction.record.id);
        toast.success('Hora extra eliminada');
      }
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al realizar la accion');
    } finally {
      setLoadingAction(false);
      setConfirmAction(null);
    }
  };

  const executeReject = async () => {
    if (!rejectingOvertime) return;
    if (rejectionReason.length < 5) {
      toast.error('La razon debe tener al menos 5 caracteres');
      return;
    }
    setLoadingReject(true);
    try {
      await attendanceService.rejectOvertime(rejectingOvertime.id, rejectionReason);
      toast.success('Hora extra rechazada');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al rechazar');
    } finally {
      setLoadingReject(false);
      setRejectingOvertime(null);
      setRejectionReason('');
    }
  };

  const getConfirmTitle = () => {
    if (!confirmAction) return '';
    return confirmAction.type === 'approve_overtime' ? 'Aprobar Hora Extra' : 'Eliminar Hora Extra';
  };

  const getConfirmDescription = () => {
    if (!confirmAction) return '';
    const name = confirmAction.record.third_party?.name || 'este registro';
    if (confirmAction.type === 'approve_overtime') {
      return `¿Esta seguro que desea aprobar la hora extra de "${name}"?`;
    }
    return `¿Esta seguro que desea eliminar la hora extra de "${name}"? Esta accion no se puede deshacer.`;
  };

  return (
    <ProtectedRoute
      anyPermission={['attendance.view', 'attendance.self_view']}
      deniedMessage="No tienes permisos para ver Control de Tiempo."
    >
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-indigo-500 text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asistencia</h1>
                <p className="text-sm text-muted-foreground">
                  Gestiona la asistencia y horas extras de los empleados.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Estadisticas */}
        <AttendanceStats key={`stats-${refreshKey}`} />

        {/* Tabs */}
        <Tabs defaultValue="attendance">
          <TabsList>
            <TabsTrigger value="attendance">Asistencia</TabsTrigger>
            {canDoViewOvertime && <TabsTrigger value="overtime">Horas Extras</TabsTrigger>}
          </TabsList>

          <TabsContent value="attendance">
            <AttendanceList
              key={`att-${refreshKey}`}
              canEdit={canEditAttendance}
              canCheckin={canDoCheckin}
              canCheckout={canDoCheckout}
              onCheckin={handleCheckin}
              onCheckout={handleCheckout}
            />
          </TabsContent>

          {canDoViewOvertime && (
            <TabsContent value="overtime">
              <div className="mb-4">
                {canDoCreateOvertime && (
                  <Button onClick={handleCreateOvertime} disabled={loadingCheckin}>
                    <Plus className="h-4 w-4 mr-2" />
                    {canSelfRequestOvertime && !canCreateOvertime
                      ? 'Solicitar Hora Extra'
                      : 'Nueva Hora Extra'}
                  </Button>
                )}
              </div>
              <OvertimeList
                key={`ot-${refreshKey}`}
                canEdit={canEditOvertime}
                canDelete={canDeleteOvertime}
                canApprove={canApproveOvertime}
                canReject={canRejectOvertime}
                onEdit={handleEditOvertime}
                onDelete={handleDeleteOvertime}
                onApprove={handleApproveOvertime}
                onReject={handleRejectOvertime}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Modal Checkin (solo modo admin) */}
        <Dialog open={showCheckinDialog} onOpenChange={setShowCheckinDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Marcar Entrada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Empleado *</Label>
                <SearchableSelect
                  options={employeeSearchOptions}
                  value={checkinEmployeeId}
                  onChange={(v) => setCheckinEmployeeId(v ?? '')}
                  emptyMessage="No se encontraron empleados"
                />
              </div>
              <div>
                <Label>Notas (opcional)</Label>
                <Input
                  value={checkinNotes}
                  onChange={(e) => setCheckinNotes(e.target.value)}
                  placeholder="Notas"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCheckinDialog(false)} disabled={loadingCheckin}>
                  Cancelar
                </Button>
                <Button onClick={executeCheckin} disabled={loadingCheckin}>
                  {loadingCheckin ? 'Registrando...' : 'Registrar Entrada'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Checkout (solo modo admin) */}
        <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Marcar Salida</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Empleado *</Label>
                <SearchableSelect
                  options={employeeSearchOptions}
                  value={checkinEmployeeId}
                  onChange={(v) => setCheckinEmployeeId(v ?? '')}
                  emptyMessage="No se encontraron empleados"
                />
              </div>
              <div>
                <Label>Notas (opcional)</Label>
                <Input
                  value={checkinNotes}
                  onChange={(e) => setCheckinNotes(e.target.value)}
                  placeholder="Notas"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCheckoutDialog(false)} disabled={loadingCheckin}>
                  Cancelar
                </Button>
                <Button onClick={executeCheckout} disabled={loadingCheckin}>
                  {loadingCheckin ? 'Registrando...' : 'Registrar Salida'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Overtime Form */}
        <OvertimeForm
          open={showOvertimeForm}
          onClose={() => {
            setShowOvertimeForm(false);
            setEditingOvertime(null);
          }}
          onSuccess={handleOvertimeSuccess}
          initialData={editingOvertime}
          employees={employees}
          costCenters={costCenters}
          selfService={!isAdminOvertime}
        />

        {/* Dialogo de Confirmacion (Aprobar/Eliminar HE) */}
        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{getConfirmTitle()}</AlertDialogTitle>
              <AlertDialogDescription>{getConfirmDescription()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loadingAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeConfirmAction}
                disabled={loadingAction}
                className={
                  confirmAction?.type === 'delete_overtime'
                    ? 'bg-red-600 hover:bg-red-700'
                    : ''
                }
              >
                {loadingAction ? 'Procesando...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialogo Rechazar HE */}
        <AlertDialog open={!!rejectingOvertime} onOpenChange={() => setRejectingOvertime(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rechazar Hora Extra</AlertDialogTitle>
              <AlertDialogDescription>
                Ingresa la razon del rechazo para la hora extra de &quot;{rejectingOvertime?.third_party?.name || ''}&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Razon del rechazo (minimo 5 caracteres)"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loadingReject}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeReject}
                disabled={loadingReject || rejectionReason.length < 5}
                className="bg-red-600 hover:bg-red-700"
              >
                {loadingReject ? 'Rechazando...' : 'Rechazar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
