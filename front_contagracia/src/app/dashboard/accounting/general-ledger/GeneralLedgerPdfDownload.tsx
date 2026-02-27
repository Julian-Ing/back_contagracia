'use client';

/**
 * Botón de descarga PDF para el Libro Mayor.
 * Contiene el Document completo de @react-pdf/renderer.
 *
 * IMPORTANTE: importar con dynamic({ ssr: false }) desde la page.
 *
 * El PdfHeader se envuelve en un View con fixed + position absolute para que
 * aparezca en TODAS las páginas del PDF. El paddingTop de la Page se ajusta
 * para que el contenido no quede debajo del header.
 */

import { Document, Page, View } from '@react-pdf/renderer';
import {
  PdfHeader,
  PdfFooter,
  PdfSectionHeader,
  PdfTable,
  PdfTotalsRow,
  PdfSignatures,
  pdfStyles,
} from '@/shared/components/reports/pdf';
import type { PdfColumn } from '@/shared/components/reports/pdf';
import { PdfDownloadButton } from '@/shared/components/reports/PdfDownloadButton';
import { formatNumberCO } from '@/shared/utils/formatNumber';
import type { GeneralLedgerData, GeneralLedgerMovement } from './useGeneralLedger';
import type { SignerDisplay } from '@/shared/components/reports';

// paddingTop que deja espacio al header fijo (~130pt de alto + 30pt de margen superior)
const PAGE_PADDING_TOP = 160;

interface GeneralLedgerPdfDownloadProps {
  companyName: string;
  nit: string;
  dv?: string;
  title?: string;
  subtitle: string;
  logoSrc?: string;
  fileName?: string;
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
  // Datos del reporte
  data: GeneralLedgerData;
  signers?: SignerDisplay[];
  generatedAt?: Date;
}

const PDF_COLS: PdfColumn<GeneralLedgerMovement>[] = [
  {
    key: 'date',
    label: 'Fecha',
    width: 48,
    render: (v) => {
      if (!v) return '-';
      const d = new Date(v);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
  },
  {
    key: 'consecutive',
    label: 'Comprobante',
    width: 55,
  },
  {
    key: 'description',
    label: 'Descripción',
    width: 1,
  },
  {
    key: 'third_party_name',
    label: 'Tercero',
    width: 65,
  },
  {
    key: 'debit',
    label: 'Débito',
    width: 58,
    align: 'right',
    render: (v) => (v ? formatNumberCO(v, 2) : '-'),
  },
  {
    key: 'credit',
    label: 'Crédito',
    width: 58,
    align: 'right',
    render: (v) => (v ? formatNumberCO(v, 2) : '-'),
  },
  {
    key: 'balance',
    label: 'Saldo',
    width: 58,
    align: 'right',
    render: (v) => formatNumberCO(v, 2),
  },
];

export default function GeneralLedgerPdfDownload({
  companyName,
  nit,
  dv,
  title = 'Libro Mayor',
  subtitle,
  logoSrc,
  fileName = 'libro-mayor.pdf',
  person_type,
  address,
  municipality,
  city,
  department,
  phone,
  email,
  regime,
  liability,
  data,
  signers = [],
  generatedAt,
}: GeneralLedgerPdfDownloadProps) {
  const doc = (
    <Document title={title}>
      <Page
        size="A4"
        style={{
          ...pdfStyles.page,
          // paddingTop ampliado para dejar espacio al header fijo
          paddingTop: PAGE_PADDING_TOP,
        }}
      >
        {/* ── Header fijo en TODAS las páginas ── */}
        <View
          fixed
          style={{
            position: 'absolute',
            top: 30,
            left: 35,
            right: 35,
          }}
        >
          <PdfHeader
            companyName={companyName}
            nit={nit}
            dv={dv}
            title={title}
            subtitle={subtitle}
            logoSrc={logoSrc}
            person_type={person_type}
            address={address}
            municipality={municipality}
            city={city}
            department={department}
            phone={phone}
            email={email}
            regime={regime}
            liability={liability}
          />
        </View>

        {/* ── Secciones por cuenta ── */}
        {data.accounts.map((account) => (
          <View key={account.code}>
            <PdfSectionHeader
              title={`${account.code} - ${account.name}`}
              initialBalance={account.opening_balance}
            />
            <PdfTable<GeneralLedgerMovement>
              columns={PDF_COLS}
              rows={account.movements}
            />
            <PdfTotalsRow
              label={`Total ${account.code}:`}
              debit={account.total_debits}
              credit={account.total_credits}
              balance={account.closing_balance}
            />
          </View>
        ))}

        {/* ── Totales generales ── */}
        <PdfTotalsRow
          debit={data.grand_total_debits}
          credit={data.grand_total_credits}
          isGrand
        />

        {/* ── Firmas ── */}
        {signers.length > 0 && <PdfSignatures signers={signers} />}

        <PdfFooter generatedAt={generatedAt} />
      </Page>
    </Document>
  );

  return <PdfDownloadButton document={doc} fileName={fileName} label="Descargar PDF" />;
}
