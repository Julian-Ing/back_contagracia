import { View, Text, Image } from '@react-pdf/renderer';
import { pdfColors } from './styles';
import type { SignerDisplay } from '../ReportSignatures';

function PdfSignerBlock({ signer }: { signer: SignerDisplay }) {
  return (
    <View style={{ alignItems: 'center', width: 140 }}>
      {/* Imagen de la firma */}
      <View style={{ height: 50, width: 130, justifyContent: 'flex-end', alignItems: 'center' }}>
        {signer.signatureSrc ? (
          <Image
            src={signer.signatureSrc}
            style={{ width: 120, height: 48, objectFit: 'contain' }}
          />
        ) : null}
      </View>
      {/* Línea */}
      <View
        style={{
          borderTopWidth: 0.5,
          borderTopColor: pdfColors.borderDark,
          width: 130,
          marginTop: 2,
        }}
      />
      {/* Nombre */}
      {signer.name ? (
        <Text
          style={{
            fontSize: 7,
            fontFamily: 'Helvetica-Bold',
            marginTop: 3,
            textAlign: 'center',
            color: pdfColors.text,
          }}
        >
          {signer.name}
        </Text>
      ) : null}
      {/* Cargo */}
      <Text
        style={{ fontSize: 7, color: pdfColors.textMuted, textAlign: 'center', marginTop: 1 }}
      >
        {signer.label}
      </Text>
    </View>
  );
}

interface PdfSignaturesProps {
  signers: SignerDisplay[];
}

/**
 * Bloque de firmas estilo diploma para PDF.
 * Mismo layout que ReportSignatures (HTML).
 */
export function PdfSignatures({ signers }: PdfSignaturesProps) {
  if (signers.length === 0) return null;

  if (signers.length === 1) {
    return (
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <PdfSignerBlock signer={signers[0]} />
      </View>
    );
  }

  if (signers.length === 2) {
    return (
      <View
        style={{
          marginTop: 40,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
        <PdfSignerBlock signer={signers[0]} />
        <PdfSignerBlock signer={signers[1]} />
      </View>
    );
  }

  // 3 firmantes
  return (
    <View style={{ marginTop: 40 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
        <PdfSignerBlock signer={signers[0]} />
        <PdfSignerBlock signer={signers[1]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28 }}>
        <PdfSignerBlock signer={signers[2]} />
      </View>
    </View>
  );
}
