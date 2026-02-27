'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import {
  CalendarClock,
  Plus,
  Calendar,
  Clock,
  Search,
  Filter,
  Megaphone,
  Building2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ListChecks,
  User,
  Phone,
  Mail,
  Users as UsersIcon,
  FileText,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CrmActivity {
  id: string;
  subject: string;
  description?: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  status: 'pending' | 'overdue' | 'completed' | 'canceled';
  due_date: string;
  completed_at?: string;
  lead_name?: string;
  opportunity_name?: string;
  user_name?: string;
  campaign_id?: string;
}

interface CrmCampaign {
  id: string;
  name: string;
  channel: 'email' | 'social' | 'ads' | 'manual' | 'web' | 'whatsapp';
  status: 'active' | 'paused' | 'finished';
  business_hours?: {
    timezone: string;
    schedule: Record<string, { enabled: boolean; start: string; end: string }>;
  };
}

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_CAMPAIGNS: CrmCampaign[] = [
  {
    id: 'c1',
    name: 'Campaña Email Q1',
    channel: 'email',
    status: 'active',
    business_hours: {
      timezone: 'America/Bogota',
      schedule: {
        monday: { enabled: true, start: '08:00', end: '17:00' },
        tuesday: { enabled: true, start: '08:00', end: '17:00' },
        wednesday: { enabled: true, start: '08:00', end: '17:00' },
        thursday: { enabled: true, start: '08:00', end: '17:00' },
        friday: { enabled: true, start: '08:00', end: '16:00' },
        saturday: { enabled: false, start: '', end: '' },
        sunday: { enabled: false, start: '', end: '' },
      },
    },
  },
  { id: 'c2', name: 'Redes Sociales', channel: 'social', status: 'active' },
  { id: 'c3', name: 'Google Ads 2025', channel: 'ads', status: 'paused' },
  { id: 'c4', name: 'WhatsApp Masivo', channel: 'whatsapp', status: 'active' },
  { id: 'c5', name: 'Referidos Manual', channel: 'manual', status: 'finished' },
];

const today = new Date();
const formatISO = (d: Date) => d.toISOString();

const MOCK_ACTIVITIES: CrmActivity[] = [
  { id: 'a1', subject: 'Llamar a cliente potencial', type: 'call', status: 'pending', due_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0)), lead_name: 'Carlos Gómez', user_name: 'Ana Martínez', campaign_id: 'c1' },
  { id: 'a2', subject: 'Enviar propuesta comercial', type: 'email', status: 'pending', due_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30)), lead_name: 'María López', user_name: 'Ana Martínez', campaign_id: 'c1' },
  { id: 'a3', subject: 'Reunión con equipo de ventas', type: 'meeting', status: 'pending', due_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 0)), user_name: 'Juan Pérez', campaign_id: 'c2' },
  { id: 'a4', subject: 'Seguimiento post-demo', type: 'call', status: 'overdue', due_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 11, 0)), lead_name: 'Pedro Ruiz', user_name: 'Ana Martínez', campaign_id: 'c1' },
  { id: 'a5', subject: 'Revisar contrato', type: 'task', status: 'completed', due_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 16, 0)), completed_at: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 15, 45)), opportunity_name: 'Proyecto Alpha', user_name: 'Juan Pérez', campaign_id: 'c2' },
  { id: 'a6', subject: 'Nota de seguimiento', type: 'note', status: 'completed', due_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 10, 0)), completed_at: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 10, 30)), lead_name: 'Laura Díaz', user_name: 'Ana Martínez', campaign_id: 'c3' },
  { id: 'a7', subject: 'Preparar presentación', type: 'task', status: 'canceled', due_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 13, 0)), user_name: 'Juan Pérez', campaign_id: 'c4' },
  { id: 'a8', subject: 'Llamada de cierre', type: 'call', status: 'pending', due_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 11, 0)), lead_name: 'Roberto Sánchez', user_name: 'Ana Martínez', campaign_id: 'c1' },
  { id: 'a9', subject: 'Demo de producto', type: 'meeting', status: 'pending', due_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 15, 0)), lead_name: 'Sofía Torres', user_name: 'Juan Pérez', campaign_id: 'c2' },
  { id: 'a10', subject: 'Actualizar CRM', type: 'task', status: 'overdue', due_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 9, 0)), user_name: 'Ana Martínez', campaign_id: 'c1' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const activityIconMap: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: UsersIcon,
  note: FileText,
  task: ClipboardList,
};

