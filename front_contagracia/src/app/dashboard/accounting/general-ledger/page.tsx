'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/shared/components/auth';
import { BookOpen, Download, Printer, Search, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { TimePicker } from '@/shared/components/ui/time-picker';
import { useReportCompany } from '@/shared/hooks/useReportCompany';
import { formatDateLong } from '@/shared/utils/formatDate';
import { formatDate } from '@/shared/utils/formatDate';
import { formatNumberCO } from '@/shared/utils/formatNumber';
import {
  ReportDocument,
  ReportHeader,
  ReportFooter,
  ReportSectionHeader,
  ReportTable,
  ReportTotalsRow,
  ReportSignatures,
  SIGNER_LABELS,
} from '@/shared/components/reports';
import type { ReportColumn } from '@/shared/components/reports/ReportTable';
import type { SignerKey, SignerDisplay } from '@/shared/components/reports';
import { useGeneralLedger, type GeneralLedgerMovement } from './useGeneralLedger';

// Carga dinámica para evitar SSR de @react-pdf/renderer
const GeneralLedgerPdfDownload = dynamic(
  () => import('./GeneralLedgerPdfDownload'),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" disabled className="gap-2">
        <Download className="h-4 w-4" />
        PDF...
      </Button>
    ),
  },
);

const COLUMNS: ReportColumn<GeneralLedgerMovement>[] = [
  {
    key: 'date',
    label: 'Fecha',
    align: 'left',
    className: 'w-24 shrink-0',
    render: (v) => formatDate(v),
  },
  {
    key: 'consecutive',
    label: 'Comprobante',
    align: 'left',
    className: 'w-28 shrink-0',
  },
  {
    key: 'description',
    label: 'Descripción',
    align: 'left',
  },
  {
    key: 'third_party_name',
    label: 'Tercero',
    align: 'left',
    className: 'w-36',
  },
  {
    key: 'debit',
    label: 'Débito',
    align: 'right',
    className: 'w-28 shrink-0',
    render: (v) => (v ? formatNumberCO(v, 2) : '-'),
  },
  {
    key: 'credit',
    label: 'Crédito',
    align: 'right',
    className: 'w-28 shrink-0',
    render: (v) => (v ? formatNumberCO(v, 2) : '-'),
  },
  {
    key: 'balance',
    label: 'Saldo',
    align: 'right',
    className: 'w-28 shrink-0',
    render: (v) => formatNumberCO(v, 2),
  },
];

