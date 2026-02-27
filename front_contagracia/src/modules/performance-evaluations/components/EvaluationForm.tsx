'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
import toast from 'react-hot-toast';
import { evaluationsService } from '../services/evaluations.service';
import type { Evaluation, CreateEvaluationDto, UpdateEvaluationDto } from '../types';

interface Employee {
  id: string;
  name: string;
}

interface EvaluationFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Evaluation | null;
  employees: Employee[];
}

export function EvaluationForm({
  open,
  onClose,
  onSuccess,
  initialData,
  employees,
}: EvaluationFormProps) {
  const isEdit = !!initialData;

  const [employeeId, setEmployeeId] = useState('');
  const [evaluationPeriod, setEvaluationPeriod] = useState('');
  const [evaluationDate, setEvaluationDate] = useState('');
  const [attendanceScore, setAttendanceScore] = useState('');
  const [performanceScore, setPerformanceScore] = useState('');
  const [attitudeScore, setAttitudeScore] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [goalsNextPeriod, setGoalsNextPeriod] = useState('');
  const [evaluatorComments, setEvaluatorComments] = useState('');
  const [employeeComments, setEmployeeComments] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setEmployeeId(initialData.third_party_id);
      setEvaluationPeriod(initialData.evaluation_period);
      setEvaluationDate(initialData.evaluation_date?.split('T')[0] || '');
      setAttendanceScore(initialData.attendance_score?.toString() || '');
      setPerformanceScore(initialData.performance_score?.toString() || '');
      setAttitudeScore(initialData.attitude_score?.toString() || '');
      setStrengths(initialData.strengths || '');
      setAreasForImprovement(initialData.areas_for_improvement || '');
      setGoalsNextPeriod(initialData.goals_next_period || '');
      setEvaluatorComments(initialData.evaluator_comments || '');
      setEmployeeComments(initialData.employee_comments || '');
    } else {
      const now = new Date();
      setEmployeeId('');
      setEvaluationPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      setEvaluationDate(now.toISOString().split('T')[0]);
      setAttendanceScore('');
      setPerformanceScore('');
      setAttitudeScore('');
      setStrengths('');
      setAreasForImprovement('');
      setGoalsNextPeriod('');
      setEvaluatorComments('');
      setEmployeeComments('');
    }
  }, [initialData, open]);

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));

  const validateScore = (value: string): number | undefined => {
    if (!value) return undefined;
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 0 || n > 100) return undefined;
    return n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !evaluationPeriod || !evaluationDate) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    const att = validateScore(attendanceScore);
    const perf = validateScore(performanceScore);
    const attitude = validateScore(attitudeScore);

    if (attendanceScore && att === undefined) {
      toast.error('El puntaje de asistencia debe ser entre 0 y 100');
      return;
    }
    if (performanceScore && perf === undefined) {
      toast.error('El puntaje de desempeño debe ser entre 0 y 100');
      return;
    }
    if (attitudeScore && attitude === undefined) {
      toast.error('El puntaje de actitud debe ser entre 0 y 100');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && initialData) {
        const data: UpdateEvaluationDto = {
          evaluation_period: evaluationPeriod,
          evaluation_date: evaluationDate,
          attendance_score: att,
          performance_score: perf,
          attitude_score: attitude,
          strengths: strengths || undefined,
          areas_for_improvement: areasForImprovement || undefined,
          goals_next_period: goalsNextPeriod || undefined,
          evaluator_comments: evaluatorComments || undefined,
          employee_comments: employeeComments || undefined,
        };
        await evaluationsService.update(initialData.id, data);
        toast.success('Evaluación actualizada');
      } else {
        const data: CreateEvaluationDto = {
          third_party_id: employeeId,
          evaluation_period: evaluationPeriod,
          evaluation_date: evaluationDate,
          attendance_score: att,
          performance_score: perf,
          attitude_score: attitude,
          strengths: strengths || undefined,
          areas_for_improvement: areasForImprovement || undefined,
          goals_next_period: goalsNextPeriod || undefined,
          evaluator_comments: evaluatorComments || undefined,
          employee_comments: employeeComments || undefined,
        };
        await evaluationsService.create(data);
        toast.success('Evaluación creada');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const previewAtt = validateScore(attendanceScore);
  const previewPerf = validateScore(performanceScore);
  const previewAttitude = validateScore(attitudeScore);
  const calculatedOverall =
    previewAtt !== undefined && previewPerf !== undefined && previewAttitude !== undefined
      ? (previewAtt * 0.3 + previewPerf * 0.5 + previewAttitude * 0.2).toFixed(2)
      : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Evaluación' : 'Nueva Evaluación'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Empleado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Empleado *
            </label>
            <Select
              options={employeeOptions}
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="Seleccionar empleado"
              searchable
              disabled={isEdit}
            />
          </div>

          {/* Periodo y Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Periodo *
              </label>
              <Input
                type="month"
                value={evaluationPeriod}
                onChange={(e) => setEvaluationPeriod(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Fecha de Evaluación *
              </label>
              <DatePicker
                value={evaluationDate}
                onChange={setEvaluationDate}
                usePortal
              />
            </div>
          </div>

          {/* Puntajes */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Asistencia (0-100)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={attendanceScore}
                onChange={(e) => setAttendanceScore(e.target.value)}
                placeholder="0-100"
              />
              <p className="text-xs text-gray-400 mt-1">Peso: 30%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Desempeño (0-100)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={performanceScore}
                onChange={(e) => setPerformanceScore(e.target.value)}
                placeholder="0-100"
              />
              <p className="text-xs text-gray-400 mt-1">Peso: 50%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Actitud (0-100)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={attitudeScore}
                onChange={(e) => setAttitudeScore(e.target.value)}
                placeholder="0-100"
              />
              <p className="text-xs text-gray-400 mt-1">Peso: 20%</p>
            </div>
          </div>

          {/* Preview del score global */}
          {calculatedOverall && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
              <span className="text-sm text-gray-600 dark:text-slate-300">Puntaje Global Estimado: </span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {calculatedOverall}
              </span>
            </div>
          )}

          {/* Fortalezas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Fortalezas
            </label>
            <Textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="Fortalezas identificadas del empleado..."
              rows={2}
            />
          </div>

          {/* Áreas de mejora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Áreas de Mejora
            </label>
            <Textarea
              value={areasForImprovement}
              onChange={(e) => setAreasForImprovement(e.target.value)}
              placeholder="Áreas en las que el empleado puede mejorar..."
              rows={2}
            />
          </div>

          {/* Metas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Metas Próximo Periodo
            </label>
            <Textarea
              value={goalsNextPeriod}
              onChange={(e) => setGoalsNextPeriod(e.target.value)}
              placeholder="Objetivos para el siguiente periodo..."
              rows={2}
            />
          </div>

          {/* Comentarios */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Comentarios del Evaluador
              </label>
              <Textarea
                value={evaluatorComments}
                onChange={(e) => setEvaluatorComments(e.target.value)}
                placeholder="Comentarios adicionales..."
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Comentarios del Empleado
              </label>
              <Textarea
                value={employeeComments}
                onChange={(e) => setEmployeeComments(e.target.value)}
                placeholder="Comentarios del empleado..."
                rows={2}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
