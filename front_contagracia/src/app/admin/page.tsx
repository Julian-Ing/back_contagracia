'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Users,
  Building,
  FileText,
  Package,
  Loader2,
  UserPlus,
  Activity,
  RefreshCw,
  LayoutGrid,
} from 'lucide-react';
import type { AdminOverview, RecentUser } from '@/modules/admin';

// Mock data para desarrollo
const MOCK_OVERVIEW: AdminOverview = {
  total_users: 34,
  active_users_last_30_days: 8,
  new_users_last_30_days: 5,
  total_companies: 16,
  total_invoices: 364,
  total_inventory_items: 259,
  recent_users: [
    {
      id: '1',
      email: 'tatiana.hernandez.castillo@gmail.com',
      role: 'user',
      status: 'active',
      created_at: '2026-01-17T10:00:00Z',
    },
    {
      id: '2',
      email: 'vidriosyaluminiosdyv@gmail.com',
      role: 'user',
      status: 'active',
      created_at: '2026-01-16T10:00:00Z',
    },
    {
      id: '3',
      email: 'plasticoshyn@gmail.com',
      role: 'user',
      status: 'active',
      created_at: '2026-01-13T10:00:00Z',
    },
    {
      id: '4',
      email: 'shibai@gmail.com',
      role: 'user',
      status: 'active',
      created_at: '2026-01-05T10:00:00Z',
    },
    {
      id: '5',
      email: 'demo@contagracia.com',
      role: 'admin',
      status: 'active',
      created_at: '2026-01-01T10:00:00Z',
    },
  ],
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card className="bg-transparent border-gray-200 dark:border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700 dark:text-slate-300">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString('es-CO')}</div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'inactive':
      return 'bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600';
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default:
      return 'bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600';
  }
}

function getRoleBadgeClass(role: string): string {
  return role === 'admin'
    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
    : 'bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600';
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Reemplazar con llamada real al API
      // const data = await adminService.getSystemOverview();
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simular delay
      setOverview(MOCK_OVERVIEW);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div>
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard de Administración</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Una vista general del estado de la plataforma.</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchDashboardData}
          disabled={loading}
          className="border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white h-10 w-10"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
        </Button>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : overview ? (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <StatCard
              title="Usuarios Totales"
              value={overview.total_users}
              icon={<Users className="h-4 w-4 text-gray-500 dark:text-slate-400" />}
              description="Todos los usuarios registrados."
            />
            <StatCard
              title="Usuarios Activos"
              value={overview.active_users_last_30_days}
              icon={<Activity className="h-4 w-4 text-gray-500 dark:text-slate-400" />}
              description="Usuarios activos en los últimos 30 días."
            />
            <StatCard
              title="Nuevos Usuarios"
              value={overview.new_users_last_30_days}
              icon={<UserPlus className="h-4 w-4 text-gray-500 dark:text-slate-400" />}
              description="Registrados en los últimos 30 días."
            />
            <StatCard
              title="Empresas Registradas"
              value={overview.total_companies}
              icon={<Building className="h-4 w-4 text-gray-500 dark:text-slate-400" />}
              description="Empresas con perfil creado."
            />
            <StatCard
              title="Facturas Totales"
              value={overview.total_invoices}
              icon={<FileText className="h-4 w-4 text-gray-500 dark:text-slate-400" />}
              description="Total de facturas creadas."
            />
            <StatCard
              title="Items de Inventario"
              value={overview.total_inventory_items}
              icon={<Package className="h-4 w-4 text-gray-500 dark:text-slate-400" />}
              description="Total de productos/servicios."
            />
          </div>

          {/* Recent Users Table */}
          <Card className="bg-transparent border-gray-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Registros Recientes</CardTitle>
              <CardDescription className="text-gray-400 dark:text-slate-500">
                Los últimos 5 usuarios que se han unido a la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-700 hover:bg-transparent">
                    <TableHead className="text-gray-500 dark:text-slate-400">Email</TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400">Rol</TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400">Estado</TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-right">Fecha de Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recent_users.map((user) => (
                    <TableRow key={user.id} className="border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800/30">
                      <TableCell className="font-medium text-gray-900 dark:text-white">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeClass(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-gray-700 dark:text-slate-300">
                        {formatDate(user.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-20">
          <LayoutGrid className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400">No se pudieron cargar los datos del dashboard.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            className="mt-4 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}
