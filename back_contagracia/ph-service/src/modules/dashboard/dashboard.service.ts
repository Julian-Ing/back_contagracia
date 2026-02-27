import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async getStats(companyId: string, condominiumId?: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Filtro base para entidades que dependen de condominio
    const condominiumFilter = condominiumId ? { condominium_id: condominiumId } : {};

    const [
      condominiums,
      units,
      residents,
      vehicles,
      feesPending,
      feesOverdue,
      feesPendingAmount,
      activeRentals,
      pendingReservations,
      commonAreas,
    ] = await Promise.all([
      // Total condominios activos
      db.phCondominium.count({
        where: { company_id: companyId, is_active: true },
      }),
      // Total unidades activas
      db.phUnit.count({
        where: { is_active: true, ...condominiumFilter },
      }),
      // Total residentes activos
      db.phUnitResident.count({
        where: { is_active: true },
      }),
      // Total vehículos activos
      db.phVehicle.count({
        where: { is_active: true },
      }),
      // Cuotas pendientes
      db.phFee.count({
        where: { status: 'pending' },
      }),
      // Cuotas vencidas
      db.phFee.count({
        where: { status: 'overdue' },
      }),
      // Monto total de cuotas pendientes + vencidas
      db.phFee.aggregate({
        where: { status: { in: ['pending', 'overdue'] } },
        _sum: { balance: true },
      }),
      // Alquileres activos
      db.phUnitRental.count({
        where: { status: 'active' },
      }),
      // Reservaciones pendientes
      db.phCommonAreaReservation.count({
        where: { status: 'pending' },
      }),
      // Áreas comunes activas
      db.phCommonArea.count({
        where: { is_active: true },
      }),
    ]);

    return {
      condominiums,
      units,
      residents,
      vehicles,
      common_areas: commonAreas,
      fees_pending: feesPending,
      fees_overdue: feesOverdue,
      fees_pending_amount: feesPendingAmount._sum.balance?.toNumber?.() ?? Number(feesPendingAmount._sum.balance) ?? 0,
      active_rentals: activeRentals,
      pending_reservations: pendingReservations,
    };
  }
}
