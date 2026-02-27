'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/modules/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { AsyncSearchableSelect } from '@/shared/components/ui/async-searchable-select';
import type { LoadOptionsResult, AsyncSelectOption } from '@/shared/components/ui/async-searchable-select';
import { formatCurrencyCO } from '@/shared/utils/formatNumber';
import { useDisplayDecimals } from '@/shared/providers/CompanySettingsProvider';
import { arApService } from '@/modules/ar-ap/services/arAp.service';
import { employeesService } from '@/modules/hr/services/employees.service';
import { accountingPeriodsService } from '@/modules/accounting/services/accountingPeriods.service';
import type { EmployeeStats } from '@/modules/hr/types';
import {
  Calendar,
  RefreshCw,
  Zap,
  FilePlus,
  Receipt,
  Landmark,
  FileSignature,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  Loader2,
  Users,
  Ban,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/shared/lib/utils';

// Colores para gráficos
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Tooltip personalizado para gráficos
function CustomTooltip({ active, payload, label, decimals }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="p-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl">
      <p className="font-semibold mb-1 text-sm text-gray-900 dark:text-white">{label}</p>
      {payload.map((item: any, idx: number) => (
        <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">
          {`${item.name}: ${formatCurrencyCO(Number(item.value || 0), decimals)}`}
        </p>
      ))}
    </div>
  );
}

// Card de salud financiera
function FinancialHealthCard({
  title,
  value,
  interpretation,
  status,
  pending,
}: {
  title: string;
  value: string;
  interpretation: string;
  status: 'good' | 'warning' | 'danger';
  pending?: boolean;
}) {
  const statusClasses = {
    good: 'border-green-500/30 bg-green-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
    danger: 'border-red-500/30 bg-red-500/10',
  };
  const textClasses = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card className={cn(statusClasses[status], 'border')}>
      <CardHeader className="pb-2">
        <CardTitle className={cn('text-sm font-medium', textClasses[status])}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', pending ? 'text-gray-400 dark:text-gray-500' : textClasses[status])}>
          {value}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{interpretation}</p>
      </CardContent>
    </Card>
  );
}

// Card de KPI con estado pendiente
function KpiCard({
  title,
  description,
  icon: Icon,
  value,
  pending,
  colorClasses,
}: {
  title: string;
  description: string;
  icon: any;
  value: number | null;
  pending?: boolean;
  colorClasses: {
    border: string;
    bg: string;
    title: string;
    icon: string;
    value: string;
    desc: string;
  };
}) {
  return (
    <Card className={cn(colorClasses.border, colorClasses.bg)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn('text-sm font-medium', colorClasses.title)}>{title}</CardTitle>
        <Icon className={cn('h-4 w-4', colorClasses.icon)} />
      </CardHeader>
      <CardContent>
        {pending ? (
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-gray-400" />
            <span className="text-lg font-semibold text-gray-400 dark:text-gray-500">Pendiente</span>
          </div>
        ) : (
          <FormattedNumber
            value={value ?? 0}
            type="currency"
            className={cn('text-2xl font-bold', colorClasses.value)}
          />
        )}
        <p className={cn('text-xs mt-1', pending ? 'text-gray-400 dark:text-gray-500' : colorClasses.desc)}>
          {pending ? 'Requiere integración de facturación' : description}
        </p>
      </CardContent>
    </Card>
  );
}

// Formatear fecha para display
const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric', year: 'numeric' });
};

// Obtener status de salud financiera
const getHealthStatus = (metric: string, value: number | null): 'good' | 'warning' | 'danger' => {
  if (metric === 'profit_margin') {
    if (value === null) return 'warning';
    if (value > 0.2) return 'good';
    if (value > 0.05) return 'warning';
    return 'danger';
  }
  if (metric === 'current_ratio') {
    if (value === null) return 'warning';
    if (value > 2) return 'good';
    if (value > 1) return 'warning';
    return 'danger';
  }
  return 'warning';
};

