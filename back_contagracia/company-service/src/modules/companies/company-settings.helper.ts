import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

const BRAND_CATEGORY = 'brand';
const LEGAL_REP_CATEGORY = 'legal_representative';
const COMPANY_INFO_CATEGORY = 'company_info';
const TAX_CLASSIFICATION_CATEGORY = 'tax_classification';
const ACCOUNTANT_CATEGORY = 'accountant';
const TAX_AUDITOR_CATEGORY = 'tax_auditor';

const ALL_PROFILE_CATEGORIES = [
  BRAND_CATEGORY,
  LEGAL_REP_CATEGORY,
  COMPANY_INFO_CATEGORY,
  TAX_CLASSIFICATION_CATEGORY,
  ACCOUNTANT_CATEGORY,
  TAX_AUDITOR_CATEGORY,
];

interface PersonData {
  name?: string | null;
  identification?: string | null;
  phone?: string | null;
  email?: string | null;
  signature_url?: string | null;
}

interface CompanyInfoData {
  dv?: string | null;
  phone?: string | null;
  address?: string | null;
  whatsapp_number?: string | null;
  country_id?: string | null;
  department_id?: string | null;
  municipality_id?: string | null;
}

interface TaxClassificationData {
  type_document_identification_id?: string | null;
  type_organization_id?: string | null;
  type_regime_id?: string | null;
  type_liability_id?: string | null;
}

export interface CompanyProfile {
  // company_info
  dv: string | null;
  phone: string | null;
  address: string | null;
  whatsapp_number: string | null;
  country_id: string | null;
  department_id: string | null;
  municipality_id: string | null;
  // tax_classification
  type_document_identification_id: string | null;
  type_organization_id: string | null;
  type_regime_id: string | null;
  type_liability_id: string | null;
  // brand
  logo_url: string | null;
  // legal_representative
  legal_rep_name: string | null;
  legal_rep_identification: string | null;
  legal_rep_phone: string | null;
  legal_rep_email: string | null;
  legal_rep_signature_url: string | null;
  // accountant
  contador_name: string | null;
  contador_identification: string | null;
  contador_phone: string | null;
  contador_email: string | null;
  contador_signature_url: string | null;
  // tax_auditor
  revisor_fiscal_name: string | null;
  revisor_fiscal_identification: string | null;
  revisor_fiscal_phone: string | null;
  revisor_fiscal_email: string | null;
  revisor_fiscal_signature_url: string | null;
}

const NULL_PROFILE: CompanyProfile = {
  dv: null,
  phone: null,
  address: null,
  whatsapp_number: null,
  country_id: null,
  department_id: null,
  municipality_id: null,
  type_document_identification_id: null,
  type_organization_id: null,
  type_regime_id: null,
  type_liability_id: null,
  logo_url: null,
  legal_rep_name: null,
  legal_rep_identification: null,
  legal_rep_phone: null,
  legal_rep_email: null,
  legal_rep_signature_url: null,
  contador_name: null,
  contador_identification: null,
  contador_phone: null,
  contador_email: null,
  contador_signature_url: null,
  revisor_fiscal_name: null,
  revisor_fiscal_identification: null,
  revisor_fiscal_phone: null,
  revisor_fiscal_email: null,
  revisor_fiscal_signature_url: null,
};