const channelColors: Record<string, string> = {
  email: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  social: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  ads: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  manual: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-600',
  web: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  whatsapp: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
};

const channelLabels: Record<string, string> = {
  email: 'Email', social: 'Social', ads: 'Ads', manual: 'Manual', web: 'Web', whatsapp: 'WhatsApp',
};

function formatDate(d: Date) {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isTodayFn(d: Date) {
  return isSameDay(d, new Date());
}

function isTomorrow(d: Date) {
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  return isSameDay(d, tom);
}

// ─── Month names ──────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DAY_NAMES_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

// ─── Full Calendar Component (Month/Week/Day/Agenda) ──────────────────────────
function FullCalendar({
  activities,
  currentDate,
  view,
  onViewChange,
  onDateChange,
  onSelectEvent,
  onSelectSlot,
}: {
  activities: CrmActivity[];
  currentDate: Date;
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  onDateChange: (d: Date) => void;
  onSelectEvent: (a: CrmActivity) => void;
  onSelectSlot: (d: Date) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const goToday = () => onDateChange(new Date());
  const goPrev = () => {
    if (view === 'month') onDateChange(new Date(year, month - 1, 1));
    else if (view === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      onDateChange(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      onDateChange(d);
    }
  };
  const goNext = () => {
    if (view === 'month') onDateChange(new Date(year, month + 1, 1));
    else if (view === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      onDateChange(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      onDateChange(d);
    }
  };

  // Title
  const getTitle = () => {
    if (view === 'month') return `${MONTH_NAMES[month]} ${year}`;
    if (view === 'day') return `${currentDate.getDate()} de ${MONTH_NAMES[month]} ${year}`;
    if (view === 'week') {
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - ((dayOfWeek + 6) % 7));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${MONTH_NAMES[startOfWeek.getMonth()]} ${year}`;
      }
      return `${startOfWeek.getDate()} ${MONTH_NAMES[startOfWeek.getMonth()].substring(0, 3)} - ${endOfWeek.getDate()} ${MONTH_NAMES[endOfWeek.getMonth()].substring(0, 3)} ${year}`;
    }
    return `${MONTH_NAMES[month]} ${year}`;
  };

  const getActivitiesForDate = (d: Date) =>
    activities.filter((a) => a.due_date && isSameDay(new Date(a.due_date), d));

  const getEventColor = (a: CrmActivity) => {
    const isOverdue = a.status === 'pending' && new Date(a.due_date) < new Date();
    if (a.status === 'completed') return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
    if (a.status === 'canceled') return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    if (isOverdue || a.status === 'overdue') return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
    return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
  };

  // ─── Month View ───────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const totalRows = Math.ceil((startOffset + daysInMonth) / 7);
    const totalCells = totalRows * 7;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        cells.push(new Date(year, month, dayNum));
      } else {
        cells.push(null);
      }
    }

    return (
      <div className="flex-1 flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-600">
          {DAY_NAMES_SHORT.map((name) => (
            <div
              key={name}
              className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider py-3 bg-gray-100/80 dark:bg-slate-700/80"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
          {cells.map((date, i) => {
            if (!date) {
              return (
                <div
                  key={`empty-${i}`}
                  className="border-b border-r border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/30 min-h-[100px]"
                />
              );
            }

            const acts = getActivitiesForDate(date);
            const isTd = isTodayFn(date);

            return (
              <div
                key={date.toISOString()}
                onClick={() => onSelectSlot(date)}
                className={`border-b border-r border-gray-100 dark:border-slate-700/50 p-1 min-h-[100px] cursor-pointer transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/10 ${
                  isTd ? 'bg-blue-50/70 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex justify-end p-1">
                  <span
                    className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                      isTd
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5 px-0.5">
                  {acts.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(a);
                      }}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate cursor-pointer shadow-sm ${getEventColor(a)}`}
                      title={a.subject}
                    >
                      {a.subject}
                    </div>
                  ))}
                  {acts.length > 3 && (
                    <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 px-1.5">
                      + Ver más ({acts.length - 3})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Week View ────────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - ((dayOfWeek + 6) % 7));

    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      weekDays.push(d);
    }

    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm

    return (
      <div className="flex-1 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-600">
          <div className="border-r border-gray-200 dark:border-slate-600" />
          {weekDays.map((d) => {
            const isTd = isTodayFn(d);
            return (
              <div
                key={d.toISOString()}
                className={`text-center py-3 border-r border-gray-100 dark:border-slate-700 ${
                  isTd ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                  {DAY_NAMES_SHORT[(d.getDay() + 6) % 7]}
                </div>
                <div
                  className={`text-lg font-bold mt-1 ${
                    isTd ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 dark:border-slate-700/50"
          >
            <div className="text-xs text-gray-400 dark:text-gray-500 text-right pr-2 py-2 border-r border-gray-200 dark:border-slate-600 font-medium">
              {String(hour).padStart(2, '0')}:00
            </div>
            {weekDays.map((d) => {
              const acts = getActivitiesForDate(d).filter((a) => {
                const h = new Date(a.due_date).getHours();
                return h === hour;
              });
              return (
                <div
                  key={d.toISOString()}
                  className="border-r border-gray-100 dark:border-slate-700/50 min-h-[48px] p-0.5 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer"
                  onClick={() => onSelectSlot(d)}
                >
                  {acts.map((a) => (
                    <div
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(a);
                      }}
                      className={`text-[10px] font-semibold px-1.5 py-1 rounded cursor-pointer shadow-sm mb-0.5 ${getEventColor(a)}`}
                    >
                      {formatTime(new Date(a.due_date))} {a.subject}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ─── Day View ─────────────────────────────────────────────────────────────
  const renderDayView = () => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 6);

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[60px_1fr] sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-600">
          <div className="border-r border-gray-200 dark:border-slate-600" />
          <div className="text-center py-3">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
              {DAY_NAMES_SHORT[(currentDate.getDay() + 6) % 7]}
            </div>
            <div
              className={`text-2xl font-bold mt-1 ${
                isTodayFn(currentDate) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              {currentDate.getDate()}
            </div>
          </div>
        </div>

        {hours.map((hour) => {
          const acts = getActivitiesForDate(currentDate).filter(
            (a) => new Date(a.due_date).getHours() === hour
          );
          return (
            <div
              key={hour}
              className="grid grid-cols-[60px_1fr] border-b border-gray-100 dark:border-slate-700/50"
            >
              <div className="text-xs text-gray-400 dark:text-gray-500 text-right pr-2 py-3 border-r border-gray-200 dark:border-slate-600 font-medium">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="min-h-[56px] p-1 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer">
                {acts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => onSelectEvent(a)}
                    className={`text-sm font-semibold px-3 py-2 rounded-lg cursor-pointer shadow-sm mb-1 ${getEventColor(a)}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{formatTime(new Date(a.due_date))}</span>
                      <span>{a.subject}</span>
                    </div>
                    {a.lead_name && (
                      <div className="text-xs opacity-80 mt-0.5">{a.lead_name}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Agenda View ──────────────────────────────────────────────────────────
  const renderAgendaView = () => {
    const sorted = [...activities]
      .filter((a) => a.due_date)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    // Group by date
    const grouped: Record<string, CrmActivity[]> = {};
    sorted.forEach((a) => {
      const key = new Date(a.due_date).toDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    });

    return (
      <div className="flex-1 overflow-auto">
        {Object.keys(grouped).length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No hay actividades en este rango
          </div>
        ) : (
          Object.entries(grouped).map(([dateStr, acts]) => {
            const d = new Date(dateStr);
            return (
              <div key={dateStr}>
                <div className="px-4 py-3 bg-gray-100 dark:bg-slate-700/80 font-bold text-sm text-gray-700 dark:text-gray-200 sticky top-0 z-10 border-b border-gray-200 dark:border-slate-600">
                  {formatDate(d)}
                  {isTodayFn(d) && (
                    <Badge className="ml-2 bg-blue-500 text-white text-xs">Hoy</Badge>
                  )}
                </div>
                {acts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => onSelectEvent(a)}
                    className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 w-14">
                      {formatTime(new Date(a.due_date))}
                    </div>
                    <div className={`w-1 h-10 rounded-full ${
                      a.status === 'completed' ? 'bg-green-500'
                      : a.status === 'overdue' ? 'bg-red-500'
                      : a.status === 'canceled' ? 'bg-gray-400'
                      : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{a.subject}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {a.lead_name || a.opportunity_name || ''}
                        {a.user_name ? ` · ${a.user_name}` : ''}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        a.status === 'completed'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : a.status === 'overdue'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : a.status === 'canceled'
                          ? 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}
                    >
                      {a.status === 'pending' ? 'Pendiente' : a.status === 'overdue' ? 'Vencida' : a.status === 'completed' ? 'Completada' : 'Cancelada'}
                    </Badge>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-gray-100/80 dark:bg-slate-700/80 rounded-t-xl border-b border-gray-200 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="font-semibold border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700"
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goPrev}
            className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700"
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700"
          >
            Siguiente
          </Button>
        </div>

        <h3 className="text-lg font-bold text-gray-800 dark:text-white capitalize">{getTitle()}</h3>

        <div className="flex items-center gap-1">
          {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map((v) => (
            <Button
              key={v}
              variant={view === v ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewChange(v)}
              className={
                view === v
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700'
              }
            >
              {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : v === 'day' ? 'Día' : 'Agenda'}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}
      {view === 'agenda' && renderAgendaView()}
    </div>
  );
}

// ─── Activity Card ────────────────────────────────────────────────────────────
function ActivityCard({
  activity,
  onClick,
  onComplete,
  onCancel,
  showActions = true,
}: {
  activity: CrmActivity;
  onClick: () => void;
  onComplete?: (e: React.MouseEvent) => void;
  onCancel?: (e: React.MouseEvent) => void;
  showActions?: boolean;
}) {
  const dueDate = new Date(activity.due_date);
  const isTodayDate = isTodayFn(dueDate);
  const isTomorrowDate = isTomorrow(dueDate);
  const isPast = dueDate < new Date();

  let dateLabel = formatDate(dueDate);
  let dateBadgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (isTodayDate) {
    dateLabel = '¡Hoy!';
    dateBadgeColor = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-bold';
  } else if (isTomorrowDate) {
    dateLabel = 'Mañana';
    dateBadgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 font-semibold';
  } else if (isPast && activity.status !== 'completed' && activity.status !== 'canceled') {
    dateBadgeColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  }

  const Icon = activityIconMap[activity.type] || Clock;

  const borderColors: Record<string, string> = {
    pending: 'border-l-blue-500 dark:border-l-blue-600',
    overdue: 'border-l-red-500 dark:border-l-red-600',
    completed: 'border-l-green-500 dark:border-l-green-600',
    canceled: 'border-l-gray-500 dark:border-l-gray-600',
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 hover:bg-gray-50/80 dark:hover:bg-slate-700/30 cursor-pointer transition-all border-l-4 ${
        borderColors[activity.status] || borderColors.pending
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {formatTime(dueDate)}
            </span>
            <Badge variant="outline" className={`${dateBadgeColor} text-xs px-2 py-0`}>
              {dateLabel}
            </Badge>
          </div>
        </div>
        {showActions && (
          <div className="flex items-center gap-1">
            {isPast && activity.status === 'pending' && (
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            )}
            {activity.status === 'pending' && onCancel && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-700"
                onClick={onCancel}
                title="Marcar como no realizada"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            )}
            {onComplete && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 shrink-0 ${
                  activity.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 text-green-700'
                    : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-500 hover:text-green-700'
                }`}
                onClick={onComplete}
                title={activity.status === 'completed' ? 'Marcar como pendiente' : 'Marcar como completada'}
              >
                <CheckCircle2 className={`h-5 w-5 ${activity.status === 'completed' ? 'fill-green-700' : ''}`} />
              </Button>
            )}
          </div>
        )}
      </div>

      <h4 className="font-semibold text-sm mb-1 line-clamp-2 text-gray-900 dark:text-white">
        {activity.subject || 'Sin asunto'}
      </h4>

      {(activity.lead_name || activity.opportunity_name) && (
        <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
          <User className="h-3 w-3" />
          <span className="truncate">{activity.lead_name || activity.opportunity_name}</span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-2">
        <Badge
          variant="outline"
          className={`text-xs ${
            activity.status === 'completed'
              ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
              : activity.status === 'overdue'
              ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
              : activity.status === 'canceled'
              ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-600'
              : 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700'
          }`}
        >
          {activity.status === 'pending' ? 'Pendiente' : activity.status === 'overdue' ? 'Vencida' : activity.status === 'completed' ? 'Completada' : 'Cancelada'}
        </Badge>
        {activity.user_name && (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 text-xs">
            {activity.user_name}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ActivitiesPage() {
  const [activities] = useState<CrmActivity[]>(MOCK_ACTIVITIES);
  const [campaigns] = useState<CrmCampaign[]>(MOCK_CAMPAIGNS);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('');
  const [campaignsPage, setCampaignsPage] = useState(1);
  const campaignsPerPage = 4;

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [activitiesTab, setActivitiesTab] = useState('pending');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<CrmActivity | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    activity: CrmActivity | null;
    action: 'complete' | 'cancel' | 'overdue';
  }>({ open: false, activity: null, action: 'complete' });

  const [newActivity, setNewActivity] = useState({
    subject: '',
    description: '',
    type: 'call',
    due_date: '',
    due_time: '',
  });

  // ─── Filtered data ──────────────────────────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(campaignSearchTerm.toLowerCase()) ||
        c.channel.toLowerCase().includes(campaignSearchTerm.toLowerCase())
    );
  }, [campaigns, campaignSearchTerm]);

  const totalCampaignPages = Math.ceil(filteredCampaigns.length / campaignsPerPage);
  const paginatedCampaigns = useMemo(() => {
    const start = (campaignsPage - 1) * campaignsPerPage;
    return filteredCampaigns.slice(start, start + campaignsPerPage);
  }, [filteredCampaigns, campaignsPage]);

  const filteredActivities = useMemo(() => {
    if (selectedCampaign === 'all') return activities;
    return activities.filter((a) => a.campaign_id === selectedCampaign);
  }, [activities, selectedCampaign]);

  const pendingActivities = useMemo(() => {
    return filteredActivities
      .filter((a) => a.status === 'pending')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [filteredActivities]);

  const overdueActivities = useMemo(() => {
    return filteredActivities
      .filter((a) => a.status === 'overdue')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [filteredActivities]);

  const completedActivities = useMemo(() => {
    return filteredActivities
      .filter((a) => a.status === 'completed')
      .sort((a, b) => new Date(b.completed_at || b.due_date).getTime() - new Date(a.completed_at || a.due_date).getTime());
  }, [filteredActivities]);

  const canceledActivities = useMemo(() => {
    return filteredActivities
      .filter((a) => a.status === 'canceled')
      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [filteredActivities]);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

    return {
      total: filteredActivities.length,
      today: filteredActivities.filter((a) => {
        if (!a.due_date) return false;
        const d = new Date(a.due_date);
        return d >= todayStart && d < todayEnd;
      }).length,
      thisWeek: filteredActivities.filter((a) => {
        if (!a.due_date) return false;
        return new Date(a.due_date) >= weekStart;
      }).length,
      thisCampaign: selectedCampaign !== 'all' ? filteredActivities.length : 0,
    };
  }, [filteredActivities, selectedCampaign]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleCompleteActivity = (activity: CrmActivity, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({ open: true, activity, action: 'complete' });
  };

  const handleCancelActivity = (activity: CrmActivity, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({ open: true, activity, action: 'cancel' });
  };

  const handleOpenDetails = (activity: CrmActivity) => {
    setSelectedActivity(activity);
    setShowDetailsModal(true);
  };

  const selectedCampaignInfo = selectedCampaign !== 'all'
    ? campaigns.find((c) => c.id === selectedCampaign)
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header con gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.4),transparent)]" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm shadow-xl border border-white/30">
                <CalendarClock className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-5xl font-bold">Calendario</h1>
                <p className="text-blue-100 text-lg mt-1">
                  Gestiona tu agenda y horarios de campañas
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => {
              setSelectedActivity(null);
              setShowCreateModal(true);
            }}
            size="lg"
            className="bg-white text-indigo-700 hover:bg-blue-50 shadow-2xl font-semibold"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nueva Actividad
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-2 border-blue-100 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg bg-white dark:bg-slate-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Actividades</div>
                <div className="text-3xl font-bold mt-2 text-blue-600 dark:text-blue-400">{stats.total}</div>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-lg bg-white dark:bg-slate-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Hoy</div>
                <div className="text-3xl font-bold mt-2 text-indigo-600 dark:text-indigo-400">{stats.today}</div>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <Clock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-100 dark:border-purple-900/50 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-lg bg-white dark:bg-slate-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Esta Semana</div>
                <div className="text-3xl font-bold mt-2 text-purple-600 dark:text-purple-400">{stats.thisWeek}</div>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <CalendarClock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-100 dark:border-purple-900/50 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-lg bg-white dark:bg-slate-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Campaña Actual</div>
                <div className="text-3xl font-bold mt-2 text-purple-600 dark:text-purple-400">
                  {selectedCampaign === 'all' ? stats.total : stats.thisCampaign}
                </div>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Megaphone className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campañas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Campañas</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selecciona una campaña para ver sus horarios en el calendario
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar campañas..."
              value={campaignSearchTerm}
              onChange={(e) => {
                setCampaignSearchTerm(e.target.value);
                setCampaignsPage(1);
              }}
              className="pl-9 border-2 border-indigo-200 dark:border-indigo-800 focus:border-indigo-500 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Card "Todas" */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedCampaign === 'all'
                ? 'border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 shadow-lg'
                : 'border-2 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-800/50'
            }`}
            onClick={() => setSelectedCampaign('all')}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    selectedCampaign === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Todas</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ver todas las actividades</p>
                  <div className="mt-3">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                      {stats.total} actividades
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {paginatedCampaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedCampaign === campaign.id
                  ? 'border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 shadow-lg'
                  : 'border-2 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-800/50'
              }`}
              onClick={() => setSelectedCampaign(campaign.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-3 rounded-xl ${
                      selectedCampaign === campaign.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    <Megaphone className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-gray-900 dark:text-white">{campaign.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className={channelColors[campaign.channel] || channelColors.manual}>
                        {channelLabels[campaign.channel] || campaign.channel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          campaign.status === 'active'
                            ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                            : campaign.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700'
                            : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-600'
                        }
                      >
                        {campaign.status === 'active' ? 'Activa' : campaign.status === 'paused' ? 'Pausada' : 'Finalizada'}
                      </Badge>
                    </div>
                    {campaign.business_hours && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>Con horarios configurados</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Campaign Pagination */}
        {filteredCampaigns.length > campaignsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {(campaignsPage - 1) * campaignsPerPage + 1} -{' '}
              {Math.min(campaignsPage * campaignsPerPage, filteredCampaigns.length)} de{' '}
              {filteredCampaigns.length} campañas
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCampaignsPage((p) => Math.max(1, p - 1))}
                disabled={campaignsPage === 1}
              >
                Anterior
              </Button>
              {Array.from({ length: totalCampaignPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={campaignsPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCampaignsPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCampaignsPage((p) => Math.min(totalCampaignPages, p + 1))}
                disabled={campaignsPage === totalCampaignPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Business Hours Legend */}
      {selectedCampaignInfo?.business_hours && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-lg">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Horarios: {selectedCampaignInfo.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedCampaignInfo.business_hours.timezone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(
                  (day) => {
                    const dayLabels: Record<string, string> = {
                      monday: 'L', tuesday: 'M', wednesday: 'X', thursday: 'J',
                      friday: 'V', saturday: 'S', sunday: 'D',
                    };
                    const hours = selectedCampaignInfo.business_hours!.schedule?.[day] || { enabled: false, start: '', end: '' };
                    return (
                      <div
                        key={day}
                        className={`px-3 py-2 rounded-lg text-center min-w-[60px] ${
                          hours.enabled
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                        title={hours.enabled ? `${hours.start} - ${hours.end}` : 'Cerrado'}
                      >
                        <div className="font-bold text-xs">{dayLabels[day]}</div>
                        {hours.enabled && (
                          <div className="text-[10px] mt-1 opacity-90">{hours.start.substring(0, 5)}</div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid principal: Calendario grande + Sidebar actividades */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* Calendario completo */}
        <Card className="shadow-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
          <div className="h-[700px] flex flex-col">
            <FullCalendar
              activities={filteredActivities}
              currentDate={calendarDate}
              view={calendarView}
              onViewChange={setCalendarView}
              onDateChange={setCalendarDate}
              onSelectEvent={handleOpenDetails}
              onSelectSlot={(d) => {
                setNewActivity({ ...newActivity, due_date: d.toISOString().split('T')[0] });
                setShowCreateModal(true);
              }}
            />
          </div>
        </Card>

        {/* Sidebar: Mis Actividades */}
        <Card className="shadow-xl border-2 border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/50">
          <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-900 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
              <Clock className="h-5 w-5" />
              Mis Actividades
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activitiesTab} onValueChange={setActivitiesTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4 rounded-none border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                <TabsTrigger value="pending" className="text-xs gap-1 px-1">
                  Pendientes
                  {overdueActivities.length > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1 py-0 h-4 min-w-4 flex items-center justify-center">
                      {overdueActivities.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="overdue" className="text-xs gap-1 px-1">
                  Vencidas
                  {overdueActivities.length > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1 py-0 h-4 min-w-4 flex items-center justify-center">
                      {overdueActivities.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs gap-1 px-1">
                  Completadas
                </TabsTrigger>
                <TabsTrigger value="canceled" className="text-xs gap-1 px-1">
                  Canceladas
                </TabsTrigger>
              </TabsList>

              {/* Pendientes */}
              <TabsContent value="pending" className="m-0">
                <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
                  {pendingActivities.length === 0 ? (
                    <div className="p-8 text-center">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-600 opacity-50" />
                      <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">¡Todo al día!</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No tienes actividades pendientes</p>
                    </div>
                  ) : (
                    pendingActivities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onClick={() => handleOpenDetails(activity)}
                        onComplete={(e) => handleCompleteActivity(activity, e)}
                        onCancel={(e) => handleCancelActivity(activity, e)}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Vencidas */}
              <TabsContent value="overdue" className="m-0">
                <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
                  {overdueActivities.length === 0 ? (
                    <div className="p-8 text-center">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-400 dark:text-green-600" />
                      <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">¡Sin actividades vencidas!</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No tienes actividades vencidas</p>
                    </div>
                  ) : (
                    overdueActivities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onClick={() => handleOpenDetails(activity)}
                        onComplete={(e) => handleCompleteActivity(activity, e)}
                        onCancel={(e) => handleCancelActivity(activity, e)}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Completadas */}
              <TabsContent value="completed" className="m-0">
                <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
                  {completedActivities.length === 0 ? (
                    <div className="p-8 text-center">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-600 opacity-50" />
                      <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Sin completadas</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No has completado actividades recientemente</p>
                    </div>
                  ) : (
                    completedActivities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onClick={() => handleOpenDetails(activity)}
                        onComplete={(e) => handleCompleteActivity(activity, e)}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Canceladas */}
              <TabsContent value="canceled" className="m-0">
                <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
                  {canceledActivities.length === 0 ? (
                    <div className="p-8 text-center">
                      <XCircle className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-600 opacity-50" />
                      <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">No hay canceladas</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aquí verás actividades no realizadas</p>
                    </div>
                  ) : (
                    canceledActivities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onClick={() => handleOpenDetails(activity)}
                        showActions={false}
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, activity: null, action: 'complete' })}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {confirmDialog.action === 'cancel'
                ? '¿Marcar como No Realizada?'
                : confirmDialog.activity?.status === 'completed'
                ? '¿Marcar como pendiente?'
                : '¿Marcar como completada?'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {confirmDialog.action === 'cancel' ? (
                <>
                  Estás a punto de marcar la actividad{' '}
                  <strong>&quot;{confirmDialog.activity?.subject || 'Sin asunto'}&quot;</strong> como no realizada.
                  Se enviará una notificación a los involucrados.
                </>
              ) : confirmDialog.activity?.status === 'completed' ? (
                <>
                  Estás a punto de marcar la actividad{' '}
                  <strong>&quot;{confirmDialog.activity?.subject || 'Sin asunto'}&quot;</strong> como pendiente.
                </>
              ) : (
                <>
                  Estás a punto de marcar la actividad{' '}
                  <strong>&quot;{confirmDialog.activity?.subject || 'Sin asunto'}&quot;</strong> como completada.
                  Se registrará la fecha y hora de finalización.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, activity: null, action: 'complete' })}>
              Cancelar
            </Button>
            <Button
              onClick={() => setConfirmDialog({ open: false, activity: null, action: 'complete' })}
              className={
                confirmDialog.action === 'cancel'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : confirmDialog.activity?.status === 'completed'
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
            >
              {confirmDialog.action === 'cancel'
                ? 'Marcar como No Realizada'
                : confirmDialog.activity?.status === 'completed'
                ? 'Marcar como pendiente'
                : 'Marcar como completada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Activity Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Nueva Actividad</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Crea una nueva actividad en tu calendario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Asunto *</Label>
              <Input
                placeholder="Ej: Llamar al cliente..."
                value={newActivity.subject}
                onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Tipo</Label>
              <Select
                options={[
                  { value: 'call', label: 'Llamada' },
                  { value: 'email', label: 'Correo' },
                  { value: 'meeting', label: 'Reunión' },
                  { value: 'note', label: 'Nota' },
                  { value: 'task', label: 'Tarea' },
                ]}
                value={newActivity.type}
                onChange={(v) => setNewActivity({ ...newActivity, type: v })}
                placeholder="Seleccionar tipo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Fecha *</Label>
                <DatePicker
                  value={newActivity.due_date}
                  onChange={(v) => setNewActivity({ ...newActivity, due_date: v })}
                  className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Hora *</Label>
                <Input
                  type="time"
                  value={newActivity.due_time}
                  onChange={(e) => setNewActivity({ ...newActivity, due_time: e.target.value })}
                  className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Descripción</Label>
              <Textarea
                placeholder="Descripción de la actividad..."
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                rows={3}
                className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowCreateModal(false)}>Crear Actividad</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Detalle de Actividad</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Información de la actividad seleccionada
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asunto</Label>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedActivity.subject || 'Sin asunto'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</Label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedActivity.type === 'call' ? 'Llamada' : selectedActivity.type === 'email' ? 'Correo' : selectedActivity.type === 'meeting' ? 'Reunión' : selectedActivity.type === 'note' ? 'Nota' : 'Tarea'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</Label>
                  <Badge
                    variant="outline"
                    className={
                      selectedActivity.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : selectedActivity.status === 'overdue'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : selectedActivity.status === 'canceled'
                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }
                  >
                    {selectedActivity.status === 'pending' ? 'Pendiente' : selectedActivity.status === 'overdue' ? 'Vencida' : selectedActivity.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(new Date(selectedActivity.due_date))}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hora</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{formatTime(new Date(selectedActivity.due_date))}</p>
                </div>
              </div>

              {(selectedActivity.lead_name || selectedActivity.opportunity_name) && (
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contacto / Lead</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedActivity.lead_name || selectedActivity.opportunity_name}</p>
                </div>
              )}

              {selectedActivity.user_name && (
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asignado a</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedActivity.user_name}</p>
                </div>
              )}

              {selectedActivity.description && (
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descripción</Label>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedActivity.description}</p>
                </div>
              )}

              {selectedActivity.completed_at && (
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completada el</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{new Date(selectedActivity.completed_at).toLocaleString('es-CO')}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
