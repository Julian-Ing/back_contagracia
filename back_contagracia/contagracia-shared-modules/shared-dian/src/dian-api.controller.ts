import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { Public } from '../../shared-auth/dist/decorators/public.decorator';
import { DianApiService } from './dian-api.service';

@Controller('dian')
export class DianApiController {
  constructor(private readonly dianApiService: DianApiService) {}

  @Public()
  @Public()
  @Post('query-rut')
  async queryRut(@Body() body: { identification_number: string }) {
    if (!body.identification_number) {
      throw new BadRequestException('identification_number es requerido');
    }

    return this.dianApiService.queryRut(body.identification_number);
  }
}
