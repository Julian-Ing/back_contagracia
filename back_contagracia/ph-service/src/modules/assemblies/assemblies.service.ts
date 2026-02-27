import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import {
  CreateAssemblyDto,
  UpdateAssemblyDto,
  RegisterAttendanceDto,
  CreateVoteDto,
  CastVoteDto,
} from './dto';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import * as ExcelJS from 'exceljs';

const ASSEMBLY_INCLUDE = {
  condominium: { select: { id: true, name: true } },
};

const ASSEMBLY_DETAIL_INCLUDE = {
  condominium: { select: { id: true, name: true } },
  attendances: {
    orderBy: { checked_in_at: 'desc' as const },
  },
  votes: {
    orderBy: { created_at: 'asc' as const },
    include: {
      _count: { select: { results: true } },
    },
  },
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  in_progress: 'En Curso',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
};

@Injectable()
export class AssembliesService {
  private readonly logger = new Logger(AssembliesService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServiceUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') || 'http://localhost:3015';
  }

  // ─── Notificaciones ────────────────────────────────────────

  private async sendNotification(
    companyId: string,
    notification: { type: string; title: string; message: string; action_url: string; exclude_user_id?: string },
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.notificationServiceUrl}/api/notifications`,
          { company_id: companyId, ...notification },
          { timeout: 5000 },
        ),
      );
    } catch (err: any) {
      this.logger.warn(`Error enviando notificación de asamblea: ${err.message}`);
    }
  }

  // ─── CRUD Asambleas ──────────────────────────────────────

  async findAll(
    companyId: string,
    query: {
      condominium_id?: string;
      status?: string;
      assembly_type?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const where: any = {};
    if (query.condominium_id) where.condominium_id = query.condominium_id;
    if (query.status) where.status = query.status;
    if (query.assembly_type) where.assembly_type = query.assembly_type;

    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const [data, total] = await Promise.all([
      db.phAssembly.findMany({
        where,
        skip,
        take,
        orderBy: { assembly_date: 'desc' },
        include: {
          ...ASSEMBLY_INCLUDE,
          _count: { select: { attendances: true, votes: true } },
        },
      }),
      db.phAssembly.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.findUnique({
      where: { id },
      include: ASSEMBLY_DETAIL_INCLUDE,
    });
    if (!assembly) throw new NotFoundException('Asamblea no encontrada');
    return assembly;
  }

  async create(companyId: string, dto: CreateAssemblyDto, userId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.create({
      data: {
        condominium_id: dto.condominium_id,
        title: dto.title,
        description: dto.description,
        assembly_date: new Date(dto.assembly_date),
        start_time: dto.start_time,
        end_time: dto.end_time,
        location: dto.location,
        assembly_type: dto.assembly_type || 'ordinary',
        quorum_required: dto.quorum_required,
        qr_code: randomUUID(), // token único para QR
        notes: dto.notes,
        created_by: userId,
      },
      include: {
        ...ASSEMBLY_INCLUDE,
        _count: { select: { attendances: true, votes: true } },
      },
    });

    const dateStr = new Date(dto.assembly_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    this.sendNotification(companyId, {
      type: 'ph_assembly_created',
      title: `Nueva asamblea: ${assembly.title}`,
      message: `Se ha convocado la asamblea "${assembly.title}" para el ${dateStr}. Lugar: ${dto.location || 'Por definir'}.`,
      action_url: `/dashboard/ph/asambleas?id=${assembly.id}`,
      exclude_user_id: userId,
    }).catch(() => {});

    return assembly;
  }

  async update(companyId: string, id: string, dto: UpdateAssemblyDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const existing = await db.phAssembly.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Asamblea no encontrada');

    const data: any = { ...dto };
    if (dto.assembly_date) data.assembly_date = new Date(dto.assembly_date);

    return db.phAssembly.update({
      where: { id },
      data,
      include: {
        ...ASSEMBLY_INCLUDE,
        _count: { select: { attendances: true, votes: true } },
      },
    });
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const existing = await db.phAssembly.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Asamblea no encontrada');
    if (existing.status !== 'scheduled' && existing.status !== 'cancelled') {
      throw new BadRequestException('Solo se pueden eliminar asambleas programadas o canceladas');
    }

    await db.phAssembly.delete({ where: { id } });
    return { message: 'Asamblea eliminada exitosamente' };
  }

  async changeStatus(companyId: string, id: string, newStatus: string, userId?: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.findUnique({ where: { id } });
    if (!assembly) throw new NotFoundException('Asamblea no encontrada');

    // Validar transiciones de estado
    const validTransitions: Record<string, string[]> = {
      scheduled: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: ['in_progress'],
      cancelled: ['scheduled'],
    };

    const allowed = validTransitions[assembly.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `No se puede cambiar de "${assembly.status}" a "${newStatus}"`,
      );
    }

    const updated = await db.phAssembly.update({
      where: { id },
      data: { status: newStatus },
      include: {
        ...ASSEMBLY_INCLUDE,
        _count: { select: { attendances: true, votes: true } },
      },
    });

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    this.sendNotification(companyId, {
      type: 'ph_assembly_status_changed',
      title: `Asamblea ${statusLabel}: ${assembly.title}`,
      message: `La asamblea "${assembly.title}" cambió a estado: ${statusLabel}.`,
      action_url: `/dashboard/ph/asambleas?id=${id}`,
      exclude_user_id: userId,
    }).catch(() => {});

    return updated;
  }

  async generateQrCode(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.findUnique({ where: { id } });
    if (!assembly) throw new NotFoundException('Asamblea no encontrada');

    if (!assembly.qr_code) {
      // Generar token si no existe
      const token = randomUUID();
      await db.phAssembly.update({ where: { id }, data: { qr_code: token } });
      assembly.qr_code = token;
    }

    // El QR contiene el token que la APP usará para registrar asistencia
    const qrDataUrl = await QRCode.toDataURL(assembly.qr_code!, {
      width: 400,
      margin: 2,
    });

    return {
      qr_code: assembly.qr_code,
      qr_data_url: qrDataUrl,
      assembly_id: assembly.id,
      title: assembly.title,
    };
  }

  // ─── Asistencia ───────────────────────────────────────────

  async getAttendances(companyId: string, assemblyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.findUnique({ where: { id: assemblyId } });
    if (!assembly) throw new NotFoundException('Asamblea no encontrada');

    const data = await db.phAssemblyAttendance.findMany({
      where: { assembly_id: assemblyId },
      orderBy: { checked_in_at: 'desc' },
    });

    return { data, total: data.length };
  }

  async registerAttendance(
    companyId: string,
    assemblyId: string,
    dto: RegisterAttendanceDto,
    method: string = 'manual',
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.findUnique({ where: { id: assemblyId } });
    if (!assembly) throw new NotFoundException('Asamblea no encontrada');

    // Verificar duplicado por tercero_id si se provee
    if (dto.tercero_id) {
      const existing = await db.phAssemblyAttendance.findUnique({
        where: {
          assembly_id_tercero_id: {
            assembly_id: assemblyId,
            tercero_id: dto.tercero_id,
          },
        },
      });
      if (existing) throw new ConflictException('Este residente ya registró asistencia');
    }

    const attendance = await db.phAssemblyAttendance.create({
      data: {
        assembly_id: assemblyId,
        unit_id: dto.unit_id,
        tercero_id: dto.tercero_id,
        resident_name: dto.resident_name,
        unit_label: dto.unit_label,
        delegate_name: dto.delegate_name,
        method,
        notes: dto.notes,
      },
    });

    // Actualizar quórum si aplica
    await this.updateQuorum(db, assemblyId);

    return attendance;
  }

  async registerByQr(companyId: string, qrToken: string, dto: RegisterAttendanceDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.findFirst({
      where: { qr_code: qrToken },
    });
    if (!assembly) throw new NotFoundException('Código QR inválido');

    if (assembly.status !== 'in_progress' && assembly.status !== 'scheduled') {
      throw new BadRequestException('La asamblea no está abierta para registro');
    }

    return this.registerAttendance(companyId, assembly.id, dto, 'qr');
  }

  async removeAttendance(companyId: string, assemblyId: string, attendanceId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const existing = await db.phAssemblyAttendance.findUnique({
      where: { id: attendanceId },
    });
    if (!existing || existing.assembly_id !== assemblyId) {
      throw new NotFoundException('Registro de asistencia no encontrado');
    }

    await db.phAssemblyAttendance.delete({ where: { id: attendanceId } });
    await this.updateQuorum(db, assemblyId);
    return { message: 'Asistencia eliminada' };
  }

  async getAttendanceStats(companyId: string, assemblyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.findUnique({ where: { id: assemblyId } });
    if (!assembly) throw new NotFoundException('Asamblea no encontrada');

    const quorumData = await this.computeQuorum(db, assembly);

    // Calcular quorum_reached en vivo (no depende del valor guardado en BD)
    const quorumReached = assembly.quorum_required
      ? quorumData.quorum_percent >= assembly.quorum_required
      : false;

    return {
      total_attendees: quorumData.total_attendees,
      owner_attendees: quorumData.owner_attendees,
      total_owners: quorumData.total_owners,
      total_units: quorumData.total_units,
      total_coefficient: quorumData.total_coefficient,
      present_coefficient: quorumData.present_coefficient,
      quorum_percent: quorumData.quorum_percent,
      quorum_required: assembly.quorum_required,
      quorum_reached: quorumReached,
      use_coefficients: quorumData.use_coefficients,
    };
  }

  /**
   * Calcula quórum por coeficiente de copropiedad (Ley 675).
   * Solo propietarios cuentan. Fallback a conteo si no hay coeficientes.
   */
  private async computeQuorum(db: any, assembly: any) {
    // 1. Unidades activas con propietario activo y sus coeficientes
    const unitsWithOwners = await db.phUnit.findMany({
      where: {
        condominium_id: assembly.condominium_id,
        is_active: true,
        residents: { some: { resident_type: 'owner', is_active: true } },
      },
      select: {
        id: true,
        coefficient: true,
        residents: {
          where: { resident_type: 'owner', is_active: true },
          select: { tercero_id: true },
        },
      },
    });

    // Mapa: tercero_id → suma de coeficientes de sus unidades como propietario
    const ownerCoeffMap = new Map<string, number>();
    let totalCoefficient = 0;

    for (const unit of unitsWithOwners) {
      const coeff = unit.coefficient ? Number(unit.coefficient) : 0;
      totalCoefficient += coeff;
      for (const res of unit.residents) {
        ownerCoeffMap.set(
          res.tercero_id,
          (ownerCoeffMap.get(res.tercero_id) || 0) + coeff,
        );
      }
    }

    // 2. Asistencias de esta asamblea
    const attendances = await db.phAssemblyAttendance.findMany({
      where: { assembly_id: assembly.id },
      select: { tercero_id: true },
    });

    const totalAttendees = attendances.length;

    // 3. Filtrar propietarios presentes y sumar coeficientes
    let presentCoefficient = 0;
    let ownerAttendees = 0;
    const countedOwners = new Set<string>();

    for (const att of attendances) {
      if (att.tercero_id && ownerCoeffMap.has(att.tercero_id) && !countedOwners.has(att.tercero_id)) {
        countedOwners.add(att.tercero_id);
        ownerAttendees++;
        presentCoefficient += ownerCoeffMap.get(att.tercero_id)!;
      }
    }

    // 4. Calcular quórum — preferir coeficientes, fallback a conteo de propietarios
    const useCoefficients = totalCoefficient > 0;
    let quorumPercent: number;

    if (useCoefficients) {
      quorumPercent = totalCoefficient > 0
        ? Math.round((presentCoefficient / totalCoefficient) * 10000) / 100
        : 0;
    } else {
      // Fallback: contar propietarios únicos presentes vs total propietarios únicos
      const totalOwners = ownerCoeffMap.size;
      quorumPercent = totalOwners > 0
        ? Math.round((ownerAttendees / totalOwners) * 10000) / 100
        : 0;
    }

    return {
      total_attendees: totalAttendees,
      owner_attendees: ownerAttendees,
      total_owners: ownerCoeffMap.size,
      total_units: unitsWithOwners.length,
      total_coefficient: Math.round(totalCoefficient * 10000) / 10000,
      present_coefficient: Math.round(presentCoefficient * 10000) / 10000,
      quorum_percent: quorumPercent,
      use_coefficients: useCoefficients,
    };
  }

  private async updateQuorum(db: any, assemblyId: string) {
    const assembly = await db.phAssembly.findUnique({ where: { id: assemblyId } });
    if (!assembly || !assembly.quorum_required) return;

    const quorumData = await this.computeQuorum(db, assembly);

    const quorumReached = quorumData.quorum_percent >= assembly.quorum_required;
    if (quorumReached !== assembly.quorum_reached) {
      await db.phAssembly.update({
        where: { id: assemblyId },
        data: { quorum_reached: quorumReached },
      });
    }
  }

  // ─── Votaciones ───────────────────────────────────────────

  async createVote(companyId: string, assemblyId: string, dto: CreateVoteDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.findUnique({ where: { id: assemblyId } });
    if (!assembly) throw new NotFoundException('Asamblea no encontrada');

    return db.phAssemblyVote.create({
      data: {
        assembly_id: assemblyId,
        title: dto.title,
        description: dto.description,
        vote_type: dto.vote_type || 'yes_no',
        options: dto.options ? JSON.stringify(dto.options) : null,
      },
      include: { _count: { select: { results: true } } },
    });
  }

  async updateVote(companyId: string, voteId: string, dto: Partial<CreateVoteDto>) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const vote = await db.phAssemblyVote.findUnique({ where: { id: voteId } });
    if (!vote) throw new NotFoundException('Votación no encontrada');
    if (vote.status !== 'pending') {
      throw new BadRequestException('Solo se pueden editar votaciones pendientes');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.vote_type !== undefined) data.vote_type = dto.vote_type;
    if (dto.options !== undefined) data.options = JSON.stringify(dto.options);

    return db.phAssemblyVote.update({
      where: { id: voteId },
      data,
      include: { _count: { select: { results: true } } },
    });
  }

  async openVote(companyId: string, voteId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const vote = await db.phAssemblyVote.findUnique({ where: { id: voteId } });
    if (!vote) throw new NotFoundException('Votación no encontrada');
    if (vote.status !== 'pending') {
      throw new BadRequestException('Solo se pueden abrir votaciones pendientes');
    }

    return db.phAssemblyVote.update({
      where: { id: voteId },
      data: { status: 'open', opened_at: new Date() },
      include: { _count: { select: { results: true } } },
    });
  }

  async closeVote(companyId: string, voteId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const vote = await db.phAssemblyVote.findUnique({ where: { id: voteId } });
    if (!vote) throw new NotFoundException('Votación no encontrada');
    if (vote.status !== 'open') {
      throw new BadRequestException('Solo se pueden cerrar votaciones abiertas');
    }

    return db.phAssemblyVote.update({
      where: { id: voteId },
      data: { status: 'closed', closed_at: new Date() },
      include: { _count: { select: { results: true } } },
    });
  }

  async castVote(companyId: string, voteId: string, dto: CastVoteDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const vote = await db.phAssemblyVote.findUnique({
      where: { id: voteId },
      include: { assembly: true },
    });
    if (!vote) throw new NotFoundException('Votación no encontrada');
    // Validar que la asamblea esté en curso (ya no depende del status individual del voto)
    if (vote.assembly.status !== 'in_progress') {
      throw new BadRequestException('La asamblea no está en curso');
    }

    // Verificar que sea propietario en la copropiedad de la asamblea
    if (dto.tercero_id) {
      const isOwner = await db.phUnitResident.findFirst({
        where: {
          tercero_id: dto.tercero_id,
          resident_type: 'owner',
          is_active: true,
          unit: { condominium_id: vote.assembly.condominium_id, is_active: true },
        },
      });
      if (!isOwner) {
        throw new BadRequestException('Solo los propietarios pueden votar en las asambleas');
      }
    }

    // Verificar duplicado por tercero_id
    if (dto.tercero_id) {
      const existing = await db.phAssemblyVoteResult.findUnique({
        where: {
          vote_id_tercero_id: {
            vote_id: voteId,
            tercero_id: dto.tercero_id,
          },
        },
      });
      if (existing) throw new ConflictException('Este residente ya votó en este tema');
    }

    // Validar opción
    if (vote.vote_type === 'yes_no') {
      if (!['yes', 'no', 'abstain'].includes(dto.selected_option)) {
        throw new BadRequestException('Opción inválida. Use: yes, no, abstain');
      }
    } else if (vote.vote_type === 'multiple_choice' && vote.options) {
      const validOptions = JSON.parse(vote.options);
      if (!validOptions.includes(dto.selected_option) && dto.selected_option !== 'abstain') {
        throw new BadRequestException('Opción inválida');
      }
    }

    const result = await db.phAssemblyVoteResult.create({
      data: {
        vote_id: voteId,
        tercero_id: dto.tercero_id,
        unit_id: dto.unit_id,
        resident_name: dto.resident_name,
        unit_label: dto.unit_label,
        selected_option: dto.selected_option,
      },
    });

    // Notificar para actualización en tiempo real de resultados
    this.sendNotification(companyId, {
      type: 'ph_assembly_vote_cast',
      title: `Nuevo voto en: ${vote.title}`,
      message: `${dto.resident_name || 'Un residente'} votó en "${vote.title}".`,
      action_url: `/dashboard/ph/asambleas?id=${vote.assembly_id}`,
      exclude_user_id: dto.tercero_id, // excluir al votante
    }).catch(() => {});

    return result;
  }

  async getVoteResults(companyId: string, voteId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const vote = await db.phAssemblyVote.findUnique({
      where: { id: voteId },
      include: { results: true },
    });
    if (!vote) throw new NotFoundException('Votación no encontrada');

    // Agrupar resultados por opción
    const summary: Record<string, number> = {};
    for (const result of vote.results) {
      summary[result.selected_option] = (summary[result.selected_option] || 0) + 1;
    }

    return {
      vote,
      summary,
      total_votes: vote.results.length,
    };
  }

  // ─── Export Excel ─────────────────────────────────────────

  async exportAttendanceExcel(companyId: string, assemblyId: string): Promise<Buffer> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.findUnique({
      where: { id: assemblyId },
      include: {
        condominium: { select: { name: true } },
        attendances: { orderBy: { checked_in_at: 'asc' } },
      },
    });
    if (!assembly) throw new NotFoundException('Asamblea no encontrada');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Asistencia');

    // Header info
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = `Asistencia - ${assembly.title}`;
    sheet.getCell('A1').font = { size: 14, bold: true };

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Copropiedad: ${assembly.condominium?.name || ''} | Fecha: ${new Date(assembly.assembly_date).toLocaleDateString('es-CO')}`;

