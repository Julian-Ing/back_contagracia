'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  AlertTriangle,
  Clock,
  Building2,
  TrendingUp,
  Search,
  FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';

import { useAuthStore } from '@/modules/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { carteraService, unitStatementService, useCondominiums } from '@/modules/ph';

// ─── Helpers ───

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

interface CarteraUnit {
  unit_id: string;
  unit_number: string;
  floor: number | null;
  condominium_name: string;
  total_pending: number;
  total_overdue: number;
  total_balance: number;
  fee_count: number;
  oldest_due_date: string | null;
}

interface CarteraSummary {
  total_pending: number;
  total_overdue: number;
  total_balance: number;
  units_with_debt: number;
  total_fees: number;
}

// ─── Component ───

export default function CarteraPage() {
  const companyId = useAuthStore((s) => s.company?.id);
  const { isPrivileged } = usePermissions();
  const { condominiums } = useCondominiums();

  const [summary, setSummary] = useState<CarteraSummary | null>(null);
  const [units, setUnits] = useState<CarteraUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCondominium, setFilterCondominium] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCartera = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterCondominium) params.condominium_id = filterCondominium;
      const res = await carteraService.getSummary(companyId, params);
      setSummary(res.summary);
      setUnits(res.units);
    } catch (err) {
      console.error('Error cargando cartera:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, filterCondominium]);

  useEffect(() => {
    fetchCartera();
  }, [fetchCartera]);

  // Filtrar por busqueda
  const filteredUnits = units.filter((u) =>
    u.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.condominium_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDownloadStatement = async (unitId: string) => {
    if (!companyId) return;
    try {
      const blob = await unitStatementService.downloadPdf(companyId, unitId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `estado-cuenta-${unitId.slice(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al generar estado de cuenta');
    }
  };

  // Porcentaje de recaudo
  const collectionRate = summary && summary.total_balance > 0
    ? Math.round(((summary.total_balance - summary.total_overdue) / summary.total_balance) * 100)
    : 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isPrivileged ? 'Cartera PH' : 'Mi Cartera'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {isPrivileged ? 'Cuentas por cobrar por unidad' : 'Estado de cuenta de mis unidades'}
            </p>
          </div>
        </div>
        {isPrivileged && (
          <Select
            value={filterCondominium}
            onChange={(val) => setFilterCondominium(val)}
            placeholder="Todas las copropiedades"
            options={[
              { value: '', label: 'Todas las copropiedades' },
              ...condominiums.map((c) => ({ value: c.id, label: c.name })),
            ]}
            className="w-64"
          />
        )}
      </div>

      {/* KPI Cards */}
      <div className={cn('grid gap-4', isPrivileged ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2')}>
        <Card className="border-gray-200 dark:border-slate-700">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary ? formatCOP(summary.total_balance) : '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Total Cartera</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-slate-700">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary ? formatCOP(summary.total_overdue) : '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Total Vencido</p>
            </div>
          </CardContent>
        </Card>

        {isPrivileged && (
          <Card className="border-gray-200 dark:border-slate-700">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary?.units_with_debt ?? '—'}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Unidades con Deuda</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isPrivileged && (
          <Card className="border-gray-200 dark:border-slate-700">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {collectionRate}%
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Recaudo Vigente</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Table */}
      <Card className="border-gray-200 dark:border-slate-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalle por Unidad</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar unidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Clock className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Cargando cartera...</span>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="h-12 w-12 text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-gray-500 dark:text-slate-400 font-medium">Sin deudas pendientes</p>
            <p className="text-sm text-gray-400 dark:text-slate-500">Todas las unidades estan al dia</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidad</TableHead>
                <TableHead>Copropiedad</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead className="text-right">Vencido</TableHead>
                <TableHead className="text-right">Total Deuda</TableHead>
                <TableHead className="text-center">Cuotas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.map((unit) => {
                const isDelinquent = unit.total_overdue > 0;
                return (
                  <TableRow
                    key={unit.unit_id}
                    className={cn(
                      'border-l-4',
                      isDelinquent
                        ? 'border-l-red-500 bg-red-50/30 dark:bg-red-900/5'
                        : 'border-l-amber-400',
                    )}
                  >
                    <TableCell className="font-medium">{unit.unit_number}</TableCell>
                    <TableCell className="text-gray-500 dark:text-slate-400 text-sm">
                      {unit.condominium_name}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCOP(unit.total_pending)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                      {unit.total_overdue > 0 ? formatCOP(unit.total_overdue) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCOP(unit.total_balance)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{unit.fee_count}</Badge>
                    </TableCell>
                    <TableCell>
                      {isDelinquent ? (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Moroso
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Descargar estado de cuenta"
                        onClick={() => handleDownloadStatement(unit.unit_id)}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
