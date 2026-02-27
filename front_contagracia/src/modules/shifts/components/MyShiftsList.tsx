'use client';

import { Clock, CheckCircle, Calendar } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ShiftAssignment } from '../types';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_COLORS } from '../types';

interface Props {
  myShifts: ShiftAssignment[];
  loading: boolean;
  onConfirm: (id: string) => Promise<void>;
}

export function MyShiftsList({ myShifts, loading, onConfirm }: Props) {
  const fmtDate = (d: string) => {
    try { return format(new Date(d), 'EEEE dd MMM yyyy', { locale: es }); } catch { return d; }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
        <Calendar className="h-5 w-5" />Mis Turnos
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>)}
        </div>
      ) : myShifts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No tienes turnos asignados próximamente.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myShifts.map(a => (
            <Card key={a.id} className="relative overflow-hidden">
              {a.shift_template?.color && <div className="h-1" style={{ backgroundColor: a.shift_template.color }} />}
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base capitalize">{fmtDate(a.date)}</CardTitle>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${ASSIGNMENT_STATUS_COLORS[a.status]}`}>
                    {ASSIGNMENT_STATUS_LABELS[a.status]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium text-gray-900 dark:text-white">{a.shift_template?.name || 'Sin turno'}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {a.custom_start_time || a.shift_template?.start_time} - {a.custom_end_time || a.shift_template?.end_time}
                </p>
                {a.schedule?.name && <p className="text-xs text-muted-foreground">{a.schedule.name}</p>}
                {a.notes && <p className="text-sm text-muted-foreground">{a.notes}</p>}
                {a.status === 'ASSIGNED' && (
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => onConfirm(a.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />Confirmar Turno
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
