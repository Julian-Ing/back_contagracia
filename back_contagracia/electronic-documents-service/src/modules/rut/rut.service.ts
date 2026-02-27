import { Injectable, Logger } from '@nestjs/common';
import { DianApiService } from '@contagracia/shared-modules';

@Injectable()
export class RutService {
  private readonly logger = new Logger(RutService.name);

  constructor(private readonly dianApiService: DianApiService) {}

  /**
   * Consultar información de RUT en la DIAN
   */
  async queryRut(identificationNumber: string) {
    this.logger.log(`Consultando RUT: ${identificationNumber}`);
    return this.dianApiService.queryRut(identificationNumber);
  }
}