// Datos mock solo para gráficos (hasta que haya endpoints reales)
const MOCK_CHART_DATA = {
  sales_vs_expenses: [
    { name: 'Ene', sales: 8500000, expenses: 120000, purchases: 15000 },
    { name: 'Feb', sales: 9200000, expenses: 95000, purchases: 8500 },
    { name: 'Mar', sales: 7800000, expenses: 110000, purchases: 12000 },
    { name: 'Abr', sales: 10500000, expenses: 85000, purchases: 5910 },
    { name: 'May', sales: 11200000, expenses: 90000, purchases: 0 },
  ],
  expense_categories_top5: [
    { category_name: 'Servicios', amount: 180000 },
    { category_name: 'Nómina', amount: 150000 },
    { category_name: 'Suministros', amount: 85000 },
    { category_name: 'Transporte', amount: 50000 },
    { category_name: 'Otros', amount: 35000 },
  ],
};

export default function DashboardPage() {
  const { user, company } = useAuth();
  const router = useRouter();
  const displayDecimals = useDisplayDecimals();

  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [useManualDates, setUseManualDates] = useState(false);

  // Datos reales
  const [accountsReceivable, setAccountsReceivable] = useState<number | null>(null);
  const [accountsPayable, setAccountsPayable] = useState<number | null>(null);
  const [hrStats, setHrStats] = useState<EmployeeStats | null>(null);

  // Fechas por defecto (año actual)
  const today = new Date();
  const defaultFrom = `${today.getFullYear()}-01-01`;
  const defaultTo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState<string>('');

  // Label del período
  const periodLabel = useMemo(() => {
    return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
  }, [dateFrom, dateTo]);

  // Razón corriente calculada
  const currentRatio = useMemo(() => {
    if (accountsReceivable === null || accountsPayable === null) return null;
    if (accountsPayable === 0) return accountsReceivable > 0 ? 999 : null;
    return accountsReceivable / accountsPayable;
  }, [accountsReceivable, accountsPayable]);

  // Fetch datos reales
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [arRes, apRes, hrRes] = await Promise.allSettled([
        // CxC: todos los terceros con saldo pendiente
        arApService.getSummaryByThirdParty({
          type: 'RECEIVABLE',
          tab: 'pending',
          limit: 99999,
        }),
        // CxP: todos los terceros con saldo pendiente
        arApService.getSummaryByThirdParty({
          type: 'PAYABLE',
          tab: 'pending',
          limit: 99999,
        }),
        // HR stats
        employeesService.getStats(),
      ]);

      // Sumar total_balance de todos los terceros para CxC
      if (arRes.status === 'fulfilled') {
        const totalAR = arRes.value.data.reduce((sum, item) => sum + (item.total_balance || 0), 0);
        setAccountsReceivable(totalAR);
      }

      // Sumar total_balance de todos los terceros para CxP
      if (apRes.status === 'fulfilled') {
        const totalAP = apRes.value.data.reduce((sum, item) => sum + (item.total_balance || 0), 0);
        setAccountsPayable(totalAP);
      }

      // HR stats
      if (hrRes.status === 'fulfilled') {
        setHrStats(hrRes.value);
      }
    } catch {
      // Silently handle errors — dashboard shouldn't crash
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  // Cargar períodos contables para el select
  const loadPeriods = useCallback(async (search: string, page: number): Promise<LoadOptionsResult> => {
    try {
      const response = await accountingPeriodsService.getAll({
        search,
        page,
        limit: 20,
      });

      const options: AsyncSelectOption[] = response.data.map((period) => ({
        value: period.id,
        label: period.name,
        description: `${formatDate(period.start_date)} - ${formatDate(period.end_date)}`,
      }));

      return {
        data: options,
        hasMore: response.page < response.totalPages,
        total: response.total,
      };
    } catch (error) {
      console.error('Error loading periods:', error);
      return { data: [], hasMore: false, total: 0 };
    }
  }, []);

  // Manejar selección de período
  const handlePeriodChange = useCallback(async (periodId: string, option?: AsyncSelectOption) => {
    if (!periodId || !option) {
      setSelectedPeriod('');
      setSelectedPeriodLabel('');
      return;
    }

    setSelectedPeriod(periodId);
    setSelectedPeriodLabel(option.label);

    // Obtener el período completo del backend para tener las fechas exactas
    try {
      const period = await accountingPeriodsService.getById(periodId);
      setDateFrom(period.start_date.split('T')[0]);
      setDateTo(period.end_date.split('T')[0]);
      // Aplicar filtro automáticamente
      setTimeout(() => fetchDashboardData(), 100);
    } catch (error) {
      console.error('Error loading period details:', error);
    }
  }, [fetchDashboardData]);

  useEffect(() => {
    if (user && company) {
      fetchDashboardData();
    }
  }, [user, company, fetchDashboardData]);

  const handleApplyFilter = () => {
    fetchDashboardData();
  };

  if (!user || !company) {
    return null;
  }

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Filtro de Período */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg text-gray-900 dark:text-white">
            <Calendar className="mr-2 h-5 w-5" />
            Período de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Toggle fechas manuales */}
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useManualDates}
                  onChange={(e) => setUseManualDates(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-700 dark:text-gray-300">Fechas manuales</span>
              </label>
            </div>

            {useManualDates ? (
              <div className="flex items-center gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Desde</label>
                  <DatePicker
                    value={dateFrom}
                    onChange={(v) => setDateFrom(v)}
                    className="w-40"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Hasta</label>
                  <DatePicker
                    value={dateTo}
                    onChange={(v) => setDateTo(v)}
                    className="w-40"
                  />
                </div>
              </div>
            ) : (
              <div className="min-w-[300px]">
                <AsyncSearchableSelect
                  loadOptions={loadPeriods}
                  value={selectedPeriod}
                  valueLabel={selectedPeriodLabel}
                  onChange={handlePeriodChange}
                  placeholder="Seleccionar período contable"
                  searchPlaceholder="Buscar período..."
                  emptyMessage="No se encontraron períodos"
                  clearable
                />
              </div>
            )}

            <Button onClick={handleApplyFilter} disabled={loading} className="flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Aplicar
            </Button>

            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
              Mostrando: <span className="font-medium text-gray-700 dark:text-gray-300">{periodLabel}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Financiero + Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Dashboard Financiero</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">Un resumen de la salud financiera de tu negocio.</p>
        </div>
        <Card className="lg:row-span-2 bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <Zap className="mr-2 text-yellow-500" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
              onClick={() => router.push('/dashboard/invoices/new')}
            >
              <FilePlus className="h-6 w-6" />
              <span>Crear Factura</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
              onClick={() => router.push('/dashboard/expenses/new')}
            >
              <Receipt className="h-6 w-6" />
              <span>Registrar Gasto</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
              onClick={() => router.push('/dashboard/banking')}
            >
              <Landmark className="h-6 w-6" />
              <span>Ver Cuentas</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
              onClick={() => router.push('/dashboard/quotes')}
            >
              <FileSignature className="h-6 w-6" />
              <span>Cotizaciones</span>
            </Button>
          </CardContent>
        </Card>

        {/* Salud Financiera */}
        <div className="lg:col-start-1">
          <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <TrendingUp className="mr-2 text-green-500" />
                Salud Financiera ({periodLabel})
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <FinancialHealthCard
                title="Margen de Utilidad"
                value="—"
                interpretation="Requiere datos de ventas y gastos"
                status="warning"
                pending
              />
              <FinancialHealthCard
                title="Razón Corriente"
                value={currentRatio != null ? (currentRatio >= 999 ? '> 999' : currentRatio.toFixed(2)) : '—'}
                interpretation={
                  currentRatio != null
                    ? 'Capacidad de pago a corto plazo (CxC / CxP)'
                    : 'Sin datos de CxC o CxP'
                }
                status={getHealthStatus('current_ratio', currentRatio)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="space-y-6">
        {/* Primera fila: 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KpiCard
            title="Ventas Totales"
            description="Total de ingresos por facturas."
            icon={DollarSign}
            value={null}
            pending
            colorClasses={{
              border: 'border-blue-200 dark:border-blue-800',
              bg: 'bg-blue-50 dark:bg-blue-950/30',
              title: 'text-blue-700 dark:text-blue-300',
              icon: 'text-blue-600 dark:text-blue-400',
              value: 'text-blue-900 dark:text-blue-100',
              desc: 'text-blue-600 dark:text-blue-400',
            }}
          />
          <KpiCard
            title="Gastos Totales"
            description="Total de gastos registrados."
            icon={Receipt}
            value={null}
            pending
            colorClasses={{
              border: 'border-yellow-200 dark:border-yellow-800',
              bg: 'bg-yellow-50 dark:bg-yellow-950/30',
              title: 'text-yellow-700 dark:text-yellow-300',
              icon: 'text-yellow-600 dark:text-yellow-400',
              value: 'text-yellow-900 dark:text-yellow-100',
              desc: 'text-yellow-600 dark:text-yellow-400',
            }}
          />
          <KpiCard
            title="Compras Totales"
            description="Total de compras pagadas."
            icon={ShoppingBag}
            value={null}
            pending
            colorClasses={{
              border: 'border-red-200 dark:border-red-800',
              bg: 'bg-red-50 dark:bg-red-950/30',
              title: 'text-red-700 dark:text-red-300',
              icon: 'text-red-600 dark:text-red-400',
              value: 'text-red-900 dark:text-red-100',
              desc: 'text-red-600 dark:text-red-400',
            }}
          />
        </div>

        {/* Segunda fila: 2 cards con datos reales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <KpiCard
            title="Cuentas por Cobrar"
            description="Facturas a crédito pendientes de pago."
            icon={CreditCard}
            value={accountsReceivable}
            colorClasses={{
              border: 'border-green-200 dark:border-green-800',
              bg: 'bg-green-50 dark:bg-green-950/30',
              title: 'text-green-700 dark:text-green-300',
              icon: 'text-green-600 dark:text-green-400',
              value: 'text-green-900 dark:text-green-100',
              desc: 'text-green-600 dark:text-green-400',
            }}
          />
          <KpiCard
            title="Cuentas por Pagar"
            description="Incluye compras, gastos e impuestos pendientes."
            icon={AlertCircle}
            value={accountsPayable}
            colorClasses={{
              border: 'border-purple-200 dark:border-purple-800',
              bg: 'bg-purple-50 dark:bg-purple-950/30',
              title: 'text-purple-700 dark:text-purple-300',
              icon: 'text-purple-600 dark:text-purple-400',
              value: 'text-purple-900 dark:text-purple-100',
              desc: 'text-purple-600 dark:text-purple-400',
            }}
          />
        </div>
      </div>

      {/* Resumen de Recursos Humanos */}
      {hrStats && (
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <Users className="mr-2 h-5 w-5 text-indigo-500" />
              Recursos Humanos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{hrStats.total}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Empleados Total</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{hrStats.by_status.ACTIVE}</div>
                <p className="text-xs text-green-600 dark:text-green-400">Activos</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                <FormattedNumber
                  value={hrStats.total_salary}
                  type="currency"
                  className="text-2xl font-bold text-indigo-700 dark:text-indigo-300"
                />
                <p className="text-xs text-indigo-600 dark:text-indigo-400">Nómina Total</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30">
                <FormattedNumber
                  value={hrStats.average_salary}
                  type="currency"
                  className="text-2xl font-bold text-sky-700 dark:text-sky-300"
                />
                <p className="text-xs text-sky-600 dark:text-sky-400">Salario Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Tendencia Mensual */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Tendencia Mensual</CardTitle>
            <CardDescription>Evolución de ventas, gastos y compras por mes</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_CHART_DATA.sales_vs_expenses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000000)}M`} />
                <Tooltip content={<CustomTooltip decimals={displayDecimals} />} />
                <Legend />
                <Bar dataKey="sales" fill="#3B82F6" name="Ventas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#F59E0B" name="Gastos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" fill="#EF4444" name="Compras" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Distribución de Gastos */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Distribución de Gastos</CardTitle>
            <CardDescription>Top 5 categorías de gastos</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_CHART_DATA.expense_categories_top5}
                  dataKey="amount"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {MOCK_CHART_DATA.expense_categories_top5.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => typeof value === 'number' ? formatCurrencyCO(value, displayDecimals) : value}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Nota sobre datos mock en gráficos */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-lg mt-0.5">!</span>
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">Datos parciales</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Cuentas por Cobrar, Cuentas por Pagar y Recursos Humanos muestran datos reales.
              Ventas, Gastos, Compras y los gráficos mostrarán datos reales cuando se integre el módulo de facturación.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
