'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
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
  BarChart3,
  Plus,
  Brain,
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
} from 'lucide-react';
import {
  EvaluationsList,
  EvaluationForm,
  DashboardTab,
  EmployeeAnalysisTab,
  ReportsTab,
  evaluationsService,
  useDashboard,
} from '@/modules/performance-evaluations';
import { employeesService } from '@/modules/hr';
import type { Evaluation } from '@/modules/performance-evaluations';
import toast from 'react-hot-toast';

interface SimpleEmployee {
  id: string;
  name: string;
}

export default function PerformanceEvaluationsPage() {
  const { can } = usePermissions();
  const canCreate = can('performance.create');
  const canEdit = can('performance.edit');
  const canComplete = can('performance.complete');
  const canApprove = can('performance.approve');
  const canDelete = can('performance.delete');
  const canAutoGenerate = can('performance.auto_generate');
  const canViewDashboard = can('performance.view');

  // Dashboard data — solo se carga si el usuario tiene performance.view
  const {
    data: dashboardData,
    loading: dashboardLoading,
    filters,
    updateFilters,
    refetch: refetchDashboard,
  } = useDashboard({ period: '3m' }, canViewDashboard);

  // CRUD state
  const [showForm, setShowForm] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'complete' | 'approve';
    evaluation: Evaluation;
  } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [generating, setGenerating] = useState(false);

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
    setSelectedEvaluation(null);
    setRefreshKey((k) => k + 1);
    refetchDashboard();
  };

  const handleEdit = useCallback((evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setShowForm(true);
  }, []);

  const handleComplete = useCallback((evaluation: Evaluation) => {
    setConfirmAction({ type: 'complete', evaluation });
  }, []);

  const handleApprove = useCallback((evaluation: Evaluation) => {
    setConfirmAction({ type: 'approve', evaluation });
  }, []);

  const executeAction = async () => {
    if (!confirmAction) return;
    setLoadingAction(true);
    try {
      if (confirmAction.type === 'complete') {
        await evaluationsService.complete(confirmAction.evaluation.id);
        toast.success('Evaluación completada');
      } else {
        await evaluationsService.approve(confirmAction.evaluation.id);
        toast.success('Evaluación aprobada');
      }
      setRefreshKey((k) => k + 1);
      refetchDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al procesar');
    } finally {
      setLoadingAction(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = useCallback(async (evaluation: Evaluation) => {
    try {
      await evaluationsService.remove(evaluation.id);
      toast.success('Evaluación eliminada');
      setRefreshKey((k) => k + 1);
      refetchDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al eliminar');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const result = await evaluationsService.generate({
        evaluation_period: period,
        date_from: filters.date_from,
        date_to: filters.date_to,
      });
      toast.success(
        `${result.generated_count} evaluación(es) generada(s). ${result.skipped_count} omitida(s).`
      );
      setRefreshKey((k) => k + 1);
      refetchDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al generar evaluaciones');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ProtectedRoute
      anyPermission={['performance.view', 'performance.self_view']}
      deniedMessage="No tienes permisos para ver Evaluaciones de Desempeño."
    >
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-purple-500 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Evaluaciones de Desempeño
                </h1>
                <p className="text-sm text-muted-foreground">
                  Dashboard inteligente, análisis y gestión de evaluaciones.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {canAutoGenerate && (
                <Button
                  variant="outline"
                  onClick={handleAutoGenerate}
                  disabled={generating || dashboardLoading}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {generating ? 'Generando...' : 'Generar Automáticas'}
                </Button>
              )}
              {canCreate && (
                <Button onClick={() => { setSelectedEvaluation(null); setShowForm(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Evaluación
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Tab Layout — Dashboard/Análisis/Reportes solo con performance.view */}
        <Tabs defaultValue={canViewDashboard ? 'dashboard' : 'evaluations'} className="space-y-6">
          <TabsList className={`grid w-full ${canViewDashboard ? 'grid-cols-4' : 'grid-cols-1'}`}>
            {canViewDashboard && (
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
            )}
            {canViewDashboard && (
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Análisis</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="evaluations" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Evaluaciones</span>
            </TabsTrigger>
            {canViewDashboard && (
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Reportes</span>
              </TabsTrigger>
            )}
          </TabsList>

          {canViewDashboard && (
            <TabsContent value="dashboard">
              <DashboardTab
                data={dashboardData}
                loading={dashboardLoading}
                filters={filters}
                updateFilters={updateFilters}
              />
            </TabsContent>
          )}

          {canViewDashboard && (
            <TabsContent value="analysis">
              <EmployeeAnalysisTab
                data={dashboardData}
                loading={dashboardLoading}
              />
            </TabsContent>
          )}

          <TabsContent value="evaluations">
            <EvaluationsList
              key={refreshKey}
              canEdit={canEdit}
              canComplete={canComplete}
              canApprove={canApprove}
              canDelete={canDelete}
              onEdit={handleEdit}
              onComplete={handleComplete}
              onApprove={handleApprove}
              onDelete={handleDelete}
            />
          </TabsContent>

          {canViewDashboard && (
            <TabsContent value="reports">
              <ReportsTab data={dashboardData} loading={dashboardLoading} />
            </TabsContent>
          )}
        </Tabs>

        {/* Form Dialog */}
        <EvaluationForm
          open={showForm}
          onClose={() => { setShowForm(false); setSelectedEvaluation(null); }}
          onSuccess={handleFormSuccess}
          initialData={selectedEvaluation}
          employees={employees}
        />

        {/* Complete/Approve Confirmation */}
        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction?.type === 'complete' ? 'Completar Evaluación' : 'Aprobar Evaluación'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction?.type === 'complete'
                  ? `¿Está seguro que desea completar la evaluación de "${confirmAction?.evaluation?.third_party?.name}"? Una vez completada, no podrá editar los puntajes.`
                  : `¿Está seguro que desea aprobar la evaluación de "${confirmAction?.evaluation?.third_party?.name}"? Esta acción es definitiva.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loadingAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={executeAction} disabled={loadingAction}>
                {loadingAction ? 'Procesando...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
