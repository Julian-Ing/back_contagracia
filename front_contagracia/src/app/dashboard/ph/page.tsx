'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import {
  Building2,
  Home,
  Users,
  Car,
  MapPin,
  Receipt,
  AlertTriangle,
  DollarSign,
  Key,
  Calendar,
  Loader2,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { useDashboard } from '@/modules/ph';

// ─── Color Map ───

const COLOR_MAP: Record<
  string,
  {
    border: string;
    bg: string;
    darkBorder: string;
    darkBg: string;
    text: string;
    darkText: string;
    subText: string;
    darkSubText: string;
    iconText: string;
    darkIconText: string;
  }
> = {
  blue: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    darkBorder: 'dark:border-blue-800',
    darkBg: 'dark:bg-blue-950/30',
    text: 'text-blue-900',
    darkText: 'dark:text-blue-100',
    subText: 'text-blue-600',
    darkSubText: 'dark:text-blue-400',
    iconText: 'text-blue-600',
    darkIconText: 'dark:text-blue-400',
  },
  indigo: {
    border: 'border-indigo-200',
    bg: 'bg-indigo-50',
    darkBorder: 'dark:border-indigo-800',
    darkBg: 'dark:bg-indigo-950/30',
    text: 'text-indigo-900',
    darkText: 'dark:text-indigo-100',
    subText: 'text-indigo-600',
    darkSubText: 'dark:text-indigo-400',
    iconText: 'text-indigo-600',
    darkIconText: 'dark:text-indigo-400',
  },
  green: {
    border: 'border-green-200',
    bg: 'bg-green-50',
    darkBorder: 'dark:border-green-800',
    darkBg: 'dark:bg-green-950/30',
    text: 'text-green-900',
    darkText: 'dark:text-green-100',
    subText: 'text-green-600',
    darkSubText: 'dark:text-green-400',
    iconText: 'text-green-600',
    darkIconText: 'dark:text-green-400',
  },
  orange: {
    border: 'border-orange-200',
    bg: 'bg-orange-50',
    darkBorder: 'dark:border-orange-800',
    darkBg: 'dark:bg-orange-950/30',
    text: 'text-orange-900',
    darkText: 'dark:text-orange-100',
    subText: 'text-orange-600',
    darkSubText: 'dark:text-orange-400',
    iconText: 'text-orange-600',
    darkIconText: 'dark:text-orange-400',
  },
  purple: {
    border: 'border-purple-200',
    bg: 'bg-purple-50',
    darkBorder: 'dark:border-purple-800',
    darkBg: 'dark:bg-purple-950/30',
    text: 'text-purple-900',
    darkText: 'dark:text-purple-100',
    subText: 'text-purple-600',
    darkSubText: 'dark:text-purple-400',
    iconText: 'text-purple-600',
    darkIconText: 'dark:text-purple-400',
  },
  yellow: {
    border: 'border-yellow-200',
    bg: 'bg-yellow-50',
    darkBorder: 'dark:border-yellow-800',
    darkBg: 'dark:bg-yellow-950/30',
    text: 'text-yellow-900',
    darkText: 'dark:text-yellow-100',
    subText: 'text-yellow-600',
    darkSubText: 'dark:text-yellow-400',
    iconText: 'text-yellow-600',
    darkIconText: 'dark:text-yellow-400',
  },
  red: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    darkBorder: 'dark:border-red-800',
    darkBg: 'dark:bg-red-950/30',
    text: 'text-red-900',
    darkText: 'dark:text-red-100',
    subText: 'text-red-600',
    darkSubText: 'dark:text-red-400',
    iconText: 'text-red-600',
    darkIconText: 'dark:text-red-400',
  },
  emerald: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    darkBorder: 'dark:border-emerald-800',
    darkBg: 'dark:bg-emerald-950/30',
    text: 'text-emerald-900',
    darkText: 'dark:text-emerald-100',
    subText: 'text-emerald-600',
    darkSubText: 'dark:text-emerald-400',
    iconText: 'text-emerald-600',
    darkIconText: 'dark:text-emerald-400',
  },
  cyan: {
    border: 'border-cyan-200',
    bg: 'bg-cyan-50',
    darkBorder: 'dark:border-cyan-800',
    darkBg: 'dark:bg-cyan-950/30',
    text: 'text-cyan-900',
    darkText: 'dark:text-cyan-100',
    subText: 'text-cyan-600',
    darkSubText: 'dark:text-cyan-400',
    iconText: 'text-cyan-600',
    darkIconText: 'dark:text-cyan-400',
  },
  pink: {
    border: 'border-pink-200',
    bg: 'bg-pink-50',
    darkBorder: 'dark:border-pink-800',
    darkBg: 'dark:bg-pink-950/30',
    text: 'text-pink-900',
    darkText: 'dark:text-pink-100',
    subText: 'text-pink-600',
    darkSubText: 'dark:text-pink-400',
    iconText: 'text-pink-600',
    darkIconText: 'dark:text-pink-400',
  },
};

