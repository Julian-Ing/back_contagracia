import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyCO } from '@/shared/utils/formatNumber';

interface PdfItem {
  account: { code: string; name: string };
  third_party: { identification_number: string; name: string } | null;
  bank_account: { account_name: string } | null;
  description: string | null;
  type: 'DEBIT' | 'CREDIT';
  amount: string | number;
}

interface PdfEntry {
  consecutive: string;
  date: string | null;
  description: string | null;
  type: { description: string };
  is_reversed: boolean;
  type_key: string;
  items: PdfItem[];
}

interface GenerateOptions {
  entry: PdfEntry;
  companyName: string;
  nit: string;
  logoUrl?: string | null;
  displayDecimals: number;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Sin fecha';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function generateJournalEntryPdf({ entry, companyName, nit, logoUrl, displayDecimals }: GenerateOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Logo
  let textStartX = 14;
  if (logoUrl) {
    const imgData = await loadImageAsBase64(logoUrl);
    if (imgData) {
      doc.addImage(imgData, 'PNG', 14, 12, 18, 18);
      textStartX = 36;
    }
  }

  // Company header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, textStartX, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIT: ${nit}`, textStartX, 26);

  // Generated date (right)
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${now}`, pageWidth - 14, 20, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Entry title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Asiento Contable — ${entry.consecutive}`, 14, 38);

  // Entry info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const estado = entry.is_reversed ? 'Reversado' : entry.type_key === 'reversal' ? 'Reversión' : 'Activo';
  const infoLine = `Fecha: ${formatDate(entry.date)}    |    Tipo: ${entry.type.description}    |    Estado: ${estado}`;
  doc.text(infoLine, 14, 44);

  if (entry.description) {
    doc.text(`Descripción: ${entry.description}`, 14, 50);
  }

  const fmt = (val: string | number) => formatCurrencyCO(typeof val === 'string' ? parseFloat(val) : val, displayDecimals);

  // Table
  let totalDebit = 0;
  let totalCredit = 0;

  const rows = entry.items.map((item) => {
    const amt = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;
    if (item.type === 'DEBIT') totalDebit += amt;
    else totalCredit += amt;

    return [
      `${item.account.code} ${item.account.name}`,
      item.third_party ? `${item.third_party.identification_number} ${item.third_party.name}` : '—',
      item.bank_account?.account_name || '—',
      item.description || '—',
      item.type === 'DEBIT' ? fmt(amt) : '—',
      item.type === 'CREDIT' ? fmt(amt) : '—',
    ];
  });

  // Totals row
  rows.push(['', '', '', 'Totales', fmt(totalDebit), fmt(totalCredit)]);

  autoTable(doc, {
    startY: entry.description ? 55 : 49,
    head: [['Cuenta', 'Tercero', 'Banco/Caja', 'Descripción', 'Débito', 'Crédito']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [245, 158, 11], // amber-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 45 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 25 },
    },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    // Bold totals row
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [243, 244, 246];
      }
    },
    margin: { bottom: 20 },
    didDrawPage: () => {
      // Page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${doc.getCurrentPageInfo().pageNumber} de ${pageCount}`,
        pageWidth / 2, pageHeight - 10,
        { align: 'center' }
      );
    },
  });

  doc.save(`${entry.consecutive}.pdf`);
}
