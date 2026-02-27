/**
 * Report Components — sistema de reportes imprimibles reutilizable
 *
 * Uso básico:
 *
 *   import {
 *     ReportDocument,
 *     ReportHeader,
 *     ReportTable,
 *     ReportSectionHeader,
 *     ReportTotalsRow,
 *     ReportFooter,
 *   } from '@/shared/components/reports';
 *
 *   import { useReportCompany } from '@/shared/hooks/useReportCompany';
 *   import { formatDateLong } from '@/shared/utils/formatDate';
 */

export { ReportDocument } from './ReportDocument';
export { ReportHeader } from './ReportHeader';
export { ReportTable } from './ReportTable';
export { ReportSectionHeader } from './ReportSectionHeader';
export { ReportTotalsRow } from './ReportTotalsRow';
export { ReportFooter } from './ReportFooter';
export { ReportSignatures, SIGNER_LABELS } from './ReportSignatures';

export type { ReportHeaderProps } from './ReportHeader';
export type { ReportColumn } from './ReportTable';
export type { SignerKey, SignerDisplay } from './ReportSignatures';