    // Table header
    const headerRow = sheet.addRow([]);
    sheet.addRow(['#', 'Unidad', 'Residente', 'Delegado', 'Método', 'Hora Check-in', 'Notas']);
    const hRow = sheet.getRow(4);
    hRow.font = { bold: true };
    hRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // Data rows
    assembly.attendances.forEach((att: any, idx: number) => {
      sheet.addRow([
        idx + 1,
        att.unit_label || '',
        att.resident_name || '',
        att.delegate_name || '',
        att.method === 'qr' ? 'QR' : 'Manual',
        new Date(att.checked_in_at).toLocaleTimeString('es-CO'),
        att.notes || '',
      ]);
    });

    // Auto-width
    sheet.columns.forEach((col) => {
      col.width = 18;
    });

    // Summary
    const summaryRow = sheet.addRow([]);
    sheet.addRow(['', `Total asistentes: ${assembly.attendances.length}`]);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportVoteResultsExcel(companyId: string, assemblyId: string): Promise<Buffer> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const assembly = await db.phAssembly.findUnique({
      where: { id: assemblyId },
      include: {
        condominium: { select: { name: true } },
        votes: {
          include: { results: true },
          orderBy: { created_at: 'asc' },
        },
      },
    });
    if (!assembly) throw new NotFoundException('Asamblea no encontrada');