@Injectable()
export class CompanySettingsHelper {
  private readonly logger = new Logger(CompanySettingsHelper.name);

  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Lee TODOS los campos de perfil de empresa desde tenant CompanySetting.
   * Retorna un objeto plano con los mismos nombres que usa el frontend.
   */
  async getAllCompanyProfile(companyId: string): Promise<CompanyProfile> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      return { ...NULL_PROFILE };
    }

    const settings = await tenantDb.companySetting.findMany({
      where: { category: { in: ALL_PROFILE_CATEGORIES } },
    });

    const map = new Map<string, string>();
    for (const s of settings) {
      map.set(`${s.category}:${s.key}`, s.value);
    }

    const get = (cat: string, key: string): string | null =>
      map.get(`${cat}:${key}`) ?? null;

    return {
      // company_info
      dv: get(COMPANY_INFO_CATEGORY, 'dv'),
      phone: get(COMPANY_INFO_CATEGORY, 'phone'),
      address: get(COMPANY_INFO_CATEGORY, 'address'),
      whatsapp_number: get(COMPANY_INFO_CATEGORY, 'whatsapp_number'),
      country_id: get(COMPANY_INFO_CATEGORY, 'country_id'),
      department_id: get(COMPANY_INFO_CATEGORY, 'department_id'),
      municipality_id: get(COMPANY_INFO_CATEGORY, 'municipality_id'),
      // tax_classification
      type_document_identification_id: get(TAX_CLASSIFICATION_CATEGORY, 'type_document_identification_id'),
      type_organization_id: get(TAX_CLASSIFICATION_CATEGORY, 'type_organization_id'),
      type_regime_id: get(TAX_CLASSIFICATION_CATEGORY, 'type_regime_id'),
      type_liability_id: get(TAX_CLASSIFICATION_CATEGORY, 'type_liability_id'),
      // brand
      logo_url: get(BRAND_CATEGORY, 'logo_url'),
      // legal_representative
      legal_rep_name: get(LEGAL_REP_CATEGORY, 'name'),
      legal_rep_identification: get(LEGAL_REP_CATEGORY, 'identification'),
      legal_rep_phone: get(LEGAL_REP_CATEGORY, 'phone'),
      legal_rep_email: get(LEGAL_REP_CATEGORY, 'email'),
      legal_rep_signature_url: get(LEGAL_REP_CATEGORY, 'signature_url'),
      // accountant
      contador_name: get(ACCOUNTANT_CATEGORY, 'name'),
      contador_identification: get(ACCOUNTANT_CATEGORY, 'identification'),
      contador_phone: get(ACCOUNTANT_CATEGORY, 'phone'),
      contador_email: get(ACCOUNTANT_CATEGORY, 'email'),
      contador_signature_url: get(ACCOUNTANT_CATEGORY, 'signature_url'),
      // tax_auditor
      revisor_fiscal_name: get(TAX_AUDITOR_CATEGORY, 'name'),
      revisor_fiscal_identification: get(TAX_AUDITOR_CATEGORY, 'identification'),
      revisor_fiscal_phone: get(TAX_AUDITOR_CATEGORY, 'phone'),
      revisor_fiscal_email: get(TAX_AUDITOR_CATEGORY, 'email'),
      revisor_fiscal_signature_url: get(TAX_AUDITOR_CATEGORY, 'signature_url'),
    };
  }

  /**
   * Lee brand + legal_representative desde tenant CompanySetting.
   * Si el tenant no existe, retorna nulls (degradacion graceful).
   */
  async getBrandAndLegalRep(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      return {
        logo_url: null,
        legal_rep_name: null,
        legal_rep_identification: null,
        legal_rep_phone: null,
        legal_rep_email: null,
        legal_rep_signature_url: null,
      };
    }

    const settings = await tenantDb.companySetting.findMany({
      where: {
        category: { in: [BRAND_CATEGORY, LEGAL_REP_CATEGORY] },
      },
    });

    const map = new Map<string, string>();
    for (const s of settings) {
      map.set(`${s.category}:${s.key}`, s.value);
    }

    return {
      logo_url: map.get('brand:logo_url') ?? null,
      legal_rep_name: map.get('legal_representative:name') ?? null,
      legal_rep_identification: map.get('legal_representative:identification') ?? null,
      legal_rep_phone: map.get('legal_representative:phone') ?? null,
      legal_rep_email: map.get('legal_representative:email') ?? null,
      legal_rep_signature_url: map.get('legal_representative:signature_url') ?? null,
    };
  }

  /**
   * Upsert individual. Si value es null, borra la fila.
   */
  async upsertSetting(
    companyId: string,
    category: string,
    key: string,
    value: string | null,
  ): Promise<void> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    if (value === null || value === undefined) {
      await tenantDb.companySetting.deleteMany({
        where: { category, key },
      });
      return;
    }

    await tenantDb.companySetting.upsert({
      where: { category_key: { category, key } },
      create: {
        category,
        key,
        value,
        value_type: 'string',
        is_readonly: false,
      },
      update: { value },
    });
  }

  /**
   * Upsert batch: escribe múltiples keys de una categoría.
   * Solo escribe entries cuyo value !== undefined.
   */
  private async upsertCategory(
    companyId: string,
    category: string,
    entries: [string, string | null | undefined][],
  ): Promise<void> {
    for (const [key, value] of entries) {
      if (value !== undefined) {
        await this.upsertSetting(companyId, category, key, value);
      }
    }
  }

  async upsertLogoUrl(companyId: string, logoUrl: string | null): Promise<void> {
    await this.upsertSetting(companyId, BRAND_CATEGORY, 'logo_url', logoUrl);
  }

  async upsertLegalRep(companyId: string, data: PersonData): Promise<void> {
    await this.upsertCategory(companyId, LEGAL_REP_CATEGORY, [
      ['name', data.name],
      ['identification', data.identification],
      ['phone', data.phone],
      ['email', data.email],
      ['signature_url', data.signature_url],
    ]);
  }

  async upsertCompanyInfo(companyId: string, data: CompanyInfoData): Promise<void> {
    await this.upsertCategory(companyId, COMPANY_INFO_CATEGORY, [
      ['dv', data.dv],
      ['phone', data.phone],
      ['address', data.address],
      ['whatsapp_number', data.whatsapp_number],
      ['country_id', data.country_id],
      ['department_id', data.department_id],
      ['municipality_id', data.municipality_id],
    ]);
  }

  async upsertTaxClassification(companyId: string, data: TaxClassificationData): Promise<void> {
    await this.upsertCategory(companyId, TAX_CLASSIFICATION_CATEGORY, [
      ['type_document_identification_id', data.type_document_identification_id],
      ['type_organization_id', data.type_organization_id],
      ['type_regime_id', data.type_regime_id],
      ['type_liability_id', data.type_liability_id],
    ]);
  }

  async upsertAccountant(companyId: string, data: PersonData): Promise<void> {
    await this.upsertCategory(companyId, ACCOUNTANT_CATEGORY, [
      ['name', data.name],
      ['identification', data.identification],
      ['phone', data.phone],
      ['email', data.email],
      ['signature_url', data.signature_url],
    ]);
  }

  async upsertTaxAuditor(companyId: string, data: PersonData): Promise<void> {
    await this.upsertCategory(companyId, TAX_AUDITOR_CATEGORY, [
      ['name', data.name],
      ['identification', data.identification],
      ['phone', data.phone],
      ['email', data.email],
      ['signature_url', data.signature_url],
    ]);
  }
}
