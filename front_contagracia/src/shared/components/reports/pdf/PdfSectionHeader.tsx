import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { formatNumberCO } from '@/shared/utils/formatNumber';

interface PdfSectionHeaderProps {
  /** "11050501 - Caja general" */
  title: string;
  initialBalance?: number;
  decimals?: number;
}

/**
 * Encabezado de sección (por cuenta) en el PDF.
 * Fondo gris, código+nombre a la izquierda, saldo inicial a la derecha.
 */
export function PdfSectionHeader({ title, initialBalance, decimals = 2 }: PdfSectionHeaderProps) {
  return (
    <View style={pdfStyles.sectionHeader}>
      <Text style={pdfStyles.sectionTitle}>{title}</Text>
      {initialBalance !== undefined ? (
        <Text style={pdfStyles.sectionBalance}>
          Saldo Inicial: {formatNumberCO(initialBalance, decimals)}
        </Text>
      ) : null}
    </View>
  );
}
