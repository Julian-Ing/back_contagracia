import { Injectable } from '@nestjs/common';

/**
 * Servicio para reemplazar variables en plantillas de email/whatsapp
 * Variables soportadas:
 * - {{contact_name}}, {{contact_email}}, {{contact_phone}}, {{contact_company}}
 * - {{opportunity_name}}, {{opportunity_value}}, {{opportunity_stage}}, {{expected_close_date}}
 * - {{company_name}}, {{company_email}}, {{company_phone}}
 * - {{date}}, {{time}}, {{current_date}}, {{current_time}}
 */
@Injectable()
export class TemplateVariablesService {
  /**
   * Reemplaza todas las variables en un template
   */
  replaceAll(
    template: string,
    context: {
      contact?: ContactVariables;
      opportunity?: OpportunityVariables;
      company?: CompanyVariables;
      custom?: Record<string, string>;
    },
  ): string {
    let result = template;

    // Variables de contacto
    if (context.contact) {
      result = this.replaceContactVariables(result, context.contact);
    }

    // Variables de oportunidad
    if (context.opportunity) {
      result = this.replaceOpportunityVariables(result, context.opportunity);
    }

    // Variables de empresa
    if (context.company) {
      result = this.replaceCompanyVariables(result, context.company);
    }

    // Variables de fecha/hora actuales
    result = this.replaceDateVariables(result);

    // Variables personalizadas
    if (context.custom) {
      result = this.replaceCustomVariables(result, context.custom);
    }

    return result;
  }

  /**
   * Reemplaza variables de contacto
   */
  private readonly fallback = '(no disponible)';

  replaceContactVariables(template: string, contact: ContactVariables): string {
    const fb = this.fallback;
    const replacements: Record<string, string> = {
      '{{contact_name}}': contact.name || fb,
      '{{contact_first_name}}': contact.name?.split(' ')[0] || fb,
      '{{contact_email}}': contact.email || fb,
      '{{contact_phone}}': contact.phone || fb,
      '{{contact_whatsapp}}': contact.whatsapp || contact.phone || fb,
      '{{contact_company}}': contact.company_name || fb,
    };

    return this.replaceVariables(template, replacements);
  }

  /**
   * Reemplaza variables de oportunidad
   */
  replaceOpportunityVariables(template: string, opportunity: OpportunityVariables): string {
    const fb = this.fallback;
    const replacements: Record<string, string> = {
      '{{opportunity_name}}': opportunity.name || fb,
      '{{opportunity_value}}': opportunity.value?.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) || fb,
      '{{opportunity_value_raw}}': opportunity.value?.toString() || fb,
      '{{opportunity_stage}}': opportunity.stage_name || fb,
      '{{expected_close_date}}': opportunity.expected_close_date
        ? new Date(opportunity.expected_close_date).toLocaleDateString('es-CO')
        : fb,
    };

    return this.replaceVariables(template, replacements);
  }

  /**
   * Reemplaza variables de empresa
   */
  replaceCompanyVariables(template: string, company: CompanyVariables): string {
    const fb = this.fallback;
    const replacements: Record<string, string> = {
      '{{company_name}}': company.name || fb,
      '{{company_email}}': company.email || fb,
      '{{company_phone}}': company.phone || fb,
      '{{company_address}}': company.address || fb,
      '{{company_website}}': company.website || fb,
    };

    return this.replaceVariables(template, replacements);
  }

  /**
   * Reemplaza variables de fecha/hora
   */
  replaceDateVariables(template: string): string {
    const now = new Date();
    const replacements: Record<string, string> = {
      '{{current_date}}': now.toLocaleDateString('es-CO'),
      '{{current_time}}': now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      '{{current_year}}': now.getFullYear().toString(),
      '{{current_month}}': now.toLocaleDateString('es-CO', { month: 'long' }),
      '{{current_day}}': now.toLocaleDateString('es-CO', { weekday: 'long' }),
    };

    return this.replaceVariables(template, replacements);
  }

  /**
   * Reemplaza variables personalizadas
   */
  replaceCustomVariables(template: string, custom: Record<string, string>): string {
    const replacements: Record<string, string> = {};
    for (const [key, value] of Object.entries(custom)) {
      replacements[`{{${key}}}`] = value || this.fallback;
    }
    return this.replaceVariables(template, replacements);
  }

  /**
   * Método helper para reemplazar variables
   */
  private replaceVariables(template: string, replacements: Record<string, string>): string {
    let result = template;
    for (const [variable, value] of Object.entries(replacements)) {
      result = result.replaceAll(variable, value);
    }
    return result;
  }

  /**
   * Extrae las variables de un template (útil para mostrar qué variables se pueden usar)
   */
  extractVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = template.matchAll(regex);
    return [...new Set([...matches].map(m => m[1]))];
  }
}

// ============================================
// Tipos
// ============================================

export interface ContactVariables {
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company_name?: string;
}

export interface OpportunityVariables {
  name?: string;
  value?: number;
  stage_name?: string;
  expected_close_date?: Date | string;
}

export interface CompanyVariables {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}
