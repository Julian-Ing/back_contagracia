import { Controller, Post, Body } from '@nestjs/common';
import { Public } from '@contagracia/shared-modules';
import { RutService } from './rut.service';

@Controller('dian')
export class RutController {
  constructor(private readonly rutService: RutService) {}

  @Post('query-rut')
  @Public()
  async queryRut(@Body() body: { identification_number: string }) {
    return this.rutService.queryRut(body.identification_number);
  }
}
