'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Check, Star } from 'lucide-react';
import { adminService } from '@/modules/admin/services/admin.service';
import type { SiteSection } from '@/modules/admin/types/cms.types';
import type { Plan } from '@/modules/admin/types';

interface PricingSectionProps {
  section: SiteSection;
  onGetStartedClick?: (plan?: Plan) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

function PlanCard({
  plan,
  onGetStartedClick,
}: {
  plan: Plan;
  onGetStartedClick?: (plan: Plan) => void;
}) {
  const isPopular =
    (plan as any).is_default ||
    plan.name?.toLowerCase() === 'profesional';

  const price = useMemo(() => Number((plan as any).price) || 0, [plan]);
  const days = (plan as any).days || 30;
  const invoiceLimit = (plan as any).max_invoices;
  const userLimit = (plan as any).max_users;

  return (
    <Card
      className={`relative flex h-full flex-col rounded-2xl ${isPopular ? 'border-blue-500/60 shadow-lg' : ''}`}
    >
      {isPopular && (
        <Badge className="absolute -top-3 right-4 flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
          <Star className="h-3 w-3" /> Más Popular
        </Badge>
      )}

      <CardHeader>
        <CardTitle className="text-2xl font-semibold leading-7">
          {plan.name}
        </CardTitle>
        <p className="mt-1 min-h-6 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {plan.description ?? '—'}
        </p>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mt-2 flex items-baseline gap-2">
          {price > 0 ? (
            <>
              <span className="text-4xl font-bold tracking-tight">
                {formatCurrency(price)}
              </span>
              <span className="text-sm font-semibold leading-6 text-slate-500">
                /{days} días
              </span>
            </>
          ) : (
            <span className="text-4xl font-bold tracking-tight">Gratis</span>
          )}
        </div>

        <div className="my-6 border-t border-slate-200 dark:border-slate-700" />

        <ul role="list" className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-2">
            <Check className="h-5 w-5 text-blue-600" />
            Duración:{' '}
            <span className="font-semibold ml-1">{days} días</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-5 w-5 text-blue-600" />
            Facturas:{' '}
            <span className="font-semibold ml-1">
              {invoiceLimit ? `${invoiceLimit}` : 'Ilimitadas'}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-5 w-5 text-blue-600" />
            Usuarios:{' '}
            <span className="font-semibold ml-1">
              {userLimit ? userLimit : 'Ilimitados'}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-5 w-5 text-blue-600" />
            Soporte por email
          </li>
        </ul>
      </CardContent>

      <CardFooter className="mt-2">
        <Button
          onClick={() => onGetStartedClick?.(plan)}
          variant={isPopular ? 'default' : 'outline'}
          className="w-full py-6 text-base"
        >
          Empezar ahora
        </Button>
      </CardFooter>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 md:max-w-2xl md:grid-cols-2 lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-2xl border bg-white dark:bg-slate-800 p-6 shadow-sm"
        >
          <div className="mb-4">
            <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="mt-2 h-4 w-64 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="h-9 w-28 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
          <ul className="mt-6 space-y-3">
            <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </ul>
          <div className="mt-6 h-10 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function PricingSection({
  section,
  onGetStartedClick,
}: PricingSectionProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = section.title || 'Planes y Precios';
  const subtitle =
    section.subtitle || 'Elige el plan que mejor se adapte a tu negocio';

  useEffect(() => {
    let ignore = false;
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const data = await adminService.getPlans();
        if (!ignore) setPlans(data);
      } catch (err: any) {
        if (!ignore) setError('No pudimos cargar los planes.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchPlans();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section id="pricing" className="bg-white dark:bg-slate-900/95 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            Precios
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl text-slate-900 dark:text-white">
            {title}
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-slate-600 dark:text-slate-300">
          {subtitle}
        </p>

        {error && (
          <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingGrid />
        ) : plans.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="rounded-2xl border p-10 shadow-sm bg-white dark:bg-slate-800 max-w-lg">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                Aún no hay planes activos
              </p>
            </div>
          </div>
        ) : (
          <div className="isolate mx-auto mt-12 grid max-w-md grid-cols-1 gap-8 md:max-w-2xl md:grid-cols-2 lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onGetStartedClick={onGetStartedClick}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
