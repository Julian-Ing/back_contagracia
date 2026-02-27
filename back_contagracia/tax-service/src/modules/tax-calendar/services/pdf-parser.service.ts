import { Injectable, Logger } from '@nestjs/common';
import pdfParse = require('pdf-parse');
import { PdfParseResult, ParsedDate, ParserPatterns } from '../types/parser.types';

@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name);

  private readonly monthNames: Record<string, number> = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
    ene: 1,
    feb: 2,
    mar: 3,
    abr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    ago: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dic: 12,
  };

  private readonly taxTypeMap: Record<string, { code: string; periodicity: string }> = {
    'renta grandes contribuyentes': { code: 'RENTA_GC', periodicity: 'anual' },
    'renta personas jurídicas': { code: 'RENTA_PJ', periodicity: 'anual' },
    'renta personas naturales': { code: 'RENTA_PN', periodicity: 'anual' },
    'iva bimestral': { code: 'IVA_BIMESTRAL', periodicity: 'bimestral' },
    'iva cuatrimestral': { code: 'IVA_CUATRIMESTRAL', periodicity: 'cuatrimestral' },
    'retención en la fuente': { code: 'RETEFUENTE', periodicity: 'mensual' },
    'retefuente': { code: 'RETEFUENTE', periodicity: 'mensual' },
    'rst - declaración anual': { code: 'RST_ANUAL', periodicity: 'anual' },
    'rst - anticipo bimestral': { code: 'RST_BIMESTRAL', periodicity: 'bimestral' },
    'consumo': { code: 'CONSUMO', periodicity: 'bimestral' },
    'impuesto al patrimonio': { code: 'PATRIMONIO', periodicity: 'anual' },
    'presencia económica': { code: 'PES_BIMESTRAL', periodicity: 'bimestral' },
    'precios de transferencia': { code: 'PT_INFORMATIVA', periodicity: 'anual' },
    'activos en el exterior': { code: 'ACTIVOS_EXTERIOR', periodicity: 'anual' },
  };

  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      this.logger.debug('Extrayendo texto del PDF...');
      const data = await pdfParse(buffer);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error('El PDF no contiene texto extraíble');
      }

      this.logger.debug(`Texto extraído: ${data.text.length} caracteres`);
      return data.text;
    } catch (error) {
      this.logger.error('Error al extraer texto del PDF:', error);
      throw new Error(`No se pudo extraer texto del PDF: ${error.message}`);
    }
  }

  detectTaxTypes(text: string): string[] {
    const detected: Set<string> = new Set();
    const lowerText = text.toLowerCase();

    for (const [keyword, { code }] of Object.entries(this.taxTypeMap)) {
      if (lowerText.includes(keyword)) {
        detected.add(code);
        this.logger.debug(`Tipo de obligación detectado: ${code}`);
      }
    }

    return Array.from(detected);
  }

  /**
   * Extrae fechas del texto del PDF del calendario DIAN
   * El formato DIAN tiene tablas con:
   * - Fila de NITs: 1 2 3 4 5 6 7 8 9 0
   * - Fila de días correspondientes: 10 11 12 13 14 17 18 19 20 21
   */
  extractDates(text: string, year: number): ParsedDate[] {
    const dates: ParsedDate[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let currentTaxType: string | null = null;
    let currentPeriodicity: string | null = null;
    let currentMonth: number | null = null;
    let pendingNits: number[] | null = null;
    let processedMonthsForType: Set<string> = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // 1. Detectar tipo de impuesto (resetea el estado)
      for (const [keyword, { code, periodicity }] of Object.entries(this.taxTypeMap)) {
        if (lowerLine.includes(keyword)) {
          if (currentTaxType !== code) {
            currentTaxType = code;
            currentPeriodicity = periodicity;
            processedMonthsForType = new Set();
            this.logger.debug(`[${i}] Tipo detectado: ${code}`);
          }
          break;
        }
      }

      // 2. Detectar mes
      const hastaMatch = line.match(/Hasta\s+(\w+)/i);
      if (hastaMatch) {
        const monthName = hastaMatch[1].toLowerCase();
        if (this.monthNames[monthName]) {
          currentMonth = this.monthNames[monthName];
          this.logger.debug(`[${i}] Mes detectado (con Hasta): ${monthName}`);
        }
      } else {
        const monthMatch = line.match(/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)$/i);
        if (monthMatch) {
          const monthName = monthMatch[1].toLowerCase();
          currentMonth = this.monthNames[monthName];
          this.logger.debug(`[${i}] Mes detectado (solo): ${monthName}`);
        }
      }

      // 3. Buscar números en la línea
      let numbersMatch: string[] | null = line.match(/\b(\d{1,2})\b/g);

      // Línea de números concatenados
      if (!numbersMatch && /^\d+$/.test(line) && line.length >= 10) {
        const parsed = this.parseDaysSequence(line);
        if (parsed.length >= 5) {
          numbersMatch = parsed.map(n => String(n));
        }
      }

      if (!numbersMatch || numbersMatch.length < 5 || !currentTaxType || currentMonth === null) {
        continue;
      }

      const numbers = numbersMatch.map(n => parseInt(n, 10));
      const monthNum = currentMonth;

      // Determinar si es línea de NITs o días
      // NITs: números pequeños 0-9, típicamente en secuencia
      // Días: números >= 10 (excepto casos especiales)
      const smallNumbers = numbers.filter(n => n <= 9);
      const largeNumbers = numbers.filter(n => n >= 10 && n <= 31);

      // Detectar línea de NITs: mayoría son 0-9 y hay secuencia reconocible
      const looksLikeNitRow = smallNumbers.length >= 5 &&
        (this.isNitSequence(numbers) || smallNumbers.length > largeNumbers.length);

      // Detectar línea de días: mayoría son >= 10
      const looksLikeDayRow = largeNumbers.length >= 5 && largeNumbers.length > smallNumbers.length;

      if (looksLikeNitRow) {
        // Guardar NITs para emparejar con siguiente línea de días
        pendingNits = numbers.filter(n => n <= 9);
        // Si tiene exactamente 10 elementos incluyendo 0, usar como NITs
        if (numbers.length === 10 && numbers.includes(0)) {
          pendingNits = numbers;
        }
        this.logger.debug(`[${i}] NITs pendientes: ${pendingNits.join(', ')}`);
      } else if (looksLikeDayRow) {
        // Generar key única para evitar duplicados
        const monthKey = `${currentTaxType}-${monthNum}`;

        if (processedMonthsForType.has(monthKey)) {
          this.logger.debug(`[${i}] Mes ${monthNum} ya procesado para ${currentTaxType}, saltando`);
          continue;
        }

        const days = largeNumbers;
        // Usar NITs pendientes o secuencia estándar
        const nitsToUse = pendingNits && pendingNits.length >= days.length
          ? pendingNits
          : [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

        this.logger.debug(`[${i}] Creando fechas: ${days.length} días con ${nitsToUse.length} NITs para mes ${monthNum}`);

        let created = 0;
        for (let j = 0; j < Math.min(days.length, nitsToUse.length); j++) {
          const nit = nitsToUse[j];
          const day = days[j];

          // Validar día
          if (day < 1 || day > 31) continue;

          try {
            const dueDate = new Date(year, monthNum - 1, day);
            // Verificar que la fecha sea válida
            if (dueDate.getMonth() !== monthNum - 1) continue;

            dates.push({
              taxObligationTypeCode: currentTaxType,
              year,
              periodName: this.getPeriodName(currentPeriodicity || 'mensual', monthNum),
              installmentNumber: 1,
              nitLastDigits: String(nit),
              dueDate,
              dueMonthName: Object.keys(this.monthNames).find(k => this.monthNames[k] === monthNum) || '',
              dueDay: day,
              isDeclaration: true,
              isPayment: true,
            });
            created++;
          } catch {
            // Fecha inválida
          }
        }

        if (created > 0) {
          processedMonthsForType.add(monthKey);
          this.logger.debug(`✅ Creadas ${created} fechas para ${currentTaxType} mes ${monthNum}`);
        }

        pendingNits = null; // Resetear después de usar
      }
    }

    this.logger.log(`Total de fechas extraídas: ${dates.length}`);
    return dates;
  }

  /**
   * Detecta si una secuencia de números parece ser NITs (1-9, 0)
   */
  private isNitSequence(numbers: number[]): boolean {
    // Secuencia típica de DIAN: 1 2 3 4 5 6 7 8 9 0
    const typical = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    if (numbers.length !== 10) return false;

    // Verificar si es la secuencia exacta o muy similar
    let matches = 0;
    for (let i = 0; i < numbers.length; i++) {
      if (numbers[i] === typical[i]) matches++;
    }
    return matches >= 8;
  }

  /**
   * Genera nombre del período según la periodicidad
   */
  private getPeriodName(periodicity: string, month: number): string {
    switch (periodicity) {
      case 'mensual':
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return monthNames[month - 1] || `Mes ${month}`;
      case 'bimestral':
        const bimestre = Math.ceil(month / 2);
        return `Bimestre ${bimestre}`;
      case 'cuatrimestral':
        const cuatrimestre = Math.ceil(month / 4);
        return `Cuatrimestre ${cuatrimestre}`;
      case 'anual':
        return 'Anual';
      default:
        return periodicity;
    }
  }

  /**
   * Parsea una secuencia de días como "12131415161920212223"
   * Retorna array de días: [12, 13, 14, 15, 16, 19, 20, 21, 22, 23]
   */
  private parseDaysSequence(sequence: string): number[] {
    const days: number[] = [];
    let i = 0;

    while (i < sequence.length) {
      // Intentar leer 2 dígitos
      if (i + 1 < sequence.length) {
        const twoDigits = parseInt(sequence.substring(i, i + 2), 10);

        // Validar que sea un día válido (1-31)
        if (twoDigits >= 1 && twoDigits <= 31) {
          days.push(twoDigits);
          i += 2;
          continue;
        }
      }

      // Si no funciona, leer 1 dígito
      const oneDigit = parseInt(sequence[i], 10);
      if (oneDigit >= 1 && oneDigit <= 9) {
        days.push(oneDigit);
        i += 1;
      } else {
        i += 1; // Saltar carácter inválido
      }
    }

    return days;
  }

  async parsePdf(buffer: Buffer, year: number, sourceUrl?: string): Promise<PdfParseResult> {
    this.logger.log(`Iniciando parseo de PDF para año ${year}`);

    const result: PdfParseResult = {
      year,
      sourceUrl,
      dates: [],
      totalDates: 0,
      taxTypesDetected: [],
      parseErrors: [],
      parseWarnings: [],
    };

    try {
      // 1. Extraer texto
      const text = await this.extractTextFromPdf(buffer);

      // 2. Detectar tipos de obligaciones
      result.taxTypesDetected = this.detectTaxTypes(text);

      if (result.taxTypesDetected.length === 0) {
        result.parseWarnings.push('No se detectaron tipos de obligaciones tributarias en el PDF');
      }

      // 3. Extraer fechas
      result.dates = this.extractDates(text, year);
      result.totalDates = result.dates.length;

      if (result.dates.length === 0) {
        result.parseWarnings.push('No se pudieron extraer fechas del PDF');
      } else {
        this.logger.log(`✅ Parseo exitoso: ${result.totalDates} fechas extraídas`);
      }
    } catch (error) {
      this.logger.error('Error durante el parseo del PDF:', error);
      result.parseErrors.push(error.message);
    }

    return result;
  }

  validateParseResult(result: PdfParseResult): boolean {
    return result.dates.length > 0 && result.parseErrors.length === 0;
  }
}
