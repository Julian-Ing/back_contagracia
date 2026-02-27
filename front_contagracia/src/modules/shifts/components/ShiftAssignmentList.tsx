'use client';

import { useState } from 'react';
import { Plus, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ShiftAssignment, ShiftTemplate, ShiftSchedule, CreateAssignmentDto, QueryAssignmentsParams } from '../types';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_COLORS } from '../types';

interface Props {
  assignments: ShiftAssignment[];
  total: number;
  loading: boolean;
  params: QueryAssignmentsParams;
  templates: ShiftTemplate[];
  schedules: ShiftSchedule[];
  employees: { id: string; name: string }[];
  onCreate: (data: CreateAssignmentDto) => Promise<any>;
  onCancel: (id: string) => Promise<void>;
  onUpdateFilters: (params: Partial<QueryAssignmentsParams>) => void;
}

export function ShiftAssignmentList({ assignments, total, loading, params, templates, schedules, employees, onCreate, onCancel, onUpdateFilters }: Props) {
  const { can } = usePermissions();
  const canCreate = can('shifts.assignments.create');
  const canDelete = can('shifts.assignments.delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateAssignmentDto>({
    third_party_id: '', shift_template_id: '', date: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.third_party_id || !form.shift_template_id || !form.date) return;
    setSaving(true);
    try {
      await onCreate(form);
      setOpen(false);
      setForm({ third_party_id: '', shift_template_id: '', date: '' });
    } catch {
      // handled in hook
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d: string) => {
    try { return format(new Date(d), 'dd MMM yyyy', { locale: es }); } catch { return d; }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Asignaciones de Turno</h2>
        {canCreate && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Asignar Turno</Button>}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><Label>Desde</Label><DatePicker value={params.date_from || ''} onChange={v => onUpdateFilters({ date_from: v })} placeholder="Fecha desde" /></div>
            <div><Label>Hasta</Label><DatePicker value={params.date_to || ''} onChange={v => onUpdateFilters({ date_to: v })} placeholder="Fecha hasta" /></div>
            <div>
              <Label>Empleado</Label>
              <SearchableSelect
                options={[{ value: 'all', label: 'Todos' }, ...employees.map(e => ({ value: e.id, label: e.name }))]}
                value={params.third_party_id || 'all'}
                onChange={v => onUpdateFilters({ third_party_id: v === 'all' ? undefined : v })}
                placeholder="Todos"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => onUpdateFilters({})}>
                <RefreshCw className="h-4 w-4 mr-2" />Filtrar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <div className="rounded-md border dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empleado</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Turno</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Horario</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Cargando...</td></tr>
            ) : assignments.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hay asignaciones.</td></tr>
            ) : assignments.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3">{fmtDate(a.date)}</td>
                <td className="px-4 py-3">{a.third_party?.name || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {a.shift_template?.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.shift_template.color }} />}
                    {a.shift_template?.name || '-'}
                  </div>
                </td>
                <td className="px-4 py-3">{a.custom_start_time || a.shift_template?.start_time || '-'} - {a.custom_end_time || a.shift_template?.end_time || '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${ASSIGNMENT_STATUS_COLORS[a.status]}`}>{ASSIGNMENT_STATUS_LABELS[a.status]}</span></td>
                <td className="px-4 py-3">
                  {canDelete && (a.status === 'ASSIGNED' || a.status === 'CONFIRMED') && (
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm('¿Cancelar esta asignación?')) onCancel(a.id); }}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">{total} asignaciones encontradas</p>

      {/* Modal Asignar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Turno</DialogTitle>
            <DialogDescription>Asigna un turno a un empleado para una fecha específica.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Empleado *</Label>
              <SearchableSelect
                options={employees.map(e => ({ value: e.id, label: e.name }))}
                value={form.third_party_id}
                onChange={v => setForm(f => ({ ...f, third_party_id: v }))}
                placeholder="Seleccionar empleado"
              />
            </div>
            <div>
              <Label>Turno *</Label>
              <Select
                options={templates.filter(t => t.is_active).map(t => ({ value: t.id, label: `${t.name} (${t.start_time} - ${t.end_time})` }))}
                value={form.shift_template_id}
                onChange={v => setForm(f => ({ ...f, shift_template_id: v }))}
                placeholder="Seleccionar turno"
              />
            </div>
            <div><Label>Fecha *</Label><DatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} placeholder="Seleccionar fecha" usePortal /></div>
            <div>
              <Label>Programación (opcional)</Label>
              <Select
                options={[{ value: 'none', label: 'Sin programación' }, ...schedules.map(s => ({ value: s.id, label: s.name }))]}
                value={form.schedule_id || 'none'}
                onChange={v => setForm(f => ({ ...f, schedule_id: v === 'none' ? undefined : v }))}
                placeholder="Sin programación"
              />
            </div>
            <div><Label>Notas</Label><Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>Asignar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
