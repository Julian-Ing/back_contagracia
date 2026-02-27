import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface PdfFooterProps {
  generatedAt?: Date;
}

/**
 * Footer fijo que aparece en TODAS las páginas del PDF.
 * - Izquierda: fecha de elaboración
 * - Centro:    paginación (Pág. X de Y)
 * - Derecha:   "Generado por Contagracia"
 *
 * `fixed` → se repite en cada página.
 * `render` prop → accede a pageNumber/totalPages de react-pdf.
 */
export function PdfFooter({ generatedAt }: PdfFooterProps) {
  const date = generatedAt ?? new Date();

  const formatted = date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>Elaborado el {formatted}</Text>

      <Text
        style={pdfStyles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Pág. ${pageNumber} de ${totalPages}`
        }
      />

      <Text style={pdfStyles.footerText}>Generado por Contagracia</Text>
    </View>
  );
}
