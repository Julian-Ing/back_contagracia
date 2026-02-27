import { StyleSheet } from '@react-pdf/renderer';

/** Paleta de colores para reportes PDF */
export const pdfColors = {
  text:      '#111827', // gray-900
  textMuted: '#6B7280', // gray-500
  border:    '#D1D5DB', // gray-300
  borderDark:'#9CA3AF', // gray-400
  sectionBg: '#F3F4F6', // gray-100
  totalsBg:  '#F9FAFB', // gray-50
  negative:  '#DC2626', // red-600
  white:     '#FFFFFF',
};

/** Estilos base reutilizables en todos los componentes PDF */
export const pdfStyles = StyleSheet.create({
  // ── Página ──────────────────────────────────────────────────────────────
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: pdfColors.text,
    paddingTop: 30,
    paddingBottom: 48, // espacio para el footer fijo
    paddingHorizontal: 35,
    backgroundColor: pdfColors.white,
  },

  // ── Utilidades generales ─────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  textRight: {
    textAlign: 'right',
  },
  textCenter: {
    textAlign: 'center',
  },
  muted: {
    color: pdfColors.textMuted,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
    paddingBottom: 8,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  headerCompanyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: pdfColors.text,
  },
  headerNit: {
    fontSize: 8,
    color: pdfColors.textMuted,
    marginTop: 1,
  },
  headerMeta: {
    fontSize: 7,
    color: pdfColors.textMuted,
    marginTop: 1,
  },
  // Fila título + subtítulo en la misma línea
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: pdfColors.text,
  },
  headerSubtitle: {
    fontSize: 8,
    color: pdfColors.textMuted,
  },
  headerLogo: {
    width: 70,
    height: 70,
    objectFit: 'contain',
  },

  // ── Section header (por cuenta) ───────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: pdfColors.sectionBg,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  sectionBalance: {
    fontSize: 7,
    color: pdfColors.textMuted,
  },

  // ── Tabla ─────────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: pdfColors.textMuted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 8,
    color: pdfColors.text,
  },

  // ── Totales ───────────────────────────────────────────────────────────────
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: pdfColors.border,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  totalsRowGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: pdfColors.borderDark,
    backgroundColor: pdfColors.totalsBg,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginTop: 4,
  },
  totalsLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  totalsLabelGrand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalsValues: {
    flexDirection: 'row',
    gap: 8,
  },
  totalsValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    width: 70,
    textAlign: 'right',
  },
  totalsValueNegative: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    width: 70,
    textAlign: 'right',
    color: pdfColors.negative,
  },

  // ── Footer (fijo en todas las páginas) ───────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 35,
    right: 35,
    borderTopWidth: 0.5,
    borderTopColor: pdfColors.border,
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: pdfColors.textMuted,
  },
});
