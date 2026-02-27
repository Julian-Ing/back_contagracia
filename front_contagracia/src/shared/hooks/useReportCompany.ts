'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/modules/auth';
import { companyService } from '@/modules/company/services/company.service';
import { useAuthImage } from '@/shared/hooks/useAuthImage';

export interface ReportCompany {
  id: string;
  company_name: string;
  nit: string;
  dv: string;
  logo_url?: string | null;
  // Identificación
  person_type?: string;
  // Contacto
  phone?: string;
  email?: string;
  // Ubicación
  address?: string;
  municipality?: string;
  city?: string;
  department?: string;
  // Fiscal
  regime?: string;
  liability?: string;
  // Firmantes
  legal_rep_name?: string;
  legal_rep_signature_url?: string | null;
  contador_name?: string;
  contador_signature_url?: string | null;
  revisor_fiscal_name?: string;
  revisor_fiscal_signature_url?: string | null;
}

/** Convierte un valor de entity_type a texto legible */
export function formatPersonType(value?: string): string | undefined {
  if (!value) return undefined;
  const map: Record<string, string> = {
    NATURAL: 'Persona Natural',
    JURIDICA: 'Persona Jurídica',
    JURIDICAL: 'Persona Jurídica',
    PERSON_NATURAL: 'Persona Natural',
    PERSON_JURIDICA: 'Persona Jurídica',
  };
  return map[value.toUpperCase()] ?? value;
}

/**
 * Extrae el texto de un campo que puede ser:
 *  - string directo ("No Responsable de IVA")
 *  - objeto { id, name } → retorna .name
 *  - undefined/null → retorna undefined
 */
function str(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'object') return v.name ?? undefined;
  const s = String(v);
  return s || undefined;
}

/**
 * Intenta el campo expandido (object) primero, luego el campo plano (string).
 * Ej: str2(raw.type_regime, raw.regime) usa type_regime.name si existe.
 */
function str2(expanded: any, flat: any): string | undefined {
  return str(expanded) ?? str(flat);
}

/**
 * Hook que carga los datos de la empresa activa para usar en encabezados
 * de reportes e informes (Libro Mayor, Balance General, etc.)
 */
export function useReportCompany(): {
  company: ReportCompany | null;
  logoSrc: string;
  signerSrcs: Record<'legal_rep' | 'contador' | 'revisor_fiscal', string>;
  loading: boolean;
} {
  const { company: authCompany } = useAuth();
  const [company, setCompany] = useState<ReportCompany | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  useEffect(() => {
    if (!authCompany?.id) return;
    setLoadingCompany(true);
    companyService
      .getCompany(authCompany.id)
      .then((data) => {
        const raw = data as any;
        setCompany({
          id: data.id,
          company_name: data.company_name,
          nit: data.nit,
          dv: data.dv,
          logo_url: data.logo_url,
          // entity_type puede ser string ('NATURAL') o venir como type_organization: {id, name}
          person_type: formatPersonType(str2(raw.type_organization, raw.entity_type)),
          phone: data.phone,
          email: data.email,
          address: data.address,
          municipality: str2(raw.type_municipality, raw.municipality),
          city: str2(raw.type_city, raw.city),
          department: str2(raw.type_department, raw.department),
          // regime puede ser string plano o type_regime: {id, name}
          regime: str2(raw.type_regime, raw.regime),
          // liability puede ser string plano o type_liability: {id, name}
          liability: str2(raw.type_liability, raw.liability),
          // Firmantes
          legal_rep_name: data.legal_rep_name,
          legal_rep_signature_url: data.legal_rep_signature_url ?? null,
          contador_name: data.contador_name,
          contador_signature_url: data.contador_signature_url ?? null,
          revisor_fiscal_name: data.revisor_fiscal_name,
          revisor_fiscal_signature_url: data.revisor_fiscal_signature_url ?? null,
        });
      })
      .catch(() => {
        const raw = authCompany as any;
        setCompany({
          id: raw.id,
          company_name: raw.company_name || raw.name || '',
          nit: raw.nit || '',
          dv: raw.dv || '',
          logo_url: raw.logo_url ?? null,
          person_type: formatPersonType(str2(raw.type_organization, raw.entity_type)),
          phone: raw.phone,
          email: raw.email,
          address: raw.address,
          municipality: str2(raw.type_municipality, raw.municipality),
          city: str2(raw.type_city, raw.city),
          department: str2(raw.type_department, raw.department),
          regime: str2(raw.type_regime, raw.regime),
          liability: str2(raw.type_liability, raw.liability),
          legal_rep_name: raw.legal_rep_name,
          legal_rep_signature_url: raw.legal_rep_signature_url ?? null,
          contador_name: raw.contador_name,
          contador_signature_url: raw.contador_signature_url ?? null,
          revisor_fiscal_name: raw.revisor_fiscal_name,
          revisor_fiscal_signature_url: raw.revisor_fiscal_signature_url ?? null,
        });
      })
      .finally(() => setLoadingCompany(false));
  }, [authCompany?.id]);

  const { src: logoSrc, loading: logoLoading } = useAuthImage(company?.logo_url);
  const { src: legalRepSrc } = useAuthImage(company?.legal_rep_signature_url);
  const { src: contadorSrc } = useAuthImage(company?.contador_signature_url);
  const { src: revisorFiscalSrc } = useAuthImage(company?.revisor_fiscal_signature_url);

  return {
    company,
    logoSrc,
    signerSrcs: {
      legal_rep: legalRepSrc,
      contador: contadorSrc,
      revisor_fiscal: revisorFiscalSrc,
    },
    loading: loadingCompany || logoLoading,
  };
}
