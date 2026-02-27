'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Button } from '@/shared/components/ui/button';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/components/ui/tabs';
import { ClipboardList, Plus, FileText } from 'lucide-react';
import {
  ObservationsList,
  ObservationForm,
  ObservationsReportsTab,
  observationsService,
} from '@/modules/employee-observations';
import { employeesService } from '@/modules/hr';
import type { Observation } from '@/modules/employee-observations';
import toast from 'react-hot-toast';

interface SimpleEmployee {
  id: string;
  name: string;
}

export default function EmployeeObservationsPage() {
  const { can } = usePermissions();
  const canCreate = can('observations.create');
  const canEdit = can('observations.edit');
  const canDelete = can('observations.delete');
  const canViewReports = can('observations.view');

  const [showForm, setShowForm] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);

  useEffect(() => {
    if (!canCreate && !canEdit) return;
    const loadEmployees = async () => {
      try {
        const response = await employeesService.getAll({ limit: 500, status: 'ACTIVE' });
        setEmployees(
          response.data.map((e) => ({
            id: e.id,
            name: e.name || 'Sin nombre',
          }))
        );
      } catch {
        // silently fail
      }
    };
    loadEmployees();
  }, [canCreate, canEdit]);

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedObservation(null);
    setRefreshKey((k) => k + 1);
  };

  const handleEdit = useCallback((observation: Observation) => {
    setSelectedObservation(observation);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (observation: Observation) => {
    try {
      await observationsService.remove(observation.id);
      toast.success('Observación eliminada');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al eliminar');
    }
  }, []);

  return (
    <ProtectedRoute
      anyPermission={['observations.view', 'observations.self_view']}
      deniedMessage="No tienes permisos para ver Observaciones."
    >
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-amber-500 text-white">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Observaciones de Empleados
                </h1>
                <p className="text-sm text-muted-foreground">
                  Registra y gestiona observaciones, reconocimientos e incidentes.
                </p>
              </div>
            </div>
            {canCreate && (
              <Button onClick={() => { setSelectedObservation(null); setShowForm(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Observación
              </Button>
            )}
          </div>
        </header>

        <Tabs defaultValue="observations" className="space-y-6">
          <TabsList className={`grid w-full ${canViewReports ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="observations" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Observaciones</span>
            </TabsTrigger>
            {canViewReports && (
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Reportes</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="observations">
            <ObservationsList
              key={refreshKey}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          {canViewReports && (
            <TabsContent value="reports">
              <ObservationsReportsTab refreshKey={refreshKey} />
            </TabsContent>
          )}
        </Tabs>

        <ObservationForm
          open={showForm}
          onClose={() => { setShowForm(false); setSelectedObservation(null); }}
          onSuccess={handleFormSuccess}
          initialData={selectedObservation}
          employees={employees}
        />
      </div>
    </ProtectedRoute>
  );
}
