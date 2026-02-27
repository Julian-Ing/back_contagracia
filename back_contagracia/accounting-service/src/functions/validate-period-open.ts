import { BadRequestException } from '@nestjs/common';

/**
 * Valida que exista un período contable abierto para la fecha dada.
 *
 * Reglas:
 * 1. Debe existir un período ANUAL que contenga la fecha
 * 2. El período anual debe estar OPEN o REOPENED
 * 3. Si existe un período MENSUAL para esa fecha:
 *    - Debe estar OPEN o REOPENED
 * 4. Si no existe período mensual, es válido (el anual abierto es suficiente)
 *
 * @param tenantDb - Cliente Prisma del tenant
 * @param date - Fecha de la operación contable
 * @throws BadRequestException si el período está cerrado o no existe
 */
export async function validatePeriodOpen(tenantDb: any, date: Date): Promise<void> {
  const operationDate = new Date(date);

  // Normalizar a solo fecha UTC (sin hora) para comparación consistente
  operationDate.setUTCHours(0, 0, 0, 0);

  // 1. Buscar período ANUAL que contenga la fecha
  const annualPeriod = await tenantDb.accountingPeriod.findFirst({
    where: {
      is_annual: true,
      start_date: { lte: operationDate },
      end_date: { gte: operationDate },
    },
    select: {
      id: true,
      name: true,
      status: true,
      year: true,
    },
  });

  // Si no existe período anual para esta fecha
  if (!annualPeriod) {
    const year = operationDate.getFullYear();
    throw new BadRequestException(
      `No existe un período contable anual para el año ${year}. Debe crear el período antes de registrar operaciones.`
    );
  }

  // Si el período anual está cerrado
  if (annualPeriod.status === 'CLOSED') {
    throw new BadRequestException(
      `El período contable "${annualPeriod.name}" está cerrado. No se pueden registrar operaciones en este período.`
    );
  }

  // 2. Buscar período MENSUAL que contenga la fecha (hijo del anual)
  const monthlyPeriod = await tenantDb.accountingPeriod.findFirst({
    where: {
      is_annual: false,
      parent_period_id: annualPeriod.id,
      start_date: { lte: operationDate },
      end_date: { gte: operationDate },
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  // Si existe un período mensual y está cerrado
  if (monthlyPeriod && monthlyPeriod.status === 'CLOSED') {
    throw new BadRequestException(
      `El período contable "${monthlyPeriod.name}" está cerrado. No se pueden registrar operaciones en este período.`
    );
  }

  // Si llegamos aquí, la operación está permitida:
  // - El anual está OPEN o REOPENED
  // - No existe mensual, o el mensual está OPEN o REOPENED
}

/**
 * Versión que retorna booleano en lugar de lanzar excepción.
 * Útil para validaciones en UI o lógica condicional.
 */
export async function isPeriodOpen(tenantDb: any, date: Date): Promise<{
  isOpen: boolean;
  reason?: string;
  annualPeriod?: { id: string; name: string; status: string };
  monthlyPeriod?: { id: string; name: string; status: string } | null;
}> {
  const operationDate = new Date(date);
  operationDate.setUTCHours(0, 0, 0, 0);

  const annualPeriod = await tenantDb.accountingPeriod.findFirst({
    where: {
      is_annual: true,
      start_date: { lte: operationDate },
      end_date: { gte: operationDate },
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!annualPeriod) {
    return {
      isOpen: false,
      reason: `No existe período anual para ${operationDate.getFullYear()}`,
    };
  }

  if (annualPeriod.status === 'CLOSED') {
    return {
      isOpen: false,
      reason: `Período "${annualPeriod.name}" cerrado`,
      annualPeriod,
    };
  }

  const monthlyPeriod = await tenantDb.accountingPeriod.findFirst({
    where: {
      is_annual: false,
      parent_period_id: annualPeriod.id,
      start_date: { lte: operationDate },
      end_date: { gte: operationDate },
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (monthlyPeriod && monthlyPeriod.status === 'CLOSED') {
    return {
      isOpen: false,
      reason: `Período "${monthlyPeriod.name}" cerrado`,
      annualPeriod,
      monthlyPeriod,
    };
  }

  return {
    isOpen: true,
    annualPeriod,
    monthlyPeriod,
  };
}
