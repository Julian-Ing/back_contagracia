import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

export interface PdfHeaderProps {
  companyName: string;
  nit: string;
  dv?: string;
  title: string;
  subtitle?: string;
  logoSrc?: string;
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
}

export function PdfHeader({
  companyName,
  nit,
  dv,
  title,
  subtitle,
  logoSrc,
  person_type,
  address,
  municipality,
  city,
  department,
  phone,
  email,
  regime,
  liability,
}: PdfHeaderProps) {
  const location = [municipality || city, department].filter(Boolean).join(', ');
  const locationAddress = [location, address].filter(Boolean).join('  ·  ');
  const contact = [phone && `Tel: ${phone}`, email].filter(Boolean).join('  ·  ');
  const fiscal = [
    regime && `Régimen: ${regime}`,
    liability && `Resp.: ${liability}`,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const nitLine = `NIT: ${nit}${dv ? `-${dv}` : ''}${person_type ? `  ·  ${person_type}` : ''}`;

  return (
    <View style={pdfStyles.headerContainer}>
      {/* Info legal + contacto */}
      <View style={pdfStyles.headerLeft}>
        <Text style={pdfStyles.headerCompanyName}>{companyName}</Text>
        <Text style={pdfStyles.headerNit}>{nitLine}</Text>

        {!!locationAddress && <Text style={pdfStyles.headerMeta}>{locationAddress}</Text>}
        {!!contact && <Text style={pdfStyles.headerMeta}>{contact}</Text>}
        {!!fiscal && <Text style={pdfStyles.headerMeta}>{fiscal}</Text>}

        <View style={pdfStyles.headerTitleRow}>
          <Text style={pdfStyles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={pdfStyles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {/* Logo */}
      {logoSrc ? (
        <Image src={logoSrc} style={pdfStyles.headerLogo} />
      ) : null}
    </View>
  );
}
