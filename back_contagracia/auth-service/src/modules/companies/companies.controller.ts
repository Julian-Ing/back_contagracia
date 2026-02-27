import {
  Controller,
  Get,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('my-companies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener mis empresas',
    description:
      'Devuelve la lista de empresas a las que pertenece el usuario autenticado (solo para usuarios tipo owner - login sin NIT)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de empresas obtenida exitosamente',
    schema: {
      example: {
        companies: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Distribuidora ABC S.A.S',
            nit: '901234567',
            email: 'contacto@distribuidoraabc.com',
            phone: '3001234567',
            is_active: true,
            role: 'admin',
            role_name: 'Administrador',
            joined_at: '2024-01-15T10:30:00.000Z',
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Tech Solutions Ltda',
            nit: '900987654',
            email: 'info@techsolutions.com',
            phone: '3109876543',
            is_active: true,
            role: 'user',
            role_name: 'Usuario',
            joined_at: '2024-02-20T14:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async getMyCompanies(@Req() req: any) {
    const { user_type, company_id } = req.user;
    return this.companiesService.getMyCompanies(user_type, company_id);
  }
}
