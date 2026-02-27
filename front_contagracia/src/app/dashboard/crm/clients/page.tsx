'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Search,
  Users,
  DollarSign,
  Receipt,
  TrendingUp,
  MoreHorizontal,
  Eye,
  PlusCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import type { CrmContact } from '@/modules/crm/types';
import { useContacts } from '@/modules/crm/hooks/useContacts';

// ---------- Constants ----------

const ITEMS_PER_PAGE = 10;

// ---------- Helpers ----------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------- Component ----------

export default function CrmClientsPage() {
  const { contacts: clients, loading, refetch } = useContacts();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch clients on mount (contacts with is_client flag)
  useEffect(() => {
    refetch({ is_client: true });
  }, [refetch]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        !search ||
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        (client.company_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (client.email ?? '').toLowerCase().includes(search.toLowerCase());

      return matchesSearch;
    });
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE));
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Stats - simplified for MVP
  const stats = useMemo(() => {
    const total = filteredClients.length;
    return { total };
  }, [filteredClients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-64"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Valor Total Ganado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">—</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Próximamente</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Facturado
            </CardTitle>
            <Receipt className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">—</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Próximamente</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Valor Promedio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">—</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Próximamente</p>
          </CardContent>
        </Card>
      </div>

      {/* Table / Empty State */}
      {loading ? (
        <Card className="bg-white dark:bg-slate-800/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Cargando clientes...
            </p>
          </CardContent>
        </Card>
      ) : paginatedClients.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="h-12 w-12 text-gray-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Sin clientes
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Aún no hay contactos con oportunidades ganadas. Cierra tu primera oportunidad para
              verla aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-slate-800/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {client.name}
                        </p>
                        {client.company_name && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {client.company_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300">
                      {client.email || '—'}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300">
                      {client.phone || '—'}
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400">
                      {formatDate(client.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver contacto
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nueva oportunidad
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            Ir a facturación
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredClients.length)} de{' '}
              {filteredClients.length} clientes
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
