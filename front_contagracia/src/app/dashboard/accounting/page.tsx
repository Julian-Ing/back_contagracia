'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import {
  ListTree,
  Edit,
  BookOpen,
  MapPin,
  FileSpreadsheet,
  BookCheck,
  FileDigit,
  Banknote,
  Users,
  Layers,
  CalendarCheck,
  AlertCircle,
} from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  href: string;
  cta: string;
  disabled?: boolean;
}

function FeatureCard({ title, description, icon, iconBg, href, cta, disabled }: FeatureCardProps) {
  const router = useRouter();

  return (
    <Card className="group flex flex-col rounded-xl border border-muted/30 bg-background/80 backdrop-blur hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 w-[220px] h-[180px]">
      <CardHeader className="space-y-1 p-3">
        <div className="flex items-start gap-3">
          <div className={`h-8 w-8 grid place-items-center rounded-lg ${iconBg} text-white`}>
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold leading-tight">{title}</CardTitle>
            <CardDescription className="pt-1 text-xs leading-snug line-clamp-2">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="mt-auto p-3">
        <Button
          onClick={() => router.push(href)}
          disabled={disabled}
          size="sm"
          className="w-full text-xs"
          variant={disabled ? 'secondary' : 'default'}
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AccountingPage() {
  const { can } = usePermissions();

  const features: (FeatureCardProps & { permission: string })[] = [
    {
      title: 'Plan de Cuentas',
      description: 'Gestiona la estructura de tus cuentas contables.',
      icon: <ListTree className="h-4 w-4" />,
      iconBg: 'bg-emerald-500',
      href: '/dashboard/accounting/chart-of-accounts',
      cta: 'Gestionar',
      permission: 'chart_of_accounts.view',
    },
    {
      title: 'Asientos Contables',
      description: 'Consulta y crea asientos contables.',
      icon: <Edit className="h-4 w-4" />,
      iconBg: 'bg-amber-500',
      href: '/dashboard/accounting/journal-entries',
      cta: 'Ir',
      permission: 'journal_entries.view',
    },
    {
      title: 'Libro Mayor',
      description: 'Consulta los movimientos detallados por cuenta.',
      icon: <BookOpen className="h-4 w-4" />,
      iconBg: 'bg-blue-500',
      href: '/dashboard/accounting/general-ledger',
      cta: 'Consultar',
      permission: 'general_ledger.view',
    },
    {
      title: 'Mapeo Contable',
      description: 'Configura tus cuentas.',
      icon: <MapPin className="h-4 w-4" />,
      iconBg: 'bg-teal-500',
      href: '/dashboard/accounting/account-mapping',
      cta: 'Configurar',
      permission: 'account_mapping.view',
    },
    {
      title: 'Reportes Financieros',
      description: 'Estados Financieros y Certificados de Retención.',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      iconBg: 'bg-indigo-500',
      href: '/dashboard/accounting/reports',
      cta: 'Reportes',
      permission: 'reports.financial.view',
    },
    {
      title: 'Conciliación Bancaria',
      description: 'Compara registros con extractos.',
      icon: <BookCheck className="h-4 w-4" />,
      iconBg: 'bg-cyan-500',
      href: '/dashboard/accounting/bank-reconciliation',
      cta: 'Conciliar',
      permission: 'bank_reconciliation.view',
    },
    {
      title: 'Reporte de Impuestos',
      description: 'Prepara declaraciones de impuestos.',
      icon: <FileDigit className="h-4 w-4" />,
      iconBg: 'bg-green-600',
      href: '/dashboard/accounting/tax-reports',
      cta: 'Impuestos',
      permission: 'tax_reports.view',
    },
    {
      title: 'Impuestos y Retenciones',
      description: 'Cambia porcentajes de impuestos, crea y elimina.',
      icon: <Banknote className="h-4 w-4" />,
      iconBg: 'bg-purple-500',
      href: '/dashboard/accounting/tax-withholdings',
      cta: 'Gestionar',
      permission: 'tax.rates.view',
    },
    {
      title: 'Auxiliar de Tercero',
      description: 'Movimientos y saldos por tercero (CxC, CxP).',
      icon: <Users className="h-4 w-4" />,
      iconBg: 'bg-pink-500',
      href: '/dashboard/accounting/third-party-ledger',
      cta: 'Ver',
      permission: 'third_parties.ledger.view',
    },
    {
      title: 'Auxiliar por Cuentas',
      description: 'Movimientos y saldos por cuenta de toda la compañía.',
      icon: <Layers className="h-4 w-4" />,
      iconBg: 'bg-sky-600',
      href: '/dashboard/accounting/accounts-ledger',
      cta: 'Ver',
      permission: 'auxiliary_books.view',
    },
    {
      title: 'Períodos Contables',
      description: 'Gestión de períodos contables.',
      icon: <CalendarCheck className="h-4 w-4" />,
      iconBg: 'bg-slate-600',
      href: '/dashboard/accounting/closing',
      cta: 'Gestionar',
      permission: 'closing.view',
    },
    {
      title: 'Información Exógena',
      description: 'Genera y descarga formatos exógenos DIAN.',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      iconBg: 'bg-violet-600',
      href: '/dashboard/accounting/exogenous',
      cta: 'Gestionar',
      permission: 'exogenous.view',
    },
  ];

  // Filtrar features según permisos del usuario
  const visibleFeatures = features.filter((feature) => can(feature.permission));

  return (
    <ProtectedRoute permission="accounting.view" deniedMessage="No tienes permisos para acceder al módulo de Contabilidad.">
      <div className="space-y-6 p-6">
        <header className="mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Módulo de Contabilidad</h1>
          <p className="text-sm text-muted-foreground">Tu centro de control para la salud financiera de tu negocio.</p>
        </header>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center gap-3 p-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <CardTitle className="text-blue-700 dark:text-blue-300 text-sm">Contabilidad Híbrida</CardTitle>
              <CardDescription className="text-blue-600 dark:text-blue-400 mt-1 text-xs">
                El sistema crea asientos automáticos por cada operación. También puedes crear asientos manuales para ajustes y control.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div className="flex flex-wrap gap-4 justify-center">
          {visibleFeatures.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              iconBg={feature.iconBg}
              href={feature.href}
              cta={feature.cta}
              disabled={feature.disabled}
            />
          ))}
        </div>

        {visibleFeatures.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No tienes permisos para ver ninguna funcionalidad de contabilidad.</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
