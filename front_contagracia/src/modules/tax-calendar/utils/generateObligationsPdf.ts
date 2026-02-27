import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ObligationPdfRow {
  name: string;
  period: string;
  dueDate: string;
  type: string;
}

export interface GeneratePdfOptions {
  companyName: string;
  nit: string;
  nitLastDigit?: string;
  logoUrl?: string | null;
  scopeLabel: string; // Ej: "Enero 2026", "Año 2026"
  year: number;
  totalCount?: number;
  obligations: ObligationPdfRow[];
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

export async function generateObligationsPdf({ companyName, nit, nitLastDigit, logoUrl, scopeLabel, year, totalCount, obligations }: GeneratePdfOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Logo de la empresa
  let textStartX = 14;
  if (logoUrl) {
    const imgData = await loadImageAsBase64(logoUrl);
    if (imgData) {
      doc.addImage(imgData, 'PNG', 14, 12, 18, 18);
      textStartX = 36;
    }
  }

  // Header — Nombre empresa
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, textStartX, 20);

  // NIT + dígito
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const nitText = nitLastDigit ? `NIT: ${nit} (último dígito: ${nitLastDigit})` : `NIT: ${nit}`;
  doc.text(nitText, textStartX, 27);

  // Título scope
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Calendario Tributario — ${scopeLabel}`, 14, 38);

  // Total obligaciones
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const count = totalCount ?? obligations.length;
  doc.text(`${count} obligaciones`, 14, 44);

  // Fecha generación (derecha)
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${now}`, pageWidth - 14, 20, { align: 'right' });
  doc.text('Fuente: DIAN', pageWidth - 14, 25, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // URL DIAN para el footer
  const dianUrl = `https://www.dian.gov.co/Calendarios/Calendario_Tributario_${year}.pdf`;

  // Tabla
  autoTable(doc, {
    startY: 50,
    head: [['Obligación', 'Período', 'Fecha Vencimiento', 'Tipo']],
    body: obligations.map((o) => [o.name, o.period, o.dueDate, o.type]),
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [67, 56, 202], // indigo-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 255],
    },
    margin: { bottom: 30 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();

      // Línea separadora del footer
      doc.setDrawColor(200, 200, 200);
      doc.line(14, pageHeight - 28, pageWidth - 14, pageHeight - 28);

      // Referencia DIAN — texto normal + link en azul
      const prefixText = 'Para especificaciones oficiales visite: ';
      const linkText = 'Calendario Tributario DIAN';

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const prefixWidth = doc.getTextWidth(prefixText);
      const startX = (pageWidth - prefixWidth - doc.getTextWidth(linkText)) / 2;
      doc.text(prefixText, startX, pageHeight - 22);

      // Link clickeable en azul subrayado
      doc.setTextColor(67, 56, 202); // indigo
      doc.setFont('helvetica', 'bold');
      doc.textWithLink(linkText, startX + prefixWidth, pageHeight - 22, { url: dianUrl });
      // Subrayado manual
      const linkWidth = doc.getTextWidth(linkText);
      doc.setDrawColor(67, 56, 202);
      doc.line(startX + prefixWidth, pageHeight - 21.5, startX + prefixWidth + linkWidth, pageHeight - 21.5);

      // Número de página
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 14,
        { align: 'center' }
      );
    },
  });

  // Descargar
  const fileName = `calendario-tributario-${scopeLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
}
