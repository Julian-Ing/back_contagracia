import { Injectable } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

interface ConsecutiveRow {
  type: string;
  last_number: number;
  prefix: string;
  padding: number;
}

interface ConsecutiveTypeRow {
  type: string;
  table_name: string | null;
  condition_field: string | null;
  condition_value: string | null;
}

/**
 * Servicio para generar consecutivos únicos con lock FOR UPDATE
 * Evita duplicados en entornos concurrentes
 */
@Injectable()
export class ConsecutiveService {
  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Formatea el consecutivo: PREFIX-0001
   * Si el número tiene más dígitos que el padding, no recorta
   */
  private formatConsecutive(prefix: string, number: number, padding: number): string {
    const numStr = number.toString();
    const padded = numStr.length >= padding ? numStr : numStr.padStart(padding, '0');
    return `${prefix}-${padded}`;
  }

  /**
   * Obtiene el siguiente consecutivo para un tipo dado
   * Usa SELECT FOR UPDATE para evitar race conditions
   */
  async getNext(companyId: string, type: string): Promise<string> {
    const prisma = await this.tenantContext.getTenantClient(companyId);
    if (!prisma) {
      throw new Error('Tenant no encontrado');
    }

    return prisma.$transaction(async (tx: any) => {
      // Lock del registro con FOR UPDATE
      const [consecutive] = await tx.$queryRaw<ConsecutiveRow[]>`
        SELECT type, last_number, prefix, padding
        FROM consecutives
        WHERE type = ${type}
        FOR UPDATE
      `;

      if (!consecutive) {
        throw new Error(`Tipo de consecutivo '${type}' no configurado`);
      }

      const nextNumber = consecutive.last_number + 1;

      // Actualizar el último número
      await tx.consecutive.update({
        where: { type },
        data: { last_number: nextNumber },
      });

      return this.formatConsecutive(consecutive.prefix, nextNumber, consecutive.padding);
    });
  }

  /**
   * Busca el tipo de consecutivo para una tabla y condición dada
   */
  async findTypeForTable(
    companyId: string,
    tableName: string,
    conditionField?: string,
    conditionValue?: string,
  ): Promise<string | null> {
    const prisma = await this.tenantContext.getTenantClient(companyId);
    if (!prisma) {
      return null;
    }

    // Buscar tipo de consecutivo que coincida con tabla y condición
    const consecutiveType = await prisma.consecutiveType.findFirst({
      where: {
        table_name: tableName,
        ...(conditionField && conditionValue
          ? { condition_field: conditionField, condition_value: conditionValue }
          : { condition_field: null }),
      },
    });

    return consecutiveType?.type || null;
  }

  /**
   * Obtiene el siguiente consecutivo para una tabla/condición
   * Útil para el middleware automático
   */
  async getNextForTable(
    companyId: string,
    tableName: string,
    data: Record<string, any>,
  ): Promise<string | null> {
    const prisma = await this.tenantContext.getTenantClient(companyId);
    if (!prisma) {
      return null;
    }

    // Buscar todos los tipos para esta tabla
    const consecutiveTypes = await prisma.consecutiveType.findMany({
      where: { table_name: tableName },
    });

    if (consecutiveTypes.length === 0) {
      return null;
    }

    // Buscar el tipo que coincida con la condición
    for (const ct of consecutiveTypes) {
      if (ct.condition_field && ct.condition_value) {
        // Tiene condición, verificar si coincide
        if (data[ct.condition_field] === ct.condition_value) {
          return this.getNext(companyId, ct.type);
        }
      } else if (!ct.condition_field) {
        // Sin condición, usar este
        return this.getNext(companyId, ct.type);
      }
    }

    return null;
  }

  /**
   * Obtiene el consecutivo actual sin incrementar
   */
  async getCurrent(companyId: string, type: string): Promise<string | null> {
    const prisma = await this.tenantContext.getTenantClient(companyId);
    if (!prisma) {
      return null;
    }

    const consecutive = await prisma.consecutive.findUnique({
      where: { type },
    });

    if (!consecutive || consecutive.last_number === 0) {
      return null;
    }

    return this.formatConsecutive(consecutive.prefix, consecutive.last_number, consecutive.padding);
  }
}
