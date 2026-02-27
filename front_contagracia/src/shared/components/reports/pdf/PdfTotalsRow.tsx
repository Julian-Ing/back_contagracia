import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { formatNumberCO } from '@/shared/utils/formatNumber';

interface PdfTotalsRowProps {
  label?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  decimals?: number;
  isGrand?: boolean;
}

/**
 * Fila de totales para el PDF.
 * isGrand = true → "TOTALES GENERALES:" con borde grueso y fondo
 * isGrand = false → "Total XXXXX:" con borde fino
 */
export function PdfTotalsRow({
  label,
  debit,
  credit,
  balance,
  decimals = 2,
  isGrand = false,
}: PdfTotalsRowProps) {
  const defaultLabel = isGrand ? 'TOTALES GENERALES:' : 'Total:';
  const containerStyle = isGrand ? pdfStyles.totalsRowGrand : pdfStyles.totalsRow;

  return (
    <View style={containerStyle}>
      <Text style={isGrand ? pdfStyles.totalsLabelGrand : pdfStyles.totalsLabel}>
        {label ?? defaultLabel}
      </Text>

      <View style={pdfStyles.totalsValues}>
        {debit !== undefined ? (
          <Text style={pdfStyles.totalsValue}>{formatNumberCO(debit, decimals)}</Text>
        ) : null}
        {credit !== undefined ? (
          <Text style={pdfStyles.totalsValue}>{formatNumberCO(credit, decimals)}</Text>
        ) : null}
        {balance !== undefined ? (
          <Text style={balance < 0 ? pdfStyles.totalsValueNegative : pdfStyles.totalsValue}>
            {formatNumberCO(balance, decimals)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
