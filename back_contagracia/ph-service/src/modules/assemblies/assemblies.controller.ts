import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import * as express from 'express';
import { AssembliesService } from './assemblies.service';
import {
  CreateAssemblyDto,
  UpdateAssemblyDto,
  RegisterAttendanceDto,
  CreateVoteDto,
  CastVoteDto,
} from './dto';

@ApiTags('PH Assemblies')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/assemblies')
export class AssembliesController {
  constructor(private readonly service: AssembliesService) {}

  // ─── CRUD Asambleas ──────────────────────────────────────

  /**
   * Permission: ph.assemblies.view
   */
  @Get()
  @ApiOperation({ summary: 'Listar asambleas' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assembly_type', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('status') status?: string,
    @Query('assembly_type') assemblyType?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAll(companyId, {
      condominium_id: condominiumId,
      status,
      assembly_type: assemblyType,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * Permission: ph.assemblies.view
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener asamblea con asistencia y votaciones' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  /**
   * Permission: ph.assemblies.create
   */
  @Post()
  @ApiOperation({ summary: 'Crear asamblea' })
  @Audit('assembly.created', 'assembly')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateAssemblyDto,
    @Request() req: any,
  ) {
    return this.service.create(companyId, dto, req.user.sub);
  }

  /**
   * Permission: ph.assemblies.edit
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar asamblea' })
  @Audit('assembly.updated', 'assembly')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssemblyDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  /**
   * Permission: ph.assemblies.delete
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar asamblea (solo scheduled/cancelled)' })
  @Audit('assembly.deleted', 'assembly')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }

  /**
   * Permission: ph.assemblies.edit
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado de asamblea' })
  @Audit('assembly.status_changed', 'assembly')
  async changeStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.service.changeStatus(companyId, id, status, req.user.sub);
  }

  // ─── QR ───────────────────────────────────────────────────

  /**
   * Permission: ph.assemblies.view
   */
  @Get(':id/qr')
  @ApiOperation({ summary: 'Obtener QR de la asamblea (data URL)' })
  async getQrCode(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.generateQrCode(companyId, id);
  }

  @Post('check-in/:qrToken')
  @ApiOperation({ summary: 'Registrar asistencia por QR (para APP)' })
  @Audit('assembly_attendance.checked_in', 'assembly_attendance')
  async checkInByQr(
    @Param('companyId') companyId: string,
    @Param('qrToken') qrToken: string,
    @Body() dto: RegisterAttendanceDto,
  ) {
    return this.service.registerByQr(companyId, qrToken, dto);
  }

  // ─── Asistencia ───────────────────────────────────────────

  /**
   * Permission: ph.assemblies.view
   */
  @Get(':id/attendances')
  @ApiOperation({ summary: 'Listar asistencia de una asamblea' })
  async getAttendances(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.getAttendances(companyId, id);
  }

  /**
   * Permission: ph.assemblies.view
   */
  @Get(':id/attendances/stats')
  @ApiOperation({ summary: 'Estadísticas de asistencia y quórum' })
  async getAttendanceStats(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.getAttendanceStats(companyId, id);
  }

  /**
   * Permission: ph.assemblies.manage_attendance
   */
  @Post(':id/attendances')
  @ApiOperation({ summary: 'Registrar asistencia manual' })
  @Audit('assembly_attendance.created', 'assembly_attendance')
  async registerAttendance(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: RegisterAttendanceDto,
  ) {
    return this.service.registerAttendance(companyId, id, dto, 'manual');
  }

  /**
   * Permission: ph.assemblies.manage_attendance
   */
  @Delete(':id/attendances/:attId')
  @ApiOperation({ summary: 'Eliminar registro de asistencia' })
  @Audit('assembly_attendance.deleted', 'assembly_attendance')
  async removeAttendance(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('attId') attId: string,
  ) {
    return this.service.removeAttendance(companyId, id, attId);
  }

  /**
   * Permission: ph.assemblies.export
   */
  @Get(':id/attendances/export')
  @ApiOperation({ summary: 'Exportar asistencia a Excel' })
  async exportAttendance(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Res() res: express.Response,
  ) {
    const buffer = await this.service.exportAttendanceExcel(companyId, id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="asistencia_asamblea.xlsx"`,
    });
    res.send(buffer);
  }

  // ─── Votaciones ───────────────────────────────────────────

  /**
   * Permission: ph.assemblies.manage_votes
   */
  @Post(':id/votes')
  @ApiOperation({ summary: 'Crear tema de votación' })
  @Audit('assembly_vote.created', 'assembly_vote')
  async createVote(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateVoteDto,
  ) {
    return this.service.createVote(companyId, id, dto);
  }

  /**
   * Permission: ph.assemblies.manage_votes
   */
  @Patch('votes/:voteId')
  @ApiOperation({ summary: 'Actualizar tema de votación' })
  @Audit('assembly_vote.updated', 'assembly_vote')
  async updateVote(
    @Param('companyId') companyId: string,
    @Param('voteId') voteId: string,
    @Body() dto: CreateVoteDto,
  ) {
    return this.service.updateVote(companyId, voteId, dto);
  }

  /**
   * Permission: ph.assemblies.manage_votes
   */
  @Patch('votes/:voteId/open')
  @ApiOperation({ summary: 'Abrir votación' })
  @Audit('assembly_vote.opened', 'assembly_vote')
  async openVote(
    @Param('companyId') companyId: string,
    @Param('voteId') voteId: string,
  ) {
    return this.service.openVote(companyId, voteId);
  }

  /**
   * Permission: ph.assemblies.manage_votes
   */
  @Patch('votes/:voteId/close')
  @ApiOperation({ summary: 'Cerrar votación' })
  @Audit('assembly_vote.closed', 'assembly_vote')
  async closeVote(
    @Param('companyId') companyId: string,
    @Param('voteId') voteId: string,
  ) {
    return this.service.closeVote(companyId, voteId);
  }

  @Post('votes/:voteId/cast')
  @ApiOperation({ summary: 'Emitir voto (para APP)' })
  @Audit('assembly_vote.cast', 'assembly_vote')
  async castVote(
    @Param('companyId') companyId: string,
    @Param('voteId') voteId: string,
    @Body() dto: CastVoteDto,
  ) {
    return this.service.castVote(companyId, voteId, dto);
  }

  /**
   * Permission: ph.assemblies.view
   */
  @Get('votes/:voteId/results')
  @ApiOperation({ summary: 'Ver resultados de votación' })
  async getVoteResults(
    @Param('companyId') companyId: string,
    @Param('voteId') voteId: string,
  ) {
    return this.service.getVoteResults(companyId, voteId);
  }

  /**
   * Permission: ph.assemblies.export
   */
  @Get(':id/votes/export')
  @ApiOperation({ summary: 'Exportar resultados de votaciones a Excel' })
  async exportVotes(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Res() res: express.Response,
  ) {
    const buffer = await this.service.exportVoteResultsExcel(companyId, id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="votaciones_asamblea.xlsx"`,
    });
    res.send(buffer);
  }
}
