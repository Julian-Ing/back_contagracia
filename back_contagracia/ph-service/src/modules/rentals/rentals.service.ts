import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

interface FindAllParams {
  condominium_id?: string;
  unit_id?: string;
  renter_unit_id?: string;
  status?: string;
  skip?: number;
  take?: number;
}

@Injectable()
export class RentalsService {
  private readonly logger = new Logger(RentalsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // ─── Find All ──────────────────────────────────────────────────────

  async findAll(companyId: string, params: FindAllParams) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const { skip = 0, take = 20 } = params;

    const where: any = {};

    if (params.condominium_id) {
      where.condominium_id = params.condominium_id;
    }

    if (params.unit_id) {
      where.unit_id = params.unit_id;
    }

    if (params.renter_unit_id) {
      where.renter_unit_id = params.renter_unit_id;
    }

    if (params.status) {
      where.status = params.status;
    }

    const [data, total] = await Promise.all([
      db.phUnitRental.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          unit: {
            select: {
              id: true,
              unit_number: true,
              floor: true,
              unit_type: { select: { id: true, name: true } },
            },
          },
          renter_unit: {
            select: {
              id: true,
              unit_number: true,
              floor: true,
              unit_type: { select: { id: true, name: true } },
            },
          },
          condominium: {
            select: { id: true, name: true },
          },
        },
      }),
      db.phUnitRental.count({ where }),
    ]);

    return { data, total };
  }

  // ─── Find One ──────────────────────────────────────────────────────

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const rental = await db.phUnitRental.findUnique({
      where: { id },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            unit_type: { select: { id: true, name: true, free_minutes: true, rental_fee: true, rental_fee_type: true } },
          },
        },
        renter_unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            unit_type: { select: { id: true, name: true } },
          },
        },
        condominium: {
          select: { id: true, name: true },
        },
      },
    });

    if (!rental) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    return rental;
  }

  // ─── Create ────────────────────────────────────────────────────────

  async create(companyId: string, dto: CreateRentalDto, userId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Verificar que la unidad a alquilar existe e incluir su tipo
    const unit = await db.phUnit.findUnique({
      where: { id: dto.unit_id },
      include: {
        unit_type: {
          select: { id: true, name: true, is_rentable: true, free_minutes: true, rental_fee: true, rental_fee_type: true },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unidad a alquilar no encontrada');
    }

    if (unit.unit_type && !unit.unit_type.is_rentable) {
      throw new BadRequestException('Este tipo de unidad no es alquilable');
    }

    // Verificar que la unidad arrendataria existe
    const renterUnit = await db.phUnit.findUnique({
      where: { id: dto.renter_unit_id },
    });

    if (!renterUnit) {
      throw new NotFoundException('Unidad arrendataria no encontrada');
    }

    // Verificar que no sea la misma unidad
    if (dto.unit_id === dto.renter_unit_id) {
      throw new BadRequestException('La unidad alquilada y la arrendataria no pueden ser la misma');
    }

    return db.phUnitRental.create({
      data: {
        unit_id: dto.unit_id,
        renter_unit_id: dto.renter_unit_id,
        condominium_id: dto.condominium_id,
        start_time: new Date(dto.start_time),
        status: 'active',
        notes: dto.notes || null,
        created_by: userId,
      },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            unit_type: { select: { id: true, name: true, free_minutes: true, rental_fee: true, rental_fee_type: true } },
          },
        },
        renter_unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            unit_type: { select: { id: true, name: true } },
          },
        },
        condominium: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // ─── Update ────────────────────────────────────────────────────────

  async update(companyId: string, id: string, dto: UpdateRentalDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phUnitRental.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    const data: any = {};
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.amount !== undefined) data.amount = dto.amount;

    return db.phUnitRental.update({
      where: { id },
      data,
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            unit_type: { select: { id: true, name: true } },
          },
        },
        renter_unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            unit_type: { select: { id: true, name: true } },
          },
        },
        condominium: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // ─── Checkout ──────────────────────────────────────────────────────

  async checkout(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const rental = await db.phUnitRental.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            unit_type: {
              select: { free_minutes: true, rental_fee: true, rental_fee_type: true },
            },
          },
        },
      },
    });

    if (!rental) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    if (rental.status !== 'active') {
      throw new BadRequestException('Solo se pueden completar alquileres activos');
    }

    const now = new Date();
    const startTime = new Date(rental.start_time);
    const totalMinutes = Math.ceil((now.getTime() - startTime.getTime()) / (1000 * 60));

    // Obtener datos de tarifa desde el tipo de unidad
    const unitType = rental.unit?.unit_type;
    const freeMinutes = unitType?.free_minutes ?? 0;
    const rentalFee = unitType?.rental_fee ? Number(unitType.rental_fee) : 0;
    const feeType = unitType?.rental_fee_type; // 'per_minute', 'per_hour', 'flat', etc.

    // Calcular minutos facturables (descontar minutos gratis)
    const billableMinutes = Math.max(0, totalMinutes - freeMinutes);

    // Calcular monto segun el tipo de tarifa
    let amount = 0;
    if (billableMinutes > 0 && rentalFee > 0) {
      switch (feeType) {
        case 'per_hour':
          // Redondear hacia arriba a la hora mas cercana
          const billableHours = Math.ceil(billableMinutes / 60);
          amount = billableHours * rentalFee;
          break;
        case 'flat':
          amount = rentalFee;
          break;
        case 'per_minute':
        default:
          amount = billableMinutes * rentalFee;
          break;
      }
    }

    return db.phUnitRental.update({
      where: { id },
      data: {
        status: 'completed',
        end_time: now,
        total_minutes: totalMinutes,
        billable_minutes: billableMinutes,
        amount,
      },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            unit_type: { select: { id: true, name: true, free_minutes: true, rental_fee: true, rental_fee_type: true } },
          },
        },
        renter_unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            unit_type: { select: { id: true, name: true } },
          },
        },
        condominium: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // ─── Cancel ────────────────────────────────────────────────────────

  async cancel(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phUnitRental.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    if (existing.status !== 'active') {
      throw new BadRequestException('Solo se pueden cancelar alquileres activos');
    }

    return db.phUnitRental.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            unit_type: { select: { id: true, name: true } },
          },
        },
        renter_unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            unit_type: { select: { id: true, name: true } },
          },
        },
        condominium: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // ─── Generate Receipt PDF ────────────────────────────────────────

  async generateReceiptPdf(companyId: string, id: string): Promise<Buffer> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const rental = await db.phUnitRental.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            unit_type: {
              select: { name: true, free_minutes: true, rental_fee: true, rental_fee_type: true },
            },
          },
        },
        renter_unit: { select: { id: true, unit_number: true, floor: true } },
        condominium: { select: { id: true, name: true, logo_url: true } },
      },
    });

    if (!rental) throw new NotFoundException('Alquiler no encontrado');

    // Obtener residentes activos de la unidad arrendataria
    const residents = await db.phUnitResident.findMany({
      where: { unit_id: rental.renter_unit_id, is_active: true },
      select: { tercero_id: true, resident_type: true, is_primary: true },
      orderBy: { is_primary: 'desc' },
    });

    // Obtener datos de terceros
    let terceros: any[] = [];
    if (residents.length > 0) {
      const terceroIds = residents.map((r) => r.tercero_id);
      terceros = await db.thirdParty.findMany({
        where: { id: { in: terceroIds } },
        select: { id: true, first_name: true, first_surname: true, second_surname: true, identification_number: true, phone: true },
      });
    }

    const terceroMap = new Map(terceros.map((t) => [t.id, t]));

    // Fetch logo de copropiedad
    const logoBuffer = rental.condominium?.logo_url
      ? await this.fetchImageBuffer(rental.condominium.logo_url)
      : null;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = 612;
      const leftMargin = 50;
      const contentWidth = pageWidth - 100;

      // ── Logo ──
      if (logoBuffer) {
        doc.image(logoBuffer, (pageWidth - 80) / 2, doc.y, { width: 80 });
        doc.moveDown(5);
      }

      // ── Header ──
      doc.fontSize(16).font('Helvetica-Bold')
        .text(rental.condominium?.name || 'Copropiedad', { align: 'center', width: contentWidth });
      doc.moveDown(0.5);

      doc.fontSize(14).font('Helvetica-Bold')
        .text('Soporte de Alquiler', { align: 'center', width: contentWidth });
      doc.moveDown(0.3);

      // Línea separadora
      doc.moveTo(leftMargin, doc.y).lineTo(pageWidth - 50, doc.y).stroke('#cccccc');
      doc.moveDown(1);

      // ── Datos del alquiler ──
      const labelX = leftMargin;
      const valueX = leftMargin + 180;
      const rowHeight = 20;

      const drawRow = (label: string, value: string) => {
        const y = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').text(label, labelX, y);
        doc.fontSize(10).font('Helvetica').text(value, valueX, y);
        doc.y = y + rowHeight;
      };

      drawRow('Unidad Alquilada:', `${rental.unit?.unit_number || '—'}${rental.unit?.unit_type ? ` (${rental.unit.unit_type.name})` : ''}`);
      drawRow('Unidad Arrendataria:', rental.renter_unit?.unit_number || '—');
      drawRow('Copropiedad:', rental.condominium?.name || '—');

      // Arrendatarios
      if (residents.length > 0) {
        const y = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').text('Arrendatario(s):', labelX, y);
        let resY = y;
        for (const res of residents) {
          const t = terceroMap.get(res.tercero_id);
          if (!t) continue;
          const fullName = [t.first_name, t.first_surname, t.second_surname].filter(Boolean).join(' ');
          const doc_number = t.identification_number ? ` — CC ${t.identification_number}` : '';
          doc.fontSize(10).font('Helvetica').text(`${fullName}${doc_number}`, valueX, resY);
          resY += 16;
        }
        doc.y = Math.max(y + rowHeight, resY + 4);
      }

      doc.moveDown(0.5);

      // Línea separadora
      doc.moveTo(leftMargin, doc.y).lineTo(pageWidth - 50, doc.y).stroke('#cccccc');
      doc.moveDown(0.5);

      drawRow('Fecha/Hora Entrada:', this.formatDateTimePdf(rental.start_time));
      drawRow('Fecha/Hora Salida:', rental.end_time ? this.formatDateTimePdf(rental.end_time) : '—');

      if (rental.total_minutes != null) {
        drawRow('Duración Total:', this.formatMinutes(rental.total_minutes));
      }

      const freeMin = rental.unit?.unit_type?.free_minutes ?? 0;
      if (freeMin > 0) {
        drawRow('Minutos Libres:', `${freeMin} min`);
      }

      if (rental.billable_minutes != null) {
        drawRow('Minutos Facturables:', `${rental.billable_minutes} min`);
      }

      // Tarifa
      const unitType = rental.unit?.unit_type;
      if (unitType?.rental_fee) {
        const feeTypeLabels: Record<string, string> = {
          per_minute: '/minuto',
          per_hour: '/hora',
          flat: '(tarifa fija)',
        };
        const feeLabel = feeTypeLabels[unitType.rental_fee_type || ''] || '';
        drawRow('Tarifa:', `${this.formatCOP(Number(unitType.rental_fee))} ${feeLabel}`);
      }

      doc.moveDown(0.5);

      // Monto total destacado
      doc.moveTo(leftMargin, doc.y).lineTo(pageWidth - 50, doc.y).stroke('#cccccc');
      doc.moveDown(0.5);

      const amountY = doc.y;
      doc.fontSize(12).font('Helvetica-Bold').text('TOTAL:', labelX, amountY);
      doc.fontSize(12).font('Helvetica-Bold').text(
        this.formatCOP(Number(rental.amount || 0)),
        valueX, amountY,
      );
      doc.y = amountY + 28;

      const statusLabels: Record<string, string> = {
        active: 'Activo',
        completed: 'Completado',
        cancelled: 'Cancelado',
      };
      drawRow('Estado:', statusLabels[rental.status] || rental.status);

      if (rental.notes) {
        drawRow('Notas:', rental.notes);
      }

      // ── Footer ──
      doc.moveDown(2);
      doc.moveTo(leftMargin, doc.y).lineTo(pageWidth - 50, doc.y).stroke('#cccccc');
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').fillColor('#888888')
        .text(`Generado el ${this.formatDateTimePdf(new Date())}`, { align: 'center', width: contentWidth });

      doc.end();
    });
  }

  // ─── Helpers PDF ─────────────────────────────────────────────────

  private formatCOP(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }

  private formatDateTimePdf(date?: string | Date | null): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    });
  }

  private formatMinutes(totalMin: number): string {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}min`;
  }

  private async fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
      let fullUrl = url;
      if (url.startsWith('/api/media/')) {
        const base = process.env.MEDIA_SERVICE_URL || 'http://localhost:3018';
        fullUrl = `${base}${url}`;
      } else if (!url.startsWith('http')) {
        const base = process.env.COMPANY_SERVICE_URL || 'http://localhost:3003';
        fullUrl = `${base}${url}`;
      }
      const res = await fetch(fullUrl);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }
}
