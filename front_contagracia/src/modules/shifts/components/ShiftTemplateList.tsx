'use client';

import { useState } from 'react';
import { Clock, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { TimePicker } from '@/shared/components/ui/time-picker';
import { ColorPicker } from '@/shared/components/ui/color-picker';
import { usePermissions } from '@/shared/hooks/usePermissions';
import type { ShiftTemplate, CreateShiftTemplateDto } from '../types';
import { SHIFT_TYPE_LABELS } from '../types';

interface Props {
  templates: ShiftTemplate[];
  loading: boolean;
  onCreate: (data: CreateShiftTemplateDto) => Promise<any>;
  onUpdate: (id: string, data: Partial<CreateShiftTemplateDto>) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
}

const EMPTY_FORM: CreateShiftTemplateDto = {
  name: '', shift_type: 'MORNING', start_time: '06:00', end_time: '14:00',
  total_hours: 8, color: '#3B82F6',
};

export function ShiftTemplateList({ templates, loading, onCreate, onUpdate, onDelete }: Props) {
  const { can } = usePermissions();
  const canCreate = can('shifts.templates.create');
  const canEdit = can('shifts.templates.edit');
  const canDelete = can('shifts.templates.delete');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftTemplate | null>(null);
  const [form, setForm] = useState<CreateShiftTemplateDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm(EMPTY_FORM); setEditing(null); setOpen(true); };
  const openEdit = (t: ShiftTemplate) => {
    setForm({
      name: t.name, code: t.code, shift_type: t.shift_type,
      start_time: t.start_time, end_time: t.end_time,
      break_start: t.break_start, break_end: t.break_end,
      break_minutes: t.break_minutes, total_hours: t.total_hours,
      color: t.color, description: t.description, is_overnight: t.is_overnight,
    });
    setEditing(t);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.start_time || !form.end_time) return;
    setSaving(true);
    try {
      if (editing) {
        await onUpdate(editing.id, form);
      } else {
        await onCreate(form);
      }
      setOpen(false);
    } catch {
      // toast is handled in hook
    } finally {
      setSaving(false);
    }
  };

  const activeTemplates = templates.filter(t => t.is_active);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Plantillas de Turno</h2>
        {canCreate && (
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nueva Plantilla</Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>
          ))}
        </div>
      ) : activeTemplates.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No hay plantillas de turno.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTemplates.map(t => (
            <Card key={t.id} className="relative overflow-hidden">
              <div className="h-1" style={{ backgroundColor: t.color || '#6B7280' }} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    {t.code && <p className="text-sm text-muted-foreground">{t.code}</p>}
                  </div>
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar esta plantilla?')) onDelete(t.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800">{SHIFT_TYPE_LABELS[t.shift_type]}</span>
                  {t.is_overnight && <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">Nocturno</span>}
                </div>
                <p className="text-sm flex items-center gap-1"><Clock className="h-3 w-3" />{t.start_time} - {t.end_time}</p>
                {t.break_minutes > 0 && <p className="text-xs text-muted-foreground">Descanso: {t.break_minutes} min</p>}
                <p className="text-sm font-medium">{t.total_hours}h netas</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Plantilla' : 'Nueva Plantilla de Turno'}</DialogTitle>
            <DialogDescription>Define los horarios y características del turno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Turno Mañana" /></div>
              <div><Label>Código</Label><Input value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="TM-01" /></div>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                options={Object.entries(SHIFT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                value={form.shift_type}
                onChange={v => setForm(f => ({ ...f, shift_type: v as any }))}
              />
            </div>
            <ColorPicker
              label="Color"
              value={form.color || '#3B82F6'}
              onChange={color => setForm(f => ({ ...f, color }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Hora Inicio *</Label><TimePicker value={form.start_time} onChange={v => setForm(f => ({ ...f, start_time: v }))} usePortal /></div>
              <div><Label>Hora Fin *</Label><TimePicker value={form.end_time} onChange={v => setForm(f => ({ ...f, end_time: v }))} usePortal /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Descanso Inicio</Label><TimePicker value={form.break_start || ''} onChange={v => setForm(f => ({ ...f, break_start: v }))} clearable usePortal /></div>
              <div><Label>Descanso Fin</Label><TimePicker value={form.break_end || ''} onChange={v => setForm(f => ({ ...f, break_end: v }))} clearable usePortal /></div>
              <div><Label>Min. Descanso</Label><Input type="number" value={form.break_minutes || 0} onChange={e => setForm(f => ({ ...f, break_minutes: Number(e.target.value) }))} min={0} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Horas Netas *</Label><Input type="number" step="0.5" value={form.total_hours} onChange={e => setForm(f => ({ ...f, total_hours: Number(e.target.value) }))} /></div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.is_overnight || false}
                  onCheckedChange={v => setForm(f => ({
                    ...f,
                    is_overnight: v,
                    shift_type: v ? 'NIGHT' : 'MORNING',
                    start_time: v ? '22:00' : '06:00',
                    end_time: v ? '06:00' : '14:00',
                    total_hours: v ? 8 : 8,
                  }))}
                />
                <Label>Nocturno</Label>
              </div>
            </div>
            <div><Label>Descripción</Label><Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{editing ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