export default function GeneralLedgerPage() {
  const currentYear = new Date().getFullYear();
  const [title, setTitle] = useState('Libro Mayor');
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);

  const { company, logoSrc, signerSrcs, loading: companyLoading } = useReportCompany();

  const ALL_SIGNERS: SignerKey[] = ['legal_rep', 'contador', 'revisor_fiscal'];
  const [slot1, setSlot1] = useState<SignerKey | ''>('');
  const [slot2, setSlot2] = useState<SignerKey | ''>('');
  const [slot3, setSlot3] = useState<SignerKey | ''>('');

  const slot1Options = ALL_SIGNERS.filter((k) => k !== slot2 && k !== slot3);
  const slot2Options = ALL_SIGNERS.filter((k) => k !== slot1 && k !== slot3);
  const slot3Options = ALL_SIGNERS.filter((k) => k !== slot1 && k !== slot2);

  const selectedSigners = useMemo<SignerDisplay[]>(() => {
    return ([slot1, slot2, slot3] as (SignerKey | '')[])
      .filter(Boolean)
      .map((key) => {
        const k = key as SignerKey;
        const name =
          k === 'legal_rep'
            ? company?.legal_rep_name
            : k === 'contador'
              ? company?.contador_name
              : company?.revisor_fiscal_name;
        return { key: k, label: SIGNER_LABELS[k], name, signatureSrc: signerSrcs[k] };
      });
  }, [slot1, slot2, slot3, company, signerSrcs]);

  // ── Fecha de generación ──────────────────────────────────────────────────
  const nowRef = new Date();
  const todayStr = nowRef.toISOString().slice(0, 10);
  const nowTimeStr = `${nowRef.getHours().toString().padStart(2, '0')}:${nowRef.getMinutes().toString().padStart(2, '0')}`;

  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState(todayStr);
  const [customTime, setCustomTime] = useState(nowTimeStr);

  const generatedAt = useMemo<Date | undefined>(() => {
    if (!useCustomDate || !customDate) return undefined;
    const [year, month, day] = customDate.split('-').map(Number);
    const [hour = 0, minute = 0] = (customTime || '00:00').split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, 0);
  }, [useCustomDate, customDate, customTime]);

  const { data, loading: dataLoading, error, fetch } = useGeneralLedger();

  const subtitle =
    dateFrom && dateTo
      ? `de ${formatDateLong(dateFrom)} a ${formatDateLong(dateTo)}`
      : '';

  const handleGenerate = () => {
    fetch(dateFrom, dateTo);
  };

  return (
    <ProtectedRoute
      permission="general_ledger.view"
      deniedMessage="No tienes permisos para ver el Libro Mayor."
    >
      <div className="p-6">
        {/* ── Encabezado de la página (UI, no va en el PDF) ── */}
        <header className="mb-6 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-blue-500 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Libro Mayor
                </h1>
                <p className="text-sm text-muted-foreground">
                  Movimientos detallados por cuenta contable.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!companyLoading && data && (
                <GeneralLedgerPdfDownload
                  companyName={company?.company_name ?? ''}
                  nit={company?.nit ?? ''}
                  dv={company?.dv}
                  title={title || 'Libro Mayor'}
                  subtitle={subtitle}
                  logoSrc={logoSrc}
                  person_type={company?.person_type}
                  address={company?.address}
                  municipality={company?.municipality}
                  city={company?.city}
                  department={company?.department}
                  phone={company?.phone}
                  email={company?.email}
                  regime={company?.regime}
                  liability={company?.liability}
                  data={data}
                  signers={selectedSigners}
                  generatedAt={generatedAt}
                />
              )}
              <Button variant="outline" onClick={() => window.print()} className="gap-2" disabled={!data}>
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </div>
        </header>

        {/* ── Filtros ── */}
        <div className="mb-6 flex flex-wrap gap-4 items-end print:hidden">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Título del reporte
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Libro Mayor"
              className="h-10 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Fecha desde
            </label>
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Seleccionar fecha"
              clearable={false}
              className="w-52"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Fecha hasta
            </label>
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="Seleccionar fecha"
              clearable={false}
              minDate={dateFrom}
              className="w-52"
            />
          </div>
          <Button onClick={handleGenerate} disabled={dataLoading} className="gap-2">
            {dataLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Generar
          </Button>

          {/* Separador */}
          <div className="h-10 w-px bg-gray-200 dark:bg-gray-700 self-end" />

          {/* Selectores de firma */}
          {(['1ra Firma', '2da Firma', '3ra Firma'] as const).map((label, i) => {
            const value = [slot1, slot2, slot3][i];
            const setValue = [setSlot1, setSlot2, setSlot3][i];
            const options = [slot1Options, slot2Options, slot3Options][i];
            return (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {label}
                </label>
                <select
                  value={value}
                  onChange={(e) => setValue(e.target.value as SignerKey | '')}
                  className="h-10 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ninguna</option>
                  {options.map((k) => (
                    <option key={k} value={k}>
                      {SIGNER_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          {/* Separador */}
          <div className="h-10 w-px bg-gray-200 dark:bg-gray-700 self-end" />

          {/* Fecha de generación */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Fecha del informe
            </label>
            <label className="flex items-center gap-2 h-10 cursor-pointer select-none text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={useCustomDate}
                onChange={(e) => setUseCustomDate(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 accent-blue-600"
              />
              Personalizar
            </label>
          </div>
          {useCustomDate && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Fecha
                </label>
                <DatePicker
                  value={customDate}
                  onChange={setCustomDate}
                  clearable={false}
                  className="w-44"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Hora
                </label>
                <TimePicker
                  value={customTime}
                  onChange={setCustomTime}
                  clearable={false}
                  className="w-36"
                />
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400 print:hidden">
            {error}
          </div>
        )}

        {/* ── Vista previa / reporte imprimible ── */}
        <ReportDocument>
          {companyLoading ? (
            <div className="space-y-2 animate-pulse pb-4 border-b border-gray-300">
              <div className="h-5 w-56 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ) : (
            <ReportHeader
              companyName={company?.company_name ?? ''}
              nit={company?.nit ?? ''}
              dv={company?.dv}
              title={title || 'Libro Mayor'}
              subtitle={subtitle}
              logoSrc={logoSrc}
              person_type={company?.person_type}
              address={company?.address}
              municipality={company?.municipality}
              city={company?.city}
              department={company?.department}
              phone={company?.phone}
              email={company?.email}
              regime={company?.regime}
              liability={company?.liability}
            />
          )}

          {/* ── Cuerpo del reporte ── */}
          {dataLoading && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500 print:hidden">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando reporte...
            </div>
          )}

          {!dataLoading && !data && !error && (
            <div className="mt-10 text-center text-sm text-gray-400 dark:text-gray-500 print:hidden">
              <p>Selecciona el rango de fechas y haz clic en <strong>Generar</strong>.</p>
            </div>
          )}

          {!dataLoading && data && (
            <>
              {data.accounts.length === 0 ? (
                <div className="mt-10 text-center text-sm text-gray-400 dark:text-gray-500">
                  No hay movimientos en el período seleccionado.
                </div>
              ) : (
                <>
                  {data.accounts.map((account) => (
                    <div key={account.code}>
                      <ReportSectionHeader
                        title={`${account.code} - ${account.name}`}
                        initialBalance={account.opening_balance}
                      />
                      <ReportTable<GeneralLedgerMovement>
                        columns={COLUMNS}
                        rows={account.movements}
                      />
                      <ReportTotalsRow
                        label={`Total ${account.code}:`}
                        debit={account.total_debits}
                        credit={account.total_credits}
                        balance={account.closing_balance}
                      />
                    </div>
                  ))}

                  <ReportTotalsRow
                    debit={data.grand_total_debits}
                    credit={data.grand_total_credits}
                    isGrand
                  />
                </>
              )}
            </>
          )}

          <ReportSignatures signers={selectedSigners} />

          <ReportFooter generatedAt={generatedAt} />
        </ReportDocument>
      </div>
    </ProtectedRoute>
  );
}