// ─── Helpers ───

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-CO');
}

// ─── Quick Links Config ───

const QUICK_LINKS = [
  { label: 'Copropiedades', href: '/dashboard/ph/condominiums', icon: Building2 },
  { label: 'Unidades', href: '/dashboard/ph/units', icon: Home },
  { label: 'Copropietarios', href: '/dashboard/ph/residents', icon: Users },
  { label: 'Facturacion', href: '/dashboard/ph/billing', icon: Receipt },
  { label: 'Zonas Comunes', href: '/dashboard/ph/common-areas', icon: MapPin },
  { label: 'Vehiculos', href: '/dashboard/ph/vehicles', icon: Car },
  { label: 'Alquileres', href: '/dashboard/ph/rentals', icon: Key },
  { label: 'Configuracion', href: '/dashboard/ph/settings', icon: Settings },
];

// ─── Component ───

export default function PhDashboardPage() {
  const router = useRouter();
  const { stats, loading } = useDashboard();

  const s = stats ?? {
    condominiums: 0,
    units: 0,
    residents: 0,
    vehicles: 0,
    common_areas: 0,
    fees_pending: 0,
    fees_overdue: 0,
    fees_pending_amount: 0,
    active_rentals: 0,
    pending_reservations: 0,
  };

  const STAT_CARDS = [
    {
      title: 'Copropiedades',
      value: formatNumber(s.condominiums),
      icon: Building2,
      color: 'blue',
      description: 'Copropiedades registradas',
    },
    {
      title: 'Unidades',
      value: formatNumber(s.units),
      icon: Home,
      color: 'indigo',
      description: 'Unidades en todas las copropiedades',
    },
    {
      title: 'Copropietarios',
      value: formatNumber(s.residents),
      icon: Users,
      color: 'green',
      description: 'Residentes activos registrados',
    },
    {
      title: 'Vehiculos',
      value: formatNumber(s.vehicles),
      icon: Car,
      color: 'orange',
      description: 'Vehiculos registrados',
    },
    {
      title: 'Zonas Comunes',
      value: formatNumber(s.common_areas),
      icon: MapPin,
      color: 'purple',
      description: 'Zonas comunes disponibles',
    },
    {
      title: 'Cuotas Pendientes',
      value: formatNumber(s.fees_pending),
      icon: Receipt,
      color: 'yellow',
      description: 'Cuotas por cobrar',
    },
    {
      title: 'Cuotas Vencidas',
      value: formatNumber(s.fees_overdue),
      icon: AlertTriangle,
      color: 'red',
      description: 'Cuotas fuera de fecha de pago',
    },
    {
      title: 'Monto Pendiente',
      value: formatCOP(s.fees_pending_amount),
      icon: DollarSign,
      color: 'emerald',
      description: 'Total pendiente por recaudar',
    },
    {
      title: 'Alquileres Activos',
      value: formatNumber(s.active_rentals),
      icon: Key,
      color: 'cyan',
      description: 'Alquileres en curso actualmente',
    },
    {
      title: 'Reservas Pendientes',
      value: formatNumber(s.pending_reservations),
      icon: Calendar,
      color: 'pink',
      description: 'Reservas por confirmar',
    },
  ];

  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Propiedad Horizontal
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">
          Administra copropiedades, unidades, residentes, facturacion y zonas comunes.
        </p>
      </div>

      {/* KPI Cards — 2 rows of 5 */}
      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {STAT_CARDS.map((card) => {
              const c = COLOR_MAP[card.color];
              const Icon = card.icon;
              return (
                <Card
                  key={card.title}
                  className={cn(c.border, c.bg, c.darkBorder, c.darkBg)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle
                      className={cn('text-sm font-medium', c.subText, c.darkSubText)}
                    >
                      {card.title}
                    </CardTitle>
                    <Icon className={cn('h-4 w-4', c.iconText, c.darkIconText)} />
                  </CardHeader>
                  <CardContent>
                    <div className={cn('text-2xl font-bold', c.text, c.darkText)}>
                      {card.value}
                    </div>
                    <p className={cn('text-xs mt-1', c.subText, c.darkSubText)}>
                      {card.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Links */}
          <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">
                Acceso Rapido
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.href}
                    variant="outline"
                    className="h-20 flex-col gap-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
                    onClick={() => router.push(link.href)}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="flex items-center gap-1">
                      {link.label}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
