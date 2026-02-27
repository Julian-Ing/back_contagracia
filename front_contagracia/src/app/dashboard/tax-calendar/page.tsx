'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select } from '@/shared/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/components/ui/dropdown-menu';
import { FuzzySearchInput } from '@/shared/components/ui/fuzzy-search-input';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Upload,
  List,
  CalendarDays,
  FileText,
  Building2,
  Bell,
  Loader2,
  ExternalLink,
  Info,
  LayoutGrid,
  Download,
  Search,
} from 'lucide-react';
import { useTaxCalendar, useUpcomingObligations, useTaxSync, calendarService } from '@/modules/tax-calendar';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import type { CompanyObligation, TaxCalendarDate } from '@/modules/tax-calendar';
import { normalizeText } from '@/shared/lib/fuzzy-search';
import { generateObligationsPdf, type ObligationPdfRow } from '@/modules/tax-calendar/utils/generateObligationsPdf';
import { getUploadUrl } from '@/config/api.config';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_OPTIONS = [
  { value: '7', label: 'Próximos 7 días' },
  { value: '15', label: 'Próximos 15 días' },
  { value: '30', label: 'Próximos 30 días' },
  { value: '60', label: 'Próximos 60 días' },
  { value: '90', label: 'Próximos 90 días' },
];

