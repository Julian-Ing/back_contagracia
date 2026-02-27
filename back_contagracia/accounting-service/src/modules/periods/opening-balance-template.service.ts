import { Injectable } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import * as ExcelJS from 'exceljs';

@Injectable()
export class OpeningBalanceTemplateService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async generateTemplate(companyId: string): Promise<ExcelJS.Workbook> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');

    // Fetch reference data
    const [accounts, thirdParties, bankAccounts, costCenters, ccMovementTypes] = await Promise.all([
      tenantDb.chartOfAccount.findMany({
        where: { is_active: true },
        select: { code: true, name: true },
        orderBy: { code: 'asc' },
      }),
      tenantDb.thirdParty.findMany({
        where: { is_active: true },
        select: { id: true, identification_number: true, name: true },
        orderBy: { name: 'asc' },
      }),
      tenantDb.bankAccount.findMany({
        where: { is_active: true },
        select: { id: true, account_name: true },
        orderBy: { account_name: 'asc' },
      }),
      hasCostCentersModule
        ? tenantDb.costCenter.findMany({
            where: { is_active: true },
            select: { id: true, consecutive: true, name: true },
            orderBy: { consecutive: 'asc' },
          })
        : [],
      hasCostCentersModule
        ? tenantDb.costCenterMovementType.findMany({
            select: { key: true, name: true },
            orderBy: { key: 'asc' },
          })
        : [],
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Contagracia ERP';

    // ========== Hidden data sheets ==========
    const accountValues = accounts.map((a: any) => `${a.code} — ${a.name}`);
    const thirdPartyValues = thirdParties.map((t: any) => `${t.identification_number || ''} — ${t.name || ''}`);
    const bankValues = bankAccounts.map((b: any) => b.account_name);

    const sheetAccounts = workbook.addWorksheet('_cuentas', { state: 'veryHidden' });
    accountValues.forEach((v: string, i: number) => {
      sheetAccounts.getCell(`A${i + 1}`).value = v;
    });

    const sheetThirdParties = workbook.addWorksheet('_terceros', { state: 'veryHidden' });
    thirdPartyValues.forEach((v: string, i: number) => {
      sheetThirdParties.getCell(`A${i + 1}`).value = v;
    });

    const sheetBanks = workbook.addWorksheet('_bancos', { state: 'veryHidden' });
    bankValues.forEach((v: string, i: number) => {
      sheetBanks.getCell(`A${i + 1}`).value = v;
    });

    let ccValues: string[] = [];
    let ccTypeValues: string[] = [];
    if (hasCostCentersModule) {
      ccValues = costCenters.map((c: any) => `${c.consecutive} — ${c.name}`);
      ccTypeValues = ccMovementTypes.map((t: any) => `${t.key} — ${t.name}`);

      const sheetCC = workbook.addWorksheet('_cc', { state: 'veryHidden' });
      ccValues.forEach((v: string, i: number) => {
        sheetCC.getCell(`A${i + 1}`).value = v;
      });

      const sheetCCType = workbook.addWorksheet('_tipocc', { state: 'veryHidden' });
      ccTypeValues.forEach((v: string, i: number) => {
        sheetCCType.getCell(`A${i + 1}`).value = v;
      });
    }

    // Helper: add data validation for a column
    const addValidation = (
      ws: ExcelJS.Worksheet,
      col: string,
      sheetName: string,
      count: number,
      startRow: number,
      endRow: number,
    ) => {
      if (count === 0) return;
      for (let r = startRow; r <= endRow; r++) {
        ws.getCell(`${col}${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'${sheetName}'!$A$1:$A$${count}`],
        };
      }
    };

    const VALIDATION_ROWS = 500; // rows with validation dropdowns
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
      alignment: { horizontal: 'center' },
    };

    // ========== Hoja SALDOS ==========
    const saldos = workbook.addWorksheet('Saldos');
    const saldosCols: Partial<ExcelJS.Column>[] = [
      { header: 'Cuenta', key: 'account', width: 40 },
      { header: 'Valor', key: 'amount', width: 18 },
      { header: 'Tipo', key: 'type', width: 14 },
      { header: 'Descripción', key: 'description', width: 35 },
      { header: 'Tercero', key: 'third_party', width: 40 },
      { header: 'Banco', key: 'bank', width: 30 },
    ];
    if (hasCostCentersModule) {
      saldosCols.push({ header: 'Centro de Costos', key: 'cost_center', width: 35 });
      saldosCols.push({ header: 'Tipo CC', key: 'cc_type', width: 30 });
    }
    saldos.columns = saldosCols;
    saldos.getRow(1).eachCell((cell) => { cell.style = headerStyle; });

    addValidation(saldos, 'A', '_cuentas', accountValues.length, 2, VALIDATION_ROWS);
    addValidation(saldos, 'E', '_terceros', thirdPartyValues.length, 2, VALIDATION_ROWS);
    addValidation(saldos, 'F', '_bancos', bankValues.length, 2, VALIDATION_ROWS);
    if (hasCostCentersModule) {
      addValidation(saldos, 'G', '_cc', ccValues.length, 2, VALIDATION_ROWS);
      addValidation(saldos, 'H', '_tipocc', ccTypeValues.length, 2, VALIDATION_ROWS);
    }

    // Number format for amount + type dropdown (Débito/Crédito)
    for (let r = 2; r <= VALIDATION_ROWS; r++) {
      saldos.getCell(`B${r}`).numFmt = '#,##0.00';
      saldos.getCell(`C${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Débito,Crédito"'],
      };
    }

    // ========== Hoja CxC ==========
    const cxc = workbook.addWorksheet('CxC');
    const cxcCols: Partial<ExcelJS.Column>[] = [
      { header: 'NIT Tercero', key: 'third_party', width: 40 },
      { header: 'Descripción', key: 'description', width: 25 },
      { header: 'Monto', key: 'amount', width: 18 },
      { header: 'Fecha Vencimiento', key: 'due_date', width: 20 },
      { header: 'Cuenta CxC', key: 'account', width: 40 },
    ];
    if (hasCostCentersModule) {
      cxcCols.push({ header: 'Centro de Costos', key: 'cost_center', width: 35 });
      cxcCols.push({ header: 'Tipo CC', key: 'cc_type', width: 30 });
    }
    cxc.columns = cxcCols;
    cxc.getRow(1).eachCell((cell) => { cell.style = headerStyle; });

    addValidation(cxc, 'A', '_terceros', thirdPartyValues.length, 2, VALIDATION_ROWS);
    addValidation(cxc, 'E', '_cuentas', accountValues.length, 2, VALIDATION_ROWS);
    if (hasCostCentersModule) {
      addValidation(cxc, 'F', '_cc', ccValues.length, 2, VALIDATION_ROWS);
      addValidation(cxc, 'G', '_tipocc', ccTypeValues.length, 2, VALIDATION_ROWS);
    }
    for (let r = 2; r <= VALIDATION_ROWS; r++) {
      cxc.getCell(`C${r}`).numFmt = '#,##0.00';
      cxc.getCell(`D${r}`).numFmt = 'YYYY-MM-DD';
    }

    // ========== Hoja CxP ==========
    const cxp = workbook.addWorksheet('CxP');
    const cxpCols: Partial<ExcelJS.Column>[] = [
      { header: 'NIT Tercero', key: 'third_party', width: 40 },
      { header: 'Descripción', key: 'description', width: 25 },
      { header: 'Monto', key: 'amount', width: 18 },
      { header: 'Fecha Vencimiento', key: 'due_date', width: 20 },
      { header: 'Cuenta CxP', key: 'account', width: 40 },
    ];
    if (hasCostCentersModule) {
      cxpCols.push({ header: 'Centro de Costos', key: 'cost_center', width: 35 });
      cxpCols.push({ header: 'Tipo CC', key: 'cc_type', width: 30 });
    }
    cxp.columns = cxpCols;
    cxp.getRow(1).eachCell((cell) => { cell.style = headerStyle; });

    addValidation(cxp, 'A', '_terceros', thirdPartyValues.length, 2, VALIDATION_ROWS);
    addValidation(cxp, 'E', '_cuentas', accountValues.length, 2, VALIDATION_ROWS);
    if (hasCostCentersModule) {
      addValidation(cxp, 'F', '_cc', ccValues.length, 2, VALIDATION_ROWS);
      addValidation(cxp, 'G', '_tipocc', ccTypeValues.length, 2, VALIDATION_ROWS);
    }
    for (let r = 2; r <= VALIDATION_ROWS; r++) {
      cxp.getCell(`C${r}`).numFmt = '#,##0.00';
      cxp.getCell(`D${r}`).numFmt = 'YYYY-MM-DD';
    }

    // ========== Hoja Anticipos ==========
    const anticipos = workbook.addWorksheet('Anticipos');
    const anticiposCols: Partial<ExcelJS.Column>[] = [
      { header: 'NIT Tercero', key: 'third_party', width: 40 },
      { header: 'Tipo', key: 'type', width: 20 },
      { header: 'Monto', key: 'amount', width: 18 },
      { header: 'Cuenta', key: 'account', width: 40 },
    ];
    if (hasCostCentersModule) {
      anticiposCols.push({ header: 'Centro de Costos', key: 'cost_center', width: 35 });
      anticiposCols.push({ header: 'Tipo CC', key: 'cc_type', width: 30 });
    }
    anticipos.columns = anticiposCols;
    anticipos.getRow(1).eachCell((cell) => { cell.style = headerStyle; });

    addValidation(anticipos, 'A', '_terceros', thirdPartyValues.length, 2, VALIDATION_ROWS);
    addValidation(anticipos, 'D', '_cuentas', accountValues.length, 2, VALIDATION_ROWS);
    if (hasCostCentersModule) {
      anticipos.getCell('E1').value = 'Centro de Costos';
      anticipos.getCell('F1').value = 'Tipo CC';
      addValidation(anticipos, 'E', '_cc', ccValues.length, 2, VALIDATION_ROWS);
      addValidation(anticipos, 'F', '_tipocc', ccTypeValues.length, 2, VALIDATION_ROWS);
    }

    // Type dropdown for anticipos (Cliente/Proveedor/Empleado)
    for (let r = 2; r <= VALIDATION_ROWS; r++) {
      anticipos.getCell(`B${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Cliente,Proveedor,Empleado"'],
      };
      anticipos.getCell(`C${r}`).numFmt = '#,##0.00';
    }

    return workbook;
  }
}
