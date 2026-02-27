import * as React from 'react';
import Image from 'next/image';
import { FileText } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface ReportHeaderProps {
  companyName: string;
  nit: string;
  dv?: string;
  title: string;
  subtitle?: string;
  logoSrc?: string;
  logoLoading?: boolean;
  // Identificación
  person_type?: string;
  // Contacto / ubicación
  address?: string;
  municipality?: string;
  city?: string;
  department?: string;
  phone?: string;
  email?: string;
  // Fiscal
  regime?: string;
  liability?: string;
  className?: string;
}

export function ReportHeader({
  companyName,
  nit,
  dv,
  title,
  subtitle,
  logoSrc,
  logoLoading,
  person_type,
  address,
  municipality,
  city,
  department,
  phone,
  email,
  regime,
  liability,
  className,
}: ReportHeaderProps) {
  const location = [municipality || city, department].filter(Boolean).join(', ');
  const locationAddress = [location, address].filter(Boolean).join('  ·  ');
  const contact = [phone && `Tel: ${phone}`, email].filter(Boolean).join('  ·  ');
  const fiscal = [regime && `Régimen: ${regime}`, liability && `Resp.: ${liability}`]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <div
      id="report-header"
      className={cn(
        'flex items-start justify-between pb-4 border-b border-gray-300 dark:border-gray-600',
        className,
      )}
    >
      {/* ── Info legal + contacto ── */}
      <div className="flex flex-col gap-0.5">
        <span className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
          {companyName}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          NIT: {nit}{dv ? `-${dv}` : ''}
          {person_type && <span className="ml-2 text-xs text-gray-500">· {person_type}</span>}
        </span>

        {locationAddress && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{locationAddress}</span>
        )}
        {contact && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{contact}</span>
        )}
        {fiscal && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{fiscal}</span>
        )}

        <div className="flex items-baseline gap-2 mt-2 flex-wrap">
          <span className="text-base font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </span>
          {subtitle && (
            <span className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</span>
          )}
        </div>
      </div>

      {/* ── Logo ── */}
      <div className="shrink-0 ml-6 h-20 w-36 flex items-center justify-end">
        {logoLoading ? (
          <div className="h-16 w-28 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
        ) : logoSrc ? (
          <Image
            src={logoSrc}
            alt={companyName}
            width={144}
            height={80}
            className="object-contain max-h-20"
            unoptimized
          />
        ) : (
          <div className="h-16 w-28 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
            <FileText className="h-6 w-6 text-gray-300" />
          </div>
        )}
      </div>
    </div>
  );
}