    const workbook = new ExcelJS.Workbook();

    // Hoja resumen
    const summarySheet = workbook.addWorksheet('Resumen Votaciones');
    summarySheet.mergeCells('A1:E1');
    summarySheet.getCell('A1').value = `Votaciones - ${assembly.title}`;
    summarySheet.getCell('A1').font = { size: 14, bold: true };

    summarySheet.mergeCells('A2:E2');
    summarySheet.getCell('A2').value = `Copropiedad: ${assembly.condominium?.name || ''} | Fecha: ${new Date(assembly.assembly_date).toLocaleDateString('es-CO')}`;

    summarySheet.addRow([]);
    const sHeaderRow = summarySheet.addRow(['#', 'Tema', 'Tipo', 'Total Votos', 'Estado', 'Resultado']);
    sHeaderRow.font = { bold: true };
    sHeaderRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    assembly.votes.forEach((vote: any, idx: number) => {
      const tally: Record<string, number> = {};
      for (const r of vote.results) {
        tally[r.selected_option] = (tally[r.selected_option] || 0) + 1;
      }
      const resultStr = Object.entries(tally)
        .map(([opt, count]) => `${opt}: ${count}`)
        .join(', ');

      summarySheet.addRow([
        idx + 1,
        vote.title,
        vote.vote_type === 'yes_no' ? 'Sí/No' : 'Opción múltiple',
        vote.results.length,
        vote.status === 'closed' ? 'Cerrada' : vote.status === 'open' ? 'Abierta' : 'Pendiente',
        resultStr || 'Sin votos',
      ]);

      // Hoja detallada por votación
      const voteSheet = workbook.addWorksheet(`Votación ${idx + 1}`);
      voteSheet.mergeCells('A1:D1');
      voteSheet.getCell('A1').value = vote.title;
      voteSheet.getCell('A1').font = { size: 12, bold: true };

      voteSheet.addRow([]);
      const vHeaderRow = voteSheet.addRow(['#', 'Unidad', 'Residente', 'Voto', 'Fecha']);
      vHeaderRow.font = { bold: true };
      vHeaderRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });

      vote.results.forEach((r: any, rIdx: number) => {
        voteSheet.addRow([
          rIdx + 1,
          r.unit_label || '',
          r.resident_name || '',
          r.selected_option,
          new Date(r.voted_at).toLocaleString('es-CO'),
        ]);
      });

      voteSheet.columns.forEach((col) => { col.width = 18; });
    });

    summarySheet.columns.forEach((col) => { col.width = 20; });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
