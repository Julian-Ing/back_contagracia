import { Injectable } from '@nestjs/common';
import { DomainModule, DomainModuleContext } from './domain-module.interface';

@Injectable()
export class GeneralDomainModule implements DomainModule {
  moduleId = 'general';

  async getContext(_companyId: string, _query: string): Promise<DomainModuleContext> {
    return {
      data: null,
      instructions: [
        'Responde preguntas generales sobre contabilidad, impuestos y normativa colombiana.',
        'Si la pregunta requiere datos específicos de la empresa, sugiere seleccionar el módulo adecuado.',
      ],
      description: 'Consulta general sin contexto de datos empresariales.',
    };
  }
}
