import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener empresas del usuario autenticado
   * - system_admin: No tiene empresas asociadas (retorna vacío)
   * - company_user: Tiene una sola empresa (la del tenant donde está)
   */
  async getMyCompanies(userType: string, companyId?: string) {
    // Admins del sistema no tienen empresas asociadas
    if (userType === 'system_admin') {
      return { companies: [] };
    }

    // Usuarios de empresa solo tienen una empresa
    if (!companyId) {
      return { companies: [] };
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        company_name: true,
        nit: true,
        email: true,
        is_active: true,
      },
    });

    if (!company) {
      return { companies: [] };
    }

    return {
      companies: [
        {
          id: company.id,
          name: company.company_name,
          nit: company.nit,
          email: company.email,
          is_active: company.is_active,
        },
      ],
    };
  }
}