const YEAR_OPTIONS = [
  { value: '2023', label: '2023' },
  { value: '2024', label: '2024' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
];

function getUrgencyBadge(urgency: string, daysRemaining: number) {
  if (daysRemaining < 0) {
    return <Badge variant="destructive" className="text-xs">Vencida ({Math.abs(daysRemaining)}d)</Badge>;
  }

  switch (urgency) {
    case 'urgent':
      return <Badge variant="destructive" className="text-xs">{daysRemaining}d - Urgente</Badge>;
    case 'soon':
      return <Badge className="bg-amber-500 text-xs">{daysRemaining}d - Pronto</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">{daysRemaining}d</Badge>;
  }
}

function ObligationCard({ obligation, showDate = true }: { obligation: CompanyObligation | TaxCalendarDate; showDate?: boolean }) {
  const obl = obligation as CompanyObligation;
  const dueDate = new Date(obligation.due_date);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm truncate">
                {obligation.tax_obligation_type?.name || 'Obligación'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{obligation.period_name}</p>
            {showDate && (
              <p className="text-xs text-muted-foreground">
                Vence: {dueDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {'daysRemaining' in obl && getUrgencyBadge(obl.urgency, obl.daysRemaining)}
            {obligation.is_declaration && (
              <Badge variant="outline" className="text-xs">Declaración</Badge>
            )}
            {obligation.is_payment && (
              <Badge variant="outline" className="text-xs">Pago</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingSummary({ summary }: { summary: { total: number; urgent: number; soon: number; normal: number } }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{summary.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </CardContent>
      </Card>
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{summary.urgent}</div>
          <div className="text-xs text-red-600">Urgentes</div>
        </CardContent>
      </Card>
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{summary.soon}</div>
          <div className="text-xs text-amber-600">Pronto</div>
        </CardContent>
      </Card>
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{summary.normal}</div>
          <div className="text-xs text-green-600">Normal</div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function AlertBox({ variant, icon: Icon, children }: { variant?: 'default' | 'destructive'; icon: React.ElementType; children: React.ReactNode }) {
  const baseClasses = "flex items-center gap-3 p-4 rounded-lg border";
  const variantClasses = variant === 'destructive'
    ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-200"
    : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-200";

  return (
    <div className={`${baseClasses} ${variantClasses}`}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <div className="text-sm">{children}</div>
    </div>
  );
}

const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface CalendarGridProps {
  year: number;
  month: number;
  obligations: TaxCalendarDate[];
}

function CalendarGrid({ year, month, obligations }: CalendarGridProps) {
  // Calcular días del mes
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: { day: number | null; isToday: boolean; obligations: TaxCalendarDate[] }[] = [];

    // Días vacíos al inicio
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, isToday: false, obligations: [] });
    }

    // Días del mes
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month - 1 &&
        today.getDate() === day;

      // Filtrar obligaciones para este día
      const dayObligations = obligations.filter((obl) => {
        const oblDate = new Date(obl.due_date);
        return oblDate.getDate() === day;
      });

      days.push({ day, isToday, obligations: dayObligations });
    }

    return days;
  }, [year, month, obligations]);

  return (
    <div className="border rounded-lg overflow-hidden dark:border-slate-700">
      {/* Header con días de la semana */}
      <div className="grid grid-cols-7 bg-muted/50 dark:bg-slate-800">
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-muted-foreground border-b dark:border-slate-700"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7">
        {calendarDays.map((dayInfo, index) => (
          <div
            key={index}
            className={`
              min-h-[100px] p-2 border-b border-r dark:border-slate-700
              ${dayInfo.day === null ? 'bg-muted/20 dark:bg-slate-900/50' : 'bg-background dark:bg-slate-800/50'}
              ${index % 7 === 6 ? 'border-r-0' : ''}
              ${dayInfo.isToday ? 'ring-2 ring-inset ring-blue-500' : ''}
            `}
          >
            {dayInfo.day !== null && (
              <>
                <div
                  className={`
                    text-sm font-medium mb-1
                    ${dayInfo.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}
                  `}
                >
                  {dayInfo.day}
                </div>
                <div className="space-y-1">
                  {dayInfo.obligations.slice(0, 3).map((obl) => (
                    <div
                      key={obl.id}
                      className="text-xs p-1 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 truncate"
                      title={`${obl.tax_obligation_type?.name || 'Obligación'} - ${obl.period_name}`}
                    >
                      {obl.tax_obligation_type?.code || obl.tax_obligation_type?.name?.substring(0, 10) || 'Obl'}
                    </div>
                  ))}
                  {dayInfo.obligations.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayInfo.obligations.length - 3} más
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function matchesSearch(obl: CompanyObligation | TaxCalendarDate, query: string): boolean {
  if (!query) return true;
  const q = normalizeText(query);
  const name = normalizeText(obl.tax_obligation_type?.name || '');
  const period = normalizeText(obl.period_name || '');
  return name.includes(q) || period.includes(q);
}

function formatOblForPdf(obl: CompanyObligation | TaxCalendarDate): ObligationPdfRow {
  const dueDate = new Date(obl.due_date);
  const types: string[] = [];
  if (obl.is_declaration) types.push('Declaración');
  if (obl.is_payment) types.push('Pago');
  return {
    name: obl.tax_obligation_type?.name || 'Obligación',
    period: obl.period_name || '',
    dueDate: dueDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),
    type: types.join(' / ') || '-',
  };
}

export default function TaxCalendarPage() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [monthViewMode, setMonthViewMode] = useState<'calendar' | 'list'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');

  // Estado para lista completa del año
  const [yearObligations, setYearObligations] = useState<TaxCalendarDate[]>([]);
  const [yearLoading, setYearLoading] = useState(false);

  const companyId = useAuthStore((s) => s.company?.id);
  const companyStore = useAuthStore((s) => s.company);

  // Hooks - Vista mensual (con filtro de mes)
  const {
    calendar,
    obligations: calendarObligations,
    obligationTypes,
    loading: calendarLoading,
    error: calendarError,
    year,
    month,
    setYear,
    setMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    refetch: refetchCalendar,
  } = useTaxCalendar({ initialMonth: new Date().getMonth() + 1 });

  const {
    obligations: upcomingObligations,
    loading: upcomingLoading,
    error: upcomingError,
    summary,
    company,
    daysAhead,
    setDaysAhead,
    refetch: refetchUpcoming,
  } = useUpcomingObligations({ daysAhead: 30 });

  const {
    syncing,
    checkStatus,
    syncFromDian,
  } = useTaxSync();

  // Fetch año completo cuando se activa la pestaña "list" o cambia el año
  const fetchYearData = useCallback(async () => {
    if (!companyId) return;
    try {
      setYearLoading(true);
      const data = await calendarService.getCompanyCalendar(companyId, year); // Sin mes = año completo
      setYearObligations(data.obligations || []);
    } catch (err) {
      console.error('Error fetching year data:', err);
    } finally {
      setYearLoading(false);
    }
  }, [companyId, year]);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchYearData();
    }
  }, [activeTab, year, fetchYearData]);

  const handleSync = async () => {
    await syncFromDian(year);
    await checkStatus(year);
    refetchCalendar();
    refetchUpcoming();
    if (activeTab === 'list') {
      fetchYearData();
    }
  };

  // Filtered data by search
  const filteredUpcoming = useMemo(
    () => upcomingObligations.filter((o) => matchesSearch(o, searchQuery)),
    [upcomingObligations, searchQuery]
  );

  const filteredCalendar = useMemo(
    () => calendarObligations.filter((o) => matchesSearch(o, searchQuery)),
    [calendarObligations, searchQuery]
  );

  const filteredYear = useMemo(
    () => yearObligations.filter((o) => matchesSearch(o, searchQuery)),
    [yearObligations, searchQuery]
  );

  // Filtered summary for upcoming tab
  const filteredSummary = useMemo(() => {
    const urgent = filteredUpcoming.filter((o) => o.urgency === 'urgent').length;
    const soon = filteredUpcoming.filter((o) => o.urgency === 'soon').length;
    const normal = filteredUpcoming.filter((o) => o.urgency === 'normal').length;
    return { total: filteredUpcoming.length, urgent, soon, normal };
  }, [filteredUpcoming]);

  // PDF download
  const handleDownloadPdf = async (scope: 'month' | 'semester' | 'year') => {
    const companyName = company?.name || companyStore?.company_name || 'Empresa';
    const nit = company?.nit || companyStore?.nit || '';
    let scopeLabel = '';
    let data: (CompanyObligation | TaxCalendarDate)[] = [];

    switch (scope) {
      case 'month':
        scopeLabel = `${MONTHS[(month ?? 1) - 1]} ${year}`;
        data = filteredCalendar;
        break;
      case 'semester': {
        // Semestre actual: meses 1-6 o 7-12 según el mes actual
        const currentMonth = month ?? (new Date().getMonth() + 1);
        const semesterStart = currentMonth <= 6 ? 1 : 7;
        const semesterEnd = currentMonth <= 6 ? 6 : 12;
        scopeLabel = `${MONTHS[semesterStart - 1]} - ${MONTHS[semesterEnd - 1]} ${year}`;
        // Necesitamos datos del año completo para filtrar el semestre
        let allYear = yearObligations;
        if (allYear.length === 0 && companyId) {
          try {
            setYearLoading(true);
            const res = await calendarService.getCompanyCalendar(companyId, year);
            allYear = res.obligations || [];
            setYearObligations(allYear);
          } finally {
            setYearLoading(false);
          }
        }
        data = allYear.filter((o) => {
          const m = new Date(o.due_date).getMonth() + 1;
          return m >= semesterStart && m <= semesterEnd && matchesSearch(o, searchQuery);
        });
        break;
      }
      case 'year': {
        scopeLabel = `Año ${year}`;
        let allYear = yearObligations;
        if (allYear.length === 0 && companyId) {
          try {
            setYearLoading(true);
            const res = await calendarService.getCompanyCalendar(companyId, year);
            allYear = res.obligations || [];
            setYearObligations(allYear);
          } finally {
            setYearLoading(false);
          }
        }
        data = allYear.filter((o) => matchesSearch(o, searchQuery));
        break;
      }
    }

    await generateObligationsPdf({
      companyName,
      nit,
      nitLastDigit: company?.nitLastDigit,
      logoUrl: companyStore?.logo_url ? getUploadUrl(companyStore.logo_url) : undefined,
      scopeLabel,
      year,
      totalCount: data.length,
      obligations: data.map(formatOblForPdf),
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Calendario Tributario DIAN
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Obligaciones tributarias según el último dígito del NIT
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchCalendar(); refetchUpcoming(); if (activeTab === 'list') fetchYearData(); }}
            disabled={calendarLoading || upcomingLoading || yearLoading}
          >
            {(calendarLoading || upcomingLoading) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualizar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Sincronizar {year}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownloadPdf('month')}>
                <CalendarDays className="h-4 w-4 mr-2" />
                Mes actual ({MONTHS[(month ?? 1) - 1]})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadPdf('semester')}>
                <FileText className="h-4 w-4 mr-2" />
                Semestre actual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadPdf('year')}>
                <List className="h-4 w-4 mr-2" />
                Año completo ({year})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Company Info Card */}
      {company && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">
                    NIT: {company.nit} <span className="text-blue-600 dark:text-blue-400">(dígito: {company.nitLastDigit})</span>
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Persona Jurídica
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-2">
                    <Info className="h-3 w-3" />
                    Las obligaciones se filtran automáticamente según tu régimen tributario y el último dígito del NIT.
                  </div>
                </div>
              </div>
              <a
                href={`https://www.dian.gov.co/Calendarios/Calendario_Tributario_${year}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                Ver calendario oficial {year}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {(calendarError || upcomingError) && (
        <AlertBox variant="destructive" icon={AlertTriangle}>
          {calendarError || upcomingError}
        </AlertBox>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Próximas
            </TabsTrigger>
            <TabsTrigger value="month" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Vista Mensual
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Lista Completa
            </TabsTrigger>
          </TabsList>
          <FuzzySearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar obligación o período..."
            className="w-72"
          />
        </div>

        {/* Tab: Próximas Obligaciones */}
        <TabsContent value="upcoming" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Próximas Obligaciones</h2>
            <div className="w-48">
              <Select
                options={DAYS_OPTIONS}
                value={daysAhead.toString()}
                onChange={(v) => setDaysAhead(parseInt(v))}
              />
            </div>
          </div>

          {upcomingLoading ? (
            <LoadingSkeleton />
          ) : upcomingObligations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="font-semibold mb-2">Sin obligaciones próximas</h3>
                <p className="text-muted-foreground text-sm">
                  No hay obligaciones tributarias en los próximos {daysAhead} días
                </p>
              </CardContent>
            </Card>
          ) : filteredUpcoming.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Sin resultados</h3>
                <p className="text-muted-foreground text-sm">
                  No se encontraron obligaciones para &quot;{searchQuery}&quot;
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <UpcomingSummary summary={filteredSummary} />
              <div className="space-y-3">
                {filteredUpcoming.map((obl) => (
                  <ObligationCard key={obl.id} obligation={obl} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab: Vista Mensual */}
        <TabsContent value="month" className="mt-6">
          {/* Month Navigation + View Toggle */}
          <div className="flex items-center justify-between mb-4">
            {/* Toggle Vista */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={monthViewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMonthViewMode('calendar')}
                className="gap-1"
              >
                <LayoutGrid className="h-4 w-4" />
                Mensual
              </Button>
              <Button
                variant={monthViewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMonthViewMode('list')}
                className="gap-1"
              >
                <List className="h-4 w-4" />
                Lista
              </Button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-45 text-center">
                <span className="font-semibold">
                  {MONTHS[(month ?? 1) - 1]} {year}
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToCurrentMonth}>
                Hoy
              </Button>
            </div>

            {/* Year Select */}
            <div className="w-28">
              <Select
                options={YEAR_OPTIONS}
                value={year.toString()}
                onChange={(v) => setYear(parseInt(v))}
              />
            </div>
          </div>

          {calendarLoading ? (
            <LoadingSkeleton />
          ) : calendarObligations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Sin obligaciones este mes</h3>
                <p className="text-muted-foreground text-sm">
                  No hay obligaciones tributarias para {MONTHS[(month ?? 1) - 1]} {year}
                </p>
                <Button variant="outline" className="mt-4" onClick={handleSync}>
                  Sincronizar calendario
                </Button>
              </CardContent>
            </Card>
          ) : filteredCalendar.length === 0 && searchQuery ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Sin resultados</h3>
                <p className="text-muted-foreground text-sm">
                  No se encontraron obligaciones para &quot;{searchQuery}&quot; en {MONTHS[(month ?? 1) - 1]} {year}
                </p>
              </CardContent>
            </Card>
          ) : monthViewMode === 'calendar' ? (
            <CalendarGrid year={year} month={month ?? 1} obligations={filteredCalendar} />
          ) : (
            <div className="space-y-3">
              {filteredCalendar.map((obl) => (
                <ObligationCard key={obl.id} obligation={obl as CompanyObligation} showDate={true} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Lista Completa */}
        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Todas las obligaciones del año {year}</CardTitle>
              <CardDescription>
                {filteredYear.length} de {yearObligations.length} obligaciones
                {searchQuery && ` (filtrado por "${searchQuery}")`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {yearLoading ? (
                <LoadingSkeleton />
              ) : (
                <div className="space-y-3">
                  {yearObligations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay datos cargados para {year}. Sincroniza el calendario primero.
                    </p>
                  ) : filteredYear.length === 0 ? (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-semibold mb-2">Sin resultados</h3>
                      <p className="text-muted-foreground text-sm">
                        No se encontraron obligaciones para &quot;{searchQuery}&quot; en {year}
                      </p>
                    </div>
                  ) : (
                    filteredYear.map((obl) => (
                      <ObligationCard key={obl.id} obligation={obl as CompanyObligation} />
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tipos de Obligación (Info) */}
      {obligationTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipos de Obligaciones Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {obligationTypes.map((type) => (
                <Badge key={type.id} variant="outline">
                  {type.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
