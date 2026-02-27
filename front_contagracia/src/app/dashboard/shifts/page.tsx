'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Clock, CalendarDays } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  useShiftTemplates,
  useShiftSchedules,
  useShiftAssignments,
  useShiftSwaps,
  useMyShifts,
  ShiftTemplateList,
  ShiftAssignmentList,
  ShiftSwapList,
  MyShiftsList,
} from '@/modules/shifts';
import { employeesService } from '@/modules/hr';

export default function ShiftsPage() {
  const { can, canAny } = usePermissions();
  const isAdmin = canAny(['shifts.templates.view', 'shifts.assignments.view']);
  const canViewSelf = can('shifts.self.view');

  // Hooks — only fetch when user has admin permissions
  const templateHook = useShiftTemplates(isAdmin);
  const scheduleHook = useShiftSchedules(isAdmin);
  const assignmentHook = useShiftAssignments({}, isAdmin);
  const swapHook = useShiftSwaps(isAdmin);
  const myShiftsHook = useMyShifts(canViewSelf && !isAdmin);

  // Employees for assignment form
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    const loadEmployees = async () => {
      try {
        const response = await employeesService.getAll({ limit: 500, status: 'ACTIVE' });
        setEmployees(response.data.map((e: any) => ({ id: e.id, name: e.name || 'Sin nombre' })));
      } catch {
        // silently fail
      }
    };
    loadEmployees();
  }, [isAdmin]);

  const defaultTab = isAdmin ? 'templates' : 'my-shifts';

  return (
    <ProtectedRoute
      anyPermission={['shifts.templates.view', 'shifts.self.view']}
      deniedMessage="No tienes permisos para ver Gestión de Turnos."
    >
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-violet-500 text-white">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gestión de Turnos
              </h1>
              <p className="text-sm text-muted-foreground">
                Plantillas, programación, asignaciones e intercambios de turnos.
              </p>
            </div>
          </div>
        </header>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex-wrap">
            {isAdmin && <TabsTrigger value="templates">Plantillas</TabsTrigger>}
            {isAdmin && <TabsTrigger value="assignments">Asignaciones</TabsTrigger>}
            {isAdmin && <TabsTrigger value="swaps">Intercambios</TabsTrigger>}
            {canViewSelf && <TabsTrigger value="my-shifts">Mis Turnos</TabsTrigger>}
          </TabsList>

          {isAdmin && (
            <TabsContent value="templates">
              <ShiftTemplateList
                templates={templateHook.templates}
                loading={templateHook.loading}
                onCreate={templateHook.create}
                onUpdate={templateHook.update}
                onDelete={templateHook.remove}
              />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="assignments">
              <ShiftAssignmentList
                assignments={assignmentHook.assignments}
                total={assignmentHook.total}
                loading={assignmentHook.loading}
                params={assignmentHook.params}
                templates={templateHook.templates}
                schedules={scheduleHook.schedules}
                employees={employees}
                onCreate={assignmentHook.create}
                onCancel={assignmentHook.cancel}
                onUpdateFilters={assignmentHook.updateFilters}
              />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="swaps">
              <ShiftSwapList
                swaps={swapHook.swaps}
                loading={swapHook.loading}
                onApprove={swapHook.approve}
                onReject={swapHook.reject}
              />
            </TabsContent>
          )}

          {canViewSelf && (
            <TabsContent value="my-shifts">
              <MyShiftsList
                myShifts={myShiftsHook.myShifts}
                loading={myShiftsHook.loading}
                onConfirm={myShiftsHook.confirm}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
