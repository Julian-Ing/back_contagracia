import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ThirdPartyType } from '@prisma/client-tenant';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { LeadSource, LeadStage } from '../leads/dto/create-lead.dto';
import { FormSubmittedEvent, CRM_EVENTS } from '../automations/events/automation.events';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    // Show all forms (active and inactive) in admin panel
    const forms = await db.crmLeadForm.findMany({
      include: {
        _count: { select: { submissions: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // Count active leads for each form's campaign
    const formsWithLeadsCount = await Promise.all(
      forms.map(async (form) => {
        let leadsCount = 0;
        if (form.campaign_id) {
          leadsCount = await db.crmLead.count({
            where: {
              campaign_id: form.campaign_id,
              is_active: true,
            },
          });
        }
        return {
          ...form,
          leads_count: leadsCount,
        };
      }),
    );

    return formsWithLeadsCount;
  }

  async findOne(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const form = await db.crmLeadForm.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { position: 'asc' } },
        _count: { select: { submissions: true } },
      },
    });
    if (!form) {
      throw new NotFoundException('Formulario no encontrado');
    }
    return form;
  }

  async create(companyId: string, dto: CreateFormDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.$transaction(async (tx) => {
      const form = await tx.crmLeadForm.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          redirect_url: dto.redirect_url,
          campaign_id: dto.campaign_id,
          fields: {
            create: dto.fields.map((f) => ({
              field_name: f.field_name,
              field_type: f.field_type,
              is_required: f.is_required,
              position: f.position,
              options: f.options ?? undefined,
            })),
          },
        },
        include: {
          fields: { orderBy: { position: 'asc' } },
        },
      });
      return form;
    });
  }

  async update(companyId: string, id: string, dto: UpdateFormDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.$transaction(async (tx) => {
      const { fields, ...formData } = dto;

      const form = await tx.crmLeadForm.update({
        where: { id },
        data: formData,
      });

      if (fields) {
        await tx.crmFormField.deleteMany({ where: { form_id: id } });
        await tx.crmFormField.createMany({
          data: fields.map((f) => ({
            form_id: id,
            field_name: f.field_name!,
            field_type: f.field_type!,
            is_required: f.is_required!,
            position: f.position!,
            options: f.options ?? undefined,
          })),
        });
      }

      return tx.crmLeadForm.findUnique({
        where: { id },
        include: {
          fields: { orderBy: { position: 'asc' } },
        },
      });
    });
  }

  async remove(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmLeadForm.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async findSubmissions(companyId: string, id: string, skip = 0, take = 20): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const [data, total] = await Promise.all([
      db.crmFormSubmission.findMany({
        where: { form_id: id },
        orderBy: { submitted_at: 'desc' },
        skip,
        take,
      }),
      db.crmFormSubmission.count({ where: { form_id: id } }),
    ]);
    return { data, total, skip, take };
  }

  async findPublicForm(companyId: string, slug: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const form = await db.crmLeadForm.findFirst({
      where: { slug, is_active: true },
      include: {
        fields: { orderBy: { position: 'asc' } },
      },
    });

    if (!form) {
      throw new NotFoundException('Formulario no encontrado o inactivo');
    }

    return form;
  }

  async submitForm(slug: string, data: any, ipAddress?: string): Promise<any> {
    // For public submissions we need to find the form across tenants
    // In a multi-tenant scenario, the slug must be globally unique or scoped.
    // Here we use a companyId-less approach: iterate is impractical,
    // so we expect the public endpoint to receive companyId as well,
    // or the slug is globally unique. We'll accept companyId param.
    throw new Error('Use submitFormForCompany instead');
  }

  async submitFormForCompany(companyId: string, slug: string, data: any, ipAddress?: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const form = await db.crmLeadForm.findFirst({
      where: { slug, is_active: true },
    });

    if (!form) {
      throw new NotFoundException('Formulario no encontrado o inactivo');
    }

    // Extract contact fields from form data
    const email = data.email?.trim() || null;
    const phone = data.phone?.trim() || data.telefono?.trim() || null;
    const whatsappNumber = this.formatWhatsappNumber(phone);
    const fullName = data.full_name?.trim() || data.name?.trim() || data.nombre?.trim() || 'Sin nombre';
    const companyName = data.company_name?.trim() || data.empresa?.trim() || null;
    const birthDate = data.birth_date || data.fecha_nacimiento || null;

    let thirdPartyId: string | null = null;

    // Search for existing third party (contact) by email, phone or whatsapp
    if (email || phone || whatsappNumber) {
      const orConditions: any[] = [];
      if (email) orConditions.push({ email });
      if (phone) orConditions.push({ phone });
      if (whatsappNumber) orConditions.push({ whatsapp_number: whatsappNumber });

      const existingThirdParty = await db.thirdParty.findFirst({
        where: {
          OR: orConditions,
          roles: { has: 'CONTACT' },
          deleted_at: null,
        },
      });

      if (existingThirdParty) {
        // Update existing third party with new data
        thirdPartyId = existingThirdParty.id;

        // Check if whatsapp_number is already used by another third party (due to unique constraint)
        let safeWhatsappNumber = whatsappNumber;
        if (whatsappNumber && existingThirdParty.whatsapp_number !== whatsappNumber) {
          const whatsappConflict = await db.thirdParty.findFirst({
            where: { whatsapp_number: whatsappNumber, id: { not: thirdPartyId } },
          });
          if (whatsappConflict) {
            // WhatsApp number belongs to another third party, don't update it
            safeWhatsappNumber = existingThirdParty.whatsapp_number;
          }
        }

        await db.thirdParty.update({
          where: { id: thirdPartyId },
          data: {
            name: fullName || existingThirdParty.name,
            email: email || existingThirdParty.email,
            phone: phone || existingThirdParty.phone,
            whatsapp_number: safeWhatsappNumber || existingThirdParty.whatsapp_number,
            company_name: companyName || existingThirdParty.company_name,
            birth_date: birthDate ? new Date(birthDate) : existingThirdParty.birth_date,
            consent_ip: ipAddress,
            consent_timestamp: new Date(),
            consent_method: 'form',
          },
        });
      } else {
        // Check if whatsapp_number already exists (unique constraint)
        let safeWhatsappNumber = whatsappNumber;
        if (whatsappNumber) {
          const whatsappConflict = await db.thirdParty.findFirst({
            where: { whatsapp_number: whatsappNumber },
          });
          if (whatsappConflict) {
            // WhatsApp number already exists, use that third party instead
            thirdPartyId = whatsappConflict.id;

            // Add CONTACT role if not present
            const existingRoles = (whatsappConflict.roles as ThirdPartyType[]) || [];
            if (!existingRoles.includes(ThirdPartyType.CONTACT)) {
              await db.thirdParty.update({
                where: { id: thirdPartyId },
                data: {
                  roles: [...existingRoles, ThirdPartyType.CONTACT],
                  name: fullName || whatsappConflict.name,
                  email: email || whatsappConflict.email,
                  phone: phone || whatsappConflict.phone,
                  company_name: companyName || whatsappConflict.company_name,
                  birth_date: birthDate ? new Date(birthDate) : whatsappConflict.birth_date,
                  consent_ip: ipAddress,
                  consent_timestamp: new Date(),
                  consent_method: 'form',
                },
              });
            } else {
              await db.thirdParty.update({
                where: { id: thirdPartyId },
                data: {
                  name: fullName || whatsappConflict.name,
                  email: email || whatsappConflict.email,
                  phone: phone || whatsappConflict.phone,
                  company_name: companyName || whatsappConflict.company_name,
                  birth_date: birthDate ? new Date(birthDate) : whatsappConflict.birth_date,
                  consent_ip: ipAddress,
                  consent_timestamp: new Date(),
                  consent_method: 'form',
                },
              });
            }
          }
        }

        // Create new third party only if we didn't find an existing one by whatsapp
        if (!thirdPartyId) {
          const newThirdParty = await db.thirdParty.create({
            data: {
              name: fullName,
              email,
              phone,
              whatsapp_number: safeWhatsappNumber,
              company_name: companyName,
              birth_date: birthDate ? new Date(birthDate) : null,
              consent_ip: ipAddress,
              consent_timestamp: new Date(),
              consent_method: 'form',
              roles: [ThirdPartyType.CONTACT],
            },
          });
          thirdPartyId = newThirdParty.id;
        }
      }
    } else {
      // No identifiable data, create anonymous third party (contact)
      const newThirdParty = await db.thirdParty.create({
        data: {
          name: fullName,
          consent_ip: ipAddress,
          consent_timestamp: new Date(),
          consent_method: 'form',
          roles: [ThirdPartyType.CONTACT],
        },
      });
      thirdPartyId = newThirdParty.id;
    }

    // Create Lead associated with the third party (contact)
    const lead = await db.crmLead.create({
      data: {
        third_party_id: thirdPartyId,
        source: LeadSource.FORM,
        stage: LeadStage.NEW,
        campaign_id: form.campaign_id || undefined,
      },
    });

    // Create form submission record
    const submission = await db.crmFormSubmission.create({
      data: {
        form_id: form.id,
        third_party_id: thirdPartyId,
        data: data,
        ip_address: ipAddress,
      },
    });

    this.logger.log(`Form submission created: form=${form.id}, thirdParty=${thirdPartyId}, lead=${lead.id}`);

    // Get third party data for event
    const thirdParty = await db.thirdParty.findUnique({
      where: { id: thirdPartyId },
    });

    // Emit event for automation engine
    this.eventEmitter.emit(
      CRM_EVENTS.FORM_SUBMITTED,
      new FormSubmittedEvent(
        companyId,
        form.id,
        submission.id,
        data,
        thirdParty ? {
          id: thirdParty.id,
          name: thirdParty.name || 'Sin nombre',
          email: thirdParty.email ?? undefined,
          phone: thirdParty.phone ?? undefined,
        } : null,
        lead.id,
      ),
    );

    return {
      message: 'Formulario enviado exitosamente',
      redirect_url: form.redirect_url,
    };
  }

  private formatWhatsappNumber(phone: string | null): string | null {
    if (!phone) return null;
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return null;
    // If starts with 57 (Colombia) or has 10 digits, format it
    if (cleaned.startsWith('57') && cleaned.length >= 12) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 10) {
      return `+57${cleaned}`;
    }
    // If already starts with +, keep as is
    if (phone.startsWith('+')) {
      return phone;
    }
    return `+${cleaned}`;
  }
}
