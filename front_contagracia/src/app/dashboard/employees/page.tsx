'use client';

import { useState, useCallback } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Button } from '@/shared/components/ui/button';
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
import { Users, Plus } from 'lucide-react';
import {
  EmployeesList,
  EmployeeForm,
  EmployeeDetail,
  employeesService,
} from '@/modules/hr';
import type { Employee } from '@/modules/hr';
import toast from 'react-hot-toast';

export default function EmployeesPage() {
  const { can } = usePermissions();
  const canCreate = can('employees.create');
  const canEdit = can('employees.edit');
  const canCreateContract = can('employees.contracts.create');
  const canEditContract = can('employees.contracts.edit');
  const canRenewContract = can('employees.contracts.renew');
  const canEditSalary = can('employees.salary.edit');
  const canActivate = can('employees.activate');
  const canDeactivate = can('employees.deactivate');
  const canTerminate = can('employees.terminate');
  const canDelete = can('employees.delete');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Estados para confirmaciones
  const [confirmAction, setConfirmAction] = useState<{
    type: 'activate' | 'deactivate' | 'terminate' | 'delete';
    employee: Employee;
  } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setRefreshKey((k) => k + 1);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedEmployee(null);
    setRefreshKey((k) => k + 1);
  };

  const handleView = useCallback(async (employee: Employee) => {
    try {
      const fullData = await employeesService.getOne(employee.id);
      setSelectedEmployee(fullData);
      setShowDetailModal(true);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar empleado');
    }
  }, []);

  const handleEdit = useCallback(async (employee: Employee) => {
    setLoadingEdit(true);
    try {
      const fullData = await employeesService.getOne(employee.id);
      setSelectedEmployee(fullData);
      setShowEditModal(true);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar empleado');
    } finally {
      setLoadingEdit(false);
    }
  }, []);

  const handleDetailRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleActivate = useCallback((employee: Employee) => {
    setConfirmAction({ type: 'activate', employee });
  }, []);

  const handleDeactivate = useCallback((employee: Employee) => {
    setConfirmAction({ type: 'deactivate', employee });
  }, []);

  const handleTerminate = useCallback((employee: Employee) => {
    setConfirmAction({ type: 'terminate', employee });
  }, []);

  const handleDelete = useCallback((employee: Employee) => {
    setConfirmAction({ type: 'delete', employee });
  }, []);

  const executeAction = async () => {
    if (!confirmAction) return;

    setLoadingAction(true);
    try {
      switch (confirmAction.type) {
        case 'activate':
          await employeesService.activate(confirmAction.employee.id);
          toast.success('Empleado activado');
          break;
        case 'deactivate':
          await employeesService.deactivate(confirmAction.employee.id);
          toast.success('Empleado desactivado');
          break;
        case 'terminate':
          await employeesService.terminate(confirmAction.employee.id);
          toast.success('Contrato terminado');
          break;
        case 'delete':
          await employeesService.delete(confirmAction.employee.id);
          toast.success('Empleado eliminado');
          break;
      }
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Error al realizar la accion');
    } finally {
      setLoadingAction(false);
      setConfirmAction(null);
    }
  };

  const getConfirmTitle = () => {
    if (!confirmAction) return '';
    const titles = {
      activate: 'Activar Empleado',
      deactivate: 'Desactivar Empleado',
      terminate: 'Terminar Contrato',
      delete: 'Eliminar Empleado',
    };
    return titles[confirmAction.type];
  };

  const getConfirmDescription = () => {
    if (!confirmAction) return '';
    const name = confirmAction.employee.name || 'este empleado';
    const descriptions = {
      activate: `¿Esta seguro que desea activar al empleado "${name}"?`,
      deactivate: `¿Esta seguro que desea desactivar al empleado "${name}"?`,
      terminate: `¿Esta seguro que desea terminar el contrato del empleado "${name}"? Esta accion cambiara su estado a TERMINADO.`,
      delete: `¿Esta seguro que desea eliminar al empleado "${name}"? Esta accion no se puede deshacer.`,
    };
    return descriptions[confirmAction.type];
  };

  return (
    <ProtectedRoute permission="employees.view" deniedMessage="No tienes permisos para ver Empleados.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-indigo-500 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Empleados</h1>
                <p className="text-sm text-muted-foreground">
                  Gestiona los empleados de tu empresa.
                </p>
              </div>
            </div>
            {canCreate && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Empleado
              </Button>
            )}
          </div>
        </header>

        {/* Lista de empleados */}
        <EmployeesList
          key={refreshKey}
          canEdit={canEdit}
          canActivate={canActivate}
          canDeactivate={canDeactivate}
          canTerminate={canTerminate}
          canDelete={canDelete}
          onView={handleView}
          onEdit={handleEdit}
          onActivate={handleActivate}
          onDeactivate={handleDeactivate}
          onTerminate={handleTerminate}
          onDelete={handleDelete}
        />

        {/* Loading overlay for edit */}
        {loadingEdit && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
              <span>Cargando...</span>
            </div>
          </div>
        )}

        {/* Modal Crear */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Empleado</DialogTitle>
            </DialogHeader>
            <EmployeeForm
              mode="create"
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateModal(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Modal Editar */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Empleado</DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <EmployeeForm
                mode="edit"
                initialData={selectedEmployee}
                onSuccess={handleEditSuccess}
                onCancel={() => {
                  setShowEditModal(false);
                  setSelectedEmployee(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Detalle (solo lectura) */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle del Empleado</DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <EmployeeDetail
                employee={selectedEmployee}
                canViewContracts={can('employees.contracts.view')}
                canViewSalary={can('employees.salary.view')}
                canEditContract={canEditContract}
                canRenewContract={canRenewContract}
                canCreateContract={canCreateContract}
                canEditSalary={canEditSalary}
                canTerminate={canTerminate}
                onRefresh={handleDetailRefresh}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialogo de Confirmacion */}
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
                    : confirmAction?.type === 'terminate'
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
